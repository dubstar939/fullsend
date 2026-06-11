/**
 * Environment System - Handles skybox, lighting, and environmental visuals
 * Extends visual quality without modifying Engine architecture
 */

import * as THREE from 'three';
import { SceneGraph } from '../core/SceneGraph';

export interface EnvironmentConfig {
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  ambientLightIntensity: number;
  directionalLightIntensity: number;
  hemisphereSkyColor: number;
  hemisphereGroundColor: number;
}

export class EnvironmentSystem {
  private scene: THREE.Scene;
  private sceneGraph: SceneGraph;
  private config: EnvironmentConfig;
  private skyMesh?: THREE.Mesh;
  private ambientLight?: THREE.AmbientLight;
  private dirLight?: THREE.DirectionalLight;
  private hemiLight?: THREE.HemisphereLight;

  constructor(scene: THREE.Scene, sceneGraph: SceneGraph) {
    this.scene = scene;
    this.sceneGraph = sceneGraph;
    this.config = this.getDefaultConfig();
  }

  private getDefaultConfig(): EnvironmentConfig {
    return {
      skyColor: 0x87ceeb,
      fogColor: 0x87ceeb,
      fogNear: 50,
      fogFar: 300,
      ambientLightIntensity: 0.5,
      directionalLightIntensity: 0.8,
      hemisphereSkyColor: 0x87ceeb,
      hemisphereGroundColor: 0x3d5c3d,
    };
  }

  /**
   * Setup enhanced environment with skybox and improved lighting
   */
  setup(config?: Partial<EnvironmentConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Apply fog to scene
    this.scene.fog = new THREE.FogExp2(
      this.config.fogColor,
      1 / (this.config.fogFar - this.config.fogNear) * 2.5
    );

    // Create gradient skybox
    this.createSkybox();

    // Update existing lights or create new ones
    this.updateLighting();
  }

  /**
   * Create a gradient skybox using a large sphere with vertex colors
   */
  private createSkybox(): void {
    // Remove existing skybox
    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      this.skyMesh.geometry.dispose();
      (this.skyMesh.material as THREE.Material).dispose();
    }

    const skyGeometry = new THREE.SphereGeometry(400, 32, 32);
    
    // Create vertex colors for smooth gradient
    const positions = skyGeometry.attributes.position.array;
    const colors: number[] = [];
    
    const topColor = new THREE.Color(this.config.skyColor);
    const horizonColor = new THREE.Color(this.config.skyColor).multiplyScalar(0.8);
    const bottomColor = new THREE.Color(this.config.fogColor);

    for (let i = 0; i < positions.length; i += 3) {
      const y = positions[i + 1];
      let t: number;
      
      if (y > 0) {
        // Top half: horizon to top color
        t = y / 400;
        const color = horizonColor.clone().lerp(topColor, t);
        colors.push(color.r, color.g, color.b);
      } else {
        // Bottom half: fog to horizon
        t = (y + 400) / 400;
        const color = bottomColor.clone().lerp(horizonColor, t);
        colors.push(color.r, color.g, color.b);
      }
    }

    skyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const skyMaterial = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
    });

    this.skyMesh = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skyMesh);
  }

  /**
   * Update or create lighting system
   */
  private updateLighting(): void {
    // Find and update existing lights or create new ones
    let foundAmbient = false;
    let foundDir = false;
    let foundHemi = false;

    for (const child of this.scene.children) {
      if (child instanceof THREE.AmbientLight && !foundAmbient) {
        child.intensity = this.config.ambientLightIntensity;
        foundAmbient = true;
      } else if (child instanceof THREE.DirectionalLight && !foundDir) {
        child.intensity = this.config.directionalLightIntensity;
        foundDir = true;
      } else if (child instanceof THREE.HemisphereLight && !foundHemi) {
        child.color.setHex(this.config.hemisphereSkyColor);
        child.groundColor.setHex(this.config.hemisphereGroundColor);
        foundHemi = true;
      }
    }

    // Add missing lights
    if (!foundAmbient) {
      this.ambientLight = new THREE.AmbientLight(0xffffff, this.config.ambientLightIntensity);
      this.scene.add(this.ambientLight);
    }

    if (!foundDir) {
      this.dirLight = new THREE.DirectionalLight(0xffffff, this.config.directionalLightIntensity);
      this.dirLight.position.set(100, 150, 50);
      
      // Enable shadows with optimized settings
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 2048;
      this.dirLight.shadow.mapSize.height = 2048;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 400;
      this.dirLight.shadow.camera.left = -80;
      this.dirLight.shadow.camera.right = 80;
      this.dirLight.shadow.camera.top = 80;
      this.dirLight.shadow.camera.bottom = -80;
      this.dirLight.shadow.bias = -0.0002;
      this.dirLight.shadow.normalBias = 0.03;
      
      this.scene.add(this.dirLight);
    }

    if (!foundHemi) {
      this.hemiLight = new THREE.HemisphereLight(
        this.config.hemisphereSkyColor,
        this.config.hemisphereGroundColor,
        0.4
      );
      this.scene.add(this.hemiLight);
    }
  }

  /**
   * Set time of day (affects lighting and sky color)
   */
  setTimeOfDay(time: 'day' | 'sunset' | 'night'): void {
    switch (time) {
      case 'day':
        this.setup({
          skyColor: 0x87ceeb,
          fogColor: 0x87ceeb,
          ambientLightIntensity: 0.6,
          directionalLightIntensity: 1.0,
          hemisphereSkyColor: 0x87ceeb,
          hemisphereGroundColor: 0x3d5c3d,
        });
        break;
      case 'sunset':
        this.setup({
          skyColor: 0xff8c42,
          fogColor: 0xffaa66,
          ambientLightIntensity: 0.5,
          directionalLightIntensity: 0.8,
          hemisphereSkyColor: 0xff8c42,
          hemisphereGroundColor: 0x3d2817,
        });
        break;
      case 'night':
        this.setup({
          skyColor: 0x0a0a1a,
          fogColor: 0x1a1a2e,
          ambientLightIntensity: 0.3,
          directionalLightIntensity: 0.4,
          hemisphereSkyColor: 0x1a1a2e,
          hemisphereGroundColor: 0x0f0f1a,
        });
        break;
    }
  }

  /**
   * Update directional light to follow a target (for shadow optimization)
   */
  updateShadowTarget(target: THREE.Vector3): void {
    if (this.dirLight) {
      this.dirLight.position.set(target.x + 50, 100, target.z + 50);
      this.dirLight.target.position.copy(target);
      this.dirLight.target.updateMatrixWorld();
    }
  }

  /**
   * Cleanup and dispose resources
   */
  dispose(): void {
    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      this.skyMesh.geometry.dispose();
      (this.skyMesh.material as THREE.Material).dispose();
    }
  }
}
