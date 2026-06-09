/**
 * Vehicle Model Factory
 * Creates optimized low-poly vehicle meshes for player, traffic, and AI
 */

import * as THREE from 'three';
import { TRAFFIC_CONFIG } from './config/gameConfig';

export interface VehicleColors {
  body: number;
  cabin: number;
  windows: number;
  wheels: number;
}

/**
 * Create a car mesh with specified colors - Enhanced visual design
 */
export function createCarMesh(color: string | number): THREE.Group {
  const group = new THREE.Group();
  const colorNum = typeof color === 'string' ? new THREE.Color(color) : new THREE.Color(color);

  // Main body - more aggressive sports car shape
  const bodyGeo = new THREE.BoxGeometry(1.6, 0.5, 4.2);
  const bodyMat = new THREE.MeshPhongMaterial({ 
    color: colorNum,
    shininess: 80,
    flatShading: true,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.45;
  body.castShadow = true;
  group.add(body);

  // Cabin - sleeker design
  const cabinGeo = new THREE.BoxGeometry(1.3, 0.5, 2.0);
  const cabinMat = new THREE.MeshPhongMaterial({ 
    color: colorNum.clone().multiplyScalar(0.85),
    shininess: 60,
    flatShading: true,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.y = 0.95;
  cabin.position.z = -0.1;
  cabin.castShadow = true;
  group.add(cabin);

  // Windows - darker tint
  const windowGeo = new THREE.BoxGeometry(1.25, 0.4, 1.8);
  const windowMat = new THREE.MeshPhongMaterial({ 
    color: 0x1a1a2e,
    shininess: 100,
    transparent: true,
    opacity: 0.8,
    flatShading: true,
  });
  const windows = new THREE.Mesh(windowGeo, windowMat);
  windows.position.y = 0.98;
  windows.position.z = -0.1;
  group.add(windows);

  // Wheels - larger and more detailed
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 16);
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 30 });
  
  const wheelPositions = [
    [-0.85, 0.38, 1.3],
    [0.85, 0.38, 1.3],
    [-0.85, 0.38, -1.3],
    [0.85, 0.38, -1.3],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);

    // Wheel rim detail
    const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.36, 8);
    const rimMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 100 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    group.add(rim);
  });

  // Headlights - modern LED style
  const headLightGeo = new THREE.BoxGeometry(0.5, 0.25, 0.15);
  const headLightMat = new THREE.MeshPhongMaterial({ 
    color: 0xffffff,
    emissive: 0xffffee,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9,
  });

  [-0.55, 0.55].forEach((x) => {
    const headlight = new THREE.Mesh(headLightGeo, headLightMat);
    headlight.position.set(x, 0.45, 2.1);
    group.add(headlight);
  });

  // Taillights - modern LED strip style
  const tailLightGeo = new THREE.BoxGeometry(0.6, 0.2, 0.1);
  const tailLightMat = new THREE.MeshPhongMaterial({ 
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.6,
  });

  [-0.55, 0.55].forEach((x) => {
    const taillight = new THREE.Mesh(tailLightGeo, tailLightMat);
    taillight.position.set(x, 0.45, -2.1);
    group.add(taillight);
  });

  // Front splitter / bumper detail
  const splitterGeo = new THREE.BoxGeometry(1.5, 0.15, 0.3);
  const splitterMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 20 });
  const splitter = new THREE.Mesh(splitterGeo, splitterMat);
  splitter.position.set(0, 0.3, 1.95);
  splitter.castShadow = true;
  group.add(splitter);

  // Rear diffuser
  const diffuserGeo = new THREE.BoxGeometry(1.5, 0.15, 0.25);
  const diffuserMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 20 });
  const diffuser = new THREE.Mesh(diffuserGeo, diffuserMat);
  diffuser.position.set(0, 0.3, -1.95);
  diffuser.castShadow = true;
  group.add(diffuser);

  return group;
}

/**
 * Create a traffic vehicle based on class - Enhanced visual design
 */
export function createTrafficVehicle(vehicleClass: keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES): THREE.Group {
  const classConfig = TRAFFIC_CONFIG.VEHICLE_CLASSES[vehicleClass];
  const [width, height, length] = classConfig.size;
  
  // Random color for traffic - expanded palette
  const colors = [0x888888, 0xcccccc, 0x444444, 0x666688, 0x886644, 0x446644, 0x664444, 0xaa3333, 0x3355aa, 0x338833];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const group = new THREE.Group();

  // Body scaled to class with flat shading
  const bodyGeo = new THREE.BoxGeometry(width, height * 0.6, length);
  const bodyMat = new THREE.MeshPhongMaterial({ 
    color: randomColor,
    shininess: 60,
    flatShading: true,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = height * 0.4;
  body.castShadow = true;
  group.add(body);

  // Cabin
  const cabinWidth = width * 0.8;
  const cabinHeight = height * 0.5;
  const cabinLength = length * 0.45;
  const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
  const cabinMat = new THREE.MeshPhongMaterial({ 
    color: randomColor,
    shininess: 50,
    flatShading: true,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.y = height * 0.85;
  cabin.position.z = -length * 0.05;
  cabin.castShadow = true;
  group.add(cabin);

  // Windows - darker tint
  const windowGeo = new THREE.BoxGeometry(cabinWidth * 0.9, cabinHeight * 0.7, cabinLength * 0.9);
  const windowMat = new THREE.MeshPhongMaterial({ 
    color: 0x1a1a2e,
    shininess: 80,
    transparent: true,
    opacity: 0.7,
    flatShading: true,
  });
  const windows = new THREE.Mesh(windowGeo, windowMat);
  windows.position.y = height * 0.9;
  windows.position.z = -length * 0.05;
  group.add(windows);

  // Wheels - improved detail
  const wheelRadius = height * 0.3;
  const wheelWidth = 0.3;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 12);
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, shininess: 30 });
  
  const wheelPositions = [
    [-width / 2 + 0.1, wheelRadius, length * 0.3],
    [width / 2 - 0.1, wheelRadius, length * 0.3],
    [-width / 2 + 0.1, wheelRadius, -length * 0.3],
    [width / 2 - 0.1, wheelRadius, -length * 0.3],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);

    // Wheel rim detail
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelWidth + 0.02, 8);
    const rimMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 100 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    group.add(rim);
  });

  // Lights - enhanced emissive
  const headLightGeo = new THREE.BoxGeometry(width * 0.25, height * 0.15, 0.1);
  const tailLightGeo = new THREE.BoxGeometry(width * 0.25, height * 0.12, 0.1);
  const headLightMat = new THREE.MeshPhongMaterial({ color: 0xffffee, emissive: 0xffffee, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 });
  const tailLightMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 });

  // Front lights
  [-1, 1].forEach((side) => {
    const headlight = new THREE.Mesh(headLightGeo, headLightMat);
    headlight.position.set(side * width * 0.35, height * 0.4, length / 2);
    group.add(headlight);
  });

  // Rear lights
  [-1, 1].forEach((side) => {
    const taillight = new THREE.Mesh(tailLightGeo, tailLightMat);
    taillight.position.set(side * width * 0.35, height * 0.4, -length / 2);
    group.add(taillight);
  });

  return group;
}

/**
 * Create a police car with special markings
 */
export function createPoliceCar(): THREE.Group {
  const group = createTrafficVehicle('POLICE');
  
  // Add light bar
  const lightBarGeo = new THREE.BoxGeometry(0.8, 0.15, 0.4);
  const lightBarMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
  const lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
  lightBar.position.set(0, 1.3, -0.3);
  group.add(lightBar);

  // Emergency lights
  const emergencyLightGeo = new THREE.BoxGeometry(0.35, 0.1, 0.3);
  const redLightMat = new THREE.MeshPhongMaterial({ 
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.5,
  });
  const blueLightMat = new THREE.MeshPhongMaterial({ 
    color: 0x0000ff,
    emissive: 0x0000ff,
    emissiveIntensity: 0.5,
  });

  const redLight = new THREE.Mesh(emergencyLightGeo, redLightMat);
  redLight.position.set(-0.2, 1.35, -0.3);
  group.add(redLight);

  const blueLight = new THREE.Mesh(emergencyLightGeo, blueLightMat);
  blueLight.position.set(0.2, 1.35, -0.3);
  group.add(blueLight);

  // Police decals (simplified as colored boxes)
  const decalGeo = new THREE.PlaneGeometry(0.8, 0.3);
  const decalMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  
  const sideDecalL = new THREE.Mesh(decalGeo, decalMat);
  sideDecalL.rotation.y = Math.PI / 2;
  sideDecalL.position.set(-0.76, 0.8, 0);
  group.add(sideDecalL);

  const sideDecalR = new THREE.Mesh(decalGeo, decalMat);
  sideDecalR.rotation.y = -Math.PI / 2;
  sideDecalR.position.set(0.76, 0.8, 0);
  group.add(sideDecalR);

  return group;
}

/**
 * Create road segment mesh - Enhanced visual design
 */
export function createRoadSegment(length: number = 100, width: number = 16): THREE.Group {
  const group = new THREE.Group();
  
  // Asphalt - textured appearance with slight variation
  const roadGeo = new THREE.PlaneGeometry(width, length);
  const roadMat = new THREE.MeshPhongMaterial({ 
    color: 0x2a2a2a,
    shininess: 15,
    flatShading: true,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  group.add(road);

  // Lane markings - dashed lines with glow effect
  const lineGeo = new THREE.PlaneGeometry(0.25, 6);
  const lineMat = new THREE.MeshPhongMaterial({ 
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.2,
    shininess: 30,
  });

  const laneCount = 4;
  const laneWidth = width / laneCount;

  for (let lane = 1; lane < laneCount; lane++) {
    const x = (lane - laneCount / 2) * laneWidth;
    for (let i = -10; i <= 10; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.02, i * 10);
      group.add(line);
    }
  }

  // Edge lines (solid yellow/white on sides)
  const edgeLineGeo = new THREE.PlaneGeometry(0.3, length);
  const edgeLineMat = new THREE.MeshPhongMaterial({ 
    color: 0xfacc15,
    emissive: 0xfacc15,
    emissiveIntensity: 0.3,
  });

  const leftEdgeLine = new THREE.Mesh(edgeLineGeo, edgeLineMat);
  leftEdgeLine.rotation.x = -Math.PI / 2;
  leftEdgeLine.position.set(-width / 2 + 0.5, 0.02, 0);
  group.add(leftEdgeLine);

  const rightEdgeLine = new THREE.Mesh(edgeLineGeo, edgeLineMat);
  rightEdgeLine.rotation.x = -Math.PI / 2;
  rightEdgeLine.position.set(width / 2 - 0.5, 0.02, 0);
  group.add(rightEdgeLine);

  // Side barriers with reflectors
  const barrierGeo = new THREE.BoxGeometry(0.6, 0.6, length);
  const barrierMat = new THREE.MeshPhongMaterial({ 
    color: 0x666666,
    shininess: 20,
    flatShading: true,
  });
  
  const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
  leftBarrier.position.set(-width / 2 - 0.3, 0.3, 0);
  leftBarrier.castShadow = true;
  group.add(leftBarrier);

  const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
  rightBarrier.position.set(width / 2 + 0.3, 0.3, 0);
  rightBarrier.castShadow = true;
  group.add(rightBarrier);

  // Reflector posts on barriers
  const reflectorGeo = new THREE.BoxGeometry(0.15, 0.15, 0.1);
  const reflectorMat = new THREE.MeshPhongMaterial({ 
    color: 0xff6600,
    emissive: 0xff6600,
    emissiveIntensity: 0.5,
  });

  for (let i = -9; i <= 9; i += 2) {
    const leftReflector = new THREE.Mesh(reflectorGeo, reflectorMat);
    leftReflector.position.set(-width / 2 - 0.6, 0.4, i * 5);
    group.add(leftReflector);

    const rightReflector = new THREE.Mesh(reflectorGeo, reflectorMat);
    rightReflector.position.set(width / 2 + 0.6, 0.4, i * 5);
    group.add(rightReflector);
  }

  return group;
}

/**
 * Create environment prop by type - Enhanced visual design
 */
export function createProp(type: string): THREE.Group {
  const group = new THREE.Group();

  switch (type) {
    case 'streetlight': {
      // Modern street light pole
      const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, 7, 8);
      const poleMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a, shininess: 40, flatShading: true });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 3.5;
      group.add(pole);

      // Curved arm
      const armGeo = new THREE.BoxGeometry(2.5, 0.15, 0.15);
      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(1.2, 6.5, 0);
      arm.rotation.z = -0.1;
      group.add(arm);

      // LED light fixture
      const fixtureGeo = new THREE.BoxGeometry(0.8, 0.2, 0.4);
      const fixtureMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 30 });
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(2, 6.3, 0);
      group.add(fixture);

      // Glowing light
      const lightGeo = new THREE.BoxGeometry(0.6, 0.15, 0.3);
      const lightMat = new THREE.MeshPhongMaterial({ 
        color: 0xffffee,
        emissive: 0xffffee,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9,
      });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(2, 6.2, 0);
      group.add(light);
      break;
    }

    case 'tree': {
      // Stylized low-poly tree
      const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 2.5, 6);
      const trunkMat = new THREE.MeshPhongMaterial({ color: 0x5c4033, shininess: 20, flatShading: true });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.25;
      group.add(trunk);

      // Layered foliage (multiple cones for fuller look)
      const foliageColors = [0x2d5a27, 0x3a6b36, 0x1e4a1a];
      
      foliageColors.forEach((color, index) => {
        const foliageGeo = new THREE.ConeGeometry(2.2 - index * 0.4, 2.5, 8);
        const foliageMat = new THREE.MeshPhongMaterial({ color, shininess: 15, flatShading: true });
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = 3.5 + index * 1.2;
        foliage.castShadow = true;
        group.add(foliage);
      });
      break;
    }

    case 'sign': {
      // Highway sign post
      const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 4, 6);
      const postMat = new THREE.MeshPhongMaterial({ color: 0x555555, shininess: 30, flatShading: true });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 2;
      group.add(post);

      // Sign board
      const signGeo = new THREE.BoxGeometry(2, 1.2, 0.15);
      const signMat = new THREE.MeshPhongMaterial({ color: 0x2a5a8a, shininess: 25, flatShading: true });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.y = 3.8;
      sign.castShadow = true;
      group.add(sign);

      // Sign text placeholder (white stripes)
      const textGeo = new THREE.PlaneGeometry(1.6, 0.15);
      const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      
      for (let i = 0; i < 3; i++) {
        const textLine = new THREE.Mesh(textGeo, textMat);
        textLine.position.set(0, 3.8 + 0.3 - i * 0.25, 0.08);
        group.add(textLine);
      }
      break;
    }

    default: {
      // Generic prop
      const geo = new THREE.BoxGeometry(1, 2, 1);
      const mat = new THREE.MeshPhongMaterial({ color: 0x666666, flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1;
      group.add(mesh);
    }
  }

  return group;
}
