/**
 * Enhanced Car System - Multiple car models with stats and visual differentiation
 * Integrates through SceneGraph/entities without modifying Engine architecture
 */

import * as THREE from 'three';
import { CarDefinition } from '../types/car.types';
import { parseColor } from '../engine/factories/CarFactory';

export interface CarStats {
  speed: number;
  acceleration: number;
  handling: number;
  grip: number;
  stability: number;
  spResistance: number;
}

export interface CarVisualConfig {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  wheelStyle: 'sport' | 'classic' | 'racing';
  hasSpoiler: boolean;
  hasWideBody: boolean;
  bodyShape: 'sedan' | 'coupe' | 'sports' | 'muscle' | 'compact';
}

/**
 * Enhanced Car Model with detailed geometry and materials
 */
export class EnhancedCarModel {
  public mesh: THREE.Group;
  private materials: {
    body: THREE.MeshStandardMaterial;
    cabin: THREE.MeshStandardMaterial;
    wheels: THREE.MeshStandardMaterial[];
    lights: {
      headlight: THREE.MeshStandardMaterial;
      taillight: THREE.MeshStandardMaterial;
    };
  };
  private config: CarVisualConfig;
  private stats: CarStats;

  constructor(definition: CarDefinition, visualConfig: CarVisualConfig) {
    this.config = visualConfig;
    this.stats = definition.baseStats;
    
    // Create enhanced mesh
    this.mesh = this.createEnhancedCar(definition, visualConfig);
    
    // Store materials for runtime updates
    this.materials = this.extractMaterials(this.mesh);
  }

  /**
   * Create enhanced car model with better materials and geometry
   */
  private createEnhancedCar(definition: CarDefinition, config: CarVisualConfig): THREE.Group {
    const group = new THREE.Group();
    
    // Get body shape from stats
    const bodyShape = this.determineBodyShape(definition);
    
    // Create body with enhanced material
    const bodyMesh = this.createBody(bodyShape, config.primaryColor);
    group.add(bodyMesh);
    
    // Create cabin
    const cabinMesh = this.createCabin(bodyShape, config.secondaryColor || config.primaryColor);
    group.add(cabinMesh);
    
    // Create wheels
    const wheels = this.createWheels(config.wheelStyle, bodyShape);
    wheels.forEach(wheel => group.add(wheel));
    
    // Create lights
    const lights = this.createLights(bodyShape, config.accentColor);
    lights.forEach(light => group.add(light));
    
    // Add spoiler if configured
    if (config.hasSpoiler || definition.baseStats.topSpeed > 155) {
      const spoiler = this.createSpoiler(bodyShape, config.primaryColor);
      group.add(spoiler);
    }
    
    // Add details
    const details = this.createDetails(bodyShape);
    details.forEach(detail => group.add(detail));
    
    // Position correctly
    group.position.y = 0;
    
    return group;
  }

  /**
   * Create car body with MeshStandardMaterial for better lighting response
   */
  private createBody(shape: string, colorHex: string): THREE.Mesh {
    let width: number, height: number, length: number;
    
    switch (shape) {
      case 'sports':
        width = 1.9; height = 0.4; length = 4.5;
        break;
      case 'muscle':
        width = 2.0; height = 0.55; length = 4.8;
        break;
      case 'coupe':
        width = 1.8; height = 0.45; length = 4.4;
        break;
      case 'compact':
        width = 1.6; height = 0.5; length = 3.9;
        break;
      default: // sedan
        width = 1.7; height = 0.5; length = 4.5;
    }
    
    // Use BoxGeometry with segments for smoother curves
    const geometry = new THREE.BoxGeometry(width, height, length, 2, 2, 2);
    
    // Enhanced material with better lighting response
    const material = new THREE.MeshStandardMaterial({
      color: parseColor(colorHex),
      metalness: 0.3,
      roughness: 0.4,
      flatShading: true,
      envMapIntensity: 1.0,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = height / 2 + 0.15;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }

  /**
   * Create cabin with tinted glass effect
   */
  private createCabin(shape: string, colorHex: string): THREE.Mesh {
    let cabinWidth: number, cabinHeight: number, cabinLength: number, positionZ: number;
    
    switch (shape) {
      case 'sports':
        cabinWidth = 1.45; cabinHeight = 0.35; cabinLength = 2.2; positionZ = -0.1;
        break;
      case 'muscle':
        cabinWidth = 1.5; cabinHeight = 0.45; cabinLength = 2.4; positionZ = -0.2;
        break;
      case 'coupe':
        cabinWidth = 1.4; cabinHeight = 0.4; cabinLength = 2.1; positionZ = 0;
        break;
      case 'compact':
        cabinWidth = 1.3; cabinHeight = 0.45; cabinLength = 1.9; positionZ = 0.1;
        break;
      default:
        cabinWidth = 1.4; cabinHeight = 0.45; cabinLength = 2.3; positionZ = -0.1;
    }
    
    const geometry = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength, 2, 2, 2);
    
    // Darker tinted glass material
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex).multiplyScalar(0.6),
      metalness: 0.6,
      roughness: 0.2,
      flatShading: true,
      transparent: true,
      opacity: 0.85,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 0.95;
    mesh.position.z = positionZ;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }

  /**
   * Create detailed wheel assemblies
   */
  private createWheels(style: string, bodyShape: string): THREE.Mesh[] {
    const wheels: THREE.Mesh[] = [];
    
    // Determine wheel positions
    let wheelBase: number, trackWidth: number;
    
    switch (bodyShape) {
      case 'sports':
        wheelBase = 1.5; trackWidth = 0.95;
        break;
      case 'muscle':
        wheelBase = 1.55; trackWidth = 1.0;
        break;
      default:
        wheelBase = 1.4; trackWidth = 0.85;
    }
    
    // Wheel dimensions based on style
    let wheelRadius: number, wheelWidth: number, spokeCount: number;
    
    switch (style) {
      case 'sport':
        wheelRadius = 0.42; wheelWidth = 0.38; spokeCount = 10;
        break;
      case 'racing':
        wheelRadius = 0.45; wheelWidth = 0.45; spokeCount = 12;
        break;
      default: // classic
        wheelRadius = 0.4; wheelWidth = 0.4; spokeCount = 8;
    }
    
    const positions = [
      [-trackWidth, wheelRadius, wheelBase],
      [trackWidth, wheelRadius, wheelBase],
      [-trackWidth, wheelRadius, -wheelBase],
      [trackWidth, wheelRadius, -wheelBase],
    ];
    
    positions.forEach(([x, y, z]) => {
      const wheelGroup = new THREE.Group();
      
      // Tire
      const tireGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
      const tireMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.1,
        roughness: 0.8,
        flatShading: true,
      });
      const tire = new THREE.Mesh(tireGeometry, tireMaterial);
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);
      
      // Rim with spokes
      const rimGeometry = new THREE.CylinderGeometry(
        wheelRadius * 0.7,
        wheelRadius * 0.7,
        wheelWidth + 0.02,
        spokeCount
      );
      const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        metalness: 0.8,
        roughness: 0.2,
        flatShading: true,
      });
      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.rotation.x = Math.PI / 2;
      wheelGroup.add(rim);
      
      wheelGroup.position.set(x as number, y as number, z as number);
      wheels.push(wheelGroup);
    });
    
    return wheels;
  }

  /**
   * Create emissive headlights and taillights
   */
  private createLights(shape: string, accentColor?: string): THREE.Mesh[] {
    const lights: THREE.Mesh[] = [];
    
    let lightWidth: number, lightHeight: number, lightXOffset: number, bodyWidth: number;
    
    switch (shape) {
      case 'sports':
        lightWidth = 0.65; lightHeight = 0.22; lightXOffset = 0.7; bodyWidth = 1.9;
        break;
      case 'muscle':
        lightWidth = 0.6; lightHeight = 0.28; lightXOffset = 0.65; bodyWidth = 2.0;
        break;
      default:
        lightWidth = 0.5; lightHeight = 0.25; lightXOffset = 0.6; bodyWidth = 1.7;
    }
    
    // Headlights with emissive material
    const headLightGeometry = new THREE.BoxGeometry(lightWidth, lightHeight, 0.15);
    const headLightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffee,
      emissiveIntensity: 1.0,
      metalness: 0.3,
      roughness: 0.3,
      flatShading: true,
    });
    
    // Taillights
    const tailLightColor = accentColor ? parseColor(accentColor) : 0xff3333;
    const tailLightGeometry = new THREE.BoxGeometry(lightWidth, lightHeight * 0.9, 0.12);
    const tailLightMaterial = new THREE.MeshStandardMaterial({
      color: tailLightColor,
      emissive: tailLightColor,
      emissiveIntensity: 0.8,
      metalness: 0.2,
      roughness: 0.4,
      flatShading: true,
    });
    
    // Front headlights
    [-1, 1].forEach(side => {
      const headlight = new THREE.Mesh(headLightGeometry, headLightMaterial);
      headlight.position.set(side * lightXOffset, 0.5, bodyWidth / 2 + 0.08);
      headlight.castShadow = true;
      lights.push(headlight);
    });
    
    // Rear taillights
    [-1, 1].forEach(side => {
      const taillight = new THREE.Mesh(tailLightGeometry, tailLightMaterial);
      taillight.position.set(side * lightXOffset, 0.5, -bodyWidth / 2 - 0.08);
      taillight.castShadow = true;
      lights.push(taillight);
    });
    
    return lights;
  }

  /**
   * Create rear spoiler
   */
  private createSpoiler(shape: string, colorHex: string): THREE.Group {
    const group = new THREE.Group();
    
    let spoilerWidth: number, spoilerHeight: number, spoilerDepth: number, positionY: number, positionZ: number;
    
    switch (shape) {
      case 'sports':
        spoilerWidth = 1.7; spoilerHeight = 0.08; spoilerDepth = 0.45; positionY = 1.4; positionZ = -1.9;
        break;
      case 'muscle':
        spoilerWidth = 1.8; spoilerHeight = 0.1; spoilerDepth = 0.4; positionY = 1.5; positionZ = -2.1;
        break;
      default:
        spoilerWidth = 1.5; spoilerHeight = 0.08; spoilerDepth = 0.35; positionY = 1.35; positionZ = -1.8;
    }
    
    // Spoiler wing
    const wingGeometry = new THREE.BoxGeometry(spoilerWidth, spoilerHeight, spoilerDepth, 2, 2, 2);
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: parseColor(colorHex),
      metalness: 0.4,
      roughness: 0.3,
      flatShading: true,
    });
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.set(0, positionY, positionZ);
    wing.castShadow = true;
    group.add(wing);
    
    // Supports
    const supportGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.15);
    const supportMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.6,
      roughness: 0.3,
      flatShading: true,
    });
    
    [-0.5, 0.5].forEach(x => {
      const support = new THREE.Mesh(supportGeometry, supportMaterial);
      support.position.set(x * spoilerWidth * 0.7, positionY - 0.15, positionZ);
      support.castShadow = true;
      group.add(support);
    });
    
    return group;
  }

  /**
   * Create additional details (splitter, diffuser, mirrors)
   */
  private createDetails(shape: string): THREE.Mesh[] {
    const details: THREE.Mesh[] = [];
    
    let splitterWidth: number, splitterZ: number;
    
    switch (shape) {
      case 'sports':
        splitterWidth = 1.8; splitterZ = 2.1;
        break;
      case 'muscle':
        splitterWidth = 1.9; splitterZ = 2.2;
        break;
      default:
        splitterWidth = 1.6; splitterZ = 2.0;
    }
    
    // Front splitter
    const splitterGeometry = new THREE.BoxGeometry(splitterWidth, 0.1, 0.3);
    const splitterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.5,
      roughness: 0.4,
      flatShading: true,
    });
    const splitter = new THREE.Mesh(splitterGeometry, splitterMaterial);
    splitter.position.set(0, 0.3, splitterZ);
    splitter.castShadow = true;
    details.push(splitter);
    
    // Rear diffuser
    const diffuserGeometry = new THREE.BoxGeometry(splitterWidth, 0.1, 0.25);
    const diffuser = new THREE.Mesh(diffuserGeometry, splitterMaterial.clone());
    diffuser.position.set(0, 0.3, -splitterZ + 0.15);
    diffuser.castShadow = true;
    details.push(diffuser);
    
    // Side mirrors (except sports cars)
    if (shape !== 'sports') {
      const mirrorGeometry = new THREE.BoxGeometry(0.18, 0.12, 0.22);
      const mirrorMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.4,
        roughness: 0.3,
        flatShading: true,
      });
      
      [-1, 1].forEach(side => {
        const mirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        mirror.position.set(side * 0.95, 0.9, 0.6);
        mirror.castShadow = true;
        details.push(mirror);
      });
    }
    
    return details;
  }

  /**
   * Determine body shape from car stats
   */
  private determineBodyShape(definition: CarDefinition): string {
    const { topSpeed, acceleration, handling } = definition.baseStats;
    
    if (handling > 90 && topSpeed < 145) return 'compact';
    if (topSpeed > 165 || acceleration > 90) return 'sports';
    if (topSpeed > 155 && acceleration > 85) return 'coupe';
    if (definition.weightClass === 'heavy') return 'muscle';
    return 'sedan';
  }

  /**
   * Extract materials for runtime updates
   */
  private extractMaterials(mesh: THREE.Group): any {
    const materials: any = {
      body: null,
      cabin: null,
      wheels: [],
      lights: { headlight: null, taillight: null },
    };
    
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        
        // Identify by position and properties
        if (child.position.y > 0.8 && child.position.y < 1.2) {
          materials.cabin = mat;
        } else if (child.position.y < 0.6 && Math.abs(child.position.z) > 1.5) {
          if (child.position.z > 0) {
            materials.lights.headlight = mat;
          } else {
            materials.lights.taillight = mat;
          }
        } else if (Math.abs(child.position.x) > 0.8 && child.position.y < 0.5) {
          materials.wheels.push(mat);
        } else if (materials.body === null && child.position.y > 0.3) {
          materials.body = mat;
        }
      }
    });
    
    return materials;
  }

  /**
   * Update car color at runtime
   */
  setPrimaryColor(hexColor: string): void {
    if (this.materials.body) {
      this.materials.body.color.set(parseColor(hexColor));
    }
  }

  /**
   * Update cabin color
   */
  setCabinColor(hexColor: string): void {
    if (this.materials.cabin) {
      this.materials.cabin.color.set(new THREE.Color(hexColor).multiplyScalar(0.6));
    }
  }

  /**
   * Toggle headlights
   */
  setHeadlights(enabled: boolean): void {
    if (this.materials.lights.headlight) {
      this.materials.lights.headlight.emissiveIntensity = enabled ? 1.0 : 0.0;
    }
  }

  /**
   * Get car stats
   */
  getStats(): CarStats {
    return { ...this.stats };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

/**
 * Car Manager - Handles car swapping and lifecycle
 */
export class CarManager {
  private currentCar?: EnhancedCarModel;
  private sceneObjects: THREE.Object3D[] = [];

  /**
   * Create and add car to scene
   */
  createCar(definition: CarDefinition, visualConfig: CarVisualConfig): THREE.Group {
    // Dispose existing car
    this.disposeCurrentCar();
    
    // Create new enhanced car
    this.currentCar = new EnhancedCarModel(definition, visualConfig);
    
    return this.currentCar.mesh;
  }

  /**
   * Swap car model without restarting engine
   */
  swapCar(definition: CarDefinition, visualConfig: CarVisualConfig): THREE.Group {
    return this.createCar(definition, visualConfig);
  }

  /**
   * Update car color
   */
  updateCarColor(hexColor: string): void {
    if (this.currentCar) {
      this.currentCar.setPrimaryColor(hexColor);
    }
  }

  /**
   * Get current car stats
   */
  getCurrentStats(): CarStats | null {
    return this.currentCar ? this.currentCar.getStats() : null;
  }

  /**
   * Dispose current car
   */
  disposeCurrentCar(): void {
    if (this.currentCar) {
      this.currentCar.dispose();
      this.currentCar = undefined;
    }
    
    // Remove scene objects
    this.sceneObjects.forEach(obj => obj.removeFromParent());
    this.sceneObjects = [];
  }

  /**
   * Full cleanup
   */
  dispose(): void {
    this.disposeCurrentCar();
  }
}
