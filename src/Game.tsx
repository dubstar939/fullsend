import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createCarMesh, createRoadSegment, createTrafficVehicle, createPoliceCar } from './models';
import { PHYSICS_CONFIG, TRAFFIC_CONFIG } from './config/gameConfig';
import { HighwayFreeRoamSystem, createFreeRoamSystem } from './systems/HighwayFreeRoamSystem';
import { PlayerCar } from './entities/PlayerCar';
import { InputHandler, InputAxis } from './engine/core/InputHandler';


interface GameProps {
  onGameOver: (score: number, coins: number) => void;
  carColor: string;
}

interface TrafficCar {
  mesh: THREE.Group;
  speed: number;
  lane: number;
}

interface GameState {
  playerSpeed: number;
  playerX: number;
  playerZ: number;
  score: number;
  coins: number;
  distance: number;
  isGameOver: boolean;
  input: InputState;
  traffic: TrafficCar[];
  roadSegments: THREE.Group[];
  time: number;
  timeLeft: number;
}

interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

const createInitialGameState = (): GameState => ({
  playerSpeed: 0,
  playerX: 0,
  playerZ: 0,
  score: 0,
  coins: 0,
  distance: 0,
  isGameOver: false,
  input: { left: false, right: false, up: false, down: false },
  traffic: [],
  roadSegments: [],
  time: 0,
  timeLeft: 60,
});

const Game: React.FC<GameProps> = ({ onGameOver, carColor }) => {
  const [currentScore, setCurrentScore] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameStateRef = useRef<GameState>(createInitialGameState());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerCarRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous instance if it exists
    if (rendererRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
      containerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 20, 100);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Player
    const playerCar = createCarMesh(carColor);
    scene.add(playerCar);
    playerCarRef.current = playerCar;

    // Road Initialization
    for (let i = 0; i < 5; i++) {
      const road = createRoadSegment();
      road.position.z = -i * 100;
      scene.add(road);
      gameStateRef.current.roadSegments.push(road);
    }

    // Input Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          gameStateRef.current.input.left = true;
          break;
        case 'ArrowRight':
        case 'd':
          gameStateRef.current.input.right = true;
          break;
        case 'ArrowUp':
        case 'w':
          gameStateRef.current.input.up = true;
          break;
        case 'ArrowDown':
        case 's':
          gameStateRef.current.input.down = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          gameStateRef.current.input.left = false;
          break;
        case 'ArrowRight':
        case 'd':
          gameStateRef.current.input.right = false;
          break;
        case 'ArrowUp':
        case 'w':
          gameStateRef.current.input.up = false;
          break;
        case 'ArrowDown':
        case 's':
          gameStateRef.current.input.down = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Game Loop
    let lastTime = performance.now();
    
    const spawnTraffic = () => {
      const lane = Math.floor(Math.random() * 4) - 1.5;
      const vehicleClasses = Object.keys(TRAFFIC_CONFIG.VEHICLE_CLASSES) as (keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES)[];
      const randomClass = vehicleClasses[Math.floor(Math.random() * vehicleClasses.length)];
      
      let trafficCar: THREE.Group;
      if (randomClass === 'POLICE') {
        trafficCar = createPoliceCar();
      } else {
        trafficCar = createTrafficVehicle(randomClass);
      }
      
      trafficCar.position.set(lane * 4, 0, gameStateRef.current.playerZ - 100);
      scene.add(trafficCar);
      gameStateRef.current.traffic.push({
        mesh: trafficCar,
        speed: 0.2 + Math.random() * 0.3,
        lane: lane
      });
    };

    const updatePlayerMovement = (dt: number) => {
      const state = gameStateRef.current;
      
      if (state.input.up) {
        state.playerSpeed = Math.min(state.playerSpeed + PHYSICS_CONFIG.ACCELERATION_BASE, PHYSICS_CONFIG.MAX_SPEED);
      } else if (state.input.down) {
        state.playerSpeed = Math.max(state.playerSpeed - PHYSICS_CONFIG.BRAKE_FORCE, 0);
      } else {
        state.playerSpeed = Math.max(state.playerSpeed - PHYSICS_CONFIG.DECELERATION_FRICTION, 0);
      }

      if (state.input.left) state.playerX = Math.max(state.playerX - 0.15, -6);
      if (state.input.right) state.playerX = Math.min(state.playerX + 0.15, 6);

      state.playerZ -= state.playerSpeed * 60 * dt;
      playerCar.position.set(state.playerX, 0, state.playerZ);
    };

    const updateUI = (now: number, dt: number) => {
      if (Math.floor(now / 100) > Math.floor((now - dt * 1000) / 100)) {
        setCurrentScore(Math.floor(-gameStateRef.current.playerZ / 10));
        setCurrentSpeed(Math.floor(gameStateRef.current.playerSpeed * 150));
      }
    };

    const updateCamera = () => {
      const state = gameStateRef.current;
      camera.position.set(state.playerX, 5, state.playerZ + 12);
      camera.lookAt(state.playerX, 2, state.playerZ - 10);
    };

    const updateRoadSegments = () => {
      gameStateRef.current.roadSegments.forEach(road => {
        if (road.position.z > gameStateRef.current.playerZ + 100) {
          road.position.z -= 500;
        }
      });
    };

    const checkCollision = (car: TrafficCar): boolean => {
      const dist = playerCar.position.distanceTo(car.mesh.position);
      return dist < 2.5;
    };

    const updateTraffic = (dt: number) => {
      const state = gameStateRef.current;
      
      if (Math.random() < 0.02) spawnTraffic();

      // Iterate backwards to safely splice while iterating
      for (let i = state.traffic.length - 1; i >= 0; i--) {
        const car = state.traffic[i];
        car.mesh.position.z -= car.speed * 60 * dt;

        if (checkCollision(car)) {
          state.isGameOver = true;
          onGameOver(Math.floor(-state.playerZ / 10), state.coins);
          return; // Exit early after collision
        }

        if (car.mesh.position.z > state.playerZ + 50) {
          scene.remove(car.mesh);
          state.traffic.splice(i, 1);
          state.score += 10;
        }
      }
    };

    const animate = (now: number) => {
      if (gameStateRef.current.isGameOver) return;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1); // Cap delta time to prevent physics explosions on lag spikes
      lastTimeRef.current = now;

      updatePlayerMovement(dt);
      updateUI(now, dt);
      updateCamera();
      updateRoadSegments();
      updateTraffic(dt);

      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      
      // Cleanup Three.js resources
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current && rendererRef.current.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
      }
      
      // Cleanup scene resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if ((object as THREE.Mesh).isMesh) {
            const mesh = object as THREE.Mesh;
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => m.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [carColor]);

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
