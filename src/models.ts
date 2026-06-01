/**
 * Vehicle Model Factory
 * Creates optimized low-poly vehicle meshes for player, traffic, and AI
 */

import * as THREE from 'three';

// Inline TRAFFIC_CONFIG for models to avoid circular dependency
const TRAFFIC_CONFIG = {
  LANE_COUNT: 4,
  LANE_WIDTH: 4.2,
  VEHICLE_CLASSES: {
    SEDAN: { weight: 0.45, speedVar: [0.3, 0.5] as [number, number], size: [1.4, 0.8, 4.2] as [number, number, number] },
    SUV: { weight: 0.25, speedVar: [0.25, 0.4] as [number, number], size: [1.6, 1.0, 4.8] as [number, number, number] },
    SPORT: { weight: 0.15, speedVar: [0.5, 0.7] as [number, number], size: [1.5, 0.7, 4.0] as [number, number, number] },
    TRUCK: { weight: 0.10, speedVar: [0.2, 0.35] as [number, number], size: [2.0, 1.8, 6.5] as [number, number, number] },
    POLICE: { weight: 0.05, speedVar: [0.6, 0.8] as [number, number], size: [1.5, 0.9, 4.5] as [number, number, number] },
  },
};

export interface VehicleColors {
  body: number;
  cabin: number;
  windows: number;
  wheels: number;
}

/**
 * Create a car mesh with specified colors
 */
export function createCarMesh(color: string | number): THREE.Group {
  const group = new THREE.Group();
  const colorNum = typeof color === 'string' ? new THREE.Color(color) : new THREE.Color(color);

  // Main body
  const bodyGeo = new THREE.BoxGeometry(1.5, 0.6, 4);
  const bodyMat = new THREE.MeshPhongMaterial({ 
    color: colorNum,
    shininess: 50,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.2, 0.6, 1.8);
  const cabinMat = new THREE.MeshPhongMaterial({ 
    color: colorNum.clone().multiplyScalar(0.9),
    shininess: 30,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.y = 1.1;
  cabin.position.z = -0.2;
  cabin.castShadow = true;
  group.add(cabin);

  // Windows
  const windowGeo = new THREE.BoxGeometry(1.1, 0.4, 1.6);
  const windowMat = new THREE.MeshPhongMaterial({ 
    color: 0x333344,
    shininess: 100,
    transparent: true,
    opacity: 0.7,
  });
  const windows = new THREE.Mesh(windowGeo, windowMat);
  windows.position.y = 1.15;
  windows.position.z = -0.2;
  group.add(windows);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12);
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
  
  const wheelPositions = [
    [-0.8, 0.35, 1.2],
    [0.8, 0.35, 1.2],
    [-0.8, 0.35, -1.2],
    [0.8, 0.35, -1.2],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);
  });

  // Headlights
  const lightGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
  const headLightMat = new THREE.MeshPhongMaterial({ 
    color: 0xffffee,
    emissive: 0xffffee,
    emissiveIntensity: 0.5,
  });

  [-0.5, 0.5].forEach((x) => {
    const headlight = new THREE.Mesh(lightGeo, headLightMat);
    headlight.position.set(x, 0.5, 2);
    group.add(headlight);
  });

  // Taillights
  const tailLightMat = new THREE.MeshPhongMaterial({ 
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 0.3,
  });

  [-0.5, 0.5].forEach((x) => {
    const taillight = new THREE.Mesh(lightGeo, tailLightMat);
    taillight.position.set(x, 0.5, -2);
    group.add(taillight);
  });

  return group;
}

/**
 * Create a traffic vehicle based on class
 */
export function createTrafficVehicle(vehicleClass: keyof typeof TRAFFIC_CONFIG.VEHICLE_CLASSES): THREE.Group {
  const classConfig = TRAFFIC_CONFIG.VEHICLE_CLASSES[vehicleClass];
  const [width, height, length] = classConfig.size;
  
  // Random color for traffic
  const colors = [0x888888, 0xcccccc, 0x444444, 0x666688, 0x886644, 0x446644, 0x664444];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const group = new THREE.Group();

  // Body scaled to class
  const bodyGeo = new THREE.BoxGeometry(width, height * 0.6, length);
  const bodyMat = new THREE.MeshPhongMaterial({ 
    color: randomColor,
    shininess: 40,
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
    shininess: 30,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.y = height * 0.85;
  cabin.position.z = -length * 0.05;
  cabin.castShadow = true;
  group.add(cabin);

  // Windows
  const windowGeo = new THREE.BoxGeometry(cabinWidth * 0.9, cabinHeight * 0.7, cabinLength * 0.9);
  const windowMat = new THREE.MeshPhongMaterial({ 
    color: 0x333344,
    shininess: 80,
    transparent: true,
    opacity: 0.6,
  });
  const windows = new THREE.Mesh(windowGeo, windowMat);
  windows.position.y = height * 0.9;
  windows.position.z = -length * 0.05;
  group.add(windows);

  // Wheels
  const wheelRadius = height * 0.3;
  const wheelWidth = 0.25;
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 10);
  const wheelMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
  
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
  });

  // Lights
  const headLightGeo = new THREE.BoxGeometry(width * 0.2, height * 0.15, 0.05);
  const tailLightGeo = new THREE.BoxGeometry(width * 0.2, height * 0.12, 0.05);
  const headLightMat = new THREE.MeshPhongMaterial({ color: 0xffffee, emissive: 0xffffee, emissiveIntensity: 0.3 });
  const tailLightMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.2 });

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
 * Create road segment mesh
 */
export function createRoadSegment(length: number = 100, width: number = 16): THREE.Group {
  const group = new THREE.Group();
  
  // Asphalt
  const roadGeo = new THREE.PlaneGeometry(width, length);
  const roadMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  group.add(road);

  // Lane markings
  const lineGeo = new THREE.PlaneGeometry(0.2, 5);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const laneCount = 4;
  const laneWidth = width / laneCount;

  for (let lane = 1; lane < laneCount; lane++) {
    const x = (lane - laneCount / 2) * laneWidth;
    for (let i = -10; i <= 10; i++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.01, i * 10);
      group.add(line);
    }
  }

  // Side barriers
  const barrierGeo = new THREE.BoxGeometry(0.5, 0.5, length);
  const barrierMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
  
  const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
  leftBarrier.position.set(-width / 2 - 0.25, 0.25, 0);
  leftBarrier.castShadow = true;
  group.add(leftBarrier);

  const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
  rightBarrier.position.set(width / 2 + 0.25, 0.25, 0);
  rightBarrier.castShadow = true;
  group.add(rightBarrier);

  return group;
}

/**
 * Create environment prop by type
 */
export function createProp(type: string): THREE.Group {
  const group = new THREE.Group();

  switch (type) {
    case 'streetlight': {
      const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 6, 6);
      const poleMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 3;
      group.add(pole);

      const armGeo = new THREE.BoxGeometry(2, 0.1, 0.1);
      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(1, 6, 0);
      group.add(arm);

      const lightGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const lightMat = new THREE.MeshPhongMaterial({ 
        color: 0xffffcc,
        emissive: 0xffffcc,
        emissiveIntensity: 0.3,
      });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(1.8, 5.8, 0);
      group.add(light);
      break;
    }

    case 'tree': {
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 6);
      const trunkMat = new THREE.MeshPhongMaterial({ color: 0x443322 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1;
      group.add(trunk);

      const foliageGeo = new THREE.ConeGeometry(2, 4, 8);
      const foliageMat = new THREE.MeshPhongMaterial({ color: 0x226622 });
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = 4;
      group.add(foliage);
      break;
    }

    case 'sign': {
      const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 6);
      const postMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 1.5;
      group.add(post);

      const signGeo = new THREE.BoxGeometry(1.5, 1, 0.1);
      const signMat = new THREE.MeshPhongMaterial({ color: 0x2266aa });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.y = 3;
      group.add(sign);
      break;
    }

    default: {
      // Generic prop
      const geo = new THREE.BoxGeometry(1, 2, 1);
      const mat = new THREE.MeshPhongMaterial({ color: 0x666666 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 1;
      group.add(mesh);
    }
  }

  return group;
}
