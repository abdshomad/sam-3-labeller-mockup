import React, { useState, useEffect } from 'react';
import { Search, Settings, Bell, User, Cpu, Layers, Wand2 } from 'lucide-react';
import { ConceptLedger } from './components/ConceptLedger';
import { SemanticCanvas } from './components/SemanticCanvas';
import { Timeline } from './components/Timeline';
import { Annotation, Concept, ModelType } from './types';
import { detectObjects, mockSAM3Detect } from './services/geminiService';

// Helper to fetch image blob and convert to base64
const getBase64FromUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
        const base64data = reader.result as string;
        // Remove the data URL prefix
        resolve(base64data.split(',')[1]);
    }
    reader.onerror = reject;
  });
};

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];
const DEMO_IMAGE = "https://images.unsplash.com/photo-1566228000166-58d23131593d?q=80&w=2070&auto=format&fit=crop"; // Traffic scene

export default function App() {
  const [activeModel, setActiveModel] = useState<ModelType>(ModelType.SAM3);
  const [inputValue, setInputValue] = useState('');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Playback state
  const [currentTime, setCurrentTime] = useState(20);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (isPlaying) {
          interval = setInterval(() => {
              setCurrentTime(prev => (prev >= 100 ? 0 : prev + 0.2));
          }, 50);
      }
      return () => clearInterval(interval);
  }, [isPlaying]);

  const handleConceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newConceptName = inputValue.trim();
    const newConceptId = newConceptName.toLowerCase().replace(/\s+/g, '-');

    // Check duplicates
    if (concepts.find(c => c.id === newConceptId)) {
        setInputValue('');
        return;
    }

    setIsProcessing(true);

    // 1. Create Concept
    const newConcept: Concept = {
        id: newConceptId,
        name: newConceptName,
        color: COLORS[concepts.length % COLORS.length],
        presenceScore: 0.92, // Placeholder initial score
        instanceCount: 0,
        isVisible: true
    };

    // 2. Fetch Annotations
    let newAnnotations: Annotation[] = [];
    
    if (activeModel === ModelType.GEMINI) {
        const base64 = await getBase64FromUrl(DEMO_IMAGE);
        const detected = await detectObjects(process.env.API_KEY || '', base64, newConceptName);
        
        // Remap IDs to match our concept system
        newAnnotations = detected.map(a => ({
            ...a,
            conceptId: newConceptId
        }));
    } else {
        // SAM 3 Mock
        await new Promise(r => setTimeout(r, 800)); // Simulate inference time
        newAnnotations = mockSAM3Detect(newConceptId);
    }

    // 3. Update State
    newConcept.instanceCount = newAnnotations.length;
    // Calculate average confidence for presence score
    if (newAnnotations.length > 0) {
        const avgConf = newAnnotations.reduce((sum, a) => sum + a.confidence, 0) / newAnnotations.length;
        newConcept.presenceScore = avgConf;
    } else {
        newConcept.presenceScore = 0.1;
    }

    setConcepts(prev => [...prev, newConcept]);
    setAnnotations(prev => [...prev, ...newAnnotations]);
    setInputValue('');
    setIsProcessing(false);
  };

  const toggleVisibility = (id: string) => {
    setConcepts(prev => prev.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c));
  };

  const deleteConcept = (id: string) => {
    setConcepts(prev => prev.filter(c => c.id !== id));
    setAnnotations(prev => prev.filter(a => a.conceptId !== id));
  };

  const verifyMask = (id: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, isVerified: true } : a));
  };

  const rejectMask = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    setConcepts(prev => prev.map(c => {
        // Update instance count
        const remaining = annotations.filter(a => a.conceptId === c.id && a.id !== id).length;
        return c.id === annotations.find(a => a.id === id)?.conceptId ? { ...c, instanceCount: remaining } : c;
    }));
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4 shrink-0 z-50">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white">
              S3
            </div>
            <span className="font-bold text-lg tracking-tight">SAM 3 <span className="text-zinc-500 font-normal">Labeller</span></span>
          </div>
          
          {/* Model Selector */}
          <div className="ml-8 flex items-center bg-zinc-950 rounded-lg p-1 border border-zinc-800">
            <button 
               onClick={() => setActiveModel(ModelType.SAM3)}
               className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeModel === ModelType.SAM3 ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
               SAM 3 Native
            </button>
            <button 
               onClick={() => setActiveModel(ModelType.GEMINI)}
               className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center space-x-1 ${activeModel === ModelType.GEMINI ? 'bg-zinc-800 text-indigo-400 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
               <span>Gemini 2.5</span>
               <span className="block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
            </button>
          </div>
        </div>

        {/* Concept Command Bar */}
        <div className="flex-1 max-w-xl mx-4">
          <form onSubmit={handleConceptSubmit} className="relative group">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {isProcessing ? (
                    <Wand2 className="text-indigo-500 animate-spin" size={16} />
                ) : (
                    <Search className="text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                )}
             </div>
             <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe a concept to label (e.g., 'red car', 'worker in vest')..." 
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
             />
             <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">ENTER</span>
             </div>
          </form>
        </div>

        <div className="flex items-center space-x-3">
           <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-zinc-900"></span>
           </button>
           <div className="h-8 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold">
              JD
           </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 flex overflow-hidden">
         <ConceptLedger 
            concepts={concepts} 
            onToggleVisibility={toggleVisibility}
            onDelete={deleteConcept}
         />
         
         <div className="flex-1 flex flex-col min-w-0">
            {/* Top Toolbar for Canvas */}
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 text-xs text-zinc-400">
                <div className="flex items-center space-x-4">
                    <span className="flex items-center hover:text-zinc-200 cursor-pointer"><Layers size={14} className="mr-1.5"/> Layers</span>
                    <span className="flex items-center hover:text-zinc-200 cursor-pointer"><Cpu size={14} className="mr-1.5"/> {activeModel === ModelType.SAM3 ? 'H100 Cluster' : 'Google TPUv5'}</span>
                </div>
                <div>
                    <span>Latency: {activeModel === ModelType.GEMINI ? '420ms' : '32ms'}</span>
                </div>
            </div>

            <SemanticCanvas 
                imageUrl={DEMO_IMAGE} 
                annotations={annotations}
                concepts={concepts}
                onVerify={verifyMask}
                onReject={rejectMask}
            />
            
            <Timeline 
                annotations={annotations}
                concepts={concepts}
                currentTime={currentTime}
                duration={100}
                isPlaying={isPlaying}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onSeek={setCurrentTime}
            />
         </div>
      </div>
    </div>
  );
}