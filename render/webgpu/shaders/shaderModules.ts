/**
 * Shader module loader - loads and manages WGSL shader code
 */

import lowPolyShader from './lowpoly.wgsl';

export interface ShaderModule {
  name: string;
  source: string;
}

/**
 * Pre-loaded shader modules
 */
export const ShaderModules: Record<string, ShaderModule> = {
  'lowpoly': {
    name: 'lowpoly',
    source: lowPolyShader
  }
};

/**
 * Get shader module by name
 */
export function getShaderModule(name: string): ShaderModule | null {
  return ShaderModules[name] || null;
}

/**
 * Create a shader module from source
 */
export function createShaderModule(
  device: GPUDevice,
  source: string
): GPUShaderModule {
  return device.createShaderModule({
    label: 'ShaderModule',
    code: source
  });
}

/**
 * Create shader module from pre-loaded module
 */
export function createShaderModuleFromName(
  device: GPUDevice,
  name: string
): GPUShaderModule | null {
  const module = getShaderModule(name);
  if (!module) {
    console.error(`Shader module "${name}" not found`);
    return null;
  }
  return createShaderModule(device, module.source);
}

/**
 * Extract entry points from WGSL source (for pipeline configuration)
 * This is a simple parser - in production you might want more robust parsing
 */
export function findEntryPoints(source: string): { vertex: string; fragment: string }[] {
  const entryPoints: { vertex: string; fragment: string }[] = [];
  
  // Find all @vertex functions
  const vertexMatches = source.matchAll(/@vertex\s+fn\s+(\w+)/g);
  const vertexFunctions = Array.from(vertexMatches).map(m => m[1]);
  
  // Find all @fragment functions
  const fragmentMatches = source.matchAll(/@fragment\s+fn\s+(\w+)/g);
  const fragmentFunctions = Array.from(fragmentMatches).map(m => m[1]);
  
  // Pair them up (assumes matching names or single pairs)
  for (const vertex of vertexFunctions) {
    for (const fragment of fragmentFunctions) {
      // Simple heuristic: pair main with main, or flatColor with flatColor
      if (vertex.includes('Main') && fragment.includes('Main')) {
        entryPoints.push({ vertex, fragment });
      } else if (vertex.includes('Flat') && fragment.includes('Flat')) {
        entryPoints.push({ vertex, fragment });
      }
    }
  }
  
  return entryPoints;
}

/**
 * Default entry points for the low-poly shader
 */
export const LowPolyEntryPoints = {
  standard: { vertex: 'vertexMain', fragment: 'fragmentMain' },
  flatColor: { vertex: 'vertexFlatColor', fragment: 'fragmentFlatColor' }
};
