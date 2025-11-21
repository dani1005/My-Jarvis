import React, { useEffect, useState } from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer, AreaChart, Area } from 'recharts';

export const HUDMetrics: React.FC = () => {
  const [data, setData] = useState<{ time: number; val1: number; val2: number }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const next = [...prev, {
          time: Date.now(),
          val1: Math.random() * 100,
          val2: Math.random() * 50 + 20
        }];
        if (next.length > 20) next.shift();
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div className="h-24 w-full border-l-2 border-cyan-500/50 bg-black/20 backdrop-blur-sm p-2">
        <h3 className="text-cyan-400 text-xs font-mono mb-1">CORE FREQUENCY</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="val1" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
            <YAxis domain={[0, 100]} hide />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="h-24 w-full border-r-2 border-cyan-500/50 bg-black/20 backdrop-blur-sm p-2">
        <h3 className="text-cyan-400 text-xs font-mono mb-1">ENERGY OUTPUT</h3>
         <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVal2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="step" dataKey="val2" stroke="#22d3ee" fillOpacity={1} fill="url(#colorVal2)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
