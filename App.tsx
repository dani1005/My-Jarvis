import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Globe } from './components/Globe';
import { HUDMetrics } from './components/HUDMetrics';
import { VisionService } from './services/visionService';
import { SystemStatus, HeadTransform, HandGesture } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(0);
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.INITIALIZING);
  const [headTransform, setHeadTransform] = useState<HeadTransform>({ x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 });
  
  // Globe Control State
  const [globeRotation, setGlobeRotation] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [globeScale, setGlobeScale] = useState<number>(1.5);
  const [isHandActive, setIsHandActive] = useState<boolean>(false);

  // Initialize Camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', () => {
            setStatus(SystemStatus.SCANNING);
            startProcessing();
          });
        }
      } catch (err) {
        console.error("Camera init failed:", err);
        setStatus(SystemStatus.ERROR);
      }
    };

    initCamera();
    return () => cancelAnimationFrame(requestRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Process Loop
  const startProcessing = useCallback(async () => {
    const vision = VisionService.getInstance();
    await vision.initialize();
    setStatus(SystemStatus.ACTIVE);

    const loop = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const now = performance.now();
        
        // 1. Detect Face (Head Tracking)
        const faceResult = vision.detectFace(videoRef.current, now);
        if (faceResult && faceResult.faceLandmarks.length > 0) {
          const landmarks = faceResult.faceLandmarks[0];
          // Use nose tip (1) and sides of face (454, 234) for rough pose estimation
          const nose = landmarks[1];
          // Rough estimate: center of screen is 0.5. 
          // We invert X because webcam is mirrored usually, but let's assume standard webcam.
          const dx = (nose.x - 0.5) * 2; // -1 to 1
          const dy = (nose.y - 0.5) * 2; // -1 to 1
          
          // Smooth update
          setHeadTransform(prev => ({
            ...prev,
            x: prev.x * 0.8 + dx * 0.2,
            y: prev.y * 0.8 + dy * 0.2,
            z: 0,
            roll: 0,
            pitch: dy * 20,
            yaw: dx * 20
          }));
        }

        // 2. Detect Hands (Globe Control)
        const handResult = vision.detectHands(videoRef.current, now);
        if (handResult && handResult.landmarks.length > 0) {
          setIsHandActive(true);
          const hand = handResult.landmarks[0];
          const thumb = hand[4];
          const index = hand[8];
          
          // Calculate Pinch
          const dist = Math.hypot(thumb.x - index.x, thumb.y - index.y);
          const isPinching = dist < 0.05; // Threshold for pinch

          if (isPinching) {
            // Map hand position to rotation
            // x: 0..1 -> Rotation Y
            // y: 0..1 -> Rotation X
            setGlobeRotation(prev => ({
               x: prev.x * 0.9 + (hand[8].x * 2) * 0.1, // Smooth lerp
               y: prev.y * 0.9 + (hand[8].y * 2) * 0.1
            }));
          }
          
          // Two hands for scaling?
          if (handResult.landmarks.length > 1) {
             const hand2 = handResult.landmarks[1];
             const centroid1 = hand[9]; // Middle finger knuckle
             const centroid2 = hand2[9];
             const separation = Math.hypot(centroid1.x - centroid2.x, centroid1.y - centroid2.y);
             // Base separation ~0.2 -> scale 1.0, ~0.8 -> scale 3.0
             const newScale = Math.max(1, Math.min(4, separation * 5));
             setGlobeScale(prev => prev * 0.9 + newScale * 0.1);
          }

        } else {
          setIsHandActive(false);
        }
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  // HUD transforms based on head position (Parallax effect)
  const hudStyle = {
    transform: `translate(${-headTransform.x * 30}px, ${-headTransform.y * 30}px) rotateX(${headTransform.pitch * 0.1}deg) rotateY(${headTransform.yaw * 0.1}deg)`,
    transition: 'transform 0.1s linear'
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-mono">
      
      {/* 1. Webcam Background */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="absolute inset-0 w-full h-full object-cover opacity-60 scale-x-[-1]" // Mirrored
      />
      
      {/* 2. Vignette & Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_50%,_#000_100%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: 'linear-gradient(#06b6d4 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
      </div>
      <div className="scanline"></div>

      {/* 3. Main HUD Container */}
      <div 
        className="absolute inset-0 p-8 flex pointer-events-none"
        style={hudStyle}
      >
        {/* Left Column: Globe & Status */}
        <div className="w-1/3 h-full flex flex-col justify-center relative z-10">
           {/* Globe Container */}
           <div className="w-full aspect-square relative border border-cyan-500/30 bg-black/20 rounded-full backdrop-blur-sm overflow-hidden">
             {/* Decorative ring */}
             <div className="absolute inset-0 border-[4px] border-cyan-500/20 rounded-full border-dashed animate-[spin_10s_linear_infinite]"></div>
             <div className="absolute inset-0 flex items-center justify-center">
                <Globe rotation={globeRotation} scale={globeScale} active={isHandActive} />
             </div>
             {/* Interaction Hint */}
             <div className="absolute bottom-4 left-0 w-full text-center text-cyan-400 text-xs animate-pulse">
                {isHandActive ? "HAND TRACKING ENGAGED" : "RAISE HAND TO INTERACT"}
             </div>
           </div>
           
           {/* System Logs */}
           <div className="mt-4 p-4 border-l-4 border-cyan-500 bg-black/40 text-cyan-300 text-xs h-48 overflow-hidden">
              <p className="mb-1">> SYSTEM INITIALIZED</p>
              <p className="mb-1">> CAMERA FEED: CONNECTED</p>
              <p className="mb-1">> VISION ALGORITHM: {status}</p>
              <p className="mb-1">> HEAD TRACKING: {headTransform.x.toFixed(2)}, {headTransform.y.toFixed(2)}</p>
              <p className="mb-1">> SECURE CONNECTION ESTABLISHED</p>
              {isHandActive && <p className="mb-1 text-yellow-400">> GESTURE DETECTED: MANIPULATION</p>}
           </div>
        </div>

        {/* Center: Reticle */}
        <div className="w-1/3 h-full flex items-center justify-center relative">
           <div className="w-64 h-64 border border-cyan-500/30 rounded-full flex items-center justify-center relative opacity-50">
             <div className="w-48 h-48 border border-cyan-500/50 rounded-full"></div>
             <div className="absolute w-full h-[1px] bg-cyan-500/50"></div>
             <div className="absolute h-full w-[1px] bg-cyan-500/50"></div>
             <div className="absolute top-0 text-[10px] text-cyan-400 bg-black px-1">TRG-01</div>
           </div>
        </div>

        {/* Right Column: Metrics & Tracking Info - Offset Right */}
        <div className="w-1/3 h-full flex flex-col justify-between pl-12">
           <div className="text-right">
              <h1 className="text-4xl font-bold text-cyan-400 tracking-widest">J.A.R.V.I.S</h1>
              <p className="text-sm text-cyan-600">MK-X AUTOMATED UI</p>
              <div className="w-full h-1 bg-cyan-500 mt-2"></div>
           </div>

           {/* Dynamic Charts */}
           <div className="flex-grow flex flex-col justify-center py-8">
              <HUDMetrics />
           </div>

           {/* Bottom Right Status */}
           <div className="border-t border-cyan-500/50 pt-4 flex justify-end gap-4">
              <div className="text-center">
                <div className="text-2xl text-cyan-400 font-bold">{Math.round(globeScale * 100)}%</div>
                <div className="text-[10px] text-cyan-600">GLOBE SCALE</div>
              </div>
              <div className="text-center">
                <div className="text-2xl text-cyan-400 font-bold">
                   {Math.abs(Math.round(globeRotation.y * 180)).toString().padStart(3, '0')}°
                </div>
                <div className="text-[10px] text-cyan-600">ROTATION X</div>
              </div>
           </div>
        </div>
      </div>
      
      {/* Loading Overlay */}
      {status === SystemStatus.INITIALIZING && (
        <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
          <div className="text-cyan-500 font-mono text-xl animate-pulse">
            INITIALIZING NEURAL NETWORKS...
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
