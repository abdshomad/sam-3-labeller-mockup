import React from 'react';
import { Concept } from '../types';
import { Eye, EyeOff, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

interface ConceptLedgerProps {
  concepts: Concept[];
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ConceptLedger: React.FC<ConceptLedgerProps> = ({
  concepts,
  onToggleVisibility,
  onDelete
}) => {
  return (
    <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Concept Ledger</h2>
        <p className="text-xs text-zinc-500 mt-1">PCS Active</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {concepts.length === 0 && (
          <div className="text-center p-8 text-zinc-600 text-sm">
            No concepts defined.<br/>Use the Command Bar to add one.
          </div>
        )}
        
        {concepts.map((concept) => (
          <div 
            key={concept.id} 
            className="bg-zinc-850 rounded-lg p-3 border border-zinc-800 hover:border-zinc-700 transition-colors group"
          >
            {/* Header: Name and Controls */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full shadow-[0_0_8px]" 
                  style={{ backgroundColor: concept.color, boxShadow: `0 0 8px ${concept.color}` }} 
                />
                <span className="font-medium text-zinc-200">{concept.name}</span>
              </div>
              <div className="flex items-center space-x-1 opacity-50 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onToggleVisibility(concept.id)}
                  className="p-1 hover:bg-zinc-700 rounded text-zinc-400"
                >
                  {concept.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button 
                  onClick={() => onDelete(concept.id)}
                  className="p-1 hover:bg-red-900/30 rounded text-zinc-400 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-zinc-900 rounded p-2 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">Instances</span>
                <span className="text-lg font-mono leading-tight">{concept.instanceCount}</span>
              </div>
              <div className="bg-zinc-900 rounded p-2 flex flex-col">
                <span className="text-[10px] text-zinc-500 uppercase">Presence</span>
                <div className="flex items-center space-x-1">
                  <span className={`text-lg font-mono leading-tight ${concept.presenceScore > 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {(concept.presenceScore * 100).toFixed(0)}%
                  </span>
                  {concept.presenceScore > 0.7 ? (
                    <CheckCircle size={12} className="text-emerald-500" />
                  ) : (
                    <AlertTriangle size={12} className="text-amber-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Presence Bar */}
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full transition-all duration-500"
                style={{ 
                  width: `${concept.presenceScore * 100}%`,
                  backgroundColor: concept.presenceScore > 0.7 ? '#10b981' : '#f59e0b' 
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};