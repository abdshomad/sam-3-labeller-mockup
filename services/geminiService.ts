
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Annotation, BoundingBox } from "../types";

const BOX_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    box_2d: {
      type: Type.ARRAY,
      items: { type: Type.NUMBER },
      description: "The bounding box [ymin, xmin, ymax, xmax] normalized 0-1000."
    },
    label: { type: Type.STRING },
    confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
    spatial_context: { 
      type: Type.STRING, 
      description: "Brief description of spatial context relative to other objects (e.g. 'occluded by tree', 'in foreground', 'left of building')." 
    },
    estimated_depth: { 
      type: Type.NUMBER, 
      description: "Estimated relative depth layer from 0 (horizon/far) to 10 (immediate foreground)." 
    },
    orientation: {
      type: Type.STRING,
      description: "Approximate facing direction (e.g., 'Front-left', 'Away')."
    }
  }
};

const RESPONSE_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: BOX_SCHEMA
};

export const detectObjects = async (
  apiKey: string,
  imageBase64: string,
  prompt: string
): Promise<Annotation[]> => {
  if (!apiKey) {
    console.warn("No API Key provided for Gemini");
    return [];
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `
      You are an advanced spatial reasoning engine for a computer vision labeling tool (SAM 3 Labeller). 
      Identify all instances of the user's requested concept in the image.
      For each instance, provide:
      1. Precise bounding box.
      2. Confidence score.
      3. Spatial Context: Describe its relationship to the scene or other objects (occlusion, position).
      4. Estimated Depth: A relative integer from 0 (farthest) to 10 (closest).
      5. Orientation: Which way is the object facing?
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: `Find all instances of: ${prompt}. Analyze their spatial placement carefully.` }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3, 
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const data = JSON.parse(jsonText);
    
    // Map response to internal Annotation type
    return data.map((item: any, index: number) => {
      const box = item.box_2d;
      
      const normalizedBox: BoundingBox = {
        ymin: box[0] / 1000,
        xmin: box[1] / 1000,
        ymax: box[2] / 1000,
        xmax: box[3] / 1000
      };

      return {
        id: `gemini-${Date.now()}-${index}`,
        conceptId: prompt,
        box: normalizedBox,
        confidence: item.confidence || 0.85,
        isVerified: false,
        isMasklet: true,
        frameStart: 0,
        frameEnd: 100,
        spatialContext: item.spatial_context || "Spatial analysis unavailable",
        depthLayer: item.estimated_depth ?? 5,
        orientation: item.orientation || "Unknown"
      };
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};


// Mock function for SAM 3 behavior simulation with fake spatial data
export const mockSAM3Detect = (concept: string): Annotation[] => {
  const count = Math.floor(Math.random() * 5) + 2; 
  const annotations: Annotation[] = [];

  for (let i = 0; i < count; i++) {
    const width = Math.random() * 0.2 + 0.05;
    const height = Math.random() * 0.3 + 0.1;
    const x = Math.random() * (1 - width);
    const y = Math.random() * (1 - height);
    const conf = Math.random() * 0.4 + 0.6;
    
    // Mock Spatial Data
    const depth = Math.floor(Math.random() * 10);
    const contexts = ["Partially occluded", "In open space", "Near edge", "Cluster center"];
    const orientations = ["Front", "Side-Profile", "Back", "Three-quarter"];

    annotations.push({
      id: `sam3-${Date.now()}-${i}`,
      conceptId: concept,
      box: {
        ymin: y,
        xmin: x,
        ymax: y + height,
        xmax: x + width
      },
      confidence: conf,
      isVerified: conf > 0.85, 
      isMasklet: true,
      frameStart: 0,
      frameEnd: 100,
      spatialContext: contexts[Math.floor(Math.random() * contexts.length)],
      depthLayer: depth,
      orientation: orientations[Math.floor(Math.random() * orientations.length)]
    });
  }
  return annotations;
};
