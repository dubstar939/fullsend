/**
 * Polish Effects System - Handles visual feedback, particles, screen shake, and effects
 * Enhances game feel without modifying core engine architecture
 */

import * as THREE from 'three';
import { SceneGraph } from '../engine/core/SceneGraph';

export interface ParticleConfig {
  color: number;
  size: number;
  lifetime: number;
  speed: number;
  spread: number;
  gravity: number;
  emissionRate: number;
}

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
  size: number;
  color: THREE.Color;
  alpha: number;
}

export interface ScreenShakeConfig {
  intensity: number;
  duration: number;
  frequency: number;
}

export type EffectType = 
  | 'speed' 
  | 'collision' 
  | 'coin' 
  | 'boost' 
  | 'brake' 
  | 'laneChange';

export interface EffectEvent {
  type: EffectType;
  position?: THREE.Vector3;
  intensity?: number;
}

export class PolishEffectsSystem {
  private scene: THREE.Scene;
  private sceneGraph: SceneGraph;
  
  // Particle systems
  private particleSystems: Map<string, {
    particles: Particle[];
    config: ParticleConfig;
    mesh: THREE.Points;
    geometry: THREE.BufferGeometry;
    material: THREE.PointsMaterial;
  }> = new Map();
  
  // Screen shake state
  private screenShakeActive: boolean = false;
  private screenShakeTime: number = 0;
  private screenShakeConfig: ScreenShakeConfig | null = null;
  private cameraOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  // Effect cooldowns
  private effectCooldowns: Map<string, number> = new Map();
  
  // Audio event hooks (to be connected to audio system)
  private audioCallbacks: Map<string, Array<(event: EffectEvent) => void>> = new Map();
  
  constructor(scene: THREE.Scene, sceneGraph: SceneGraph) {
    this.scene = scene;
    this.sceneGraph = sceneGraph;
    
    this.initializeParticleSystems();
    this.setupAudioHooks();
  }
  
  /**
   * Initialize predefined particle systems
   */
  private initializeParticleSystems(): void {
    // Speed lines particle system
    this.createParticleSystem('speed', {
      color: 0xffffff,
      size: 0.1,
      lifetime: 0.3,
      speed: 50,
      spread: 0.5,
      gravity: 0,
      emissionRate: 20,
    });
    
    // Collision spark particles
    this.createParticleSystem('collision', {
      color: 0xffaa00,
      size: 0.15,
      lifetime: 0.5,
      speed: 15,
      spread: 2.5,
      gravity: 20,
      emissionRate: 30,
    });
    
    // Coin collection particles
    this.createParticleSystem('coin', {
      color: 0xffd700,
      size: 0.2,
      lifetime: 0.8,
      speed: 8,
      spread: 1.5,
      gravity: -5,
      emissionRate: 15,
    });
    
    // Boost/nitrous particles
    this.createParticleSystem('boost', {
      color: 0x00ffff,
      size: 0.25,
      lifetime: 0.4,
      speed: 25,
      spread: 0.8,
      gravity: 0,
      emissionRate: 25,
    });
    
    // Brake dust particles
    this.createParticleSystem('brake', {
      color: 0x888888,
      size: 0.3,
      lifetime: 0.6,
      speed: 5,
      spread: 1.0,
      gravity: 5,
      emissionRate: 10,
    });
    
    // Lane change swipe effect
    this.createParticleSystem('laneChange', {
      color: 0x66ccff,
      size: 0.2,
      lifetime: 0.4,
      speed: 10,
      spread: 0.6,
      gravity: 0,
      emissionRate: 15,
    });
  }
  
  /**
   * Create a new particle system
   */
  private createParticleSystem(name: string, config: ParticleConfig): void {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      colors[i * 3] = new THREE.Color(config.color).r;
      colors[i * 3 + 1] = new THREE.Color(config.color).g;
      colors[i * 3 + 2] = new THREE.Color(config.color).b;
      
      sizes[i] = config.size;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: config.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    
    const mesh = new THREE.Points(geometry, material);
    mesh.visible = false;
    
    this.scene.add(mesh);
    
    this.particleSystems.set(name, {
      particles: [],
      config,
      mesh,
      geometry,
      material,
    });
  }
  
  /**
   * Setup audio event hooks
   */
  private setupAudioHooks(): void {
    const eventTypes: EffectType[] = ['speed', 'collision', 'coin', 'boost', 'brake', 'laneChange'];
    eventTypes.forEach(type => {
      this.audioCallbacks.set(type, []);
    });
  }
  
  /**
   * Register audio callback for effect type
   */
  public onAudioEvent(type: EffectType, callback: (event: EffectEvent) => void): void {
    const callbacks = this.audioCallbacks.get(type);
    if (callbacks) {
      callbacks.push(callback);
    }
  }
  
  /**
   * Trigger an effect
   */
  public triggerEffect(event: EffectEvent): void {
    const { type, position, intensity = 1.0 } = event;
    
    // Check cooldown
    const cooldownKey = `${type}_${position?.z ?? 0}`;
    if (this.effectCooldowns.has(cooldownKey)) {
      const lastTrigger = this.effectCooldowns.get(cooldownKey)!;
      if (Date.now() - lastTrigger < 100) {
        return;
      }
    }
    this.effectCooldowns.set(cooldownKey, Date.now());
    
    // Emit particles
    this.emitParticles(type, position || new THREE.Vector3(0, 0.5, 0), intensity);
    
    // Trigger screen shake for collisions
    if (type === 'collision') {
      this.triggerScreenShake({
        intensity: 0.5 * intensity,
        duration: 0.3,
        frequency: 60,
      });
    }
    
    // Trigger audio event
    this.triggerAudioEvent(event);
  }
  
  /**
   * Emit particles for an effect
   */
  private emitParticles(type: EffectType, position: THREE.Vector3, intensity: number): void {
    const system = this.particleSystems.get(type);
    if (!system) return;
    
    const { config } = system;
    const count = Math.floor(config.emissionRate * intensity);
    
    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * config.spread,
          (Math.random() - 0.5) * config.spread * 0.5,
          -config.speed * (0.5 + Math.random() * 0.5)
        ),
        lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
        maxLifetime: config.lifetime,
        size: config.size * (0.8 + Math.random() * 0.4),
        color: new THREE.Color(config.color),
        alpha: 1.0,
      };
      
      system.particles.push(particle);
    }
    
    system.mesh.visible = true;
  }
  
  /**
   * Trigger screen shake
   */
  public triggerScreenShake(config: ScreenShakeConfig): void {
    this.screenShakeConfig = config;
    this.screenShakeTime = config.duration;
    this.screenShakeActive = true;
  }
  
  /**
   * Get current camera shake offset
   */
  public getCameraOffset(): THREE.Vector3 {
    return this.cameraOffset.clone();
  }
  
  /**
   * Update all particle systems and effects
   */
  public update(deltaTime: number, playerSpeed: number = 0): void {
    // Update particle systems
    for (const [name, system] of this.particleSystems.entries()) {
      this.updateParticleSystem(name, system, deltaTime);
    }
    
    // Update screen shake
    if (this.screenShakeActive) {
      this.updateScreenShake(deltaTime);
    }
    
    // Auto-trigger speed effect at high speeds
    if (playerSpeed > 0.8 && Math.random() < 0.3) {
      this.emitParticles('speed', new THREE.Vector3(0, 0.3, 5), 0.5);
    }
  }
  
  /**
   * Update a single particle system
   */
  private updateParticleSystem(name: string, system: any, deltaTime: number): void {
    const positions = system.geometry.attributes.position.array as Float32Array;
    const colors = system.geometry.attributes.color.array as Float32Array;
    const sizes = system.geometry.attributes.size.array as Float32Array;
    
    // Update particles
    for (let i = system.particles.length - 1; i >= 0; i--) {
      const particle = system.particles[i];
      
      // Update lifetime
      particle.lifetime -= deltaTime;
      particle.alpha = particle.lifetime / particle.maxLifetime;
      
      if (particle.lifetime <= 0) {
        system.particles.splice(i, 1);
        continue;
      }
      
      // Update position
      particle.position.addScaledVector(particle.velocity, deltaTime);
      
      // Apply gravity
      particle.velocity.y -= system.config.gravity * deltaTime;
      
      // Update arrays
      const idx = i;
      positions[idx * 3] = particle.position.x;
      positions[idx * 3 + 1] = particle.position.y;
      positions[idx * 3 + 2] = particle.position.z;
      
      colors[idx * 3] = particle.color.r;
      colors[idx * 3 + 1] = particle.color.g;
      colors[idx * 3 + 2] = particle.color.b;
      
      sizes[idx] = particle.size * particle.alpha;
    }
    
    system.geometry.attributes.position.needsUpdate = true;
    system.geometry.attributes.color.needsUpdate = true;
    system.geometry.attributes.size.needsUpdate = true;
    
    // Hide if no particles
    system.mesh.visible = system.particles.length > 0;
  }
  
  /**
   * Update screen shake
   */
  private updateScreenShake(deltaTime: number): void {
    if (!this.screenShakeConfig) {
      this.screenShakeActive = false;
      this.cameraOffset.set(0, 0, 0);
      return;
    }
    
    this.screenShakeTime -= deltaTime;
    
    if (this.screenShakeTime <= 0) {
      this.screenShakeActive = false;
      this.screenShakeConfig = null;
      this.cameraOffset.set(0, 0, 0);
      return;
    }
    
    // Perlin-like noise for shake
    const t = this.screenShakeTime * this.screenShakeConfig.frequency;
    const intensity = this.screenShakeConfig.intensity * (this.screenShakeTime / this.screenShakeConfig.duration);
    
    this.cameraOffset.set(
      (Math.sin(t) + Math.sin(t * 1.7)) * 0.5 * intensity,
      (Math.cos(t * 1.3) + Math.sin(t * 0.9)) * 0.5 * intensity,
      Math.sin(t * 0.5) * 0.3 * intensity
    );
  }
  
  /**
   * Trigger audio event
   */
  private triggerAudioEvent(event: EffectEvent): void {
    const callbacks = this.audioCallbacks.get(event.type);
    if (callbacks) {
      callbacks.forEach(cb => cb(event));
    }
  }
  
  /**
   * Cleanup and dispose resources
   */
  public dispose(): void {
    for (const [_, system] of this.particleSystems.entries()) {
      this.scene.remove(system.mesh);
      system.geometry.dispose();
      system.material.dispose();
    }
    this.particleSystems.clear();
  }
}
