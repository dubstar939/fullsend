import React, { useEffect, useRef, useState } from 'react';
import { Engine } from './engine/core/Engine';

interface GameProps {
  onGameOver: (score: number, coins: number) => void;
  carColor: string;
}

const Game: React.FC<GameProps> = ({ onGameOver, carColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [currentScore, setCurrentScore] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create engine instance with canvas
    const engine = new Engine(canvasRef.current);
    engineRef.current = engine;

    // Start the engine
    engine.start((deltaTime) => {
      // Game update callback - update game state here
      // This is where you would update score, speed, etc.
      setCurrentScore(prev => prev + Math.floor(deltaTime * 10));
    });

    // Handle resize
    const handleResize = () => {
      if (canvasRef.current) {
        const width = canvasRef.current.clientWidth;
        const height = canvasRef.current.clientHeight;
        engine.resize(width, height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size setup

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, [carColor]);

  return (
    <div className="w-full h-full relative">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
        style={{ display: 'block' }}
      />
      {/* Game HUD */}
      <div className="absolute top-8 left-8 text-white pointer-events-none drop-shadow-md z-10">
        <div className="text-slate-400 text-sm font-bold uppercase tracking-widest">Score</div>
        <div className="text-4xl font-black italic">
          {currentScore}
        </div>
      </div>
      <div className="absolute top-8 right-8 text-white text-right pointer-events-none drop-shadow-md z-10">
        <div className="text-slate-400 text-sm font-bold uppercase tracking-widest">Speed</div>
        <div className="text-4xl font-black italic">
          {currentSpeed} <span className="text-xl">KM/H</span>
        </div>
      </div>
      
      {/* Controls Help */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 text-white opacity-50 text-sm font-bold pointer-events-none">
        <div className="px-3 py-2 bg-black/50 rounded border border-white/20">W / UP: ACCEL</div>
        <div className="px-3 py-2 bg-black/50 rounded border border-white/20">A-D / LEFT-RIGHT: STEER</div>
        <div className="px-3 py-2 bg-black/50 rounded border border-white/20">S / DOWN: BRAKE</div>
      </div>
    </div>
  );
};

export default Game;
