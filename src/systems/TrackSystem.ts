/**
 * Highway Track System
 * Procedural track generation with segments, curves, elevation, and props
 */

import * as THREE from 'three';
import { TRACK_CONFIG, TRAFFIC_CONFIG } from '../config/gameConfig';

export enum SegmentType {
  STRAIGHT = 'STRAIGHT',
  CURVE_LEFT = 'CURVE_LEFT',
  CURVE_RIGHT = 'CURVE_RIGHT',
  ELEVATION_UP = 'ELEVATION_UP',
  ELEVATION_DOWN = 'ELEVATION_DOWN',
  TUNNEL = 'TUNNEL',
  BRIDGE = 'BRIDGE',
}

export interface TrackSegment {
  type: SegmentType;
  length: number;
  startZ: number;
  endZ: number;
  curvature: number;
  elevationChange: number;
  hasBarriers: boolean;
  regionType: keyof typeof TRACK_CONFIG.REGIONS;
  props: PropData[];
}

export interface PropData {
  type: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export class HighwayTrack {
  public segments: TrackSegment[] = [];
  private totalLength: number = 0;
  private currentZ: number = 0;
  private regionIndex: number = 0;
  private readonly regions: (keyof typeof TRACK_CONFIG.REGIONS)[] = ['CITY', 'DESERT', 'FOREST', 'COASTAL'];

  constructor() {
    this.generateInitialSegments(10);
  }

  /**
   * Generate initial set of track segments
   */
  private generateInitialSegments(count: number): void {
    for (let i = 0; i < count; i++) {
      this.addSegment();
    }
  }

  /**
   * Add a new procedural segment
   */
  addSegment(): TrackSegment {
    const segmentTypes = TRACK_CONFIG.SEGMENT_TYPES;
    
    // Weight towards straight segments for highway feel
    const typeWeights = [0.5, 0.15, 0.15, 0.08, 0.08, 0.02, 0.02];
    const random = Math.random();
    let cumulative = 0;
    let selectedType = SegmentType.STRAIGHT;

    for (let i = 0; i < segmentTypes.length; i++) {
      cumulative += typeWeights[i];
      if (random < cumulative) {
        selectedType = segmentTypes[i] as SegmentType;
        break;
      }
    }

    // Determine segment properties based on type
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

    // Select region
    const regionType = this.regions[this.regionIndex % this.regions.length];

    // Generate props
    const props = this.generateProps(length, selectedType, regionType);

    const segment: TrackSegment = {
      type: selectedType,
      length,
      startZ: this.currentZ,
      endZ: this.currentZ - length,
      curvature,
      elevationChange,
      hasBarriers: true,
      regionType,
      props,
    };

    this.segments.push(segment);
    this.totalLength += length;
    this.currentZ -= length;

    return segment;
  }

  /**
   * Generate roadside props for a segment
   */
  private generateProps(length: number, type: SegmentType, regionType: keyof typeof TRACK_CONFIG.REGIONS): PropData[] {
    const props: PropData[] = [];
    const region = TRACK_CONFIG.REGIONS[regionType];
    const propTypes = region.props;

    // Generate props on both sides of the road
    const propCount = Math.floor(length / 20); // One prop per 20 units

    for (let i = 0; i < propCount; i++) {
      const z = -i * 20 - Math.random() * 10;
      const propType = propTypes[Math.floor(Math.random() * propTypes.length)];
      
      // Left side
      if (Math.random() > 0.3) {
        props.push({
          type: propType,
          position: new THREE.Vector3(-10 - Math.random() * 5, 0, z),
          rotation: new THREE.Euler(0, Math.random() * Math.PI, 0),
          scale: new THREE.Vector3(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5),
        });
      }

      // Right side
      if (Math.random() > 0.3) {
        props.push({
          type: propType,
          position: new THREE.Vector3(10 + Math.random() * 5, 0, z),
          rotation: new THREE.Euler(0, Math.random() * Math.PI, 0),
          scale: new THREE.Vector3(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5),
        });
      }
    }

    return props;
  }

  /**
   * Get track position at a specific Z coordinate
   */
  getPositionAtZ(z: number): { x: number; y: number; curvature: number } {
    for (const segment of this.segments) {
      if (z >= segment.endZ && z <= segment.startZ) {
        const t = (segment.startZ - z) / segment.length;
        
        // Calculate X offset based on curvature
        const xOffset = segment.curvature !== 0 
          ? (1 - Math.cos(t * Math.PI)) / segment.curvature 
          : 0;

        // Calculate Y based on elevation
        const yOffset = segment.elevationChange * t;

        return {
          x: xOffset,
          y: yOffset,
          curvature: segment.curvature,
        };
      }
    }

    return { x: 0, y: 0, curvature: 0 };
  }

  /**
   * Check if we need to generate more segments ahead
   */
  shouldExtendTrack(playerZ: number, renderDistance: number): boolean {
    const lastSegmentEnd = this.segments[this.segments.length - 1]?.endZ || 0;
    return playerZ - lastSegmentEnd < renderDistance;
  }

  /**
   * Remove old segments behind the player
   */
  cleanupOldSegments(playerZ: number, keepDistance: number): void {
    const cutoff = playerZ + keepDistance;
    this.segments = this.segments.filter((seg) => seg.startZ < cutoff);
  }

  /**
   * Get total track length generated so far
   */
  getTotalLength(): number {
    return this.totalLength;
  }

  /**
   * Reset track for new game
   */
  reset(): void {
    this.segments = [];
    this.totalLength = 0;
    this.currentZ = 0;
    this.regionIndex = 0;
    this.generateInitialSegments(10);
  }

  /**
   * Advance region index for variety
   */
  advanceRegion(): void {
    this.regionIndex++;
  }
}

/**
 * Road Mesh Builder
 * Creates optimized road geometry from track segments
 */
export class RoadMeshBuilder {
  private roadGeometry: THREE.BufferGeometry | null = null;
  private roadMaterial: THREE.MeshPhongMaterial;
  private markingMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.roadMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    this.markingMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  }

  /**
   * Build road mesh for a segment
   */
  buildSegmentMesh(segment: TrackSegment): THREE.Group {
    const group = new THREE.Group();

    // Road surface
    const roadGeo = new THREE.PlaneGeometry(
      TRAFFIC_CONFIG.LANE_WIDTH * TRAFFIC_CONFIG.LANE_COUNT,
      segment.length
    );
    const road = new THREE.Mesh(roadGeo, this.roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = (segment.startZ + segment.endZ) / 2;
    road.position.y = segment.elevationChange / 2;
    
    // Apply curvature
    if (segment.curvature !== 0) {
      this.applyCurvature(roadGeo, segment.curvature, segment.length);
    }

    group.add(road);

    // Lane markings
    this.addLaneMarkings(group, segment);

    // Barriers
    if (segment.hasBarriers) {
      this.addBarriers(group, segment);
    }

    // Props
    segment.props.forEach((prop) => {
      const propMesh = this.createPropMesh(prop.type);
      propMesh.position.copy(prop.position);
      propMesh.rotation.copy(prop.rotation);
      propMesh.scale.copy(prop.scale);
      group.add(propMesh);
    });

    return group;
  }

  /**
   * Apply curvature to road geometry
   */
  private applyCurvature(geometry: THREE.PlaneGeometry, curvature: number, length: number): void {
    const positions = geometry.attributes.position.array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const arcLength = positions[i + 1]; // This is actually Z in our case
      
      // Calculate offset based on curvature
      const offset = (1 - Math.cos(arcLength * curvature)) / curvature;
      positions[i] = x + offset;
    }
    
    geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Add lane markings to segment
   */
  private addLaneMarkings(group: THREE.Group, segment: TrackSegment): void {
    const markingGeo = new THREE.PlaneGeometry(0.2, 5);
    const dashSpacing = 10;

    // Center lines
    for (let lane = 1; lane < TRAFFIC_CONFIG.LANE_COUNT; lane++) {
      const x = (lane - TRAFFIC_CONFIG.LANE_COUNT / 2) * TRAFFIC_CONFIG.LANE_WIDTH;
      
      for (let z = segment.startZ; z > segment.endZ; z -= dashSpacing) {
        const marking = new THREE.Mesh(markingGeo, this.markingMaterial);
        marking.rotation.x = -Math.PI / 2;
        marking.position.set(x, 0.01, z - dashSpacing / 2);
        group.add(marking);
      }
    }
  }

  /**
   * Add roadside barriers
   */
  private addBarriers(group: THREE.Group, segment: TrackSegment): void {
    const barrierGeo = new THREE.BoxGeometry(0.5, 0.5, segment.length);
    const barrierMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const halfWidth = (TRAFFIC_CONFIG.LANE_COUNT * TRAFFIC_CONFIG.LANE_WIDTH) / 2;

    // Left barrier
    const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    leftBarrier.position.set(-halfWidth - 0.25, 0.25, (segment.startZ + segment.endZ) / 2);
    group.add(leftBarrier);

    // Right barrier
    const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    rightBarrier.position.set(halfWidth + 0.25, 0.25, (segment.startZ + segment.endZ) / 2);
    group.add(rightBarrier);
  }

  /**
   * Create a prop mesh by type
   */
  private createPropMesh(type: string): THREE.Mesh {
    // Simple placeholder props - would be replaced with actual models
    const geo = new THREE.BoxGeometry(1, 2, 1);
    const mat = new THREE.MeshPhongMaterial({ color: 0x446644 });
    return new THREE.Mesh(geo, mat);
  }

  dispose(): void {
    this.roadMaterial.dispose();
    this.markingMaterial.dispose();
    if (this.roadGeometry) {
      this.roadGeometry.dispose();
    }
  }
}
