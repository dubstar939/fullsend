/**
 * Highway Loop Manager
 * Manages infinite highway segment recycling for Tokyo Xtreme Racer-style free roam
 * Integrates with static batching for optimal performance
 */

import * as THREE from 'three';
import { TRACK_CONFIG, TRAFFIC_CONFIG } from '../config/gameConfig';
import { ZoneManager, ZoneType } from './ZoneManager';

export enum SegmentType {
  STRAIGHT = 'STRAIGHT',
  CURVE_LEFT = 'CURVE_LEFT',
  CURVE_RIGHT = 'CURVE_RIGHT',
  ELEVATION_UP = 'ELEVATION_UP',
  ELEVATION_DOWN = 'ELEVATION_DOWN',
}

export interface HighwaySegment {
  id: string;
  type: SegmentType;
  mesh: THREE.Group;
  length: number;
  startZ: number;
  endZ: number;
  curvature: number;
  elevationChange: number;
  laneCount: number;
  laneWidth: number;
  isActive: boolean;
  batchId?: number;
  zoneId?: string;
}

export interface HighwayLoopConfig {
  /** Number of active segments around player */
  activeSegmentCount: number;
  /** Distance ahead to keep segments */
  renderDistance: number;
  /** Distance behind to cull segments */
  cullDistance: number;
  /** Enable static batching for merged geometry */
  enableBatching: boolean;
}

const DEFAULT_CONFIG: HighwayLoopConfig = {
  activeSegmentCount: 5,
  renderDistance: 150,
  cullDistance: 50,
  enableBatching: true,
};

export class HighwayLoopManager {
  private segments: HighwaySegment[] = [];
  private activeSegments: HighwaySegment[] = [];
  private config: HighwayLoopConfig;
  private segmentIdCounter: number = 0;
  private recycledIndices: number[] = [];
  
  // Static batching
  private batchedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private batchGeometries: Map<string, THREE.BufferGeometry> = new Map();
  
  // Road materials
  private roadMaterial: THREE.MeshPhongMaterial;
  private markingMaterial: THREE.MeshBasicMaterial;
  private barrierMaterial: THREE.MeshPhongMaterial;

  constructor(config: Partial<HighwayLoopConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize materials
    this.roadMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x333333,
      flatShading: true,
    });
    this.markingMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
    });
    this.barrierMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x888888,
      flatShading: true,
    });
  }

  /**
   * Set zone manager for zone-based segment properties
   */
  setZoneManager(zoneManager: ZoneManager): void {
    this.zoneManager = zoneManager;
  }

  /**
   * Initialize the highway loop with initial segments
   */
  init(segments?: HighwaySegment[]): void {
    this.segments = [];
    this.activeSegments = [];
    this.recycledIndices = [];
    
    if (segments && segments.length > 0) {
      this.segments = segments;
    } else {
      // Generate initial segments
      this.generateInitialSegments(this.config.activeSegmentCount + 2);
    }
    
    this.updateActiveSegments(new THREE.Vector3(0, 0, 0));
  }

  /**
   * Generate initial set of highway segments
   */
  private generateInitialSegments(count: number): void {
    let currentZ = 0;
    
    for (let i = 0; i < count; i++) {
      const segment = this.createSegment(currentZ);
      this.segments.push(segment);
      currentZ = segment.endZ;
    }
  }

  /**
   * Create a new highway segment
   */
  private createSegment(startZ: number, type?: SegmentType): HighwaySegment {
    const segmentTypes: SegmentType[] = [
      SegmentType.STRAIGHT,
      SegmentType.CURVE_LEFT,
      SegmentType.CURVE_RIGHT,
      SegmentType.ELEVATION_UP,
      SegmentType.ELEVATION_DOWN,
    ];
    
    // Weight towards straight segments for highway feel
    const selectedType = type ?? (
      Math.random() < 0.6 ? SegmentType.STRAIGHT :
      segmentTypes[Math.floor(Math.random() * segmentTypes.length)]
    );

    const length = TRACK_CONFIG.SEGMENT_LENGTH_BASE + Math.random() * 50;
    let curvature = 0;
    let elevationChange = 0;

    switch (selectedType) {
      case SegmentType.CURVE_LEFT:
        curvature = -1 / (TRACK_CONFIG.CURVE_RADIUS_MIN + Math.random() * (TRACK_CONFIG.CURVE_RADIUS_MAX - TRACK_CONFIG.CURVE_RADIUS_MIN));
        break;
      case SegmentType.CURVE_RIGHT:
        curvature = 1 / (TRACK_CONFIG.CURVE_RADIUS_MIN + Math.random() * (TRACK_CONFIG.CURVE_RADIUS_MAX - TRACK_CONFIG.CURVE_RADIUS_MIN));
        break;
      case SegmentType.ELEVATION_UP:
        elevationChange = Math.random() * TRACK_CONFIG.ELEVATION_CHANGE_MAX;
        break;
      case SegmentType.ELEVATION_DOWN:
        elevationChange = -Math.random() * TRACK_CONFIG.ELEVATION_CHANGE_MAX;
        break;
    }

    const mesh = this.buildSegmentMesh(selectedType, length, curvature, elevationChange);
    
    const segment: HighwaySegment = {
      id: `segment_${this.segmentIdCounter++}`,
      type: selectedType,
      mesh,
      length,
      startZ,
      endZ: startZ - length,
      curvature,
      elevationChange,
      laneCount: TRAFFIC_CONFIG.LANE_COUNT,
      laneWidth: TRAFFIC_CONFIG.LANE_WIDTH,
      isActive: false,
    };

    return segment;
  }

  /**
   * Build the mesh for a highway segment
   */
  private buildSegmentMesh(
    type: SegmentType,
    length: number,
    curvature: number,
    elevationChange: number
  ): THREE.Group {
    const group = new THREE.Group();
    const roadWidth = TRAFFIC_CONFIG.LANE_COUNT * TRAFFIC_CONFIG.LANE_WIDTH;

    // Road surface
    const roadGeo = new THREE.PlaneGeometry(roadWidth, length, 1, 4);
    
    // Apply curvature vertices
    if (curvature !== 0) {
      this.applyCurvatureToGeometry(roadGeo, curvature, length);
    }
    
    // Apply elevation
    if (elevationChange !== 0) {
      this.applyElevationToGeometry(roadGeo, elevationChange, length);
    }

    const road = new THREE.Mesh(roadGeo, this.roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = (startZ + (startZ - length)) / 2;
    road.position.y = elevationChange / 2;
    road.receiveShadow = true;
    group.add(road);

    // Lane markings
    this.addLaneMarkings(group, length, curvature);

    // Barriers
    this.addBarriers(group, length, roadWidth);

    return group;
  }

  private applyCurvatureToGeometry(geometry: THREE.PlaneGeometry, curvature: number, length: number): void {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
      const x = positions[i * 3];
      const z = positions[i * 3 + 1]; // In plane geometry, this is actually Y
      
      // Calculate offset based on curvature
      const normalizedZ = (z + length / 2) / length; // 0 to 1 along segment
      const offset = (1 - Math.cos(normalizedZ * Math.PI)) / curvature * 0.5;
      positions[i * 3] = x + offset;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private applyElevationToGeometry(geometry: THREE.PlaneGeometry, elevationChange: number, length: number): void {
    const positions = geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
      const z = positions[i * 3 + 1]; // In plane geometry, this is actually Y
      const normalizedZ = (z + length / 2) / length; // 0 to 1 along segment
      positions[i * 3 + 2] = normalizedZ * elevationChange; // Z in plane becomes Y in world
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  private addLaneMarkings(group: THREE.Group, length: number, curvature: number): void {
    const markingGeo = new THREE.PlaneGeometry(0.15, 4);
    const dashSpacing = 8;

    for (let lane = 1; lane < TRAFFIC_CONFIG.LANE_COUNT; lane++) {
      const x = (lane - TRAFFIC_CONFIG.LANE_COUNT / 2) * TRAFFIC_CONFIG.LANE_WIDTH;
      
      for (let z = 0; z < length; z += dashSpacing) {
        const marking = new THREE.Mesh(markingGeo, this.markingMaterial);
        marking.rotation.x = -Math.PI / 2;
        marking.position.set(x, 0.02, -z - dashSpacing / 2);
        group.add(marking);
      }
    }
  }

  private addBarriers(group: THREE.Group, length: number, roadWidth: number): void {
    const barrierGeo = new THREE.BoxGeometry(0.3, 0.6, length);
    const halfWidth = roadWidth / 2 + 0.15;

    // Left barrier
    const leftBarrier = new THREE.Mesh(barrierGeo, this.barrierMaterial);
    leftBarrier.position.set(-halfWidth, 0.3, -length / 2);
    leftBarrier.castShadow = true;
    leftBarrier.receiveShadow = true;
    group.add(leftBarrier);

    // Right barrier
    const rightBarrier = new THREE.Mesh(barrierGeo, this.barrierMaterial);
    rightBarrier.position.set(halfWidth, 0.3, -length / 2);
    rightBarrier.castShadow = true;
    rightBarrier.receiveShadow = true;
    group.add(rightBarrier);
  }

  /**
   * Update active segments based on player position
   */
  update(playerPosition: THREE.Vector3): void {
    const playerZ = playerPosition.z;
    
    // Update which segments are active
    this.updateActiveSegments(playerPosition);
    
    // Recycle segments that are too far behind
    this.recycleOldSegments(playerZ);
    
    // Generate new segments ahead
    this.extendTrackAhead(playerZ);
    
    // Update segment transforms for continuous loop
    this.updateSegmentTransforms();
  }

  /**
   * Update the list of active segments
   */
  private updateActiveSegments(playerPosition: THREE.Vector3): void {
    const playerZ = playerPosition.z;
    
    this.activeSegments = this.segments.filter((seg) => {
      return seg.startZ > playerZ - this.config.cullDistance &&
             seg.endZ < playerZ + this.config.renderDistance;
    });
    
    // Mark segments as active/inactive
    for (const seg of this.segments) {
      seg.isActive = this.activeSegments.includes(seg);
      seg.mesh.visible = seg.isActive;
    }
  }

  /**
   * Recycle old segments that are behind the player
   */
  private recycleOldSegments(playerZ: number): void {
    const cutoffZ = playerZ + this.config.cullDistance;
    
    for (let i = 0; i < this.segments.length; i++) {
      const seg = this.segments[i];
      if (seg.startZ > cutoffZ && seg.isActive === false) {
        // Mark for recycling
        this.recycledIndices.push(i);
      }
    }
  }

  /**
   * Extend track ahead of player
   */
  private extendTrackAhead(playerZ: number): void {
    const lastSegmentEnd = this.segments.length > 0 
      ? Math.min(...this.segments.map(s => s.endZ))
      : 0;
    
    const threshold = playerZ - this.config.renderDistance + 50;
    
    while (lastSegmentEnd > threshold) {
      // Find a recycled segment index or add new
      if (this.recycledIndices.length > 0) {
        const recycledIdx = this.recycledIndices.pop()!;
        const oldSeg = this.segments[recycledIdx];
        
        // Remove old mesh
        oldSeg.mesh.removeFromParent();
        
        // Create new segment at the end
        const newStartZ = lastSegmentEnd;
        const newSegment = this.createSegment(newStartZ);
        this.segments[recycledIdx] = newSegment;
      } else {
        // Add new segment
        const newSegment = this.createSegment(lastSegmentEnd);
        this.segments.push(newSegment);
      }
      break; // Only add one per frame to avoid spikes
    }
  }

  /**
   * Update segment transforms for seamless connections
   */
  private updateSegmentTransforms(): void {
    for (let i = 0; i < this.segments.length - 1; i++) {
      const current = this.segments[i];
      const next = this.segments[i + 1];
      
      // Ensure continuity in Z
      const gap = current.endZ - next.startZ;
      if (Math.abs(gap) > 0.1) {
        next.mesh.position.z -= gap;
        next.startZ -= gap;
        next.endZ -= gap;
      }
      
      // Match elevation
      const elevDiff = current.elevationChange - (next.elevationChange * (next.startZ / next.length));
      if (Math.abs(elevDiff) > 0.1) {
        next.mesh.position.y += elevDiff;
      }
    }
  }

  /**
   * Get currently active segments
   */
  getActiveSegments(): HighwaySegment[] {
    return this.activeSegments;
  }

  /**
   * Get all segments
   */
  getAllSegments(): HighwaySegment[] {
    return this.segments;
  }

  /**
   * Get segment at specific Z position
   */
  getSegmentAtZ(z: number): HighwaySegment | undefined {
    return this.segments.find((seg) => z >= seg.endZ && z <= seg.startZ);
  }

  /**
   * Get track position and properties at specific Z
   */
  getPositionAtZ(z: number): { x: number; y: number; curvature: number; segment?: HighwaySegment } {
    const segment = this.getSegmentAtZ(z);
    if (!segment) {
      return { x: 0, y: 0, curvature: 0 };
    }
    
    const t = (segment.startZ - z) / segment.length;
    const xOffset = segment.curvature !== 0 
      ? (1 - Math.cos(t * Math.PI)) / segment.curvature * 0.5
      : 0;
    const yOffset = segment.elevationChange * t;
    
    return {
      x: xOffset,
      y: yOffset,
      curvature: segment.curvature,
      segment,
    };
  }

  /**
   * Enable static batching for active segments
   */
  enableStaticBatching(): void {
    if (!this.config.enableBatching) return;
    
    // Group segments by material for batching
    const roadMeshes: THREE.Mesh[] = [];
    const markingMeshes: THREE.Mesh[] = [];
    const barrierMeshes: THREE.Mesh[] = [];
    
    for (const seg of this.activeSegments) {
      seg.mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material === this.roadMaterial) {
            roadMeshes.push(child);
          } else if (child.material === this.markingMaterial) {
            markingMeshes.push(child);
          } else if (child.material === this.barrierMaterial) {
            barrierMeshes.push(child);
          }
        }
      });
    }
    
    // Batch road surfaces
    if (roadMeshes.length > 0) {
      this.batchMeshes('road', roadMeshes, this.roadMaterial);
    }
    
    // Batch markings
    if (markingMeshes.length > 0) {
      this.batchMeshes('markings', markingMeshes, this.markingMaterial);
    }
    
    // Batch barriers
    if (barrierMeshes.length > 0) {
      this.batchMeshes('barriers', barrierMeshes, this.barrierMaterial);
    }
  }

  /**
   * Batch meshes together for better performance
   */
  private batchMeshes(name: string, meshes: THREE.Mesh[], material: THREE.Material): void {
    // Simple merge for now - could use InstancedMesh for identical meshes
    const geometries: THREE.BufferGeometry[] = [];
    
    for (const mesh of meshes) {
      mesh.updateMatrixWorld(true);
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      geometries.push(geo);
    }
    
    const mergedGeometry = this.mergeGeometries(geometries);
    this.batchGeometries.set(name, mergedGeometry);
    
    // Create or update instanced mesh
    const existingBatch = this.batchedMeshes.get(name);
    if (existingBatch) {
      existingBatch.geometry.dispose();
      existingBatch.geometry = mergedGeometry;
    } else {
      const batchedMesh = new THREE.Mesh(mergedGeometry, material);
      this.batchedMeshes.set(name, batchedMesh as unknown as THREE.InstancedMesh);
    }
  }

  /**
   * Merge multiple geometries into one
   */
  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    // Simple merge implementation
    const totalVertices = geometries.reduce((sum, geo) => sum + geo.attributes.position.count, 0);
    
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    
    for (const geo of geometries) {
      const pos = geo.attributes.position.array;
      positions.push(...Array.from(pos));
      
      if (geo.attributes.normal) {
        const norm = geo.attributes.normal.array;
        normals.push(...Array.from(norm));
      }
      
      if (geo.attributes.uv) {
        const uv = geo.attributes.uv.array;
        uvs.push(...Array.from(uv));
      }
    }
    
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    if (normals.length > 0) {
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    }
    
    if (uvs.length > 0) {
      merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    }
    
    return merged;
  }

  /**
   * Get batched mesh for rendering
   */
  getBatchedMesh(name: string): THREE.Object3D | undefined {
    return this.batchedMeshes.get(name);
  }

  /**
   * Clear all segments and reset
   */
  clear(): void {
    for (const seg of this.segments) {
      seg.mesh.removeFromParent();
    }
    this.segments = [];
    this.activeSegments = [];
    this.recycledIndices = [];
    
    for (const [, mesh] of this.batchedMeshes) {
      mesh.geometry.dispose();
    }
    this.batchedMeshes.clear();
    this.batchGeometries.clear();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
    this.roadMaterial.dispose();
    this.markingMaterial.dispose();
    this.barrierMaterial.dispose();
  }
}
