import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createCarBody, createRoadSegment } from './models';
import { GAME_CONFIG } from './constants';

interface GameProps {
  onGameOver: (score: number, coins: number) => void;
  carColor: string;
  gameMode: string;
}

const Game: React.FC<GameProps> = ({ onGameOver, carColor, gameMode }) => {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef({
    playerSpeed: 0,
    playerX: 0,
    playerZ: 0,
    score: 0,
    coins: 0,
    distance: 0,
    isGameOver: false,
    input: { left: false, right: false, up: false, down: false },
    traffic: [] as { mesh: THREE.Group, speed: number, lane: number }[],
    roadSegments: [] as THREE.Group[],
    time: 0,
    timeLeft: 60,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 20, 100);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Player
    const playerCar = createCarBody(carColor);
    scene.add(playerCar);

    // Road Initialization
    for (let i = 0; i < 5; i++) {
      const road = createRoadSegment();
      road.position.z = -i * 100;
      scene.add(road);
      gameStateRef.current.roadSegments.push(road);
    }

    // Input Handlers
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') gameStateRef.current.input.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') gameStateRef.current.input.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w') gameStateRef.current.input.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') gameStateRef.current.input.down = true;
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') gameStateRef.current.input.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') gameStateRef.current.input.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w') gameStateRef.current.input.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') gameStateRef.current.input.down = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Game Loop
    let lastTime = performance.now();
    const spawnTraffic = () => {
      const lane = Math.floor(Math.random() * 4) - 1.5;
      const trafficCar = createCarBody(Math.random() > 0.5 ? '#999999' : '#ffffff');
      trafficCar.position.set(lane * 4, 0, gameStateRef.current.playerZ - 100);
      scene.add(trafficCar);
      gameStateRef.current.traffic.push({
        mesh: trafficCar,
        speed: 0.2 + Math.random() * 0.3,
        lane: lane
      });
    };

    const animate = (now: number) => {
      if (gameStateRef.current.isGameOver) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const state = gameStateRef.current;
      
      // Player Movement
      if (state.input.up) state.playerSpeed = Math.min(state.playerSpeed + GAME_CONFIG.ACCELERATION, GAME_CONFIG.MAX_SPEED);
      else if (state.input.down) state.playerSpeed = Math.max(state.playerSpeed - GAME_CONFIG.BRAKE_FORCE, 0);
      else state.playerSpeed = Math.max(state.playerSpeed - 0.002, 0);

      if (state.input.left) state.playerX = Math.max(state.playerX - 0.15, -6);
      if (state.input.right) state.playerX = Math.min(state.playerX + 0.15, 6);

      state.playerZ -= state.playerSpeed * 60 * dt;
      playerCar.position.set(state.playerX, 0, state.playerZ);

      // UI update (throttled)
      if (Math.floor(now / 100) > Math.floor((now - dt * 1000) / 100)) {
        setCurrentScore(Math.floor(-state.playerZ / 10));
        setCurrentSpeed(Math.floor(state.playerSpeed * 150));
      }

      // Camera Follow
      camera.position.set(state.playerX, 5, state.playerZ + 12);
      camera.lookAt(state.playerX, 2, state.playerZ - 10);

      // Road Management
      state.roadSegments.forEach(road => {
        if (road.position.z > state.playerZ + 100) {
          road.position.z -= 500;
        }
      });

      // Traffic Management
      if (Math.random() < 0.02) spawnTraffic();

      state.traffic.forEach((car, index) => {
        car.mesh.position.z -= car.speed * 60 * dt;

        // Collision Check
        const dist = playerCar.position.distanceTo(car.mesh.position);
        if (dist < 2.5) {
          state.isGameOver = true;
          onGameOver(Math.floor(-state.playerZ / 10), state.coins);
        }

        // Clean up
        if (car.mesh.position.z > state.playerZ + 50) {
          scene.remove(car.mesh);
          state.traffic.splice(index, 1);
          state.score += 10;
        }
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    const requestId = requestAnimationFrame(animate);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestId);
      renderer.dispose();
      if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, [carColor, gameMode]);

  return (
    <div ref={containerRef} className="w-full h-full">
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
