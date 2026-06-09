/**
 * WGSL Shader Modules for Low-Poly Rendering
 * 
 * Design decisions:
 * - Flat shading option for clean low-poly look
 * - Simple Lambert lighting for performance
 * - Vertex colors support for hand-painted style
 * - Minimal uniform bindings for efficiency
 */

// ============================================================================
// Uniform Buffer Structures (must match TypeScript definitions)
// ============================================================================

/**
 * Frame-level uniforms - updated once per frame
 * Bind group 0
 */
struct FrameUniforms {
  viewMatrix: mat4x4<f32>,
  projectionMatrix: mat4x4<f32>,
  viewProjectionMatrix: mat4x4<f32>,
  cameraPosition: vec4<f32>,
  time: f32,
  deltaTime: f32,
  
  // Lighting
  ambientLightColor: vec4<f32>,
  ambientLightIntensity: f32,
  directionalLightCount: f32,
  _padding1: f32,
  _padding2: f32,
  
  // Array of up to 4 directional lights
  // Each light: direction(3) + padding(1) + color(4) + intensity(1) + padding(3) = 16 floats
  directionalLights: array<DirectionalLightData, 4>
};

struct DirectionalLightData {
  direction: vec4<f32>,    // xyz = direction, w = unused
  color: vec4<f32>,
  intensity: f32,
  _padding1: f32,          // Additional padding for 64-byte alignment
  _padding2: vec2<f32>,    // Final padding
  _padding3: f32           // Complete 16-float structure
};

/**
 * Object-level uniforms - updated per object
 * Bind group 1
 */
struct ObjectUniforms {
  modelMatrix: mat4x4<f32>,
  normalMatrix: mat4x4<f32>,
  color: vec4<f32>,
  roughness: f32,
  metalness: f32,
  emissive: vec4<f32>,
  flags: u32,
  _padding: vec3<f32>
};

// Material flag bits
const USE_FLAT_SHADING: u32 = 1u;
const USE_VERTEX_COLORS: u32 = 2u;
const HAS_TEXTURE: u32 = 4u;
const CASTS_SHADOW: u32 = 8u;
const RECEIVES_SHADOW: u32 = 16u;

// ============================================================================
// Vertex Input/Output
// ============================================================================

struct VertexInput {
  @location(0) position: vec4<f32>,
  @location(1) normal: vec4<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec4<f32>
};

struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) worldPosition: vec4<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) color: vec4<f32>,
  @location(4) flatNormal: vec3<f32>  // For flat shading
};

// ============================================================================
// Bindings
// ============================================================================

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(1) @binding(0) var<uniform> object: ObjectUniforms;
@group(1) @binding(1) var objectSampler: sampler;
@group(1) @binding(2) var objectTexture: texture_2d<f32>;

// ============================================================================
// Vertex Shader
// ============================================================================

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  
  // Transform position to world space
  let worldPos = object.modelMatrix * input.position;
  output.worldPosition = worldPos;
  
  // Transform to clip space
  output.clipPosition = frame.projectionMatrix * frame.viewMatrix * worldPos;
  
  // Transform normal to world space
  let worldNormal = normalize((object.normalMatrix * input.normal).xyz);
  output.normal = worldNormal;
  
  // Pass through UVs
  output.uv = input.uv;
  
  // Pass through or use vertex colors
  output.color = input.color;
  
  // Calculate flat normal (face normal) for flat shading
  // This uses the uninterpolated normal for the entire face
  output.flatNormal = worldNormal;
  
  return output;
}

// ============================================================================
// Fragment Shader
// ============================================================================

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
  // Determine which normal to use (flat vs smooth)
  var normal: vec3<f32>;
  
  if ((object.flags & USE_FLAT_SHADING) != 0u) {
    // Use face normal for flat shading (clean low-poly look)
    normal = normalize(input.flatNormal);
  } else {
    // Use interpolated normal for smooth shading
    normal = normalize(input.normal);
  }
  
  // Start with base color
  var baseColor: vec4<f32>;
  
  if ((object.flags & USE_VERTEX_COLORS) != 0u) {
    // Use vertex colors
    baseColor = input.color;
  } else if ((object.flags & HAS_TEXTURE) != 0u) {
    // Sample texture
    baseColor = textureSample(objectTexture, objectSampler, input.uv);
  } else {
    // Use uniform color
    baseColor = object.color;
  }
  
  // Apply emissive
  let emissive = object.emissive.rgb * object.emissive.a;
  
  // Calculate lighting
  var lighting = calculateLighting(normal, input.worldPosition.xyz);
  
  // Combine diffuse + ambient + emissive
  let finalColor = vec4<f32>(
    baseColor.rgb * lighting + emissive,
    baseColor.a
  );
  
  return finalColor;
}

// ============================================================================
// Lighting Functions
// ============================================================================

/**
 * Calculate combined lighting from all sources
 * Low-poly friendly: simple Lambert diffuse + ambient
 */
fn calculateLighting(normal: vec3<f32>, worldPos: vec3<f32>) -> vec3<f32> {
  var totalLight = vec3<f32>(0.0);
  
  // Ambient light
  totalLight += frame.ambientLightColor.rgb * frame.ambientLightIntensity;
  
  // Directional lights
  for (var i: u32 = 0u; i < u32(frame.directionalLightCount); i = i + 1u) {
    let light = frame.directionalLights[i];
    
    // Skip disabled lights
    if (light.intensity <= 0.0) {
      continue;
    }
    
    let lightDir = normalize(-light.direction.xyz);
    
    // Lambert diffuse (N·L clamped to positive)
    let ndotl = max(dot(normal, lightDir), 0.0);
    
    // Simple attenuation (could add distance-based for point lights later)
    let attenuation = 1.0;
    
    totalLight += light.color.rgb * light.intensity * ndotl * attenuation;
  }
  
  return totalLight;
}

// ============================================================================
// Alternative: Pure Flat Color Shader (for UI/debug)
// ============================================================================

@vertex
fn vertexFlatColor(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.clipPosition = frame.projectionMatrix * frame.viewMatrix * (object.modelMatrix * input.position);
  output.worldPosition = object.modelMatrix * input.position;
  output.normal = input.normal.xyz;
  output.uv = input.uv;
  output.color = input.color;
  output.flatNormal = input.normal.xyz;
  return output;
}

@fragment
fn fragmentFlatColor(input: VertexOutput) -> @location(0) vec4<f32> {
  // No lighting - pure flat color (useful for UI, debug, or stylized rendering)
  if ((object.flags & USE_VERTEX_COLORS) != 0u) {
    return input.color;
  }
  return object.color;
}
