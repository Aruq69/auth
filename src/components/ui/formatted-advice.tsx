import React from 'react';
import { cn } from '@/lib/utils';

interface FormattedAdviceProps {
  content: string;
  className?: string;
  variant?: 'contained' | 'plain';
}

export const FormattedAdvice = ({ content, className, variant = 'contained' }: FormattedAdviceProps) => {
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        // Skip empty lines but add spacing
        if (elements.length > 0) {
          elements.push(<div key={`space-${index}`} className="h-4" />);
        }
        return;
      }
      
      // Main headers (bold with **)
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        const headerText = trimmedLine.slice(2, -2);
        elements.push(
          <div key={index} className="mt-6 first:mt-0">
            <h3 className="font-semibold text-cyan-300 text-lg mb-4 leading-relaxed tracking-wide">
              {headerText}
            </h3>
          </div>
        );
        return;
      }
      
      // Bullet points (• or -)
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        const bulletText = trimmedLine.replace(/^[•-]\s*/, '');
        
        // Check if it's a bold bullet point
        if (bulletText.startsWith('**') && bulletText.includes('**:')) {
          const parts = bulletText.split('**:');
          const boldPart = parts[0].replace('**', '');
          const regularPart = parts[1] || '';
          
          elements.push(
            <div key={index} className="flex items-start space-x-4 mb-4 group">
              <div className="flex-shrink-0 w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full mt-2.5 group-hover:scale-110 transition-transform duration-200" />
              <div className="flex-1">
                <span className="font-semibold text-cyan-200 text-base">{boldPart}:</span>
                <span className="text-slate-300 ml-2 leading-relaxed text-sm">{regularPart}</span>
              </div>
            </div>
          );
        } else {
          elements.push(
            <div key={index} className="flex items-start space-x-4 mb-4 group">
              <div className="flex-shrink-0 w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full mt-2.5 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-slate-300 flex-1 leading-relaxed text-sm">{bulletText}</span>
            </div>
          );
        }
        return;
      }
      
      // Numbered items
      if (trimmedLine.match(/^\d+\./)) {
        elements.push(
          <div key={index} className="mb-4 pl-4">
            <span className="font-medium text-cyan-200 leading-relaxed text-sm">{trimmedLine}</span>
          </div>
        );
        return;
      }
      
      // Regular paragraphs
      if (trimmedLine.length > 0) {
        // Check for inline bold text
        const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/g);
        const formattedParts = parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <span key={partIndex} className="font-semibold text-cyan-200">
                {part.slice(2, -2)}
              </span>
            );
          }
          return part;
        });
        
        elements.push(
          <p key={index} className="text-slate-300 leading-relaxed mb-4 text-sm">
            {formattedParts}
          </p>
        );
      }
    });
    
    return elements;
  };

  if (variant === 'plain') {
    return (
      <div className={cn("space-y-2", className)}>
        {formatContent(content)}
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-slate-700/50",
      "bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-800/90",
      "backdrop-blur-sm shadow-2xl",
      "animate-fade-in",
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />
      
      {/* Content */}
      <div className="relative p-6">
        <div className="space-y-2">
          {formatContent(content)}
        </div>
      </div>
      
      {/* Bottom glow effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
    </div>
  );
};