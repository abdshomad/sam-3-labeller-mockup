export enum ModelType {
  SAM3 = 'Meta SAM 3 (Mock)',
  GEMINI = 'Gemini 2.5 Flash (Live)'
}

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface Annotation {
  id: string;
  conceptId: string;
  box: BoundingBox;
  confidence: number; // 0 to 1
  isVerified: boolean;
  isMasklet: boolean; // Visualization style (solid vs outline)
  frameStart?: number;
  frameEnd?: number;
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