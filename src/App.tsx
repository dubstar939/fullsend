import React, { useState, useEffect } from 'react';
import { Play, Car, Trophy, Coins, ArrowLeft, Home, RotateCcw as Replay } from 'lucide-react';
import Game from './Game';
import { INITIAL_CARS, CarStats } from './constants';
import startMenuBg from "./art/fullsendstartmenu.png";
type Screen = 'MENU' | 'GARAGE' | 'PLAYING' | 'GAMEOVER' | 'LOADING';

interface GameState {
  coins: number;
  highScore: number;
  cars: CarStats[];
  selectedCarIndex: number;
  lastScore: number;
}

const STORAGE_KEYS = {
  COINS: 'traffic_jam_coins',
  HIGH_SCORE: 'traffic_jam_highscore',
  CARS: 'traffic_jam_cars',
} as const;

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('MENU');
  const [gameState, setGameState] = useState<GameState>(() => ({
    coins: loadFromStorage(STORAGE_KEYS.COINS, 0),
    highScore: loadFromStorage(STORAGE_KEYS.HIGH_SCORE, 0),
    cars: loadFromStorage(STORAGE_KEYS.CARS, INITIAL_CARS),
    selectedCarIndex: 0,
    lastScore: 0,
  }));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COINS, gameState.coins.toString());
    localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, gameState.highScore.toString());
    localStorage.setItem(STORAGE_KEYS.CARS, JSON.stringify(gameState.cars));
  }, [gameState.coins, gameState.highScore, gameState.cars]);

  const handleGameOver = (score: number, earnedCoins: number) => {
    setGameState(prev => {
      const newCoins = prev.coins + earnedCoins + Math.floor(score / 10);
      const newHighScore = Math.max(prev.highScore, score);
      
      // Only update if values actually changed to prevent unnecessary re-renders
      if (newCoins === prev.coins && newHighScore === prev.highScore) {
        return prev;
      }
      
      return {
        ...prev,
        lastScore: score,
        coins: newCoins,
        highScore: newHighScore,
      };
    });
    setScreen('GAMEOVER');
  };

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
            key={`game-${gameState.selectedCarIndex}`} // Force remount on car change to apply new color
            onGameOver={handleGameOver} 
            carColor={gameState.cars[gameState.selectedCarIndex].color}
          />
        </div>
      )}
      {screen === 'GAMEOVER' && (
        <GameOver 
          score={gameState.lastScore}
          onRetry={() => setScreen('PLAYING')}
          onMenu={() => setScreen('MENU')}
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

const Menu: React.FC<MenuProps> = ({ coins, highScore, onStart, onGarage }) => (
  <div
    style={{
      backgroundImage: `url(${startMenuBg})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      width: "100vw",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      color: "white",
    }}
  >
    <h1 className="text-6xl font-black italic tracking-tighter text-yellow-400 drop-shadow-xl mb-8">
      FULL SEND HIGHWAY BATTLE
    </h1>

    <button
      onClick={onStart}
      className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-2xl rounded-xl shadow-xl mb-4"
    >
      START RACE
    </button>

    <button
      onClick={onGarage}
      className="px-8 py-4 bg-white/80 hover:bg-white text-black font-bold text-2xl rounded-xl shadow-xl mb-8"
    >
      GARAGE
    </button>

    <div className="flex gap-8 text-xl">
      <div className="flex items-center gap-2 text-yellow-400">
        <Coins /> {coins}
      </div>
      <div className="flex items-center gap-2 text-blue-400">
        <Trophy /> {highScore}
      </div>
    </div>
  </div>
);

interface GarageProps {
  coins: number;
  cars: CarStats[];
  selectedCarIndex: number;
  onSelectCar: (index: number) => void;
  onBuyCar: (index: number) => void;
  onBack: () => void;
}

const Garage: React.FC<GarageProps> = ({ coins, cars, selectedCarIndex, onSelectCar, onBuyCar, onBack }) => (
  <div className="flex flex-col items-center h-full bg-slate-900 text-white p-8 overflow-y-auto">
    <div className="w-full max-w-2xl">
      <div className="flex justify-between items-center mb-12">
        <button onClick={onBack} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
          <ArrowLeft />
        </button>
        <h2 className="text-4xl font-bold">GARAGE</h2>
        <div className="flex items-center gap-2 text-yellow-400 text-xl">
          <Coins /> {coins}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cars.map((car, index) => (
          <div 
            key={index}
            onClick={() => onSelectCar(index)}
            className={`relative p-6 rounded-2xl border-4 transition-all cursor-pointer ${
              selectedCarIndex === index ? 'border-yellow-400 bg-slate-800' : 'border-transparent bg-slate-800/50 hover:bg-slate-800'
            } ${!car.unlocked && 'opacity-75'}`}
          >
            <div 
              className="w-full h-32 rounded-lg mb-4" 
              style={{ backgroundColor: car.color }}
            />
            <div className="flex justify-between items-end">
              <div>
                <h3 className="font-bold text-xl uppercase italic">Vehicle {index + 1}</h3>
                <div className="space-y-1 mt-2 text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-20">SPEED:</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${car.speed * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20">ACCEL:</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${car.acceleration * 5000}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              
              {!car.unlocked ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); onBuyCar(index); }}
                  className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 active:scale-95"
                >
                  ${car.price}
                </button>
              ) : (
                <div className="text-green-400 font-bold uppercase">Unlocked</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

interface GameOverProps {
  score: number;
  onRetry: () => void;
  onMenu: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ score, onRetry, onMenu }) => (
  <div className="flex flex-col items-center justify-center h-full bg-slate-900/90 backdrop-blur-md text-white space-y-8 p-4">
    <h1 className="text-6xl font-black text-red-500 italic drop-shadow-lg">CRASHED!</h1>
    <div className="text-center space-y-2">
      <p className="text-2xl text-slate-400 uppercase tracking-widest font-bold">Score</p>
      <p className="text-6xl font-black text-yellow-400">{score}</p>
    </div>
    
    <div className="flex gap-4">
      <button 
        onClick={onRetry}
        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-xl text-xl transition-all hover:scale-105 active:scale-95"
      >
        <Replay /> RETRY
      </button>
      <button 
        onClick={onMenu}
        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 font-bold py-4 px-8 rounded-xl text-xl transition-all"
      >
        <Home /> MENU
      </button>
    </div>
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
