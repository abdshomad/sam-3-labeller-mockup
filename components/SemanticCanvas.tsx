import React, { useRef, useEffect, useState } from 'react';
import { Annotation, Concept } from '../types';
import { Maximize2, Check, X } from 'lucide-react';

interface SemanticCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  concepts: Concept[];
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
}

export const SemanticCanvas: React.FC<SemanticCanvasProps> = ({
  imageUrl,
  annotations,
  concepts,
  onVerify,
  onReject
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const getConcept = (id: string) => concepts.find(c => c.id === id || c.name === id);

  return (
    <div className="flex-1 bg-zinc-950 relative overflow-hidden flex items-center justify-center p-8">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ 
                 backgroundImage: 'radial-gradient(#4f4f4f 1px, transparent 1px)', 
                 backgroundSize: '24px 24px' 
             }} 
        />

        {/* Main Canvas Container */}
        <div className="relative shadow-2xl border border-zinc-800 bg-black max-h-full max-w-full aspect-video group">
            <img 
                src={imageUrl} 
                alt="Annotation Target" 
                className="w-full h-full object-contain select-none"
                crossOrigin="anonymous"
            />
            
            {/* SVG Overlay for Masks/Boxes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {annotations.map(ann => {
                    const concept = getConcept(ann.conceptId);
                    if (!concept || !concept.isVisible) return null;
                    
                    // Determine style based on verification status
                    const isHovered = hoveredId === ann.id;
                    const strokeColor = concept.color;
                    const fillColor = `${concept.color}33`; // 20% opacity hex
                    
                    return (
                        <g key={ann.id}>
                            {/* The "Masklet" representation - here approximated as a box for Web compatibility */}
                            <rect
                                x={`${ann.box.xmin * 100}%`}
                                y={`${ann.box.ymin * 100}%`}
                                width={`${(ann.box.xmax - ann.box.xmin) * 100}%`}
                                height={`${(ann.box.ymax - ann.box.ymin) * 100}%`}
                                fill={ann.isVerified ? fillColor : 'transparent'}
                                stroke={strokeColor}
                                strokeWidth={isHovered ? 3 : 2}
                                strokeDasharray={ann.isVerified ? '0' : '4 2'}
                                className="transition-all duration-200 ease-out"
                            />
                            {/* Hover Effect Fill */}
                            {isHovered && (
                                <rect
                                    x={`${ann.box.xmin * 100}%`}
                                    y={`${ann.box.ymin * 100}%`}
                                    width={`${(ann.box.xmax - ann.box.xmin) * 100}%`}
                                    height={`${(ann.box.ymax - ann.box.ymin) * 100}%`}
                                    fill={concept.color}
                                    fillOpacity={0.1}
                                />
                            )}
                        </g>
                    );
                })}
            </svg>

            {/* Interactive Layer (HTML Divs for tooltips/buttons) */}
            <div className="absolute inset-0 w-full h-full">
                 {annotations.map(ann => {
                    const concept = getConcept(ann.conceptId);
                    if (!concept || !concept.isVisible) return null;

                    return (
                        <div
                            key={ann.id}
                            className="absolute cursor-crosshair"
                            style={{
                                left: `${ann.box.xmin * 100}%`,
                                top: `${ann.box.ymin * 100}%`,
                                width: `${(ann.box.xmax - ann.box.xmin) * 100}%`,
                                height: `${(ann.box.ymax - ann.box.ymin) * 100}%`,
                            }}
                            onMouseEnter={() => setHoveredId(ann.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            {/* Tooltip only on hover */}
                            {hoveredId === ann.id && (
                                <div className="absolute -top-10 left-0 bg-zinc-900 text-xs text-white px-2 py-1 rounded border border-zinc-700 shadow-xl flex items-center space-x-2 whitespace-nowrap z-50">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: concept.color }} />
                                    <span className="font-semibold">{concept.name}</span>
                                    <span className={`font-mono ${ann.confidence < 0.8 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                                        {(ann.confidence * 100).toFixed(0)}%
                                    </span>
                                    {!ann.isVerified && (
                                        <div className="flex items-center ml-2 space-x-1 border-l border-zinc-700 pl-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onVerify(ann.id); }}
                                                className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded"
                                                title="Verify Mask"
                                            >
                                                <Check size={12} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onReject(ann.id); }}
                                                className="p-1 hover:bg-red-500/20 text-red-400 rounded"
                                                title="Reject Mask"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                 })}
            </div>

            {/* Overlay Controls */}
            <div className="absolute bottom-4 right-4 flex space-x-2">
                <button className="p-2 bg-black/50 backdrop-blur hover:bg-black/80 text-white rounded-lg border border-white/10">
                    <Maximize2 size={18} />
                </button>
            </div>
        </div>
    </div>
  );
};