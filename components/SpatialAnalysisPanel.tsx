
import React, { useState } from 'react';
import { Annotation, Concept } from '../types';
import { Box, ArrowRightLeft, ScanEye, Layers, Search } from 'lucide-react';

interface SpatialAnalysisPanelProps {
  annotations: Annotation[];
  concepts: Concept[];
  isVisible: boolean;
}

export const SpatialAnalysisPanel: React.FC<SpatialAnalysisPanelProps> = ({
  annotations,
  concepts,
  isVisible
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isVisible) return null;

  // Group by depth layer to show scene composition
  const depthLayers = Array.from({ length: 11 }, (_, i) => 10 - i); // 10 down to 0

  const getConceptName = (id: string) => concepts.find(c => c.id === id)?.name || id;
  const getConceptColor = (id: string) => concepts.find(c => c.id === id)?.color || '#666';

  // Filter annotations based on search term in spatialContext
  const filteredAnnotations = annotations.filter(ann => 
    !searchTerm || (ann.spatialContext && ann.spatialContext.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-10">
        <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center">
          <ScanEye size={16} className="mr-2" />
          Spatial Intelligence
        </h2>
        <p className="text-xs text-zinc-500 mt-1">Gemini 3 Scene Understanding</p>
        
        {/* Search Bar */}
        <div className="mt-3 relative group">
           <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search size={12} className="text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
           </div>
           <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by spatial context..."
              className="w-full bg-black border border-zinc-800 rounded text-xs py-1.5 pl-8 pr-2 text-zinc-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder-zinc-600 transition-all"
           />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        
        {/* Scene Composition (Depth) */}
        <div>
           <h3 className="text-xs font-bold text-zinc-300 mb-3 flex items-center uppercase">
              <Layers size={12} className="mr-1.5" /> Z-Depth Composition
           </h3>
           <div className="space-y-1 relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-zinc-700 to-zinc-900" />
              
              {filteredAnnotations.length === 0 && searchTerm && (
                  <div className="pl-6 text-xs text-zinc-600 italic">No matches found.</div>
              )}

              {depthLayers.map(layer => {
                 const layerAnns = filteredAnnotations.filter(a => (a.depthLayer ?? 5) === layer);
                 if (layerAnns.length === 0) return null;

                 return (
                    <div key={layer} className="pl-6 relative">
                       <div className="absolute left-2 top-2 w-2 h-px bg-zinc-700" />
                       <span className="text-[10px] text-zinc-600 absolute -left-1 top-0.5 bg-zinc-900 px-1">
                          L{layer}
                       </span>
                       <div className="space-y-1">
                          {layerAnns.map(ann => (
                             <div key={ann.id} className="bg-zinc-850 p-2 rounded border border-zinc-800 flex items-start">
                                <div 
                                   className="w-1.5 h-1.5 rounded-full mt-1 mr-2 shrink-0" 
                                   style={{ backgroundColor: getConceptColor(ann.conceptId) }} 
                                />
                                <div>
                                   <div className="text-xs text-zinc-200 font-medium">{getConceptName(ann.conceptId)}</div>
                                   <div className="text-[10px] text-zinc-500">{ann.spatialContext}</div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )
              })}
           </div>
        </div>

        {/* Object Relationships */}
        <div>
           <h3 className="text-xs font-bold text-zinc-300 mb-3 flex items-center uppercase">
              <ArrowRightLeft size={12} className="mr-1.5" /> Spatial Relations
           </h3>
           <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 space-y-3">
              {filteredAnnotations.length < 1 ? (
                 <div className="text-center text-zinc-600 text-xs py-2">
                     {searchTerm ? 'No relations matching filter.' : 'Add objects to analyze relationships.'}
                 </div>
              ) : (
                 filteredAnnotations.slice(0, 10).map((ann, idx) => (
                    <div key={`rel-${ann.id || idx}`} className="text-xs text-zinc-400 border-b border-zinc-800/50 last:border-0 pb-2 last:pb-0">
                       <span className="text-zinc-200 font-medium">{getConceptName(ann.conceptId)}</span>
                       <span className="mx-1 text-indigo-400">is positioned</span>
                       <span className="italic">"{ann.spatialContext}"</span>
                    </div>
                 ))
              )}
           </div>
        </div>

        {/* 3D Bounding Box Data */}
        <div>
           <h3 className="text-xs font-bold text-zinc-300 mb-3 flex items-center uppercase">
              <Box size={12} className="mr-1.5" /> Metadata
           </h3>
           <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-850 p-2 rounded text-center">
                 <div className="text-xs text-zinc-500">FOV Est.</div>
                 <div className="text-sm text-zinc-300 font-mono">85°</div>
              </div>
              <div className="bg-zinc-850 p-2 rounded text-center">
                 <div className="text-xs text-zinc-500">Perspective</div>
                 <div className="text-sm text-zinc-300 font-mono">3-Point</div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
