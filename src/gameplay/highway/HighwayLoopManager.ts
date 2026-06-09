/**
 * Highway Loop Manager - Tokyo Xtreme Racer Style
 * Creates infinite highway loop illusion by recycling segments
 * Manages segment pooling and player-relative positioning
 */

import * as THREE from 'three';
import { PerformanceMonitor } from '../engine/core/PerformanceMonitor';

export interface HighwaySegmentConfig {
  /** Length of segment in units */
  length: number;
  /** Width of highway in units */
  width: number;
  /** Number of lanes */
  laneCount: number;
  /** Lane width */
  laneWidth: number;
  /** Has barriers */
  hasBarriers: boolean;
  /** Has street lights */
  hasStreetLights: boolean;
  /** Segment type */
  segmentType: 'straight' | 'curve_left' | 'curve_right' | 'bridge' | 'tunnel';
}

const DEFAULT_SEGMENT_CONFIG: HighwaySegmentConfig = {
  length: 100,
  width: 16.8, // 4 lanes × 4.2m
  laneCount: 4,
  laneWidth: 4.2,
  hasBarriers: true,
  hasStreetLights: true,
  segmentType: 'straight',
};

export interface HighwaySegment {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  startZ: number;
  endZ: number;
  isActive: boolean;
  config: HighwaySegmentConfig;
}

export interface HighwayLoopConfig {
  /** Number of segments to keep active */
  activeSegmentCount: number;
  /** Segment configuration */
  segmentConfig: Partial<HighwaySegmentConfig>;
  /** Enable procedural generation */
  enableProceduralGeneration: boolean;
  /** Recycle distance (when to move segment from back to front) */
  recycleDistance: number;
}

const DEFAULT_LOOP_CONFIG: HighwayLoopConfig = {
  activeSegmentCount: 5,
  segmentConfig: DEFAULT_SEGMENT_CONFIG,
  enableProceduralGeneration: true,
  recycleDistance: 50,
};

export class HighwayLoopManager {
  private config: HighwayLoopConfig;
  private performanceMonitor: PerformanceMonitor;
  
  // Segment pool
  private segments: Map<string, HighwaySegment> = new Map();
  private segmentPool: HighwaySegment[] = [];
  
  // Active segments (ordered by Z position)
  private activeSegments: HighwaySegment[] = [];
  
  // Tracking
  private lastPlayerZ: number = 0;
  private totalSegmentsCreated: number = 0;
  
  // Geometry cache
  private segmentGeometry: THREE.BufferGeometry | null = null;
  private segmentMaterial: THREE.MeshPhongMaterial | null = null;
  
  constructor(config: Partial<HighwayLoopConfig> = {}) {
    this.config = { ...DEFAULT_LOOP_CONFIG, ...config };
    this.performanceMonitor = new PerformanceMonitor();
  }
  
  /**
   * Initialize highway loop
   */
  init(): void {
    this.createSegmentGeometry();
    this.initializeSegments();
  }
  
  /**
   * Update highway loop based on player position
   */
  update(playerPosition: THREE.Vector3): void {
    this.performanceMonitor.beginFrame();
    
    const playerZ = playerPosition.z;
    const segmentLength = this.config.segmentConfig.length ?? DEFAULT_SEGMENT_CONFIG.length;
    
    // Check if we need to recycle segments
    const distanceTraveled = this.lastPlayerZ - playerZ;
    
    if (Math.abs(distanceTraveled) > segmentLength * 0.5) {
      this.recycleSegments(playerZ);
      this.lastPlayerZ = playerZ;
    }
    
    // Update segment positions relative to player
    this.updateSegmentPositions(playerZ);
    
    this.performanceMonitor.endFrame();
  }
  
  /**
   * Get all active segments
   */
  getActiveSegments(): HighwaySegment[] {
    return [...this.activeSegments];
  }
  
  /**
   * Get all segments (including pooled)
   */
  getAllSegments(): HighwaySegment[] {
    return [...this.segments.values()];
  }
  
  /**
   * Get segment at specific Z position
   */
  getSegmentAtZ(z: number): HighwaySegment | null {
    for (const segment of this.activeSegments) {
      if (z >= segment.startZ && z <= segment.endZ) {
        return segment;
      }
    }
    return null;
  }
  
  /**
   * Clear all segments
   */
  clear(): void {
    for (const segment of this.segments.values()) {
      segment.mesh.removeFromParent();
      segment.mesh.traverse((child) => {
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
    
    this.segments.clear();
    this.segmentPool = [];
    this.activeSegments = [];
    this.totalSegmentsCreated = 0;
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.clear();
    
    if (this.segmentGeometry) {
      this.segmentGeometry.dispose();
      this.segmentGeometry = null;
    }
    
    if (this.segmentMaterial) {
      this.segmentMaterial.dispose();
      this.segmentMaterial = null;
    }
  }
  
  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================
  
  /**
   * Create segment geometry
   */
  private createSegmentGeometry(): void {
    const config = this.config.segmentConfig;
    const length = config.length ?? DEFAULT_SEGMENT_CONFIG.length;
    const width = config.width ?? DEFAULT_SEGMENT_CONFIG.width;
    
    // Create road surface
    const roadGeometry = new THREE.PlaneGeometry(width, length);
    const roadMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2,
    });
    
    // Create lane markings
    const laneCount = config.laneCount ?? DEFAULT_SEGMENT_CONFIG.laneCount;
    const laneWidth = config.laneWidth ?? DEFAULT_SEGMENT_CONFIG.laneWidth;
    
    // Create a group for the segment
    const segmentGroup = new THREE.Group();
    
    // Road surface
    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.receiveShadow = true;
    segmentGroup.add(roadMesh);
    
    // Lane markings
    this.createLaneMarkings(segmentGroup, laneCount, laneWidth, length);
    
    // Barriers
    if (config.hasBarriers ?? DEFAULT_SEGMENT_CONFIG.hasBarriers) {
      this.createBarriers(segmentGroup, width, length);
    }
    
    // Street lights
    if (config.hasStreetLights ?? DEFAULT_SEGMENT_CONFIG.hasStreetLights) {
      this.createStreetLights(segmentGroup, width, length);
    }
    
    // Store geometry and material for instancing
    this.segmentGeometry = roadGeometry;
    this.segmentMaterial = roadMaterial;
  }
  
  /**
   * Create lane markings
   */
  private createLaneMarkings(
    group: THREE.Group,
    laneCount: number,
    laneWidth: number,
    length: number
  ): void {
    const markingMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0x222222,
    });
    
    // Dashed lines between lanes
    for (let i = 1; i < laneCount; i++) {
      const x = (i - laneCount / 2) * laneWidth + laneWidth / 2;
      
      // Create dashed pattern
      const dashLength = length / 20;
      const gapLength = dashLength;
      
      for (let z = -length / 2; z < length / 2; z += dashLength + gapLength) {
        const markingGeo = new THREE.PlaneGeometry(0.15, dashLength);
        const marking = new THREE.Mesh(markingGeo, markingMaterial);
        marking.rotation.x = -Math.PI / 2;
        marking.position.set(x, 0.01, z);
        marking.receiveShadow = true;
        group.add(marking);
      }
    }
    
    // Solid edge lines
    const edgeOffset = (laneCount * laneWidth) / 2 - laneWidth / 4;
    [-1, 1].forEach(side => {
      const edgeGeo = new THREE.PlaneGeometry(0.2, length);
      const edge = new THREE.Mesh(edgeGeo, markingMaterial);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(side * edgeOffset, 0.01, 0);
      edge.receiveShadow = true;
      group.add(edge);
    });
  }
  
  /**
   * Create barriers
   */
  private createBarriers(group: THREE.Group, width: number, length: number): void {
    const barrierMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      roughness: 0.7,
    });
    
    const barrierHeight = 1.2;
    const barrierThickness = 0.3;
    
    [-1, 1].forEach(side => {
      const barrierGeo = new THREE.BoxGeometry(barrierThickness, barrierHeight, length);
      const barrier = new THREE.Mesh(barrierGeo, barrierMaterial);
      barrier.position.set(side * (width / 2 + barrierThickness / 2), barrierHeight / 2, 0);
      barrier.castShadow = true;
      barrier.receiveShadow = true;
      group.add(barrier);
    });
  }
  
  /**
   * Create street lights
   */
  private createStreetLights(group: THREE.Group, width: number, length: number): void {
    const poleMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
    });
    
    const lightMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffaa,
      emissive: 0xffffaa,
      emissiveIntensity: 0.5,
    });
    
    const poleHeight = 8;
    const armLength = 3;
    const spacing = 20;
    
    for (let z = -length / 2 + spacing / 2; z < length / 2; z += spacing) {
      [-1, 1].forEach(side => {
        const poleGroup = new THREE.Group();
        
        // Pole
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, poleHeight, 8);
        const pole = new THREE.Mesh(poleGeo, poleMaterial);
        pole.position.y = poleHeight / 2;
        poleGroup.add(pole);
        
        // Arm
        const armGeo = new THREE.CylinderGeometry(0.1, 0.1, armLength, 8);
        const arm = new THREE.Mesh(armGeo, poleMaterial);
        arm.rotation.z = side * Math.PI / 2;
        arm.position.set(side * armLength / 2, poleHeight - 1, 0);
        poleGroup.add(arm);
        
        // Light fixture
        const lightGeo = new THREE.BoxGeometry(0.5, 0.3, 1);
        const light = new THREE.Mesh(lightGeo, lightMaterial);
        light.position.set(side * armLength, poleHeight - 1.2, 0);
        poleGroup.add(light);
        
        // Point light
        const pointLight = new THREE.PointLight(0xffffaa, 0.5, 30);
        pointLight.position.set(side * armLength, poleHeight - 2, 0);
        poleGroup.add(pointLight);
        
        poleGroup.position.set(side * (width / 2 + 0.5), 0, z);
        group.add(poleGroup);
      });
    }
  }
  
  /**
   * Initialize segment pool
   */
  private initializeSegments(): void {
    const count = this.config.activeSegmentCount;
    
    for (let i = 0; i < count; i++) {
      const segment = this.createSegment(i);
      this.segments.set(segment.id, segment);
      this.activeSegments.push(segment);
    }
  }
  
  /**
   * Create a new segment
   */
  private createSegment(index: number): HighwaySegment {
    const config = this.config.segmentConfig;
    const length = config.length ?? DEFAULT_SEGMENT_CONFIG.length;
    const width = config.width ?? DEFAULT_SEGMENT_CONFIG.width;
    
    // Create segment group
    const segmentGroup = new THREE.Group();
    
    // Clone existing geometry or create new
    if (this.segmentGeometry && this.segmentMaterial) {
      const roadMesh = new THREE.Mesh(this.segmentGeometry, this.segmentMaterial);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = true;
      segmentGroup.add(roadMesh);
      
      // Add details
      const laneCount = config.laneCount ?? DEFAULT_SEGMENT_CONFIG.laneCount;
      const laneWidth = config.laneWidth ?? DEFAULT_SEGMENT_CONFIG.laneWidth;
      this.createLaneMarkings(segmentGroup, laneCount, laneWidth, length);
      
      if (config.hasBarriers ?? DEFAULT_SEGMENT_CONFIG.hasBarriers) {
        this.createBarriers(segmentGroup, width, length);
      }
      
      if (config.hasStreetLights ?? DEFAULT_SEGMENT_CONFIG.hasStreetLights) {
        this.createStreetLights(segmentGroup, width, length);
      }
    }
    
    const id = `segment_${this.totalSegmentsCreated++}`;
    const startZ = -index * length;
    
    return {
      id,
      mesh: segmentGroup,
      position: new THREE.Vector3(0, 0, startZ + length / 2),
      rotation: new THREE.Euler(0, 0, 0),
      startZ,
      endZ: startZ + length,
      isActive: true,
      config: { ...DEFAULT_SEGMENT_CONFIG, ...config },
    };
  }
  
  /**
   * Recycle segments based on player position
   */
  private recycleSegments(playerZ: number): void {
    const segmentLength = this.config.segmentConfig.length ?? DEFAULT_SEGMENT_CONFIG.length;
    const recycleThreshold = this.config.recycleDistance;
    
    // Find segments behind player to recycle
    const segmentsToRecycle: HighwaySegment[] = [];
    
    for (const segment of this.activeSegments) {
      if (segment.endZ < playerZ - recycleThreshold) {
        segmentsToRecycle.push(segment);
      }
    }
    
    // Move recycled segments to front
    for (const segment of segmentsToRecycle) {
      // Find the furthest segment end
      let maxEndZ = -Infinity;
      for (const s of this.activeSegments) {
        if (s !== segment && s.endZ > maxEndZ) {
          maxEndZ = s.endZ;
        }
      }
      
      // Position at front
      const newStartZ = maxEndZ;
      segment.startZ = newStartZ;
      segment.endZ = newStartZ + segmentLength;
      segment.position.z = newStartZ + segmentLength / 2;
    }
    
    // Re-sort active segments
    this.activeSegments.sort((a, b) => b.startZ - a.startZ);
  }
  
  /**
   * Update segment positions relative to player
   */
  private updateSegmentPositions(playerZ: number): void {
    for (const segment of this.activeSegments) {
      segment.mesh.position.copy(segment.position);
    }
  }
}

export default HighwayLoopManager;
