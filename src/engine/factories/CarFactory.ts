/**
 * Car Factory - Creates distinct low-poly car models
 * Each car model has unique visual geometry while sharing the same component architecture
 */

import * as THREE from 'three';
import { CarDefinition } from '../types/car.types';

export interface CarModelConfig {
  bodyShape: 'sedan' | 'coupe' | 'sports' | 'muscle' | 'compact';
  primaryColor: number;
  secondaryColor?: number;
  accentColor?: number;
  wheelStyle: 'sport' | 'classic' | 'racing';
  hasSpoiler: boolean;
  hasWideBody: boolean;
}

/**
 * Create a distinct car mesh based on model configuration
 */
export function createCarModel(config: CarModelConfig): THREE.Group {
  const group = new THREE.Group();
  
  // Create body based on shape
  const bodyMesh = createCarBody(config.bodyShape, config.primaryColor, config.hasWideBody);
  group.add(bodyMesh);
  
  // Add cabin
  const cabinMesh = createCarCabin(config.bodyShape, config.secondaryColor || config.primaryColor);
  group.add(cabinMesh);
  
  // Add wheels
  const wheels = createCarWheels(config.wheelStyle, config.bodyShape);
  wheels.forEach(wheel => group.add(wheel));
  
  // Add lights
  const lights = createCarLights(config.bodyShape, config.accentColor);
  lights.forEach(light => group.add(light));
  
  // Add spoiler if configured
  if (config.hasSpoiler) {
    const spoiler = createCarSpoiler(config.bodyShape, config.primaryColor);
    group.add(spoiler);
  }
  
  // Add details based on body shape
  const details = createCarDetails(config.bodyShape);
  details.forEach(detail => group.add(detail));
  
  return group;
}

/**
 * Create car body geometry based on shape type
 */
function createCarBody(
  shape: CarModelConfig['bodyShape'], 
  color: number, 
  hasWideBody: boolean
): THREE.Mesh {
  let geometry: THREE.BoxGeometry;
  let width = hasWideBody ? 1.9 : 1.6;
  let height: number;
  let length: number;
  
  switch (shape) {
    case 'sedan':
      // Balanced sedan shape
      height = 0.55;
      length = 4.5;
      geometry = new THREE.BoxGeometry(width, height, length);
      break;
    case 'coupe':
      // Sleeker coupe with lower profile
      height = 0.45;
      length = 4.3;
      geometry = new THREE.BoxGeometry(width, height, length);
      break;
    case 'sports':
      // Aggressive sports car - low and wide
      height = 0.4;
      length = 4.4;
      width = hasWideBody ? 2.0 : 1.8;
      geometry = new THREE.BoxGeometry(width, height, length);
      break;
    case 'muscle':
      // Bulky muscle car
      height = 0.6;
      length = 4.8;
      width = hasWideBody ? 2.1 : 1.9;
      geometry = new THREE.BoxGeometry(width, height, length);
      break;
    case 'compact':
      // Small compact car
      height = 0.5;
      length = 3.8;
      width = hasWideBody ? 1.7 : 1.5;
      geometry = new THREE.BoxGeometry(width, height, length);
      break;
    default:
      height = 0.5;
      length = 4.2;
      geometry = new THREE.BoxGeometry(width, height, length);
  }
  
  const material = new THREE.MeshPhongMaterial({
    color,
    shininess: 80,
    flatShading: true,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = height / 2 + 0.1;
  mesh.castShadow = true;
  
  return mesh;
}

/**
 * Create car cabin/roof section
 */
function createCarCabin(shape: CarModelConfig['bodyShape'], color: number): THREE.Mesh {
  let cabinWidth: number;
  let cabinHeight: number;
  let cabinLength: number;
  let positionZ: number;
  
  switch (shape) {
    case 'sedan':
      cabinWidth = 1.3;
      cabinHeight = 0.45;
      cabinLength = 2.2;
      positionZ = -0.1;
      break;
    case 'coupe':
      cabinWidth = 1.35;
      cabinHeight = 0.4;
      cabinLength = 2.0;
      positionZ = 0;
      break;
    case 'sports':
      cabinWidth = 1.4;
      cabinHeight = 0.35;
      cabinLength = 2.1;
      positionZ = -0.05;
      break;
    case 'muscle':
      cabinWidth = 1.45;
      cabinHeight = 0.5;
      cabinLength = 2.3;
      positionZ = -0.15;
      break;
    case 'compact':
      cabinWidth = 1.2;
      cabinHeight = 0.45;
      cabinLength = 1.8;
      positionZ = 0.1;
      break;
    default:
      cabinWidth = 1.3;
      cabinHeight = 0.45;
      cabinLength = 2.0;
      positionZ = -0.1;
  }
  
  const geometry = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(color).multiplyScalar(0.85),
    shininess: 60,
    flatShading: true,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.95;
  mesh.position.z = positionZ;
  mesh.castShadow = true;
  
  return mesh;
}

/**
 * Create wheel assemblies based on style
 */
function createCarWheels(
  style: CarModelConfig['wheelStyle'],
  shape: CarModelConfig['bodyShape']
): THREE.Mesh[] {
  const wheels: THREE.Mesh[] = [];
  
  // Determine wheel positions based on body shape
  let wheelBase: number;
  let trackWidth: number;
  
  switch (shape) {
    case 'sedan':
      wheelBase = 1.4;
      trackWidth = 0.8;
      break;
    case 'coupe':
      wheelBase = 1.35;
      trackWidth = 0.82;
      break;
    case 'sports':
      wheelBase = 1.45;
      trackWidth = 0.9;
      break;
    case 'muscle':
      wheelBase = 1.5;
      trackWidth = 0.95;
      break;
    case 'compact':
      wheelBase = 1.2;
      trackWidth = 0.75;
      break;
    default:
      wheelBase = 1.35;
      trackWidth = 0.8;
  }
  
  // Wheel geometry based on style
  let wheelRadius: number;
  let wheelWidth: number;
  let rimSegments: number;
  
  switch (style) {
    case 'sport':
      wheelRadius = 0.4;
      wheelWidth = 0.35;
      rimSegments = 10;
      break;
    case 'classic':
      wheelRadius = 0.38;
      wheelWidth = 0.4;
      rimSegments = 8;
      break;
    case 'racing':
      wheelRadius = 0.42;
      wheelWidth = 0.45;
      rimSegments = 12;
      break;
    default:
      wheelRadius = 0.38;
      wheelWidth = 0.35;
      rimSegments = 8;
  }
  
  const tireGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
  const tireMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x1a1a1a, 
    shininess: 30,
    flatShading: true,
  });
  
  const rimGeometry = new THREE.CylinderGeometry(
    wheelRadius * 0.65, 
    wheelRadius * 0.65, 
    wheelWidth + 0.02, 
    rimSegments
  );
  const rimMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xcccccc, 
    shininess: 100,
    flatShading: true,
  });
  
  const positions = [
    [-trackWidth, wheelRadius, wheelBase],
    [trackWidth, wheelRadius, wheelBase],
    [-trackWidth, wheelRadius, -wheelBase],
    [trackWidth, wheelRadius, -wheelBase],
  ];
  
  positions.forEach(([x, y, z]) => {
    // Tire
    const tire = new THREE.Mesh(tireGeometry, tireMaterial);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, y, z);
    tire.castShadow = true;
    wheels.push(tire);
    
    // Rim
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    wheels.push(rim);
  });
  
  return wheels;
}

/**
 * Create headlight and taillight assemblies
 */
function createCarLights(
  shape: CarModelConfig['bodyShape'],
  accentColor?: number
): THREE.Mesh[] {
  const lights: THREE.Mesh[] = [];
  
  // Determine light positions and sizes
  let lightWidth: number;
  let lightHeight: number;
  let lightXOffset: number;
  let bodyWidth: number;
  
  switch (shape) {
    case 'sedan':
      lightWidth = 0.5;
      lightHeight = 0.25;
      lightXOffset = 0.55;
      bodyWidth = 1.6;
      break;
    case 'coupe':
      lightWidth = 0.45;
      lightHeight = 0.22;
      lightXOffset = 0.52;
      bodyWidth = 1.6;
      break;
    case 'sports':
      lightWidth = 0.6;
      lightHeight = 0.2;
      lightXOffset = 0.65;
      bodyWidth = 1.8;
      break;
    case 'muscle':
      lightWidth = 0.55;
      lightHeight = 0.3;
      lightXOffset = 0.6;
      bodyWidth = 1.9;
      break;
    case 'compact':
      lightWidth = 0.4;
      lightHeight = 0.25;
      lightXOffset = 0.48;
      bodyWidth = 1.5;
      break;
    default:
      lightWidth = 0.5;
      lightHeight = 0.25;
      lightXOffset = 0.55;
      bodyWidth = 1.6;
  }
  
  // Headlights
  const headLightGeometry = new THREE.BoxGeometry(lightWidth, lightHeight, 0.12);
  const headLightMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0xffffee,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9,
    flatShading: true,
  });
  
  // Taillights
  const tailLightGeometry = new THREE.BoxGeometry(lightWidth, lightHeight * 0.9, 0.1);
  const tailLightColor = accentColor || 0xff0000;
  const tailLightMaterial = new THREE.MeshPhongMaterial({
    color: tailLightColor,
    emissive: tailLightColor,
    emissiveIntensity: 0.6,
    flatShading: true,
  });
  
  // Front headlights
  [-1, 1].forEach(side => {
    const headlight = new THREE.Mesh(headLightGeometry, headLightMaterial);
    headlight.position.set(side * lightXOffset, 0.45, bodyWidth / 2 + 0.05);
    lights.push(headlight);
  });
  
  // Rear taillights
  [-1, 1].forEach(side => {
    const taillight = new THREE.Mesh(tailLightGeometry, tailLightMaterial);
    taillight.position.set(side * lightXOffset, 0.45, -bodyWidth / 2 - 0.05);
    lights.push(taillight);
  });
  
  return lights;
}

/**
 * Create rear spoiler based on body shape
 */
function createCarSpoiler(
  shape: CarModelConfig['bodyShape'],
  color: number
): THREE.Group {
  const group = new THREE.Group();
  
  let spoilerWidth: number;
  let spoilerHeight: number;
  let spoilerDepth: number;
  let positionY: number;
  let positionZ: number;
  
  switch (shape) {
    case 'sports':
      spoilerWidth = 1.6;
      spoilerHeight = 0.08;
      spoilerDepth = 0.4;
      positionY = 1.35;
      positionZ = -1.8;
      break;
    case 'muscle':
      spoilerWidth = 1.7;
      spoilerHeight = 0.1;
      spoilerDepth = 0.35;
      positionY = 1.45;
      positionZ = -2.0;
      break;
    default:
      spoilerWidth = 1.4;
      spoilerHeight = 0.08;
      spoilerDepth = 0.3;
      positionY = 1.3;
      positionZ = -1.7;
  }
  
  // Spoiler wing
  const wingGeometry = new THREE.BoxGeometry(spoilerWidth, spoilerHeight, spoilerDepth);
  const wingMaterial = new THREE.MeshPhongMaterial({
    color,
    shininess: 80,
    flatShading: true,
  });
  const wing = new THREE.Mesh(wingGeometry, wingMaterial);
  wing.position.set(0, positionY, positionZ);
  wing.castShadow = true;
  group.add(wing);
  
  // Spoiler supports
  const supportGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.15);
  const supportMaterial = new THREE.MeshPhongMaterial({
    color: 0x222222,
    shininess: 40,
    flatShading: true,
  });
  
  [-0.5, 0.5].forEach(x => {
    const support = new THREE.Mesh(supportGeometry, supportMaterial);
    support.position.set(x * spoilerWidth * 0.7, positionY - 0.15, positionZ);
    group.add(support);
  });
  
  return group;
}

/**
 * Create additional car details based on body shape
 */
function createCarDetails(shape: CarModelConfig['bodyShape']): THREE.Mesh[] {
  const details: THREE.Mesh[] = [];
  
  // Front splitter / bumper detail
  let splitterWidth: number;
  let splitterZ: number;
  
  switch (shape) {
    case 'sports':
      splitterWidth = 1.7;
      splitterZ = 2.0;
      break;
    case 'muscle':
      splitterWidth = 1.8;
      splitterZ = 2.1;
      break;
    default:
      splitterWidth = 1.5;
      splitterZ = 1.95;
  }
  
  const splitterGeometry = new THREE.BoxGeometry(splitterWidth, 0.12, 0.25);
  const splitterMaterial = new THREE.MeshPhongMaterial({
    color: 0x222222,
    shininess: 20,
    flatShading: true,
  });
  const splitter = new THREE.Mesh(splitterGeometry, splitterMaterial);
  splitter.position.set(0, 0.28, splitterZ);
  splitter.castShadow = true;
  details.push(splitter);
  
  // Rear diffuser
  const diffuserGeometry = new THREE.BoxGeometry(splitterWidth, 0.12, 0.2);
  const diffuserMaterial = new THREE.MeshPhongMaterial({
    color: 0x222222,
    shininess: 20,
    flatShading: true,
  });
  const diffuser = new THREE.Mesh(diffuserGeometry, diffuserMaterial);
  diffuser.position.set(0, 0.28, -splitterZ + 0.1);
  diffuser.castShadow = true;
  details.push(diffuser);
  
  // Side mirrors (only for non-sports cars)
  if (shape !== 'sports') {
    const mirrorGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.2);
    const mirrorMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 50,
      flatShading: true,
    });
    
    [-1, 1].forEach(side => {
      const mirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
      mirror.position.set(side * 0.9, 0.85, 0.5);
      details.push(mirror);
    });
  }
  
  return details;
}

/**
 * Get car model configuration from car definition
 * Maps car stats and properties to visual configuration
 */
export function getCarModelFromDefinition(definition: CarDefinition): CarModelConfig {
  // Map weight class to body shape
  let bodyShape: CarModelConfig['bodyShape'];
  switch (definition.weightClass) {
    case 'light':
      bodyShape = definition.baseStats.handling > 90 ? 'sports' : 'compact';
      break;
    case 'medium':
      bodyShape = definition.drivetrain === 'RWD' ? 'coupe' : 'sedan';
      break;
    case 'heavy':
      bodyShape = definition.baseStats.topSpeed > 160 ? 'muscle' : 'sedan';
      break;
    default:
      bodyShape = 'sedan';
  }
  
  // Map stats to wheel style
  let wheelStyle: CarModelConfig['wheelStyle'];
  if (definition.baseStats.handling > 90) {
    wheelStyle = 'racing';
  } else if (definition.baseStats.acceleration > 85) {
    wheelStyle = 'sport';
  } else {
    wheelStyle = 'classic';
  }
  
  // Determine if car should have spoiler based on stats
  const hasSpoiler = definition.baseStats.topSpeed > 155 || definition.baseStats.handling > 88;
  
  // Wide body for high-performance cars
  const hasWideBody = definition.baseStats.topSpeed > 165 || definition.baseStats.acceleration > 90;
  
  return {
    bodyShape,
    primaryColor: 0x3b82f6, // Default blue, will be overridden
    secondaryColor: undefined,
    accentColor: undefined,
    wheelStyle,
    hasSpoiler,
    hasWideBody,
  };
}

/**
 * Parse hex color string to THREE.js Color
 */
export function parseColor(hexString: string): number {
  return new THREE.Color(hexString).getHex();
}
