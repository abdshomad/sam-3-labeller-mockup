
export enum ModelType {
  SAM3 = 'Meta SAM 3 (Mock)',
  GEMINI = 'Gemini 3 Pro (Spatial)'
}

export type ToolType = 'select' | 'box' | 'polygon' | 'point';

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  conceptId: string;
  box: BoundingBox;
  type?: ToolType; // Defaults to 'box' if undefined
  points?: Point[]; // For polygons and points
  confidence: number; // 0 to 1
  isVerified: boolean;
  isMasklet: boolean; // Visualization style (solid vs outline)
  frameStart?: number;
  frameEnd?: number;
  
  // New Spatial Understanding Fields
  spatialContext?: string; // e.g., "Next to the red sedan"
  depthLayer?: number; // 0 (background) to 10 (foreground)
  orientation?: string; // e.g., "Facing left"
}

export interface Concept {
  id: string;
  name: string;
  color: string;
  presenceScore: number; // 0 to 1, from Presence Head
  instanceCount: number;
  isVisible: boolean;
}

export interface VideoState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}
