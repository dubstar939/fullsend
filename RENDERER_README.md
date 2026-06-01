# WebGPU Renderer for Low-Poly 3D Games

A production-grade, modular WebGPU rendering backend optimized for low-poly 3D web games.

## Features

- **WebGPU Native**: Modern GPU API with explicit control over resources
- **Low-Poly Optimized**: Flat shading, efficient batching, minimal overdraw
- **Modular Architecture**: Clean separation of concerns for easy maintenance
- **Backend Agnostic**: Designed to be swappable with WebGL if needed
- **Extensible**: Built-in hooks for frustum culling, instancing, shadows, post-processing

## Quick Start

```typescript
import { WebGPURenderer, Camera, createTestCube, createTestPlane } from './render/webgpu';

// Create and initialize renderer
const renderer = new WebGPURenderer();
await renderer.init(canvas, {
  clearColor: [0.1, 0.12, 0.15, 1],
  antialias: true,
});

// Setup camera
const camera = new Camera({
  position: [5, 5, 10],
  target: [0, 0, 0],
  fov: Math.PI / 4,
});
renderer.setCamera(camera);

// Add objects
const plane = createTestPlane(renderer, 'ground', [0, -1, 0], 20, 20);
renderer.addRenderable(plane);

const cube = createTestCube(renderer, 'cube', [0, 0, 0]);
renderer.addRenderable(cube);

// Animation loop
function animate(deltaTime: number) {
  cube.transform.rotation[1] += deltaTime;
  cube.transform.markDirty();
  
  renderer.renderFrame(deltaTime);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

## Architecture

```
render/
├── common/              # Shared components (backend-agnostic)
│   ├── Camera.ts        # View/projection matrices
│   └── Transform.ts     # Position, rotation, scale
│
├── webgpu/              # WebGPU-specific implementation
│   ├── WebGPURenderer.ts      # Main facade API
│   ├── WebGPUDeviceManager.ts # Device/context management
│   ├── WebGPUPipelineManager.ts # Pipeline creation/caching
│   ├── WebGPUBufferManager.ts # Buffer allocation
│   ├── WebGPUFrameGraph.ts    # Render pass organization
│   ├── WebGPUMesh.ts          # Geometry data
│   ├── WebGPURenderable.ts    # Scene objects
│   └── shaders/
│       └── lowpoly.wgsl.ts    # WGSL shaders
│
└── index.ts             # Barrel exports
```

## Module Responsibilities

| Module | Purpose |
|--------|---------|
| `WebGPURenderer` | Main API facade. Coordinates all subsystems. |
| `WebGPUDeviceManager` | Adapter/device acquisition, canvas context, resize handling |
| `WebGPUPipelineManager` | Render pipeline creation and caching |
| `WebGPUBufferManager` | Vertex/index/uniform buffer management |
| `WebGPUFrameGraph` | Render pass organization, global uniforms |
| `WebGPUMesh` | Geometry data with GPU buffers |
| `WebGPURenderable` | Combines mesh + material + transform |

## API Reference

### WebGPURenderer

```typescript
class WebGPURenderer {
  // Initialize with canvas
  init(canvas: HTMLCanvasElement, config?: RendererConfig): Promise<boolean>
  
  // Set active camera
  setCamera(camera: Camera): void
  
  // Scene management
  addRenderable(obj: WebGPURenderable): void
  removeRenderable(id: string): void
  getRenderable(id: string): WebGPURenderable | undefined
  
  // Lighting
  setLighting(lighting: Partial<LightingData>): void
  
  // Rendering
  renderFrame(deltaTime: number): void
  resize(width: number, height: number): void
  
  // Cleanup
  dispose(): void
}
```

### Configuration

```typescript
interface RendererConfig {
  antialias: boolean;        // MSAA (default: true)
  pixelRatio: number;        // DPR cap (default: min(devicePixelRatio, 2))
  clearAlpha: number;        // Clear alpha (default: 1)
  clearColor: [r,g,b,a];     // Clear color (default: dark blue-gray)
  toneMapping: 'none' | 'linear' | 'reinhard' | 'aces';
}
```

### Material

```typescript
interface MaterialData {
  color: [r,g,b,a];          // RGBA [0-1]
  emissive: [r,g,b];         // Self-illumination
  roughness: number;         // 0=smooth, 1=rough
  metalness: number;         // 0=non-metal, 1=metal
  flatShading: boolean;      // Low-poly flat shading
  wireframe: boolean;        // Debug wireframe overlay
}
```

## Shader Features

The low-poly shader (`lowpoly.wgsl.ts`) includes:

- **Flat/Smooth Shading Toggle**: Per-material control via `flatShading`
- **Lambert Diffuse**: Simple, fast lighting model
- **Ambient Light**: Base illumination
- **Vertex Colors**: Modulated with material color
- **Emissive**: Self-illumination support
- **Wireframe Overlay**: UV-based grid for debug
- **Tone Mapping**: Reinhard operator
- **Gamma Correction**: sRGB output

## Performance Considerations

1. **Batch Similar Materials**: Group objects by material to reduce pipeline changes
2. **Use Flat Shading**: Cheaper than smooth, fits low-poly aesthetic
3. **Limit Draw Calls**: Keep object count reasonable for mid-range devices
4. **Reuse Meshes**: Share geometry between instances
5. **Update Uniforms Efficiently**: Only update when transform changes

## Extension Points

The renderer is designed for future extensions:

### Frustum Culling
```typescript
// In WebGPURenderable.shouldBeRendered():
// TODO: Implement frustum culling
// if (cameraFrustum && !cameraFrustum.intersectsMesh(this)) return false;
```

### Instancing
```typescript
// In WebGPURenderable:
// TODO: Add instancing data
// instanceData: InstanceData[];
```

### Shadow Maps
```typescript
// In WebGPUFrameGraph:
// TODO: Add shadow pass
// - Render depth from light perspective
// - Sample in fragment shader
```

### Post-Processing
```typescript
// In WebGPUFrameGraph:
// TODO: Add post-processing passes
// - Render to intermediate texture
// - Apply effects (bloom, AA, color grading)
```

## Backend Swapping

The renderer implements `WebGPURendererAPI`, allowing easy swapping:

```typescript
interface IRenderer {
  init(canvas: HTMLCanvasElement): Promise<boolean>;
  setCamera(camera: Camera): void;
  addRenderable(obj: any): void;
  renderFrame(deltaTime: number): void;
  dispose(): void;
}

// Factory pattern for backend selection
async function createRenderer(canvas): Promise<IRenderer> {
  if (navigator.gpu) {
    return new WebGPURenderer();
  } else {
    return new WebGLRenderer(); // Future implementation
  }
}
```

## Requirements

- Modern browser with WebGPU support (Chrome 113+, Firefox Nightly, Edge)
- TypeScript 4.x or later
- gl-matrix library for math operations

## Dependencies

```json
{
  "dependencies": {
    "gl-matrix": "^3.4.0"
  },
  "devDependencies": {
    "@webgpu/types": "^0.1.0"
  }
}
```

## License

MIT
