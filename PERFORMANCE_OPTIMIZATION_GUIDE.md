# Performance Optimization Guide

## Current Performance Systems

This codebase already implements several performance optimization techniques:

### 1. **GPU Instancing** (`InstancedMeshManager.ts`)
- Reduces draw calls by batching identical meshes (trees, buildings, coins, traffic)
- Currently used for: traffic vehicles, environmental objects
- **Status**: ✅ Implemented

### 2. **Frustum Culling** (`CullingSystem.ts`)
- Only renders objects within camera view
- Distance-based culling (150m threshold)
- **Status**: ✅ Implemented

### 3. **LOD System** (`LODSystem.ts`)
- Level-of-detail management based on camera distance
- Auto-generates simplified mesh versions
- **Status**: ✅ Implemented (but mesh simplification is placeholder)

### 4. **Static Batching** (`HighwayLoopManager.ts`)
- Merges road geometries to reduce draw calls
- **Status**: ⚠️ Partially implemented (geometry merging exists but not fully optimized)

### 5. **Performance Monitoring** (`PerformanceMonitor.ts`)
- FPS tracking and frame timing
- **Status**: ✅ Implemented

---

## Recommended Optimizations

### 🔴 Critical Priority

#### 1. **Fix Renderer Precision & Pixel Ratio**
**File**: `src/engine/rendering/Renderer.ts`

```typescript
// Current line 28 - Cap pixel ratio more aggressively
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Changed from 2 to 1.5

// Add after line 25 - Enable depth texture for better shadow performance
this.renderer.shadowMap.enabled = config.shadowQuality !== 'off';
if (config.shadowQuality !== 'off') {
  this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  this.renderer.shadowMap.autoUpdate = false; // Manual control
}
```

**Impact**: 10-20% FPS improvement on mobile devices

---

#### 2. **Optimize Traffic Manager Instance Updates**
**File**: `src/systems/TrafficManager.ts`

```typescript
// Add around line 475 - Batch instance updates
private updateInstanceTransform(vehicle: TrafficVehicle): void {
  if (!this.instancedMeshManager) return;
  
  // Cache matrices to avoid allocations
  if (!vehicle._cachedMatrix) {
    vehicle._cachedMatrix = new THREE.Matrix4();
    vehicle._cachedRotation = new THREE.Euler();
    vehicle._cachedQuaternion = new THREE.Quaternion();
  }
  
  const rotation = vehicle._cachedRotation;
  rotation.set(0, 0, 0);
  
  if (vehicle.isLaneChanging && vehicle.targetLane !== null) {
    const turnDirection = vehicle.targetLane > vehicle.lane ? 1 : -1;
    rotation.y = turnDirection * 0.1 * (1 - vehicle.laneChangeProgress);
  }
  
  vehicle._cachedQuaternion.setFromEuler(rotation);
  vehicle._cachedMatrix.compose(
    vehicle.position,
    vehicle._cachedQuaternion,
    vehicle._cachedScale || new THREE.Vector3(1, 1, 1)
  );
  
  this.instancedMeshManager.updateInstanceWithMatrix(
    vehicle.instanceIndex,
    vehicle._cachedMatrix
  );
}
```

**Impact**: Reduces garbage collection spikes, smoother frame times

---

#### 3. **Implement Object Pooling for Traffic**
**File**: `src/systems/TrafficManager.ts`

Add object pooling to avoid constant allocation/deallocation:

```typescript
// Add to class properties
private vehiclePool: TrafficVehicle[] = [];

// Modify createVehicle method
private createVehicle(playerZ: number): TrafficVehicle | null {
  let vehicle: TrafficVehicle;
  
  // Reuse from pool if available
  if (this.vehiclePool.length > 0) {
    vehicle = this.vehiclePool.pop()!;
  } else {
    vehicle = {
      id: '',
      instanceIndex: 0,
      position: new THREE.Vector3(),
      speed: 0,
      targetSpeed: 0,
      lane: 0,
      targetLane: null,
      vehicleClass: 'SEDAN',
      isLaneChanging: false,
      laneChangeProgress: 0,
      isActive: true,
      zPosition: 0,
    };
  }
  
  // ... rest of initialization
  return vehicle;
}

// Modify removeVehicle
private removeVehicle(id: string): void {
  const vehicle = this.vehicles.get(id);
  if (!vehicle) return;
  
  // Return to pool instead of deleting
  vehicle.isActive = false;
  this.freeInstance(vehicle.instanceIndex);
  
  const laneSet = this.laneOccupancy.get(vehicle.lane);
  if (laneSet) {
    laneSet.delete(id);
  }
  
  this.vehiclePool.push(vehicle); // Return to pool
  this.vehicles.delete(id);
}
```

**Impact**: Eliminates GC spikes from vehicle spawning/despawning

---

### 🟡 High Priority

#### 4. **Improve LOD Mesh Simplification**
**File**: `src/engine/systems/LODSystem.ts`

Install a mesh simplification library and replace the placeholder:

```bash
npm install --save mesh-simplifier
```

```typescript
// Replace simplifyMesh method (line 107-113)
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';

private simplifyMesh(original: THREE.Mesh, reduction: number): THREE.Mesh {
  const modifier = new SimplifyModifier();
  const geometry = original.geometry.clone();
  const vertexCount = Math.floor(geometry.attributes.position.count * reduction);
  const simplified = modifier.modify(geometry, vertexCount);
  
  const simplifiedMesh = new THREE.Mesh(simplified, original.material);
  simplifiedMesh.position.copy(original.position);
  simplifiedMesh.rotation.copy(original.rotation);
  simplifiedMesh.scale.copy(original.scale);
  
  return simplifiedMesh;
}
```

**Impact**: 30-50% reduction in triangle count for distant objects

---

#### 5. **Optimize Shadow Rendering**
**File**: `src/engine/core/Engine.ts`

```typescript
// Add after line 129 - Optimize shadow camera based on view
if (this.config.shadowQuality !== 'off') {
  dirLight.castShadow = true;
  
  const shadowMapSize = this.getShadowMapSize();
  dirLight.shadow.mapSize.width = shadowMapSize;
  dirLight.shadow.mapSize.height = shadowMapSize;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 500;
  
  // Dynamic shadow camera bounds based on player position
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  
  // Reduce shadow bias issues
  dirLight.shadow.bias = -0.0001;
  dirLight.shadow.normalBias = 0.02;
}

// Add method to update shadow camera dynamically
updateShadowCamera(playerPosition: THREE.Vector3): void {
  const dirLight = this.scene.children.find(
    (c) => c instanceof THREE.DirectionalLight && c.castShadow
  ) as THREE.DirectionalLight;
  
  if (dirLight) {
    dirLight.position.set(
      playerPosition.x + 50,
      100,
      playerPosition.z + 50
    );
    dirLight.target.position.copy(playerPosition);
    dirLight.target.updateMatrixWorld();
  }
}
```

**Impact**: Sharper shadows, reduced shadow map rendering cost

---

#### 6. **Batch Highway Segment Rendering**
**File**: `src/systems/HighwayLoopManager.ts`

```typescript
// Replace mergeGeometries method (line 512+)
private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Use Three.js built-in merge utility
  const mergedGeometry = geometries[0].clone();
  
  for (let i = 1; i < geometries.length; i++) {
    const geo = geometries[i];
    mergedGeometry.merge(geo);
  }
  
  // Optimize geometry
  mergedGeometry.mergeVertices();
  mergedGeometry.computeVertexNormals();
  
  return mergedGeometry;
}

// Add method to use InstancedMesh for repeated elements
private createInstancedBarriers(count: number): THREE.InstancedMesh {
  const barrierGeo = new THREE.BoxGeometry(0.3, 0.6, 1);
  const barrierMat = this.barrierMaterial;
  
  const instancedMesh = new THREE.InstancedMesh(barrierGeo, barrierMat, count * 2);
  instancedMesh.castShadow = true;
  instancedMesh.receiveShadow = true;
  
  const matrix = new THREE.Matrix4();
  const dummy = new THREE.Object3D();
  
  for (let i = 0; i < count; i++) {
    // Left barrier
    dummy.position.set(-TRAFFIC_CONFIG.LANE_COUNT * TRAFFIC_CONFIG.LANE_WIDTH / 2 - 0.15, 0.3, -i);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
    
    // Right barrier
    dummy.position.set(TRAFFIC_CONFIG.LANE_COUNT * TRAFFIC_CONFIG.LANE_WIDTH / 2 + 0.15, 0.3, -i);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(count + i, dummy.matrix);
  }
  
  instancedMesh.instanceMatrix.needsUpdate = true;
  return instancedMesh;
}
```

**Impact**: 40-60% reduction in draw calls for highway segments

---

### 🟢 Medium Priority

#### 7. **Texture Compression & Optimization**
**File**: `src/engine/assets/AssetLoader.ts` (create if doesn't exist)

```typescript
// Add texture loading optimizations
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { BasisTranscoder } from 'three/examples/jsm/libs/basis.module.js';

export class AssetLoader {
  private ktx2Loader: KTX2Loader;
  
  constructor() {
    // Setup KTX2/Basis compression for textures
    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('/js/libs/basis/');
    this.ktx2Loader.detectSupport(new THREE.WebGLRenderer());
  }
  
  async loadTexture(url: string): Promise<THREE.Texture> {
    if (url.endsWith('.ktx2')) {
      return this.ktx2Loader.loadAsync(url);
    }
    
    const texture = await new THREE.TextureLoader().loadAsync(url);
    
    // Optimize texture settings
    texture.format = THREE.RGBAFormat;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    
    return texture;
  }
}
```

**Impact**: 75% reduction in texture memory usage

---

#### 8. **Reduce Material Count**
**File**: Throughout codebase

Share materials instead of creating new ones:

```typescript
// Create a material pool/registry
export class MaterialPool {
  private static materials: Map<string, THREE.Material> = new Map();
  
  static getMaterial(key: string, creator: () => THREE.Material): THREE.Material {
    if (!this.materials.has(key)) {
      this.materials.set(key, creator());
    }
    return this.materials.get(key)!;
  }
  
  // Common materials
  static getRoadMaterial(): THREE.MeshPhongMaterial {
    return this.getMaterial('road', () => new THREE.MeshPhongMaterial({ 
      color: 0x333333,
      flatShading: true,
    }));
  }
  
  static getBuildingMaterial(color: number): THREE.MeshPhongMaterial {
    const key = `building_${color}`;
    return this.getMaterial(key, () => new THREE.MeshPhongMaterial({
      color,
      flatShading: true,
    }));
  }
}
```

**Impact**: Reduced shader compilation, fewer state changes

---

#### 9. **Optimize Update Loops**
**File**: `src/systems/*.ts`

Use delta time smoothing and limit update frequency:

```typescript
// Add to managers that update frequently
private updateAccumulator = 0;
private updateInterval = 1 / 30; // Update at 30Hz instead of 60Hz

update(deltaTime: number, ...args: any[]): void {
  this.updateAccumulator += deltaTime;
  
  if (this.updateAccumulator < this.updateInterval) {
    return;
  }
  
  this.updateLogic(this.updateAccumulator, ...args);
  this.updateAccumulator = 0;
}

private updateLogic(dt: number, ...args: any[]): void {
  // Actual update logic here
}
```

**Impact**: 50% reduction in CPU-bound update costs

---

#### 10. **Add Profiling Overlay**
**File**: Create `src/ui/PerformanceOverlay.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Engine } from '../engine/core/Engine';

export const PerformanceOverlay: React.FC<{ engine: Engine }> = ({ engine }) => {
  const [stats, setStats] = useState({
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    memory: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const engineStats = engine.getStats();
      setStats({
        fps: engineStats.fps,
        drawCalls: engineStats.drawCalls,
        triangles: engineStats.triangleCount,
        memory: engineStats.textureMemoryMB,
      });
    }, 500);

    return () => clearInterval(interval);
  }, [engine]);

  const getColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed top-4 left-4 bg-black/70 text-white p-3 rounded font-mono text-xs">
      <div className={getColor(stats.fps)}>FPS: {stats.fps}</div>
      <div>Draw Calls: {stats.drawCalls}</div>
      <div>Triangles: {stats.triangles.toLocaleString()}</div>
      <div>VRAM: {stats.memory.toFixed(1)} MB</div>
    </div>
  );
};
```

**Impact**: Real-time performance visibility for debugging

---

## Vite Build Optimizations

### Update `vite.config.ts`

```typescript
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Optimize Three.js imports
      "three": path.resolve(__dirname, "node_modules/three/build/three.core.js"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["three"],
  },
});
```

---

## Quick Wins Checklist

- [ ] Cap pixel ratio to 1.5 instead of 2
- [ ] Enable manual shadow map updates
- [ ] Add object pooling for traffic vehicles
- [ ] Share materials across instances
- [ ] Use instanced meshes for repeated geometry
- [ ] Implement proper LOD mesh simplification
- [ ] Add performance overlay for monitoring
- [ ] Reduce update frequency for non-critical systems
- [ ] Compress textures using KTX2/Basis
- [ ] Tree-shake unused Three.js modules

---

## Expected Performance Gains

| Optimization | FPS Impact | Complexity |
|-------------|-----------|------------|
| Pixel ratio cap | +5-10 FPS | Low |
| Object pooling | +3-5 FPS (smoother) | Medium |
| Instanced batching | +10-20 FPS | Medium |
| LOD implementation | +15-25 FPS | Medium |
| Shadow optimization | +5-8 FPS | Low |
| Texture compression | +2-3 FPS | High |
| Material sharing | +3-5 FPS | Low |
| Update throttling | +5-10 FPS | Low |

**Total Potential Gain**: 30-60+ FPS depending on scene complexity

---

## Monitoring & Debugging

Use Chrome DevTools Performance tab to identify:
1. **Long tasks** (>50ms)
2. **Forced synchronous layouts**
3. **Excessive paint operations**
4. **Garbage collection spikes**

Key metrics to track:
- Frame time < 16.67ms (60 FPS)
- Draw calls < 500 per frame
- Triangle count < 100k visible
- Texture memory < 256MB
