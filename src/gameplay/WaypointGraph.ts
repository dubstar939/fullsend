/**
 * Waypoint Graph - Path following for AI agents
 * Simple node graph with connections for navigation
 */

import * as THREE from 'three';

export interface Waypoint {
  /** Unique identifier */
  id: string;
  /** Position in world space */
  position: THREE.Vector3;
  /** Connected waypoint IDs */
  connections: string[];
  /** Optional tag for special behavior */
  tag?: string;
  /** Custom data for game-specific logic */
  userData?: Record<string, unknown>;
}

export interface WaypointPath {
  /** Path name/identifier */
  name: string;
  /** Ordered list of waypoint IDs */
  waypoints: string[];
  /** Whether path loops */
  isLoop: boolean;
}

export interface WaypointGraphConfig {
  /** Default search radius for finding nearest waypoint */
  searchRadius?: number;
}

/**
 * WaypointGraph - Manages navigation waypoints and paths
 * Provides pathfinding and waypoint lookup for AI agents
 */
export class WaypointGraph {
  /** All waypoints indexed by ID */
  private _waypoints: Map<string, Waypoint> = new Map();
  
  /** Pre-defined paths */
  private _paths: Map<string, WaypointPath> = new Map();
  
  /** Spatial index for fast nearest-neighbor queries */
  private _spatialIndex: Array<{ id: string; position: THREE.Vector3 }> = [];
  
  /** Dirty flag for spatial index rebuild */
  private _spatialDirty: boolean = false;
  
  /** Default search radius */
  private _searchRadius: number;
  
  /** Temporary vector for calculations */
  private static _tempVec3 = new THREE.Vector3();

  constructor(config: WaypointGraphConfig = {}) {
    this._searchRadius = config.searchRadius ?? 50;
  }

  /**
   * Add a waypoint to the graph
   */
  addWaypoint(
    id: string,
    position: THREE.Vector3 | [number, number, number],
    connections: string[] = [],
    tag?: string
  ): Waypoint {
    const pos = Array.isArray(position) 
      ? new THREE.Vector3(position[0], position[1], position[2])
      : position.clone();
    
    const waypoint: Waypoint = {
      id,
      position: pos,
      connections,
      tag,
      userData: {},
    };
    
    this._waypoints.set(id, waypoint);
    this._spatialDirty = true;
    
    return waypoint;
  }

  /**
   * Remove a waypoint from the graph
   */
  removeWaypoint(id: string): void {
    this._waypoints.delete(id);
    
    // Remove connections to this waypoint from others
    for (const wp of this._waypoints.values()) {
      const idx = wp.connections.indexOf(id);
      if (idx !== -1) {
        wp.connections.splice(idx, 1);
      }
    }
    
    this._spatialDirty = true;
  }

  /**
   * Get a waypoint by ID
   */
  getWaypoint(id: string): Waypoint | undefined {
    return this._waypoints.get(id);
  }

  /**
   * Get all waypoints
   */
  getAllWaypoints(): Waypoint[] {
    return Array.from(this._waypoints.values());
  }

  /**
   * Find nearest waypoint to a position
   */
  findNearest(position: THREE.Vector3, maxDistance?: number): Waypoint | null {
    this._rebuildSpatialIndexIfNeeded();
    
    let nearest: Waypoint | null = null;
    let minDistSq = Infinity;
    const maxDistSq = (maxDistance ?? this._searchRadius) ** 2;
    
    for (const entry of this._spatialIndex) {
      const distSq = position.distanceToSquared(entry.position);
      
      if (distSq < minDistSq && distSq <= maxDistSq) {
        minDistSq = distSq;
        const wp = this._waypoints.get(entry.id);
        if (wp) {
          nearest = wp;
        }
      }
    }
    
    return nearest;
  }

  /**
   * Define a named path
   */
  definePath(name: string, waypointIds: string[], isLoop: boolean = false): WaypointPath {
    // Validate that all waypoints exist
    for (const id of waypointIds) {
      if (!this._waypoints.has(id)) {
        console.warn(`[WaypointGraph] Path "${name}" references non-existent waypoint: ${id}`);
      }
    }
    
    const path: WaypointPath = {
      name,
      waypoints: waypointIds,
      isLoop,
    };
    
    this._paths.set(name, path);
    return path;
  }

  /**
   * Get a path by name
   */
  getPath(name: string): WaypointPath | undefined {
    return this._paths.get(name);
  }

  /**
   * Get path as array of positions
   */
  getPathPositions(name: string): THREE.Vector3[] | null {
    const path = this._paths.get(name);
    if (!path) return null;
    
    const positions: THREE.Vector3[] = [];
    for (const id of path.waypoints) {
      const wp = this._waypoints.get(id);
      if (wp) {
        positions.push(wp.position.clone());
      }
    }
    
    return positions;
  }

  /**
   * Get next waypoint ID in a path
   */
  getNextWaypointInPath(
    pathName: string,
    currentWaypointId: string
  ): string | null {
    const path = this._paths.get(pathName);
    if (!path || path.waypoints.length === 0) return null;
    
    const currentIndex = path.waypoints.indexOf(currentWaypointId);
    if (currentIndex === -1) return null;
    
    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= path.waypoints.length) {
      if (path.isLoop) {
        nextIndex = 0;
      } else {
        return null; // End of path
      }
    }
    
    return path.waypoints[nextIndex];
  }

  /**
   * Get previous waypoint ID in a path
   */
  getPreviousWaypointInPath(
    pathName: string,
    currentWaypointId: string
  ): string | null {
    const path = this._paths.get(pathName);
    if (!path || path.waypoints.length === 0) return null;
    
    const currentIndex = path.waypoints.indexOf(currentWaypointId);
    if (currentIndex === -1) return null;
    
    let prevIndex = currentIndex - 1;
    
    if (prevIndex < 0) {
      if (path.isLoop) {
        prevIndex = path.waypoints.length - 1;
      } else {
        return null; // Start of path
      }
    }
    
    return path.waypoints[prevIndex];
  }

  /**
   * Find a path between two waypoints (simple BFS)
   */
  findPath(startId: string, endId: string): string[] | null {
    if (!this._waypoints.has(startId) || !this._waypoints.has(endId)) {
      return null;
    }
    
    if (startId === endId) {
      return [startId];
    }
    
    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [
      { id: startId, path: [startId] }
    ];
    
    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      const waypoint = this._waypoints.get(id);
      
      if (!waypoint) continue;
      
      for (const connId of waypoint.connections) {
        if (visited.has(connId)) continue;
        
        const newPath = [...path, connId];
        
        if (connId === endId) {
          return newPath;
        }
        
        visited.add(connId);
        queue.push({ id: connId, path: newPath });
      }
    }
    
    return null; // No path found
  }

  /**
   * Create waypoints along a line (for quick track setup)
   */
  createLinearPath(
    pathName: string,
    start: THREE.Vector3,
    end: THREE.Vector3,
    count: number,
    isLoop: boolean = false
  ): WaypointPath {
    const waypointIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const position = WaypointGraph._tempVec3.lerpVectors(start, end, t);
      const id = `${pathName}_wp_${i}`;
      
      // Connect to previous and next
      const connections: string[] = [];
      if (i > 0) connections.push(`${pathName}_wp_${i - 1}`);
      if (i < count - 1) connections.push(`${pathName}_wp_${i + 1}`);
      
      this.addWaypoint(id, position, connections);
      waypointIds.push(id);
    }
    
    // Close the loop if requested
    if (isLoop && count > 2) {
      const firstId = waypointIds[0];
      const lastId = waypointIds[waypointIds.length - 1];
      
      const firstWp = this._waypoints.get(firstId);
      const lastWp = this._waypoints.get(lastId);
      
      if (firstWp && lastWp) {
        firstWp.connections.push(lastId);
        lastWp.connections.push(firstId);
      }
    }
    
    return this.definePath(pathName, waypointIds, isLoop);
  }

  /**
   * Draw debug visualization (for development)
   */
  createDebugVisualization(): THREE.Group {
    const group = new THREE.Group();
    
    // Create line material
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    
    // Draw connections
    for (const waypoint of this._waypoints.values()) {
      // Draw waypoint sphere
      const sphereGeo = new THREE.SphereGeometry(0.5, 8, 8);
      const sphereMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(waypoint.position);
      group.add(sphere);
      
      // Draw connections
      for (const connId of waypoint.connections) {
        const connWp = this._waypoints.get(connId);
        if (connWp) {
          const points = [waypoint.position, connWp.position];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, lineMaterial);
          group.add(line);
        }
      }
    }
    
    return group;
  }

  /**
   * Clear all waypoints and paths
   */
  clear(): void {
    this._waypoints.clear();
    this._paths.clear();
    this._spatialIndex = [];
    this._spatialDirty = true;
  }

  /**
   * Rebuild spatial index if dirty
   */
  private _rebuildSpatialIndexIfNeeded(): void {
    if (!this._spatialDirty) return;
    
    this._spatialIndex = [];
    for (const [id, waypoint] of this._waypoints.entries()) {
      this._spatialIndex.push({
        id,
        position: waypoint.position,
      });
    }
    
    this._spatialDirty = false;
  }
}
