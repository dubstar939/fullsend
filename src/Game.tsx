import React, { useEffect, useRef, useState } from 'react';
import { Engine, EnvironmentSystem } from './engine';
import { CarManager } from './systems/EnhancedCarSystem';
import { CAR_DEFINITIONS } from './types/CarDefinitions';
import { HighwayTrack, RoadMeshBuilder } from './systems/TrackSystem';
import { HighwayFreeRoamSystem, FreeRoamEvents } from './systems/HighwayFreeRoamSystem';
import { PolishEffectsSystem, EffectType } from './systems/PolishEffectsSystem';
import * as THREE from 'three';

interface GameProps {
  onGameOver: (score: number, coins: number) => void;
  carColor: string;
  selectedCarIndex?: number;
}

const Game: React.FC<GameProps> = ({ onGameOver, carColor, selectedCarIndex = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const carManagerRef = useRef<CarManager | null>(null);
  const environmentRef = useRef<EnvironmentSystem | null>(null);
  const trackRef = useRef<HighwayTrack | null>(null);
  const roadBuilderRef = useRef<RoadMeshBuilder | null>(null);
  const freeRoamRef = useRef<HighwayFreeRoamSystem | null>(null);
  const polishEffectsRef = useRef<PolishEffectsSystem | null>(null);
  
  const [currentScore, setCurrentScore] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speedLevel, setSpeedLevel] = useState(1);
  
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create engine instance with canvas
    const engine = new Engine(canvasRef.current);
    engineRef.current = engine;
    
    // Initialize environment system for enhanced visuals
    const envSystem = new EnvironmentSystem(engine.scene, engine.sceneGraph);
    envSystem.setup({
      skyColor: 0xff8c42,
      fogColor: 0xffaa66,
      fogNear: 30,
      fogFar: 250,
      ambientLightIntensity: 0.55,
      directionalLightIntensity: 0.85,
      hemisphereSkyColor: 0xff8c42,
      hemisphereGroundColor: 0x3d2817,
    });
    environmentRef.current = envSystem;
    
    // Initialize polish effects system
    const polishEffects = new PolishEffectsSystem(engine.scene, engine.sceneGraph);
    polishEffectsRef.current = polishEffects;
    
    // Initialize track system
    trackRef.current = new HighwayTrack();
    roadBuilderRef.current = new RoadMeshBuilder();
    
    // Build initial road segments
    const track = trackRef.current;
    const roadBuilder = roadBuilderRef.current;
    track.segments.forEach(segment => {
      const roadGroup = roadBuilder.buildSegmentMesh(segment);
      engine.addObject(roadGroup, `road_${segment.startZ}`);
    });

    // Initialize car manager and create player car
    const carManager = new CarManager();
    carManagerRef.current = carManager;
    
    // Get car definition based on selected index
    const carDefinition = CAR_DEFINITIONS[selectedCarIndex % CAR_DEFINITIONS.length];
    const carMesh = carManager.createCar(carDefinition, {
      primaryColor: carColor,
      secondaryColor: '#1a1a2e',
      accentColor: '#ff3333',
      wheelStyle: 'sport',
      hasSpoiler: carDefinition.baseStats.topSpeed > 150,
      hasWideBody: carDefinition.baseStats.acceleration > 85,
      bodyShape: 'sedan',
    });
    
    engine.addObject(carMesh, 'playerCar');
    engine.setCameraTarget(carMesh);

    // Setup audio hooks for polish effects
    polishEffects.onAudioEvent('collision', () => {
      // Audio hook - can be connected to actual sound system
      console.log('Collision sound triggered');
    });
    polishEffects.onAudioEvent('coin', () => {
      console.log('Coin collection sound triggered');
    });

    // Initialize Highway Free Roam System for traffic and collision detection
    const freeRoamEvents: FreeRoamEvents = {
      onTrafficCollision: (vehicle) => {
        // Trigger collision effect
        if (polishEffectsRef.current) {
          polishEffectsRef.current.triggerEffect({
            type: 'collision',
            position: carMesh.position.clone(),
            intensity: 1.5,
          });
        }
        
        // Trigger game over on collision
        const finalScore = currentScore;
        const earnedCoins = Math.floor(finalScore / 10);
        onGameOver(finalScore, earnedCoins);
      },
    };
    
    const freeRoamSystem = new HighwayFreeRoamSystem(
      engine.scene,
      {
        trafficDensity: 0.7,
        playerSpeed: 0,
        timeOfDay: 18,
      },
      freeRoamEvents
    );
    freeRoamRef.current = freeRoamSystem;

    // Start the engine
    let gameTime = 0;
    let lastPlayerPos = new THREE.Vector3();
    let progressiveSpeedMultiplier = 1.0;
    
    engine.start((deltaTime) => {
      gameTime += deltaTime;
      
      // Get input from engine's input system
      const inputAxis = engine.inputSystem.getAxis();
      
      // Update car physics with smooth controls
      if (carManagerRef.current) {
        carManagerRef.current.update(deltaTime, inputAxis);
      }
      
      // Update player position for collision detection
      const playerPos = carMesh.position.clone();
      const playerSpeedVec = playerPos.clone().sub(lastPlayerPos).divideScalar(deltaTime || 0.016);
      lastPlayerPos.copy(playerPos);
      
      // Get current speed from car manager
      const carSpeed = carManagerRef.current?.getSpeed() ?? 0;
      setCurrentSpeed(carSpeed);
      
      // Progressive difficulty - speed increases over time
      progressiveSpeedMultiplier = 1.0 + Math.min(gameTime * 0.01, 0.5); // Max 50% increase
      
      // Update free roam system (traffic, collisions)
      if (freeRoamRef.current) {
        freeRoamRef.current.update(deltaTime, playerPos, carSpeed * progressiveSpeedMultiplier);
      }
      
      // Update polish effects
      if (polishEffectsRef.current) {
        polishEffectsRef.current.update(deltaTime, carSpeed);
      }
      
      // Update score based on distance and speed with progressive multiplier
      const speedBonus = Math.floor(carSpeed * 0.1 * progressiveSpeedMultiplier);
      setCurrentScore(prev => prev + Math.floor(deltaTime * (10 + speedBonus)));
      setDistance(prev => prev + Math.floor(carSpeed * deltaTime * 10));
      
      // Speed level feedback
      const newSpeedLevel = Math.floor(carSpeed * 10) + 1;
      if (newSpeedLevel !== speedLevel) {
        setSpeedLevel(newSpeedLevel);
        // Trigger speed effect at milestone speeds
        if (newSpeedLevel % 5 === 0 && polishEffectsRef.current) {
          polishEffectsRef.current.triggerEffect({
            type: 'speed',
            position: playerPos.clone(),
            intensity: 0.8,
          });
        }
      }
      
      // Extend track as needed
      if (track && track.shouldExtendTrack(-gameTime * 50, 200)) {
        const newSegment = track.addSegment();
        const roadGroup = roadBuilder!.buildSegmentMesh(newSegment);
        roadGroup.position.z = newSegment.startZ;
        engine.addObject(roadGroup, `road_${newSegment.startZ}`);
        track.advanceRegion();
      }
      
      // Cleanup old segments
      if (track) {
        track.cleanupOldSegments(-gameTime * 50, 50);
      }
      
      // Update shadow target with camera shake offset
      if (environmentRef.current && polishEffectsRef.current) {
        const shakeOffset = polishEffectsRef.current.getCameraOffset();
        const adjustedPos = carMesh.position.clone().add(shakeOffset);
        environmentRef.current.updateShadowTarget(adjustedPos);
      }
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
      freeRoamRef.current?.dispose();
      polishEffectsRef.current?.dispose();
      carManager.dispose();
      roadBuilder?.dispose();
      environmentRef.current?.dispose();
      engine.destroy();
      engineRef.current = null;
      carManagerRef.current = null;
      environmentRef.current = null;
      trackRef.current = null;
      roadBuilderRef.current = null;
      freeRoamRef.current = null;
      polishEffectsRef.current = null;
    };
  }, [carColor, selectedCarIndex]);

  // Update car color when changed (without recreating engine)
  useEffect(() => {
    if (carManagerRef.current) {
      carManagerRef.current.updateCarColor(carColor);
    }
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
          {currentScore.toLocaleString()}
        </div>
      </div>
      <div className="absolute top-8 right-8 text-white text-right pointer-events-none drop-shadow-md z-10">
        <div className="text-slate-400 text-sm font-bold uppercase tracking-widest">Speed</div>
        <div className="text-4xl font-black italic">
          {Math.floor(currentSpeed * 100)} <span className="text-xl">KM/H</span>
        </div>
      </div>
      
      {/* Distance counter */}
      <div className="absolute top-24 left-8 text-white pointer-events-none drop-shadow-md z-10">
        <div className="text-slate-400 text-sm font-bold uppercase tracking-widest">Distance</div>
        <div className="text-2xl font-black italic">
          {distance}m
        </div>
      </div>
      
      {/* Controls Help */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 text-white opacity-50 text-sm font-bold pointer-events-none">
        <div className="px-3 py-2 bg-black/50 rounded border border-white/20">W / UP: ACCEL</div>
        <div className="px-3 py-2 bg-black/50 rounded border border-white/20">A-D / LEFT-RIGHT: STEER</div>
        <div className="px-3 py-2 bg-black/50 rounded border border-white/20">S / DOWN: BRAKE</div>
        <div className="px-3 py-2 bg-black/50 rounded border border-white/20">ESC: QUIT</div>
      </div>
    </div>
  );
};

export default Game;
