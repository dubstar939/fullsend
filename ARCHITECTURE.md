# WebGPU Renderer Architecture

## Folder Structure

```
/workspace
├── types/
│   └── renderer.types.ts        # Shared type definitions for the renderer
│
├── render/
│   ├── common/
│   │   ├── Camera.ts            # Camera abstraction (perspective/orthographic)
│   │   ├── Transform.ts         # Transform component (position, rotation, scale)
│   │   └── Material.ts          # Material base types
│   │
│   └── webgpu/
│       ├── WebGPURenderer.ts    # Main renderer facade - public API
│       ├── WebGPUDeviceManager.ts # Device, adapter, context management
│       ├── WebGPUPipelineManager.ts # Pipeline creation and caching
│       ├── WebGPUFrameGraph.ts  # Frame graph for render passes
│       ├── WebGPUBufferManager.ts # Vertex/index/uniform buffer management
│       ├── WebGPUMesh.ts        # Mesh data structure
│       ├── WebGPURenderable.ts  # Renderable object (mesh + material + transform)
│       └── shaders/
│           ├── lowpoly.wgsl     # Main low-poly shader (vertex + fragment)
│           └── shared.wgsl      # Shared WGSL utilities and structs
│
└── index.ts                     # Entry point / barrel exports
```

## Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `WebGPURenderer.ts` | **Facade** - Exposes clean API to engine. Coordinates all subsystems. Handles frame loop. |
| `WebGPUDeviceManager.ts` | **Hardware Abstraction** - Adapter/device acquisition, canvas context, swapchain, resize handling. |
| `WebGPUPipelineManager.ts` | **Pipeline Lifecycle** - Creates and caches render pipelines, bind group layouts. |
| `WebGPUFrameGraph.ts` | **Render Pass Organization** - Manages render passes, future post-processing integration. |
| `WebGPUBufferManager.ts` | **Memory Management** - Allocates vertex/index/uniform buffers, handles GPU memory. |
| `WebGPUMesh.ts` | **Geometry** - Vertex/index buffer wrappers, vertex layout definitions. |
| `WebGPURenderable.ts` | **Scene Object** - Combines mesh, material, transform into a renderable unit. |
| `Camera.ts` | **View/Projection** - Computes view and projection matrices. |
| `Transform.ts` | **Local Space** - Position, rotation, scale with matrix computation. |
| `Material.ts` | **Surface Properties** - Color, lighting params, texture references. |

## Design Principles

1. **Low-Poly First**: Flat shading, minimal overdraw, efficient batch rendering
2. **Data-Oriented**: Separate data (buffers) from behavior (renderer)
3. **Explicit is Better**: Clear ownership of GPU resources
4. **Performance Optimizations**: Built-in frustum culling, LOD system, distance culling
5. **Backend Agnostic**: Common types allow WebGL/WebGPU swap

## Performance Features

### Frustum Culling
The renderer automatically extracts the view frustum from the camera's view-projection matrix and tests each renderable's bounding sphere against it. Objects outside the frustum are skipped during rendering.

```typescript
// Automatic in renderFrame() - no manual setup needed
const frustum = camera.getFrustum(); // Cached extraction
if (!renderable.shouldBeRendered(frustum, cameraPosition)) continue;
```

### Level of Detail (LOD)
Each renderable can have configurable LOD thresholds. The system automatically switches between LOD levels based on camera distance with hysteresis to prevent popping.

```typescript
// Per-object LOD config
const renderable = new WebGPURenderable(id, mesh, material, transform, {
  distances: [20, 50, 100], // High/Medium/Low/Cull thresholds
  lodMeshes: [highDetailMesh, mediumMesh, lowMesh] // Optional custom meshes
});

// Global LOD settings
renderer.setLODSettings({
  enabled: true,
  defaultDistances: [30, 60, 100],
  hysteresis: 0.1 // 10% hysteresis to prevent popping
});
```

### Bounding Volumes
Bounding spheres are automatically computed from mesh vertices at construction time. The sphere is transformed with the object for accurate culling.
