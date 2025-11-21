
import React, { useState } from 'react';
import { Annotation, Concept } from '../types';
import { Maximize2, Check, X, Move3d, Eye } from 'lucide-react';

interface SemanticCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  concepts: Concept[];
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  showSpatialOverlay: boolean;
}

export const SemanticCanvas: React.FC<SemanticCanvasProps> = ({
  imageUrl,
  annotations,
  concepts,
  onVerify,
  onReject,
  showSpatialOverlay
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
                    
                    const isHovered = hoveredId === ann.id;
                    const strokeColor = concept.color;
                    const fillColor = `${concept.color}33`; 

                    return (
                        <g key={ann.id}>
                            {/* Depth Shadow (Pseudo-3D) */}
                            {showSpatialOverlay && ann.depthLayer !== undefined && (
                              <rect
                                x={`${ann.box.xmin * 100 + (10 - ann.depthLayer) * 0.2}%`}
                                y={`${ann.box.ymin * 100 + (10 - ann.depthLayer) * 0.2}%`}
                                width={`${(ann.box.xmax - ann.box.xmin) * 100}%`}
                                height={`${(ann.box.ymax - ann.box.ymin) * 100}%`}
                                fill="black"
                                fillOpacity={0.3}
                                rx="2"
                              />
                            )}

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
                            
                            {/* Spatial Info Connector Line */}
                            {showSpatialOverlay && (
                                <line 
                                    x1={`${(ann.box.xmax) * 100}%`}
                                    y1={`${(ann.box.ymin) * 100}%`}
                                    x2={`${(ann.box.xmax) * 100 + 5}%`}
                                    y2={`${(ann.box.ymin) * 100 - 5}%`}
                                    stroke={strokeColor}
                                    strokeWidth="1"
                                    opacity={0.6}
                                />
                            )}

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
                            {/* Standard Tooltip */}
                            {hoveredId === ann.id && !showSpatialOverlay && (
                                <div className="absolute -top-10 left-0 bg-zinc-900/90 backdrop-blur text-xs text-white px-2 py-1 rounded border border-zinc-700 shadow-xl flex items-center space-x-2 whitespace-nowrap z-50">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: concept.color }} />
                                    <span className="font-semibold">{concept.name}</span>
                                    <span className={`font-mono ${ann.confidence < 0.8 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                                        {(ann.confidence * 100).toFixed(0)}%
                                    </span>
                                    {!ann.isVerified && (
                                        <div className="flex items-center ml-2 space-x-1 border-l border-zinc-700 pl-2">
                                            <button onClick={(e) => { e.stopPropagation(); onVerify(ann.id); }} className="p-1 hover:bg-emerald-500/20 text-emerald-400 rounded"><Check size={12} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); onReject(ann.id); }} className="p-1 hover:bg-red-500/20 text-red-400 rounded"><X size={12} /></button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Spatial Annotation Tag (Always visible if overlay on) */}
                            {showSpatialOverlay && (
                                <div 
                                    className="absolute -top-8 -right-24 w-24 transform translate-x-full"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    <div className="bg-indigo-900/80 backdrop-blur border border-indigo-500/50 text-[10px] p-1.5 rounded text-indigo-100 shadow-lg">
                                        <div className="flex items-center space-x-1 mb-1 font-bold text-indigo-300 border-b border-indigo-500/30 pb-0.5">
                                            <Move3d size={10} />
                                            <span>Depth: {ann.depthLayer}/10</span>
                                        </div>
                                        <div className="leading-tight opacity-90">
                                            {ann.spatialContext}
                                        </div>
                                    </div>
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
