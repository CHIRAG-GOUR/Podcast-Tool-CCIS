"use client"

import React, { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowRight, Clock, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Block {
  type: 'dialogue' | 'bullets';
  content: string | string[];
}

interface Segment {
  title: string;
  duration: string;
  category: 'intro' | 'sponsor' | 'content' | 'outro' | string;
  blocks: Block[];
}

interface ScriptData {
  title: string;
  brief: string;
  segments: Segment[];
}

export function ScriptBoard({ rawReport }: { rawReport: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  let data: ScriptData | null = null;
  
  try {
    data = JSON.parse(rawReport);
    if (!data?.segments) throw new Error("Missing segments");
  } catch (e) {
    return (
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{rawReport}</ReactMarkdown>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'intro': return 'bg-orange-200 text-orange-900 border-orange-300';
      case 'sponsor': return 'bg-yellow-200 text-yellow-900 border-yellow-300';
      case 'content': return 'bg-green-200 text-green-900 border-green-300';
      case 'outro': return 'bg-orange-200 text-orange-900 border-orange-300';
      default: return 'bg-blue-200 text-blue-900 border-blue-300';
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 380; // approximate width of one card + gap
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background overflow-y-auto p-8" : "relative"}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">{data.title}</h2>
          <p className="text-muted-foreground text-lg max-w-3xl">{data.brief}</p>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          <button onClick={() => scroll('left')} className="p-2 border rounded-md bg-card hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => scroll('right')} className="p-2 border rounded-md bg-card hover:bg-muted transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 border rounded-md bg-card hover:bg-muted transition-colors ml-2">
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      {/* Horizontal Scroll Board */}
      <div ref={scrollRef} className="flex overflow-x-auto pb-8 gap-6 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none' }}>
        {data.segments.map((segment, idx) => (
          <div key={idx} className="flex-none w-[350px] flex flex-col gap-4 snap-start">
            
            {/* Header / Category Block */}
            <div className={`p-4 rounded-xl border-2 font-semibold flex items-center justify-between ${getCategoryColor(segment.category)}`}>
              <span>{segment.title}</span>
              <span className="flex items-center text-sm font-medium opacity-80 gap-1">
                <Clock className="w-4 h-4" /> {segment.duration}
              </span>
            </div>

            {/* Timeline Arrow Indicator */}
            {idx < (data?.segments.length || 0) - 1 && (
              <div className="absolute top-[80px] -right-5 z-10 hidden lg:block">
                <ArrowRight className="text-muted-foreground w-5 h-5" />
              </div>
            )}

            {/* Blocks */}
            <div className="flex flex-col gap-4 relative">
              {segment.blocks.map((block, bIdx) => (
                <div key={bIdx} className="bg-card border rounded-lg p-5 shadow-sm text-sm hover:shadow-md transition-shadow">
                  {block.type === 'dialogue' ? (
                    <div className="italic text-muted-foreground border-l-4 border-primary pl-4">
                      "{block.content}"
                    </div>
                  ) : (
                    <ul className="list-disc pl-4 space-y-2">
                      {Array.isArray(block.content) 
                        ? block.content.map((pt, i) => <li key={i}>{pt}</li>)
                        : <li>{block.content}</li>}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
