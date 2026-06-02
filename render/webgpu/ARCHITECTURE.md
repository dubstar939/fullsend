# WebGPU Renderer Architecture

## Folder Structure

```
/workspace
├── types/
│   └── engine.types.ts          # Shared type definitions for the engine
│
├── render/
│   ├── common/
│   │   ├── Camera.ts            # Camera abstraction (shared between backends)
│   │   ├── Transform.ts         # Transform component (position, rotation, scale)
│   │   └── RenderTypes.ts       # Renderer-agnostic interfaces
│   │
│   └── webgpu/
│       ├── WebGPURenderer.ts    # Main renderer entry point & public API
│       ├── WebGPUDeviceManager.ts # Device, adapter, context management
│       ├── WebGPUPipelineManager.ts # Pipeline creation & management
│       ├── WebGPUFrameGraph.ts  # Frame graph for render passes (extensible)
│       ├── WebGPUBindGroupManager.ts # Bind group allocation & management
│       ├── WebGPUMesh.ts        # Mesh data (vertex/index buffers)
│       ├── WebGPUMaterial.ts    # Material definition
│       ├── WebGPURenderable.ts  # Renderable object (mesh + material + transform)
│       └── shaders/
│           ├── lowpoly.wgsl     # Main low-poly shading shader
│           └── shaderModules.ts # WGSL shader module loader
│
└── index.ts                     # Engine entry point (example usage)
```

## Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `WebGPURenderer.ts` | Public API, orchestrates rendering, manages scene graph |
| `WebGPUDeviceManager.ts` | WebGPU adapter/device acquisition, canvas context, swapchain |
| `WebGPUPipelineManager.ts` | Creates and caches render pipelines, bind group layouts |
| `WebGPUFrameGraph.ts` | Manages render passes, extensible for post-processing |
| `WebGPUBindGroupManager.ts` | Efficient bind group creation and reuse |
| `WebGPUMesh.ts` | Vertex/index buffer creation and management |
| `WebGPUMaterial.ts` | Material properties (color, roughness, texture) |
| `WebGPURenderable.ts` | Combines mesh, material, transform for rendering |
| `Camera.ts` | View/projection matrix calculation |
| `Transform.ts` | World space transforms |

## Design Decisions

1. **Flat/Lambert Shading**: Low-poly aesthetic uses flat normals or simple Lambert for clean silhouettes
2. **Uniform Buffer Strategy**: Per-frame uniforms (view/projection) + per-object uniforms (model)
3. **Bind Group Layout**: 
   - Bind Group 0: Global uniforms (camera matrices, time, lights)
   - Bind Group 1: Per-object uniforms (model matrix, material params)
4. **Frame Graph Pattern**: Prepares for multi-pass rendering (shadows, post-processing)
5. **Pipeline Caching**: Pipelines are created once and reused based on material/shader combos
