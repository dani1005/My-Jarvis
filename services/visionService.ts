import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker,
  DrawingUtils
} from '@mediapipe/tasks-vision';

export class VisionService {
  private static instance: VisionService;
  private faceLandmarker: FaceLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private isInitializing = false;

  private constructor() {}

  public static getInstance(): VisionService {
    if (!VisionService.instance) {
      VisionService.instance = new VisionService();
    }
    return VisionService.instance;
  }

  public async initialize() {
    if (this.faceLandmarker && this.handLandmarker) return;
    if (this.isInitializing) return;

    this.isInitializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      // Initialize Face Landmarker
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });

      // Initialize Hand Landmarker
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });

      console.log("Vision models loaded successfully");
    } catch (error) {
      console.error("Failed to load vision models", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  public detectFace(video: HTMLVideoElement, startTimeMs: number) {
    if (!this.faceLandmarker) return null;
    return this.faceLandmarker.detectForVideo(video, startTimeMs);
  }

  public detectHands(video: HTMLVideoElement, startTimeMs: number) {
    if (!this.handLandmarker) return null;
    return this.handLandmarker.detectForVideo(video, startTimeMs);
  }
}
