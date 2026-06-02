/**
 * WGSL Shader: Low-poly forward rendering shader.
 * Features:
 * - Flat or smooth shading toggle
 * - Directional + ambient lighting
 * - Vertex colors support
 * - GPU Instancing support
 * - Simple Lambert diffuse + ambient
 */

export const SHARED_WGSL = `
// ============================================================================
// SHARED STRUCTS
// ============================================================================

struct CameraUniforms {
  viewMatrix: mat4x4<f32>,
  projectionMatrix: mat4x4<f32>,
  cameraPosition: vec4<f32>,
};

struct LightingUniforms {
  lightDirection: vec4<f32>,
  lightColor: vec4<f32>,
  ambientColor: vec4<f32>,
};

struct ObjectUniforms {
  modelMatrix: mat4x4<f32>,
  normalMatrix: mat4x4<f32>,
  color: vec4<f32>,
  emissive: vec4<f32>,
  roughness: f32,
  metalness: f32,
  flatShading: f32,
  wireframe: f32,
};

// Instance data for GPU instancing
struct InstanceData {
  modelMatrix: mat4x4<f32>,
  color: vec4<f32>,
};

// Vertex input for low-poly meshes
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec4<f32>,
};

// Vertex output (to fragment shader)
struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) worldPosition: vec3<f32>,
  @location(1) worldNormal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec4<f32>,
  @location(4) flatNormal: vec3<f32>,
  @location(5) instanceColor: vec4<f32>,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

fn gammaCorrect(color: vec3<f32>, gamma: f32) -> vec3<f32> {
  return pow(color, vec3<f32>(1.0 / gamma));
}
`;

export const LOWPOLY_SHADER_WGSL = `
${SHARED_WGSL}

// ============================================================================
// BIND GROUP LAYOUTS
// ============================================================================

@group(0) @binding(0) var<uniform> cameraUniforms: CameraUniforms;
@group(0) @binding(1) var<uniform> lightingUniforms: LightingUniforms;
@group(1) @binding(0) var<uniform> objectUniforms: ObjectUniforms;

// ============================================================================
// VERTEX SHADER (Non-instanced)
// ============================================================================

@vertex
fn vertexMain(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec4<f32>
) -> VertexOutput {
  
  // Transform position to world space
  let worldPosition = objectUniforms.modelMatrix * vec4<f32>(position, 1.0);
  
  // Transform to clip space
  let viewPosition = cameraUniforms.viewMatrix * worldPosition;
  let clipPosition = cameraUniforms.projectionMatrix * viewPosition;
  
  // Transform normal to world space (using normal matrix)
  let worldNormal = normalize((objectUniforms.normalMatrix * vec4<f32>(normal, 0.0)).xyz);
  
  var output: VertexOutput;
  output.clipPosition = clipPosition;
  output.worldPosition = worldPosition.xyz;
  output.worldNormal = worldNormal;
  output.uv = uv;
  output.color = color;
  output.flatNormal = worldNormal;
  output.instanceColor = vec4<f32>(1.0, 1.0, 1.0, 1.0);
  
  return output;
}

// ============================================================================
// VERTEX SHADER (Instanced)
// ============================================================================

@vertex
fn vertexMainInstanced(
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec4<f32>,
  @location(4) instanceModelRow0: vec4<f32>,
  @location(5) instanceModelRow1: vec4<f32>,
  @location(6) instanceModelRow2: vec4<f32>,
  @location(7) instanceModelRow3: vec4<f32>,
  @location(8) instanceColor: vec4<f32>
) -> VertexOutput {
  
  // Reconstruct model matrix from instance attributes
  let instanceModelMatrix = mat4x4<f32>(
    instanceModelRow0,
    instanceModelRow1,
    instanceModelRow2,
    instanceModelRow3
  );
  
  // Transform position to world space using instance matrix
  let worldPosition = instanceModelMatrix * vec4<f32>(position, 1.0);
  
  // Transform to clip space
  let viewPosition = cameraUniforms.viewMatrix * worldPosition;
  let clipPosition = cameraUniforms.projectionMatrix * viewPosition;
  
  // Transform normal to world space (using upper 3x3 of instance matrix)
  let normalMatrix = mat4x4<f32>(
    instanceModelRow0,
    instanceModelRow1,
    instanceModelRow2,
    vec4<f32>(0.0, 0.0, 0.0, 1.0)
  );
  let worldNormal = normalize((normalMatrix * vec4<f32>(normal, 0.0)).xyz);
  
  var output: VertexOutput;
  output.clipPosition = clipPosition;
  output.worldPosition = worldPosition.xyz;
  output.worldNormal = worldNormal;
  output.uv = uv;
  output.color = color;
  output.flatNormal = worldNormal;
  output.instanceColor = instanceColor;
  
  return output;
}

// ============================================================================
// FRAGMENT SHADER
// ============================================================================

@fragment
fn fragmentMain(
  @interpolate(perspective) worldPosition: vec3<f32>,
  @interpolate(perspective) worldNormal: vec3<f32>,
  @interpolate(perspective) uv: vec2<f32>,
  @interpolate(perspective) color: vec4<f32>,
  @interpolate(flat) flatNormal: vec3<f32>,
  @interpolate(perspective) instanceColor: vec4<f32>
) -> @location(0) vec4<f32> {
  
  // Use flat normal if flatShading is enabled
  let normal = select(worldNormal, flatNormal, objectUniforms.flatShading > 0.5);
  let normalizedNormal = normalize(normal);
  
  // Base color from vertex color, material color, and instance color
  var baseColor = objectUniforms.color.rgb * color.rgb * instanceColor.rgb;
  
  // Directional light
  let lightDir = normalize(-lightingUniforms.lightDirection.xyz);
  let lightColor = lightingUniforms.lightColor.rgb * lightingUniforms.lightColor.w;
  
  // Lambert diffuse
  let ndotl = max(dot(normalizedNormal, lightDir), 0.0);
  let diffuse = ndotl * lightColor;
  
  // Ambient light
  let ambientColor = lightingUniforms.ambientColor.rgb * lightingUniforms.ambientColor.w;
  let ambient = ambientColor;
  
  // Emissive
  let emissive = objectUniforms.emissive.rgb;
  
  // Combine lighting
  var finalColor = (diffuse + ambient) * baseColor + emissive;
  
  // Apply vertex color alpha
  let alpha = objectUniforms.color.a * color.a * instanceColor.a;
  
  // Wireframe mode (simple grid overlay)
  if (objectUniforms.wireframe > 0.5) {
    let gridSize = 50.0;
    let lineThickness = 0.05;
    let gridX = abs(fract(uv.x * gridSize) - 0.5);
    let gridY = abs(fract(uv.y * gridSize) - 0.5);
    let wireMask = min(gridX, gridY);
    let wire = step(wireMask, lineThickness);
    finalColor = mix(finalColor, vec3<f32>(0.0, 0.0, 0.0), wire);
  }
  
  // Simple tone mapping (Reinhard)
  finalColor = finalColor / (finalColor + vec3<f32>(1.0));
  
  // Gamma correction (convert to sRGB)
  finalColor = pow(finalColor, vec3<f32>(1.0 / 2.2));
  
  return vec4<f32>(finalColor, alpha);
}
`;

/**
 * Create shader module for WebGPU.
 */
export function createLowPolyShaderModule(device: GPUDevice): GPUShaderModule {
  return device.createShaderModule({
    label: 'LowPolyShader',
    code: LOWPOLY_SHADER_WGSL,
  });
}
