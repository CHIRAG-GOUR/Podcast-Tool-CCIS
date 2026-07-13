"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, TrendingUp, BarChart3, Users, 
  MessageCircle, MonitorPlay, Newspaper, AlertTriangle, 
  Link as LinkIcon, ChevronDown, ChevronUp 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DeepResearchData {
  topic: string;
  executiveSummary: string;
  keyTakeaways: string[];
  statistics: { stat: string; description: string }[];
  expertOpinions: { expert: string; opinion: string }[];
  redditConsensus: string;
  youtubeTrends: string;
  latestNews: string[];
  counterArguments: string[];
  references: { title: string; url: string; type: string }[];
}

export function DeepResearchBoard({ rawReport }: { rawReport: string }) {
  let data: DeepResearchData | null = null;
  
  try {
    data = JSON.parse(rawReport);
    if (!data?.executiveSummary) throw new Error("Missing structure");
  } catch (e) {
    return (
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{rawReport}</ReactMarkdown>
      </div>
    );
  }

  const CollapsibleCard = ({ title, icon: Icon, children, defaultOpen = false }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
      <div className="glass-card overflow-hidden mb-4 border border-border/50">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-6 pb-6 pt-2 border-t border-border/50">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-2 text-primary">{data.topic}</h2>
        <p className="text-muted-foreground">Deep Internet Research Report</p>
      </div>

      <CollapsibleCard title="Executive Summary" icon={FileText} defaultOpen={true}>
        <div className="text-base leading-relaxed text-foreground/90">
          {data.executiveSummary}
        </div>
      </CollapsibleCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <CollapsibleCard title="Key Takeaways" icon={TrendingUp} defaultOpen={true}>
          <ul className="space-y-3">
            {data.keyTakeaways.map((item, idx) => (
              <li key={idx} className="flex gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                  {idx + 1}
                </span>
                <span className="leading-relaxed pt-0.5">{item}</span>
              </li>
            ))}
          </ul>
        </CollapsibleCard>

        <CollapsibleCard title="Critical Statistics" icon={BarChart3} defaultOpen={true}>
          <div className="space-y-4">
            {data.statistics.map((stat, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-2xl font-bold text-primary">{stat.stat}</span>
                <span className="text-sm text-muted-foreground">{stat.description}</span>
              </div>
            ))}
          </div>
        </CollapsibleCard>
      </div>

      <CollapsibleCard title="Expert Opinions" icon={Users}>
        <div className="space-y-4">
          {data.expertOpinions.map((op, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-sm italic mb-2">"{op.opinion}"</p>
              <p className="text-xs font-semibold text-primary">— {op.expert}</p>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <CollapsibleCard title="Reddit Consensus" icon={MessageCircle}>
          <p className="text-sm leading-relaxed">{data.redditConsensus}</p>
        </CollapsibleCard>

        <CollapsibleCard title="YouTube Trends" icon={MonitorPlay}>
          <p className="text-sm leading-relaxed">{data.youtubeTrends}</p>
        </CollapsibleCard>
      </div>

      <CollapsibleCard title="Latest News" icon={Newspaper}>
        <ul className="space-y-2 list-disc pl-5">
          {data.latestNews.map((news, idx) => (
            <li key={idx} className="text-sm">{news}</li>
          ))}
        </ul>
      </CollapsibleCard>

      <CollapsibleCard title="Counter Arguments & Debates" icon={AlertTriangle}>
        <ul className="space-y-3">
          {data.counterArguments.map((arg, idx) => (
            <li key={idx} className="flex gap-3 text-sm p-3 rounded-lg bg-destructive/5 border border-destructive/10 text-destructive/90">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{arg}</span>
            </li>
          ))}
        </ul>
      </CollapsibleCard>

      <CollapsibleCard title="Source References" icon={LinkIcon}>
        <div className="space-y-3">
          {data.references.map((ref, idx) => (
            <a 
              key={idx} 
              href={ref.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium group-hover:text-primary transition-colors">{ref.title}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{ref.type}</span>
              </div>
              <LinkIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            </a>
          ))}
        </div>
      </CollapsibleCard>

    </div>
  );
}
