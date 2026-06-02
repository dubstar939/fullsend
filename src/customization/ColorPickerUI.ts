/**
 * Color Picker UI
 * Supports solid, metallic, pearlescent, and matte finishes with RGB/HSV controls
 */

import { ColorOption, ColorFinishType } from "../types/car.types";
import { CarPreview } from "./CarPreview";
import { CarBuild } from "../types/car.types";

// Predefined color options
export const COLOR_OPTIONS: ColorOption[] = [
  // Solid Colors
  { hex: "#FFFFFF", name: "Arctic White", finishType: "solid" },
  { hex: "#000000", name: "Phantom Black", finishType: "solid" },
  { hex: "#C0C0C0", name: "Silver Stone", finishType: "solid" },
  { hex: "#FF0000", name: "Racing Red", finishType: "solid" },
  { hex: "#0066CC", name: "Lightning Blue", finishType: "solid" },
  { hex: "#FFD700", name: "Sunshine Yellow", finishType: "solid" },
  { hex: "#00AA00", name: "Forest Green", finishType: "solid" },
  { hex: "#FF6600", name: "Sunset Orange", finishType: "solid" },
  
  // Metallic Colors
  { hex: "#4A5568", name: "Gunmetal Metallic", finishType: "metallic" },
  { hex: "#1A365D", name: "Deep Blue Metallic", finishType: "metallic" },
  { hex: "#742A2A", name: "Ruby Metallic", finishType: "metallic" },
  { hex: "#2F855A", name: "Emerald Metallic", finishType: "metallic" },
  { hex: "#553C9A", name: "Purple Haze Metallic", finishType: "metallic" },
  
  // Pearlescent Colors
  { hex: "#F7FAFC", name: "Pearl White", finishType: "pearlescent" },
  { hex: "#1A202C", name: "Midnight Pearl", finishType: "pearlescent" },
  { hex: "#C53030", name: "Crimson Pearl", finishType: "pearlescent" },
  { hex: "#2B6CB0", name: "Ocean Pearl", finishType: "pearlescent" },
  
  // Matte Colors
  { hex: "#4A4A4A", name: "Matte Gray", finishType: "matte" },
  { hex: "#2D3748", name: "Matte Black", finishType: "matte" },
  { hex: "#9B2C2C", name: "Matte Red", finishType: "matte" },
  { hex: "#2C5282", name: "Matte Blue", finishType: "matte" },
  { hex: "#276749", name: "Matte Green", finishType: "matte" }
];

export class ColorPickerUI {
  private preview: CarPreview;
  private build: CarBuild;
  private currentColor: string = "#FFFFFF";
  private currentFinishType: ColorFinishType = "solid";
  private customRGB: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 };
  private customHSV: { h: number; s: number; v: number } = { h: 0, s: 0, v: 100 };

  constructor(preview: CarPreview, build: CarBuild) {
    this.preview = preview;
    this.build = build;
  }

  /**
   * Set color by hex value
   */
  setColor(hex: string): void {
    this.currentColor = hex;
    this.preview.setColor(hex);
    this.updateHSVFromHex(hex);
  }

  /**
   * Confirm and apply color to the build
   */
  confirmColor(hex: string): void {
    this.build.installedVisuals.bodyColor = hex;
    this.preview.commitPreview();
  }

  /**
   * Set custom RGB values
   */
  setRGB(r: number, g: number, b: number): void {
    this.customRGB = {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b))
    };
    
    const hex = this.rgbToHex(this.customRGB.r, this.customRGB.g, this.customRGB.b);
    this.setColor(hex);
  }

  /**
   * Set custom HSV values
   */
  setHSV(h: number, s: number, v: number): void {
    this.customHSV = {
      h: Math.max(0, Math.min(360, h)),
      s: Math.max(0, Math.min(100, s)),
      v: Math.max(0, Math.min(100, v))
    };
    
    const hex = this.hsvToHex(this.customHSV.h, this.customHSV.s, this.customHSV.v);
    this.setColor(hex);
  }

  /**
   * Get colors filtered by finish type
   */
  getColorsByFinish(finishType: ColorFinishType): ColorOption[] {
    return COLOR_OPTIONS.filter(color => color.finishType === finishType);
  }

  /**
   * Get all available finish types
   */
  getFinishTypes(): ColorFinishType[] {
    return ["solid", "metallic", "pearlescent", "matte"];
  }

  /**
   * Set the current finish type (affects shader properties in renderer)
   */
  setFinishType(finishType: ColorFinishType): void {
    this.currentFinishType = finishType;
    // In a full implementation, this would update material properties
    console.log(`Finish type set to: ${finishType}`);
  }

  /**
   * Get current color
   */
  getCurrentColor(): string {
    return this.currentColor;
  }

  /**
   * Get current finish type
   */
  getCurrentFinishType(): ColorFinishType {
    return this.currentFinishType;
  }

  /**
   * Get current RGB values
   */
  getCurrentRGB(): { r: number; g: number; b: number } {
    return { ...this.customRGB };
  }

  /**
   * Get current HSV values
   */
  getCurrentHSV(): { h: number; s: number; v: number } {
    return { ...this.customHSV };
  }

  /**
   * Convert RGB to Hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  /**
   * Convert Hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  /**
   * Convert HSV to Hex
   */
  private hsvToHex(h: number, s: number, v: number): string {
    s /= 100;
    v /= 100;
    
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    
    let r = 0, g = 0, b = 0;
    
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return this.rgbToHex(r, g, b);
  }

  /**
   * Update HSV values from hex color
   */
  private updateHSVFromHex(hex: string): void {
    const rgb = this.hexToRgb(hex);
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max * 100;
    
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
      }
    }
    
    this.customHSV = {
      h: Math.round(h),
      s: Math.round(s * 100),
      v: Math.round(v)
    };
    
    this.customRGB = { r: rgb.r, g: rgb.g, b: rgb.b };
  }
}
