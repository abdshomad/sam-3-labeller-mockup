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
    confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" }
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
      You are an object detection engine for a labeling tool. 
      Identify all instances of the user's requested concept in the image.
      Return bounding boxes and confidence scores.
      If the object is partially occluded, still detect it but lower confidence.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
          { text: `Find all instances of: ${prompt}` }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2, // Low temperature for more deterministic detection
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const data = JSON.parse(jsonText);
    
    // Map response to internal Annotation type
    return data.map((item: any, index: number) => {
      // Gemini often returns [ymin, xmin, ymax, xmax] scaled to 1000
      const box = item.box_2d;
      
      const normalizedBox: BoundingBox = {
        ymin: box[0] / 1000,
        xmin: box[1] / 1000,
        ymax: box[2] / 1000,
        xmax: box[3] / 1000
      };

      return {
        id: `gemini-${Date.now()}-${index}`,
        conceptId: prompt, // Temporary linking via name
        box: normalizedBox,
        confidence: item.confidence || 0.85,
        isVerified: false,
        isMasklet: true,
        frameStart: 0,
        frameEnd: 100
      };
    });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};


// Mock function for SAM 3 behavior simulation
export const mockSAM3Detect = (concept: string): Annotation[] => {
  const count = Math.floor(Math.random() * 5) + 2; // Random number of objects
  const annotations: Annotation[] = [];

  for (let i = 0; i < count; i++) {
    // Generate random consistent boxes
    const width = Math.random() * 0.2 + 0.05;
    const height = Math.random() * 0.3 + 0.1;
    const x = Math.random() * (1 - width);
    const y = Math.random() * (1 - height);
    const conf = Math.random() * 0.4 + 0.6; // 0.6 to 1.0

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
      isVerified: conf > 0.85, // Auto-verify high confidence
      isMasklet: true,
      frameStart: 0, // Mocking full video duration for now
      frameEnd: 100
    });
  }
  return annotations;
};