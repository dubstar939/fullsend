import React, { useState, useEffect } from 'react';
import { Play, Car, Trophy, Coins, ArrowLeft, Home, RotateCcw as Replay } from 'lucide-react';
import Game from './Game';
import { INITIAL_CARS, CarStats } from './constants';

type Screen = 'MENU' | 'GARAGE' | 'PLAYING' | 'GAMEOVER';

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('MENU');
  const [coins, setCoins] = useState<number>(() => {
    const saved = localStorage.getItem('traffic_jam_coins');
    return saved ? parseInt(saved) : 0;
  });
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('traffic_jam_highscore');
    return saved ? parseInt(saved) : 0;
  });
  const [cars, setCars] = useState<CarStats[]>(() => {
    const saved = localStorage.getItem('traffic_jam_cars');
    return saved ? JSON.parse(saved) : INITIAL_CARS;
  });
  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(0);
  const [lastScore, setLastScore] = useState<number>(0);
  const [gameMode] = useState<string>('Infinite');

  useEffect(() => {
    localStorage.setItem('traffic_jam_coins', coins.toString());
    localStorage.setItem('traffic_jam_highscore', highScore.toString());
    localStorage.setItem('traffic_jam_cars', JSON.stringify(cars));
  }, [coins, highScore, cars]);

  const handleGameOver = (score: number, earnedCoins: number) => {
    setLastScore(score);
    setCoins(prev => prev + earnedCoins + Math.floor(score / 10));
    if (score > highScore) setHighScore(score);
    setScreen('GAMEOVER');
  };

  const buyCar = (index: number) => {
    const car = cars[index];
    if (coins >= car.price) {
      const newCars = [...cars];
      newCars[index].unlocked = true;
      setCars(newCars);
      setCoins(prev => prev - car.price);
    }
  };

  const Menu = () => (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white space-y-8 p-4">
      <h1 className="text-6xl font-black italic tracking-tighter text-yellow-400 drop-shadow-xl">
        TRAFFIC JAM 3D
      </h1>
      
      <div className="grid grid-cols-1 gap-4 w-64">
        <button 
          onClick={() => setScreen('PLAYING')}
          className="flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-xl text-xl transition-all hover:scale-105 active:scale-95 shadow-lg"
        >
          <Play fill="black" /> START GAME
        </button>
        <button 
          onClick={() => setScreen('GARAGE')}
          className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 font-bold py-4 rounded-xl text-xl transition-all"
        >
          <Car /> GARAGE
        </button>
      </div>

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

  const Garage = () => (
    <div className="flex flex-col items-center h-full bg-slate-900 text-white p-8 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-12">
          <button onClick={() => setScreen('MENU')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
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
              onClick={() => car.unlocked && setSelectedCarIndex(index)}
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
                    onClick={(e) => { e.stopPropagation(); buyCar(index); }}
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

  const GameOver = () => (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900/90 backdrop-blur-md text-white space-y-8 p-4">
      <h1 className="text-6xl font-black text-red-500 italic drop-shadow-lg">CRASHED!</h1>
      <div className="text-center space-y-2">
        <p className="text-2xl text-slate-400 uppercase tracking-widest font-bold">Score</p>
        <p className="text-6xl font-black text-yellow-400">{lastScore}</p>
      </div>
      
      <div className="flex gap-4">
        <button 
          onClick={() => setScreen('PLAYING')}
          className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-xl text-xl transition-all hover:scale-105 active:scale-95"
        >
          <Replay /> RETRY
        </button>
        <button 
          onClick={() => setScreen('MENU')}
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 font-bold py-4 px-8 rounded-xl text-xl transition-all"
        >
          <Home /> MENU
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-black overflow-hidden font-sans select-none">
      {screen === 'MENU' && <Menu />}
      {screen === 'GARAGE' && <Garage />}
      {screen === 'PLAYING' && (
        <div className="relative w-full h-full">
          <Game 
            onGameOver={handleGameOver} 
            carColor={cars[selectedCarIndex].color}
            gameMode={gameMode}
          />
        </div>
      )}
      {screen === 'GAMEOVER' && <GameOver />}
    </div>
  );
};

export default App;
