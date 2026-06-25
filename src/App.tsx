import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Car, Trophy, Coins, ArrowLeft, Home, RotateCcw as Replay, Zap, TrendingUp, Clock, Award, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import Game from './Game';
import { INITIAL_CARS, STORAGE_KEYS, CarStats } from './config/gameConfig';
import startMenuBg from "./art/fullsendstartmenu.png";
import { WebGpuGameRenderer } from './engine/rendering/WebGpuGameAdapter';

type Screen = 'MENU' | 'GARAGE' | 'PLAYING' | 'GAMEOVER' | 'LOADING';

interface GameState {
  coins: number;
  highScore: number;
  cars: CarStats[];
  selectedCarIndex: number;
  lastScore: number;
  lastCoins: number;
  totalRaces: number;
  bestTime: number;
}

interface SessionStats {
  overtakes: number;
  distance: number;
  nearMisses: number;
  topSpeed: number;
}

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('LOADING');
  const [gameState, setGameState] = useState<GameState>(() => ({
    coins: loadFromStorage(STORAGE_KEYS.COINS, 0),
    highScore: loadFromStorage(STORAGE_KEYS.HIGH_SCORE, 0),
    cars: loadFromStorage(STORAGE_KEYS.CARS, INITIAL_CARS),
    selectedCarIndex: 0,
    lastScore: 0,
    lastCoins: 0,
    totalRaces: loadFromStorage('nohesi_total_races', 0),
    bestTime: loadFromStorage('nohesi_best_time', 0),
  }));
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    overtakes: 0,
    distance: 0,
    nearMisses: 0,
    topSpeed: 0,
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COINS, gameState.coins.toString());
    localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, gameState.highScore.toString());
    localStorage.setItem(STORAGE_KEYS.CARS, JSON.stringify(gameState.cars));
    localStorage.setItem('nohesi_total_races', gameState.totalRaces.toString());
  }, [gameState.coins, gameState.highScore, gameState.cars, gameState.totalRaces]);

  const handleGameOver = useCallback((score: number, earnedCoins: number) => {
    setSessionStats(prev => ({
      ...prev,
      topSpeed: Math.max(prev.topSpeed, Math.floor(score / 5)),
      distance: Math.floor(score / 10),
    }));
    
    setGameState(prev => {
      const newCoins = prev.coins + earnedCoins + Math.floor(score / 10);
      const newHighScore = Math.max(prev.highScore, score);
      const totalRaces = prev.totalRaces + 1;
      
      return {
        ...prev,
        lastScore: score,
        lastCoins: earnedCoins + Math.floor(score / 10),
        coins: newCoins,
        highScore: newHighScore,
        totalRaces,
      };
    });
    setScreen('GAMEOVER');
  }, []);

  const buyCar = (index: number) => {
    const car = gameState.cars[index];
    if (car.unlocked || gameState.coins < car.price) return;

    setGameState(prev => ({
      ...prev,
      cars: prev.cars.map((c, i) => 
        i === index ? { ...c, unlocked: true } : c
      ),
      coins: prev.coins - car.price,
    }));
  };

  const selectCar = (index: number) => {
    if (gameState.cars[index].unlocked) {
      setGameState(prev => ({ ...prev, selectedCarIndex: index }));
    }
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden font-sans select-none">
      {screen === 'LOADING' && (
        <LoadingScreen onLoadComplete={() => setScreen('MENU')} />
      )}
      {screen === 'MENU' && (
        <Menu 
          coins={gameState.coins} 
          highScore={gameState.highScore}
          onStart={() => setScreen('PLAYING')}
          onGarage={() => setScreen('GARAGE')}
        />
      )}
      {screen === 'GARAGE' && (
        <Garage 
          coins={gameState.coins}
          cars={gameState.cars}
          selectedCarIndex={gameState.selectedCarIndex}
          onSelectCar={selectCar}
          onBuyCar={buyCar}
          onBack={() => setScreen('MENU')}
        />
      )}
      {screen === 'PLAYING' && (
        <div className="relative w-full h-full">
          <Game 
            key={`game-${gameState.selectedCarIndex}`} // Force remount on car change to apply new stats/model
            onGameOver={handleGameOver} 
            carColor={gameState.cars[gameState.selectedCarIndex].color}
            selectedCarIndex={gameState.selectedCarIndex}
          />
        </div>
      )}
      {screen === 'GAMEOVER' && (
        <GameOver 
          score={gameState.lastScore}
          coinsEarned={gameState.lastCoins}
          highScore={gameState.highScore}
          totalRaces={gameState.totalRaces}
          sessionStats={sessionStats}
          onRetry={() => setScreen('PLAYING')}
          onMenu={() => setScreen('MENU')}
          onGarage={() => setScreen('GARAGE')}
        />
      )}
    </div>
  );
};

interface MenuProps {
  coins: number;
  highScore: number;
  onStart: () => void;
  onGarage: () => void;
}

const Menu: React.FC<MenuProps> = ({ coins, highScore, onStart, onGarage }) => {
  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center text-white"
      style={{
        backgroundImage: `url(${startMenuBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 pointer-events-none" />
      
      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Title with glow effect */}
        <div className="mb-12 animate-pulse">
          <h1 className="text-7xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
            FULL SEND
          </h1>
          <h2 className="text-4xl md:text-5xl font-black italic tracking-widest text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] mt-2">
            HIGHWAY BATTLE
          </h2>
        </div>

        {/* Main menu buttons */}
        <div className="flex flex-col gap-4 mb-10">
          <button
            onClick={onStart}
            className="group relative px-12 py-5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-2xl rounded-xl shadow-[0_8px_32px_rgba(234,179,8,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_48px_rgba(234,179,8,0.6)] active:scale-95 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-3">
              <Play className="w-7 h-7 fill-current" /> START RACE
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>

          <button
            onClick={onGarage}
            className="group relative px-12 py-5 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-black text-2xl rounded-xl shadow-[0_8px_32px_rgba(100,116,139,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_48px_rgba(100,116,139,0.6)] active:scale-95 overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-3">
              <Car className="w-7 h-7" /> GARAGE
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </button>
        </div>

        {/* Stats display */}
        <div className="flex gap-6 text-lg md:text-xl">
          <div className="flex items-center gap-2 px-6 py-3 bg-black/40 backdrop-blur-sm rounded-xl border border-yellow-400/30">
            <Coins className="w-6 h-6 text-yellow-400" />
            <span className="font-bold text-yellow-400">{coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 px-6 py-3 bg-black/40 backdrop-blur-sm rounded-xl border border-blue-400/30">
            <Trophy className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-blue-400">{highScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/50 text-sm font-bold uppercase tracking-widest">
        <Sparkles className="w-4 h-4" />
        <span>Press START to begin your journey</span>
        <Sparkles className="w-4 h-4" />
      </div>
    </div>
  );
};

interface GarageProps {
  coins: number;
  cars: CarStats[];
  selectedCarIndex: number;
  onSelectCar: (index: number) => void;
  onBuyCar: (index: number) => void;
  onBack: () => void;
}

const Garage: React.FC<GarageProps> = ({ coins, cars, selectedCarIndex, onSelectCar, onBuyCar, onBack }) => {
  const [viewingIndex, setViewingIndex] = useState(selectedCarIndex);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGpuGameRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    setViewingIndex(selectedCarIndex);
  }, [selectedCarIndex]);

  // Initialize 3D preview when entering garage
  useEffect(() => {
    if (!canvasRef.current) return;

    const initPreview = async () => {
      try {
        const renderer = new WebGpuGameRenderer(canvasRef.current);
        await renderer.initialize();
        rendererRef.current = renderer;
        
        // Load current car model
        const currentCar = cars[viewingIndex];
        if (currentCar.unlocked) {
          renderer.createPlayerCar(currentCar.color);
        }
        
        // Start render loop
        const animate = () => {
          if (rendererRef.current) {
            rendererRef.current.renderFrame(0.016);
            animationFrameRef.current = requestAnimationFrame(animate);
          }
        };
        animate();
      } catch (error) {
        console.error('Failed to initialize garage preview:', error);
      }
    };

    initPreview();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  // Update car model when viewingIndex changes
  useEffect(() => {
    if (!rendererRef.current) return;
    
    const currentCar = cars[viewingIndex];
    if (currentCar.unlocked && rendererRef.current) {
      // Clear previous car and create new one
      rendererRef.current.dispose();
      rendererRef.current.createPlayerCar(currentCar.color);
    }
  }, [viewingIndex, cars]);

  const currentCar = cars[viewingIndex];
  const prevCar = () => {
    let newIndex = viewingIndex - 1;
    if (newIndex < 0) newIndex = cars.length - 1;
    setViewingIndex(newIndex);
    if (cars[newIndex].unlocked) onSelectCar(newIndex);
  };
  const nextCar = () => {
    let newIndex = viewingIndex + 1;
    if (newIndex >= cars.length) newIndex = 0;
    setViewingIndex(newIndex);
    if (cars[newIndex].unlocked) onSelectCar(newIndex);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <button 
          onClick={onBack} 
          className="group flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-all"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold">BACK</span>
        </button>
        <h2 className="text-4xl font-black italic tracking-widest text-yellow-400 drop-shadow-lg">GARAGE</h2>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-lg border border-yellow-400/30">
          <Coins className="w-6 h-6 text-yellow-400" />
          <span className="font-bold text-yellow-400 text-lg">{coins.toLocaleString()}</span>
        </div>
      </div>

      {/* Main garage view */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Car display area */}
        <div className="relative w-full max-w-4xl mb-8">
          {/* Navigation arrows */}
          <button
            onClick={prevCar}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-4 bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-600 transition-all hover:scale-110"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={nextCar}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-4 bg-slate-800/80 hover:bg-slate-700 rounded-full border border-slate-600 transition-all hover:scale-110"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Car preview card */}
          <div className={`mx-16 p-8 rounded-3xl border-4 transition-all duration-300 ${
            currentCar.unlocked 
              ? 'border-yellow-400 bg-slate-800/80 shadow-[0_0_60px_rgba(234,179,8,0.2)]' 
              : 'border-slate-600 bg-slate-800/50'
          }`}>
            {/* 3D Car Preview Canvas */}
            {currentCar.unlocked && (
              <canvas
                ref={canvasRef}
                className="w-full h-64 rounded-xl mb-6 bg-slate-900/50"
                style={{ display: 'block' }}
              />
            )}
            
            {/* Fallback color preview for locked cars or if canvas fails */}
            {!currentCar.unlocked && (
              <div 
                className="w-full h-48 rounded-2xl mb-6 shadow-inner relative overflow-hidden"
                style={{ 
                  backgroundColor: currentCar.color,
                  backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'
                }}
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/20" />
              </div>
            )}

            {/* Car info */}
            <div className="text-center mb-6">
              <h3 className="text-3xl font-black uppercase italic tracking-wide">
                {currentCar.name}
              </h3>
              <div className="inline-block mt-2 px-4 py-1 rounded-full bg-slate-700 text-sm font-bold">
                CLASS <span className={`ml-1 ${
                  currentCar.class === 'S' ? 'text-yellow-400' :
                  currentCar.class === 'A' ? 'text-red-400' :
                  currentCar.class === 'B' ? 'text-orange-400' :
                  currentCar.class === 'C' ? 'text-blue-400' :
                  'text-slate-400'
                }`}>{currentCar.class}</span>
              </div>
            </div>

            {/* Stats bars */}
            <div className="space-y-3 mb-6">
              <StatBar label="SPEED" value={currentCar.speed * 100} color="bg-blue-500" />
              <StatBar label="HANDLING" value={currentCar.handling * 100} color="bg-green-500" />
              <StatBar label="ACCEL" value={Math.min(currentCar.acceleration * 8000, 100)} color="bg-orange-500" />
              <StatBar label="GRIP" value={currentCar.grip * 100} color="bg-purple-500" />
            </div>

            {/* Action button */}
            {!currentCar.unlocked ? (
              <button 
                onClick={(e) => { e.stopPropagation(); onBuyCar(viewingIndex); }}
                disabled={coins < currentCar.price}
                className={`w-full py-4 rounded-xl font-black text-xl transition-all ${
                  coins >= currentCar.price
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black hover:scale-105 active:scale-95'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {coins >= currentCar.price ? `BUY $${currentCar.price}` : `NEED $${currentCar.price}`}
              </button>
            ) : (
              <div className={`w-full py-4 rounded-xl font-black text-xl text-center ${
                selectedCarIndex === viewingIndex
                  ? 'bg-green-500/20 text-green-400 border-2 border-green-400'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-black hover:scale-105 cursor-pointer'
              }`}
              onClick={() => selectedCarIndex !== viewingIndex && onSelectCar(viewingIndex)}
              >
                {selectedCarIndex === viewingIndex ? '✓ SELECTED' : 'SELECT CAR'}
              </div>
            )}
          </div>
        </div>

        {/* Car selector dots */}
        <div className="flex gap-2 mt-4">
          {cars.map((car, index) => (
            <button
              key={index}
              onClick={() => {
                setViewingIndex(index);
                if (car.unlocked) onSelectCar(index);
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                viewingIndex === index 
                  ? 'bg-yellow-400 scale-125' 
                  : car.unlocked 
                    ? 'bg-slate-500 hover:bg-slate-400' 
                    : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper component for stat bars
const StatBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-3">
    <span className="w-20 text-xs font-bold text-slate-400 tracking-wider">{label}</span>
    <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
      <div 
        className={`h-full ${color} rounded-full transition-all duration-500`} 
        style={{ width: `${Math.min(value, 100)}%` }} 
      />
    </div>
    <span className="w-10 text-right text-xs font-bold text-slate-300">{Math.round(value)}%</span>
  </div>
);

interface GameOverProps {
  score: number;
  coinsEarned: number;
  highScore: number;
  totalRaces: number;
  sessionStats: SessionStats;
  onRetry: () => void;
  onMenu: () => void;
  onGarage: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ 
  score, 
  coinsEarned, 
  highScore, 
  totalRaces,
  sessionStats,
  onRetry, 
  onMenu,
  onGarage 
}) => {
  const isNewHighScore = score >= highScore && score > 0;

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-slate-900 via-red-950/30 to-slate-900 text-white relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto p-8">
        {/* Crash notification */}
        <div className="mb-8 text-center">
          <h1 className="text-7xl md:text-8xl font-black text-red-500 italic drop-shadow-[0_4px_16px_rgba(239,68,68,0.6)] animate-pulse">
            CRASHED!
          </h1>
          {isNewHighScore && (
            <div className="mt-4 inline-flex items-center gap-2 px-6 py-2 bg-yellow-500/20 border border-yellow-400 rounded-full animate-bounce">
              <Award className="w-6 h-6 text-yellow-400" />
              <span className="font-bold text-yellow-400 tracking-wider">NEW HIGH SCORE!</span>
            </div>
          )}
        </div>

        {/* Main score card */}
        <div className="w-full bg-slate-800/80 backdrop-blur-sm rounded-3xl border border-slate-700 p-8 mb-6 shadow-2xl">
          {/* Primary stats */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="text-center p-4 bg-slate-900/50 rounded-2xl">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Final Score</p>
              <p className="text-5xl font-black text-yellow-400">{score.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-2xl">
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Coins Earned</p>
              <div className="flex items-center justify-center gap-2">
                <Coins className="w-8 h-8 text-yellow-400" />
                <p className="text-5xl font-black text-yellow-400">+{coinsEarned.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Session stats */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Session Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <StatCard 
                icon={<TrendingUp className="w-5 h-5" />} 
                label="Distance" 
                value={`${sessionStats.distance}m`} 
                color="text-blue-400"
              />
              <StatCard 
                icon={<Zap className="w-5 h-5" />} 
                label="Top Speed" 
                value={`${sessionStats.topSpeed} km/h`} 
                color="text-orange-400"
              />
              <StatCard 
                icon={<Clock className="w-5 h-5" />} 
                label="Total Races" 
                value={totalRaces.toString()} 
                color="text-purple-400"
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <button 
            onClick={onRetry}
            className="group flex items-center gap-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black py-4 px-8 rounded-xl text-xl transition-all hover:scale-105 active:scale-95 shadow-[0_8px_32px_rgba(234,179,8,0.4)]"
          >
            <Replay className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" /> 
            RETRY
          </button>
          <button 
            onClick={onGarage}
            className="group flex items-center gap-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 font-black py-4 px-8 rounded-xl text-xl transition-all hover:scale-105 active:scale-95"
          >
            <Car className="w-6 h-6" /> 
            GARAGE
          </button>
          <button 
            onClick={onMenu}
            className="group flex items-center gap-3 bg-slate-800 hover:bg-slate-700 font-bold py-4 px-8 rounded-xl text-xl transition-all hover:scale-105 active:scale-95 border border-slate-600"
          >
            <Home className="w-6 h-6" /> 
            MENU
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper component for stat cards
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ 
  icon, label, value, color 
}) => (
  <div className="text-center p-3 bg-slate-900/30 rounded-xl">
    <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
    <p className="text-xs text-slate-500 font-bold uppercase">{label}</p>
    <p className={`text-lg font-black ${color}`}>{value}</p>
  </div>
);

interface LoadingScreenProps {
  onLoadComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onLoadComplete }) => {
  useEffect(() => {
    // Simulate loading time, then transition to menu
    const timer = setTimeout(() => {
      onLoadComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onLoadComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black">
      <img 
        src="https://drive.google.com/thumbnail?id=1LfUhUF1JFq_1jm71N3hRHWPZIVubFgcF&sz=w1920"
        alt="FULL SEND HIGHWAY BATTLE"
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center">
        <div className="text-4xl font-black italic tracking-wider mb-4 animate-pulse">LOADING...</div>
        <div className="flex gap-2 justify-center">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default App;
