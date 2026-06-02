/**
 * Highway Loop Manager - Infinite Highway Illusion System
 * Creates the illusion of endless highway driving
 */

import * as THREE from 'three';
import { TRAFFIC_CONFIG, TRACK_CONFIG } from '../../config/gameConfig';

export interface HighwaySegment {
  mesh: THREE.Group;
  startZ: number;
  endZ: number;
  segmentType: string;
}

export interface HighwayLoopConfig {
  segmentLength: number;
  visibleSegments: number;
  recycleThreshold: number;
  enableElevation: boolean;
  enableCurves: boolean;
}

export const DEFAULT_HIGHWAY_CONFIG: HighwayLoopConfig = {
  segmentLength: 100,
  visibleSegments: 8,
  recycleThreshold: 150,
  enableElevation: true,
  enableCurves: true,
};

export class HighwayLoopManager {
  private config: HighwayLoopConfig;
  private segments: HighwaySegment[];
  private roadMeshes: THREE.Group[];
  private sceneryObjects: THREE.Object3D[];
  private totalDistanceTraveled: number;
  private currentSegmentIndex: number;
  private segmentPool: HighwaySegment[];

  constructor(config: Partial<HighwayLoopConfig> = {}) {
    this.config = { ...DEFAULT_HIGHWAY_CONFIG, ...config };
    this.segments = [];
    this.roadMeshes = [];
    this.sceneryObjects = [];
    this.totalDistanceTraveled = 0;
    this.currentSegmentIndex = 0;
    this.segmentPool = [];
  }

  /**
   * Initialize highway with starting segments
   */
  initialize(createRoadSegment: (index: number) => THREE.Group): void {
    // Create initial segments
    for (let i = 0; i < this.config.visibleSegments; i++) {
      const segment = this.createSegment(i, createRoadSegment);
      this.segments.push(segment);
      this.roadMeshes.push(segment.mesh);
    }
  }

  private createSegment(index: number, createRoadSegment: (index: number) => THREE.Group): HighwaySegment {
    const zPosition = -index * this.config.segmentLength;
    const mesh = createRoadSegment(index);
    mesh.position.z = zPosition;

    const segmentType = this.getSegmentType(index);

    return {
      mesh,
      startZ: zPosition,
      endZ: zPosition - this.config.segmentLength,
      segmentType,
    };
  }

  private getSegmentType(index: number): string {
    const types = TRACK_CONFIG.SEGMENT_TYPES;
    
    // First segment is always straight
    if (index === 0) return 'STRAIGHT';
    
    // Random selection weighted towards straights
    const rand = Math.random();
    if (rand < 0.4) return 'STRAIGHT';
    if (rand < 0.6) return 'CURVE_LEFT';
    if (rand < 0.8) return 'CURVE_RIGHT';
    if (rand < 0.9 && this.config.enableElevation) return 'ELEVATION_UP';
    if (rand < 1.0 && this.config.enableElevation) return 'ELEVATION_DOWN';
    
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Update highway based on player position
   * @param playerZ - Player's Z position
   * @param deltaTime - Time elapsed in seconds
   */
  update(playerZ: number, deltaTime: number): void {
    this.totalDistanceTraveled = -playerZ;

    // Check for segments to recycle
    this.recycleSegments(playerZ);
  }

  private recycleSegments(playerZ: number): void {
    const recycleDistance = playerZ + this.config.recycleThreshold;

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      
      // If segment is behind the recycle threshold, move it ahead
      if (segment.startZ > recycleDistance) {
        // Find the furthest segment end position
        let maxEndZ = -Infinity;
        for (const seg of this.segments) {
          if (seg.endZ < maxEndZ) maxEndZ = seg.endZ;
        }

        // Move segment to the front
        const newStartZ = maxEndZ;
        const newEndZ = newStartZ - this.config.segmentLength;
        
        segment.mesh.position.z = newStartZ;
        segment.startZ = newStartZ;
        segment.endZ = newEndZ;
        segment.segmentType = this.getSegmentType(this.currentSegmentIndex++);
      }
    }
  }

  /**
   * Get current highway curvature at player position
   */
  getCurrentCurvature(playerZ: number): { curve: number; elevation: number } {
    const currentSegment = this.segments.find(
      seg => playerZ >= seg.endZ && playerZ <= seg.startZ
    );

    if (!currentSegment) {
      return { curve: 0, elevation: 0 };
    }

    let curve = 0;
    let elevation = 0;

    switch (currentSegment.segmentType) {
      case 'CURVE_LEFT':
        curve = -0.002;
        break;
      case 'CURVE_RIGHT':
        curve = 0.002;
        break;
      case 'ELEVATION_UP':
        elevation = 0.01;
        break;
      case 'ELEVATION_DOWN':
        elevation = -0.01;
        break;
    }

    return { curve, elevation };
  }

  /**
   * Add scenery object to highway
   */
  addSceneryObject(object: THREE.Object3D, zPosition: number): void {
    object.position.z = zPosition;
    this.sceneryObjects.push(object);
  }

  /**
   * Update scenery objects based on player position
   */
  updateScenery(playerZ: number): void {
    const spawnDistance = 150;
    const despawnDistance = 50;

    for (const obj of this.sceneryObjects) {
      // Recycle scenery objects
      if (obj.position.z > playerZ + despawnDistance) {
        obj.position.z = playerZ - spawnDistance - Math.random() * 50;
        obj.position.x = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 20);
      }
    }
  }

  /**
   * Get all road meshes for rendering
   */
  getRoadMeshes(): THREE.Group[] {
    return this.roadMeshes;
  }

  /**
   * Get all scenery objects
   */
  getSceneryObjects(): THREE.Object3D[] {
    return this.sceneryObjects;
  }

  /**
   * Get total distance traveled
   */
  getTotalDistance(): number {
    return this.totalDistanceTraveled;
  }

  /**
   * Get current segment type
   */
  getCurrentSegmentType(playerZ: number): string {
    const segment = this.segments.find(
      seg => playerZ >= seg.endZ && playerZ <= seg.startZ
    );
    return segment?.segmentType ?? 'STRAIGHT';
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    for (const segment of this.segments) {
      segment.mesh.removeFromParent();
    }
    this.segments = [];
    this.roadMeshes = [];
    
    for (const obj of this.sceneryObjects) {
      obj.removeFromParent();
    }
    this.sceneryObjects = [];
  }
}
