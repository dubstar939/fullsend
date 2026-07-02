/**
 * Car Debug Overlay - Visual debugging for car models
 * Shows bounding boxes, normals, pivots, and scale indicators
 */

import * as THREE from 'three';

export interface CarDebugOverlayConfig {
  showBoundingBox: boolean;
  showNormals: boolean;
  showPivot: boolean;
  showScaleGrid: boolean;
  normalLength: number;
}

export class CarDebugOverlay {
  private group: THREE.Group;
  private config: CarDebugOverlayConfig;
  private boundingBoxHelper?: THREE.Box3Helper;
  private normalsGroup?: THREE.Group;
  private pivotHelper?: THREE.Mesh;
  private scaleGrid?: THREE.GridHelper;

  constructor(config: Partial<CarDebugOverlayConfig> = {}) {
    this.config = {
      showBoundingBox: true,
      showNormals: false,
      showPivot: true,
      showScaleGrid: false,
      normalLength: 1.0,
      ...config,
    };

    this.group = new THREE.Group();
    this.group.name = 'CarDebugOverlay';
  }

  /**
   * Attach debug overlay to a car mesh
   */
  attach(carMesh: THREE.Group): void {
    this.clear();
    
    // Compute bounding box
    const box = new THREE.Box3().setFromObject(carMesh);
    
    // Create bounding box helper
    if (this.config.showBoundingBox) {
      this.boundingBoxHelper = new THREE.Box3Helper(box, 0x00ff00);
      this.group.add(this.boundingBoxHelper);
    }

    // Create pivot indicator at car center
    if (this.config.showPivot) {
      const pivotGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const pivotMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.8,
      });
      this.pivotHelper = new THREE.Mesh(pivotGeometry, pivotMaterial);
      this.pivotHelper.position.set(0, 0.5, 0); // Approximate ground-level pivot
      this.group.add(this.pivotHelper);

      // Add axis lines
      const axisLength = 2;
      const axesHelper = new THREE.AxesHelper(axisLength);
      this.group.add(axesHelper);
    }

    // Create scale grid on ground plane
    if (this.config.showScaleGrid) {
      this.scaleGrid = new THREE.GridHelper(10, 10, 0x444444, 0x666666);
      this.scaleGrid.position.y = 0.01;
      this.group.add(this.scaleGrid);
    }

    // Sync position with car
    this.group.position.copy(carMesh.position);
    this.group.rotation.copy(carMesh.rotation);
  }

  /**
   * Update overlay to follow car
   */
  update(carMesh: THREE.Group): void {
    this.group.position.copy(carMesh.position);
    this.group.rotation.copy(carMesh.rotation);
  }

  /**
   * Clear all debug visuals
   */
  clear(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      
      if (child instanceof THREE.LineSegments || child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      } else if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      } else if (child instanceof THREE.Group) {
        child.traverse((obj) => {
          if (obj instanceof THREE.Line) {
            obj.geometry.dispose();
            (obj.material as THREE.Material).dispose();
          }
        });
      }
      
      this.group.remove(child);
    }

    this.boundingBoxHelper = undefined;
    this.normalsGroup = undefined;
    this.pivotHelper = undefined;
    this.scaleGrid = undefined;
  }

  /**
   * Get the debug overlay group
   */
  getGroup(): THREE.Group {
    return this.group;
  }

  /**
   * Toggle visibility
   */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.clear();
    this.group.dispose();
  }
}

/**
 * Quick debug info for car properties
 */
export function getCarDebugInfo(carMesh: THREE.Group): {
  boundingBox: { min: THREE.Vector3; max: THREE.Vector3; size: THREE.Vector3 };
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  triangleCount: number;
  vertexCount: number;
  meshCount: number;
} {
  const box = new THREE.Box3().setFromObject(carMesh);
  const size = new THREE.Vector3();
  box.getSize(size);

  let triangleCount = 0;
  let vertexCount = 0;
  let meshCount = 0;

  carMesh.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      meshCount++;
      if (child.geometry.index) {
        triangleCount += child.geometry.index.count / 3;
      } else if (child.geometry.attributes.position) {
        triangleCount += child.geometry.attributes.position.count / 3;
      }
      if (child.geometry.attributes.position) {
        vertexCount += child.geometry.attributes.position.count;
      }
    }
  });

  return {
    boundingBox: {
      min: box.min.clone(),
      max: box.max.clone(),
      size: size.clone(),
    },
    position: carMesh.position.clone(),
    rotation: carMesh.rotation.clone(),
    scale: carMesh.scale.clone(),
    triangleCount: Math.floor(triangleCount),
    vertexCount,
    meshCount,
  };
}
