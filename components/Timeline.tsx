import React from 'react';
import { Annotation, Concept } from '../types';
import { Play, Pause, FastForward, Rewind, GitMerge, Scissors } from 'lucide-react';

interface TimelineProps {
  annotations: Annotation[];
  concepts: Concept[];
  currentTime: number; // 0 to 100
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  annotations,
  concepts,
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek
}) => {
  
  // Group annotations by concept ID for swimlanes
  const lanes = concepts.filter(c => c.isVisible);

  return (
    <div className="h-64 bg-zinc-900 border-t border-zinc-800 flex flex-col shrink-0">
      {/* Toolbar */}
      <div className="h-10 border-b border-zinc-800 flex items-center px-4 justify-between">
        <div className="flex items-center space-x-4">
          <button className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400">
            <Rewind size={16} />
          </button>
          <button 
            onClick={onPlayPause}
            className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400">
            <FastForward size={16} />
          </button>
          <span className="text-xs font-mono text-zinc-500">
            {Math.floor(currentTime * duration / 100).toString().padStart(2, '0')}:00 / {duration}:00
          </span>
        </div>

        <div className="flex items-center space-x-2">
           <span className="text-xs text-zinc-600 mr-2">TRACKING TOOLS</span>
           <button className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700">
              <GitMerge size={12} />
              <span>Merge</span>
           </button>
           <button className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700">
              <Scissors size={12} />
              <span>Split</span>
           </button>
        </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
         {/* Playhead Line */}
         <div 
            className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-20 pointer-events-none transition-all ease-linear"
            style={{ left: `${currentTime}%` }}
         >
            <div className="w-2 h-2 bg-indigo-500 transform -translate-x-[3px] rotate-45 mt-0" />
         </div>

         {/* Time Grids (Background) */}
         <div className="absolute inset-0 flex pointer-events-none">
            {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(pos => (
               <div key={pos} className="h-full border-r border-zinc-800/50 w-[10%]" />
            ))}
         </div>

         {lanes.map(concept => {
            const conceptAnnotations = annotations.filter(a => a.conceptId === concept.id);
            
            return (
               <div key={concept.id} className="relative h-12 border-b border-zinc-800/50 flex items-center px-4 group">
                  <div className="w-32 shrink-0 text-xs font-medium text-zinc-400 truncate pr-4 flex items-center">
                     <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: concept.color }} />
                     {concept.name}
                  </div>
                  
                  <div className="flex-1 relative h-8 bg-zinc-950/30 rounded overflow-hidden" onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const pct = (x / rect.width) * 100;
                      onSeek(pct);
                  }}>
                     {conceptAnnotations.map(ann => (
                        <div 
                           key={ann.id}
                           className={`absolute top-1 bottom-1 rounded-sm opacity-80 cursor-pointer hover:brightness-125 border-l-2 ${ann.isVerified ? 'border-white' : 'border-dashed border-white/50'}`}
                           style={{ 
                              left: `${ann.frameStart}%`, 
                              width: `${(ann.frameEnd || 100) - (ann.frameStart || 0)}%`,
                              backgroundColor: concept.color,
                              background: `linear-gradient(90deg, ${concept.color} 0%, ${concept.color}80 100%)` // Gradient fade logic
                           }}
                        >
                           {/* Confidence dip indicator visualization (fake) */}
                           {!ann.isVerified && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400/50 animate-pulse" />
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            );
         })}
      </div>
    </div>
  );
};