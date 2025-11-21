
import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Wand2, Layers, Cpu, Cuboid, PanelRightOpen, PanelRightClose, Upload, Image as ImageIcon } from 'lucide-react';
import { ConceptLedger } from './components/ConceptLedger';
import { SemanticCanvas } from './components/SemanticCanvas';
import { Timeline } from './components/Timeline';
import { SpatialAnalysisPanel } from './components/SpatialAnalysisPanel';
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
        // Handle potential prefix if present, though split is usually safer on usage site
        resolve(base64data);
    }
    reader.onerror = reject;
  });
};

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6'];
const DEMO_IMAGE = "https://images.unsplash.com/photo-1566228000166-58d23131593d?q=80&w=2070&auto=format&fit=crop"; 

export default function App() {
  const [activeModel, setActiveModel] = useState<ModelType>(ModelType.SAM3);
  const [imageSrc, setImageSrc] = useState<string>(DEMO_IMAGE);
  const [inputValue, setInputValue] = useState('');
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // UI State
  const [showSpatialPanel, setShowSpatialPanel] = useState(false);
  const [showSpatialOverlay, setShowSpatialOverlay] = useState(false);

  // File Input
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-switch visuals when model changes
  useEffect(() => {
      if (activeModel === ModelType.GEMINI) {
          setShowSpatialPanel(true);
          setShowSpatialOverlay(true);
      } else {
          setShowSpatialPanel(false);
          setShowSpatialOverlay(false);
      }
  }, [activeModel]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target?.result) {
            setImageSrc(event.target.result as string);
            // Reset state for new image
            setAnnotations([]);
            setConcepts([]);
            // Auto-switch to Gemini for real analysis since Mock SAM won't work on custom images
            setActiveModel(ModelType.GEMINI);
        }
    };
    reader.readAsDataURL(file);
  };

  const handleConceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newConceptName = inputValue.trim();
    const newConceptId = newConceptName.toLowerCase().replace(/\s+/g, '-');

    if (concepts.find(c => c.id === newConceptId)) {
        setInputValue('');
        return;
    }

    setIsProcessing(true);

    const newConcept: Concept = {
        id: newConceptId,
        name: newConceptName,
        color: COLORS[concepts.length % COLORS.length],
        presenceScore: 0.92,
        instanceCount: 0,
        isVisible: true
    };

    let newAnnotations: Annotation[] = [];
    
    if (activeModel === ModelType.GEMINI) {
        try {
            let base64 = '';
            if (imageSrc.startsWith('data:')) {
                base64 = imageSrc.split(',')[1];
            } else {
                const fullBase64 = await getBase64FromUrl(imageSrc);
                base64 = fullBase64.split(',')[1] || fullBase64;
            }
            
            const detected = await detectObjects(process.env.API_KEY || '', base64, newConceptName);
            
            newAnnotations = detected.map(a => ({
                ...a,
                conceptId: newConceptId
            }));
        } catch (error) {
            console.error("Analysis failed", error);
        }
    } else {
        // Mock delay
        await new Promise(r => setTimeout(r, 800)); 
        newAnnotations = mockSAM3Detect(newConceptId);
    }

    newConcept.instanceCount = newAnnotations.length;
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
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              S3
            </div>
            <span className="font-bold text-lg tracking-tight">SAM 3 <span className="text-zinc-500 font-normal">Labeller</span></span>
          </div>
          
          {/* Model Selector */}
          <div className="ml-8 flex items-center bg-black rounded-lg p-1 border border-zinc-800">
            <button 
               onClick={() => setActiveModel(ModelType.SAM3)}
               className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeModel === ModelType.SAM3 ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
               SAM 3 Native
            </button>
            <button 
               onClick={() => setActiveModel(ModelType.GEMINI)}
               className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center space-x-1.5 ${activeModel === ModelType.GEMINI ? 'bg-indigo-900/30 text-indigo-300 shadow-sm ring-1 ring-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
               <Wand2 size={12} />
               <span>Gemini 3 Spatial</span>
            </button>
          </div>

          {/* Image Upload */}
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
          >
            <Upload size={14} />
            <span>Upload Image</span>
          </button>
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
                placeholder={activeModel === ModelType.GEMINI ? "Ask Gemini to find objects with spatial context..." : "Describe a concept to label..."}
                className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
             />
             <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                <span className="text-[10px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">ENTER</span>
             </div>
          </form>
        </div>

        <div className="flex items-center space-x-4">
           {/* Spatial Toggles */}
           <div className="flex items-center border-r border-zinc-800 pr-4 space-x-1">
              <button 
                onClick={() => setShowSpatialOverlay(!showSpatialOverlay)}
                title="Toggle Spatial Overlay"
                className={`p-2 rounded-lg transition-colors ${showSpatialOverlay ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:bg-zinc-800'}`}
              >
                <Cuboid size={18} />
              </button>
              <button 
                onClick={() => setShowSpatialPanel(!showSpatialPanel)}
                title="Toggle Intelligence Panel"
                className={`p-2 rounded-lg transition-colors ${showSpatialPanel ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-500 hover:bg-zinc-800'}`}
              >
                {showSpatialPanel ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
              </button>
           </div>

           <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-zinc-900"></span>
           </button>
           <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-xs font-bold border border-white/10 shadow-inner">
              JD
           </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 flex overflow-hidden relative">
         <ConceptLedger 
            concepts={concepts} 
            onToggleVisibility={toggleVisibility}
            onDelete={deleteConcept}
         />
         
         <div className="flex-1 flex flex-col min-w-0 bg-black/20">
            {/* Top Toolbar for Canvas */}
            <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 text-xs text-zinc-400 select-none">
                <div className="flex items-center space-x-6">
                    <span className="flex items-center hover:text-zinc-200 cursor-pointer transition-colors">
                        <Layers size={14} className="mr-2 text-zinc-500"/> 
                        {annotations.length} Masks
                    </span>
                    <span className="flex items-center hover:text-zinc-200 cursor-pointer transition-colors">
                        <Cpu size={14} className="mr-2 text-zinc-500"/> 
                        {activeModel === ModelType.SAM3 ? 'H100 Cluster (Inference)' : 'Gemini 3 Pro (Reasoning)'}
                    </span>
                    <span className="flex items-center">
                        <ImageIcon size={14} className="mr-2 text-zinc-500" />
                        {imageSrc === DEMO_IMAGE ? "Demo Image" : "Custom Upload"}
                    </span>
                </div>
                <div className="flex items-center space-x-4">
                    <span className={`w-2 h-2 rounded-full ${activeModel === ModelType.GEMINI ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                    <span>Latency: {activeModel === ModelType.GEMINI ? '420ms' : '32ms'}</span>
                </div>
            </div>

            <SemanticCanvas 
                imageUrl={imageSrc} 
                annotations={annotations}
                concepts={concepts}
                onVerify={verifyMask}
                onReject={rejectMask}
                showSpatialOverlay={showSpatialOverlay}
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

         {/* Right Sidebar for Spatial Intelligence */}
         <div className={`transition-all duration-300 ease-in-out border-l border-zinc-800 ${showSpatialPanel ? 'w-80 translate-x-0' : 'w-0 translate-x-full opacity-0 overflow-hidden'}`}>
             <SpatialAnalysisPanel 
                annotations={annotations} 
                concepts={concepts}
                isVisible={showSpatialPanel}
             />
         </div>
      </div>
    </div>
  );
}
