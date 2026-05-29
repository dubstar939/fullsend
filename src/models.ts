import * as THREE from 'three';

export function createCarBody(color: string) {
  const group = new THREE.Group();

  // Bottom body
  const bodyGeo = new THREE.BoxGeometry(1.5, 0.6, 4);
  const bodyMat = new THREE.MeshPhongMaterial({ color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  group.add(body);

  // Cabin
  const cabinGeo = new THREE.BoxGeometry(1.2, 0.6, 1.8);
  const cabinMat = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.9 });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.y = 1.1;
  cabin.position.z = -0.2;
  group.add(cabin);

  // Windows
  const windowGeo = new THREE.BoxGeometry(1.1, 0.4, 1.6);
  const windowMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const windows = new THREE.Mesh(windowGeo, windowMat);
  windows.position.y = 1.15;
  windows.position.z = -0.2;
  group.add(windows);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
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
    group.add(wheel);
  });

  // Lights
  const lightGeo = new THREE.BoxGeometry(0.4, 0.2, 0.1);
  const headLightMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0xffffff });
  const tailLightMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000 });

  // Front lights
  const fl = new THREE.Mesh(lightGeo, headLightMat);
  fl.position.set(-0.5, 0.5, 2);
  group.add(fl);
  const fr = new THREE.Mesh(lightGeo, headLightMat);
  fr.position.set(0.5, 0.5, 2);
  group.add(fr);

  // Back lights
  const bl = new THREE.Mesh(lightGeo, tailLightMat);
  bl.position.set(-0.5, 0.5, -2);
  group.add(bl);
  const br = new THREE.Mesh(lightGeo, tailLightMat);
  br.position.set(0.5, 0.5, -2);
  group.add(br);

  return group;
}

export function createRoadSegment() {
  const group = new THREE.Group();
  
  // Asphalt
  const roadGeo = new THREE.PlaneGeometry(16, 100);
  const roadMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  group.add(road);

  // Markings
  const lineGeo = new THREE.PlaneGeometry(0.2, 5);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let i = -1; i <= 1; i++) {
    for (let j = -10; j <= 10; j++) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(i * 4, 0.01, j * 10);
      group.add(line);
    }
  }

  // Side barriers
  const barrierGeo = new THREE.BoxGeometry(0.5, 0.5, 100);
  const barrierMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
  
  const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
  leftBarrier.position.set(-8, 0.25, 0);
  group.add(leftBarrier);

  const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
  rightBarrier.position.set(8, 0.25, 0);
  group.add(rightBarrier);

  return group;
}
