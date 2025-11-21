
import React, { useState, useRef, useEffect } from 'react';
import { Annotation, Concept, ToolType, Point, BoundingBox } from '../types';
import { Maximize2, Check, X, Move3d, Eye, Layers, Compass, Info } from 'lucide-react';

interface SemanticCanvasProps {
  imageUrl: string;
  annotations: Annotation[];
  concepts: Concept[];
  selectedTool: ToolType;
  activeConceptId: string | null;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  onAddAnnotation: (annotation: Partial<Annotation>) => void;
  showSpatialOverlay: boolean;
}

export const SemanticCanvas: React.FC<SemanticCanvasProps> = ({
  imageUrl,
  annotations,
  concepts,
  selectedTool,
  activeConceptId,
  onVerify,
  onReject,
  onAddAnnotation,
  showSpatialOverlay
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const getConcept = (id: string) => concepts.find(c => c.id === id || c.name === id);
  const activeConcept = concepts.find(c => c.id === activeConceptId);

  const getRelativeCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedTool === 'select' || !activeConceptId) return;
    
    const coords = getRelativeCoords(e);
    setIsDrawing(true);
    
    if (selectedTool === 'box') {
      setCurrentPoints([coords, coords]); // Start and current end
    } else if (selectedTool === 'point') {
      // Point is instant
      onAddAnnotation({
        type: 'point',
        points: [coords],
        box: { xmin: coords.x - 0.01, ymin: coords.y - 0.01, xmax: coords.x + 0.01, ymax: coords.y + 0.01 },
        conceptId: activeConceptId
      });
      setIsDrawing(false);
    } else if (selectedTool === 'polygon') {
      setCurrentPoints(prev => [...prev, coords]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) {
      if (selectedTool === 'polygon' && currentPoints.length > 0) {
        // Preview line to cursor for polygon
        // Not implemented in this simple version, usually handled by a separate "cursor point" state
      }
      return;
    }

    const coords = getRelativeCoords(e);

    if (selectedTool === 'box') {
      setCurrentPoints(prev => [prev[0], coords]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDrawing || selectedTool === 'select' || !activeConceptId) return;

    if (selectedTool === 'box') {
      const [start, end] = currentPoints;
      const box: BoundingBox = {
        xmin: Math.min(start.x, end.x),
        ymin: Math.min(start.y, end.y),
        xmax: Math.max(start.x, end.x),
        ymax: Math.max(start.y, end.y)
      };
      
      // Prevent tiny boxes
      if (box.xmax - box.xmin > 0.01 && box.ymax - box.ymin > 0.01) {
        onAddAnnotation({
          type: 'box',
          box,
          conceptId: activeConceptId
        });
      }
      setIsDrawing(false);
      setCurrentPoints([]);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (selectedTool === 'polygon' && activeConceptId && currentPoints.length >= 3) {
       // Close polygon
       const xs = currentPoints.map(p => p.x);
       const ys = currentPoints.map(p => p.y);
       const box: BoundingBox = {
         xmin: Math.min(...xs),
         ymin: Math.min(...ys),
         xmax: Math.max(...xs),
         ymax: Math.max(...ys)
       };

       onAddAnnotation({
         type: 'polygon',
         points: currentPoints,
         box,
         conceptId: activeConceptId
       });
       setIsDrawing(false);
       setCurrentPoints([]);
    }
  };

  // Helper to render SVG path for polygon
  const pointsToPath = (pts: Point[]) => {
    return pts.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
  };

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
        <div 
          ref={containerRef}
          className={`relative shadow-2xl border border-zinc-800 bg-black max-h-full max-w-full aspect-video group ${selectedTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
            <img 
                src={imageUrl} 
                alt="Annotation Target" 
                className="w-full h-full object-contain select-none pointer-events-none"
                crossOrigin="anonymous"
            />
            
            {/* SVG Overlay for Masks/Boxes/Polygons */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {annotations.map(ann => {
                    const concept = getConcept(ann.conceptId);
                    if (!concept || !concept.isVisible) return null;
                    
                    const isHovered = hoveredId === ann.id;
                    const strokeColor = concept.color;
                    const fillColor = `${concept.color}33`; 

                    return (
                        <g key={ann.id}>
                            {/* Render based on type */}
                            {ann.type === 'point' && ann.points && (
                                <circle 
                                  cx={`${ann.points[0].x * 100}%`} 
                                  cy={`${ann.points[0].y * 100}%`} 
                                  r="4"
                                  fill={strokeColor}
                                  stroke="white"
                                  strokeWidth="2"
                                />
                            )}

                            {ann.type === 'polygon' && ann.points && (
                                <polygon
                                  points={pointsToPath(ann.points)}
                                  fill={ann.isVerified ? fillColor : 'transparent'}
                                  stroke={strokeColor}
                                  strokeWidth={isHovered ? 3 : 2}
                                  strokeDasharray={ann.isVerified ? '0' : '4 2'}
                                />
                            )}

                            {(ann.type === 'box' || !ann.type) && (
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
                            )}
                            
                            {/* Spatial Overlays (Box based) */}
                            {showSpatialOverlay && ann.depthLayer !== undefined && (
                               <>
                                 <rect
                                    x={`${ann.box.xmin * 100 + (10 - ann.depthLayer) * 0.2}%`}
                                    y={`${ann.box.ymin * 100 + (10 - ann.depthLayer) * 0.2}%`}
                                    width={`${(ann.box.xmax - ann.box.xmin) * 100}%`}
                                    height={`${(ann.box.ymax - ann.box.ymin) * 100}%`}
                                    fill="black"
                                    fillOpacity={0.3}
                                    rx="2"
                                 />
                                 <line 
                                    x1={`${(ann.box.xmax) * 100}%`}
                                    y1={`${(ann.box.ymin) * 100}%`}
                                    x2={`${(ann.box.xmax) * 100 + 5}%`}
                                    y2={`${(ann.box.ymin) * 100 - 5}%`}
                                    stroke={strokeColor}
                                    strokeWidth="1"
                                    opacity={0.6}
                                />
                               </>
                            )}
                        </g>
                    );
                })}

                {/* Current Drawing Preview */}
                {isDrawing && activeConcept && (
                   <g>
                      {selectedTool === 'box' && currentPoints.length === 2 && (
                         <rect 
                            x={`${Math.min(currentPoints[0].x, currentPoints[1].x) * 100}%`}
                            y={`${Math.min(currentPoints[0].y, currentPoints[1].y) * 100}%`}
                            width={`${Math.abs(currentPoints[1].x - currentPoints[0].x) * 100}%`}
                            height={`${Math.abs(currentPoints[1].y - currentPoints[0].y) * 100}%`}
                            fill={`${activeConcept.color}33`}
                            stroke={activeConcept.color}
                            strokeWidth="2"
                            strokeDasharray="4 2"
                         />
                      )}
                      {selectedTool === 'polygon' && currentPoints.length > 0 && (
                         <>
                           <polyline
                              points={pointsToPath(currentPoints)}
                              fill="none"
                              stroke={activeConcept.color}
                              strokeWidth="2"
                           />
                           {currentPoints.map((p, i) => (
                              <circle key={i} cx={`${p.x * 100}%`} cy={`${p.y * 100}%`} r="3" fill="white" />
                           ))}
                         </>
                      )}
                   </g>
                )}
            </svg>

            {/* Interactive Layer (HTML Divs for tooltips/buttons) - ONLY for Select Tool */}
            {selectedTool === 'select' && (
              <div className="absolute inset-0 w-full h-full">
                  {annotations.map(ann => {
                      const concept = getConcept(ann.conceptId);
                      if (!concept || !concept.isVisible) return null;

                      return (
                          <div
                              key={ann.id}
                              className="absolute cursor-pointer"
                              style={{
                                  left: `${ann.box.xmin * 100}%`,
                                  top: `${ann.box.ymin * 100}%`,
                                  width: `${(ann.box.xmax - ann.box.xmin) * 100}%`,
                                  height: `${(ann.box.ymax - ann.box.ymin) * 100}%`,
                              }}
                              onMouseEnter={() => setHoveredId(ann.id)}
                              onMouseLeave={() => setHoveredId(null)}
                          >
                              {/* Standard Tooltip (Legacy/Non-Spatial) */}
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

                              {/* Enhanced Spatial Tooltip (On Hover + Spatial Mode) */}
                              {hoveredId === ann.id && showSpatialOverlay && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-zinc-900/95 backdrop-blur-md text-zinc-100 p-3 rounded-lg border border-indigo-500/50 shadow-2xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                                      {/* Header */}
                                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                                          <div className="flex items-center space-x-2">
                                              <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: concept.color, boxShadow: `0 0 8px ${concept.color}` }} />
                                              <span className="font-bold text-sm tracking-wide">{concept.name}</span>
                                          </div>
                                          <span className="font-mono text-[10px] text-indigo-400 bg-indigo-900/30 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                              {(ann.confidence * 100).toFixed(0)}% CONF
                                          </span>
                                      </div>
                                      
                                      {/* Spatial Metrics Grid */}
                                      <div className="grid grid-cols-2 gap-2 mb-3">
                                          <div className="bg-black/40 rounded p-2 flex items-start space-x-2 border border-white/5">
                                              <Layers size={14} className="text-zinc-500 mt-0.5" />
                                              <div>
                                                  <div className="text-[9px] text-zinc-500 uppercase font-bold">Z-Depth</div>
                                                  <div className="flex items-baseline space-x-1">
                                                      <span className="text-lg font-mono text-indigo-300 leading-none">{ann.depthLayer}</span>
                                                      <span className="text-[10px] text-zinc-600">/10</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="bg-black/40 rounded p-2 flex items-start space-x-2 border border-white/5">
                                              <Compass size={14} className="text-zinc-500 mt-0.5" />
                                              <div className="overflow-hidden">
                                                  <div className="text-[9px] text-zinc-500 uppercase font-bold">Facing</div>
                                                  <div className="text-xs font-medium text-zinc-300 mt-0.5 truncate" title={ann.orientation}>
                                                      {ann.orientation || 'Unknown'}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>

                                      {/* Context Description */}
                                      <div className="relative pl-3 py-1">
                                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                                          <div className="text-xs text-zinc-300 italic leading-relaxed opacity-90">
                                              "{ann.spatialContext}"
                                          </div>
                                      </div>
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
            )}

            {/* Overlay Controls */}
            <div className="absolute bottom-4 right-4 flex space-x-2 pointer-events-auto">
                <button className="p-2 bg-black/50 backdrop-blur hover:bg-black/80 text-white rounded-lg border border-white/10">
                    <Maximize2 size={18} />
                </button>
            </div>
        </div>
    </div>
  );
};
