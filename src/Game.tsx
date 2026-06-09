import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createCarMesh, createRoadSegment, createTrafficVehicle, createPoliceCar } from './models';
import { PHYSICS_CONFIG, TRAFFIC_CONFIG, INITIAL_CARS } from './config/gameConfig';
import { HighwayFreeRoamSystem, createFreeRoamSystem } from './systems/HighwayFreeRoamSystem';
import { PlayerCar } from './entities/PlayerCar';
import { InputSystem, InputAxis } from './engine/systems/InputSystem';


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
  const playerCarRef = useRef<PlayerCar | null>(null);
  const inputSystemRef = useRef<InputSystem | null>(null);
  const freeRoamSystemRef = useRef<HighwayFreeRoamSystem | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cleanup previous instance if it exists
    if (rendererRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
      containerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }

    // Create scene with night-time atmosphere for Tokyo Xtreme Racer style
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting - Night time with street lights feel
    const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x6688cc, 0.3);
    moonLight.position.set(-20, 30, -20);
    moonLight.castShadow = true;
    scene.add(moonLight);

    // Initialize Input System
    const inputSystem = new InputSystem();
    inputSystemRef.current = inputSystem;

    // Create player car with stats from selected car
    const playerCarMesh = createCarMesh(carColor);
    scene.add(playerCarMesh);
    
    // Get car stats based on color (simplified - in production would pass car index)
    const selectedCarIndex = INITIAL_CARS.findIndex(car => car.color.toLowerCase() === carColor.toLowerCase());
    const carStats = selectedCarIndex >= 0 ? INITIAL_CARS[selectedCarIndex] : INITIAL_CARS[0];
    
    const playerCar = new PlayerCar(playerCarMesh, {
      speed: carStats.speed,
      handling: carStats.handling,
      acceleration: carStats.acceleration * 1000, // Scale to match physics config
      grip: carStats.grip,
    });
    playerCarRef.current = playerCar;

    // Initialize Highway Free Roam System
    const freeRoamSystem = createFreeRoamSystem(scene, {
      enableTraffic: true,
      enableRivals: false, // Start without rivals for simpler gameplay
      enableFlashChallenge: true,
      enableZones: true,
      maxTrafficVehicles: 40,
      maxActiveRivals: 0,
      timeOfDay: 20, // Night time
      weather: 'clear',
    });
    freeRoamSystemRef.current = freeRoamSystem;

    // Game Loop
    let lastTime = performance.now();
    
    const updatePlayerMovement = (dt: number) => {
      const state = gameStateRef.current;
      const input = inputSystem.getAxis();
      
      // Update player car physics
      playerCar.update(input, dt);
      
      // Sync game state
      const pos = playerCar.getPosition();
      state.playerX = pos.x;
      state.playerY = pos.y;
      state.playerZ = pos.z;
      state.playerSpeed = playerCar.getSpeed();
    };

    const updateUI = (now: number, dt: number) => {
      if (Math.floor(now / 100) > Math.floor((now - dt * 1000) / 100)) {
        setCurrentScore(Math.floor(-gameStateRef.current.playerZ / 10));
        setCurrentSpeed(Math.floor(gameStateRef.current.playerSpeed * 150));
      }
    };

    const updateCamera = () => {
      const state = gameStateRef.current;
      camera.position.set(state.playerX * 0.3 + state.playerX, 6, state.playerZ + 15);
      camera.lookAt(state.playerX, 1, state.playerZ - 15);
    };

    const animate = (now: number) => {
      if (gameStateRef.current.isGameOver) return;
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      // Update input system
      inputSystem.update(dt);

      // Update player
      updatePlayerMovement(dt);

      // Update free roam system (highway, traffic, zones)
      if (freeRoamSystemRef.current && playerCarRef.current) {
        const playerPos = playerCar.getPosition();
        const playerSpeed = playerCar.getSpeed();
        
        freeRoamSystemRef.current.update(dt, playerPos, playerSpeed);
        
        // Check for collisions with traffic
        const collision = freeRoamSystemRef.current.checkPlayerCollision({
          min: new THREE.Vector3(playerPos.x - 1, 0, playerPos.z - 2),
          max: new THREE.Vector3(playerPos.x + 1, 1.5, playerPos.z + 2),
        });
        
        if (collision) {
          gameStateRef.current.isGameOver = true;
          onGameOver(Math.floor(-playerPos.z / 10), 0);
          return;
        }
      }

      updateUI(now, dt);
      updateCamera();

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
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      
      // Cleanup systems
      if (inputSystemRef.current) {
        inputSystemRef.current.dispose();
      }
      if (freeRoamSystemRef.current) {
        freeRoamSystemRef.current.dispose();
      }
      
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
  }, [carColor, onGameOver]);

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
