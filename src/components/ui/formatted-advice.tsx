import React from 'react';
import { cn } from '@/lib/utils';

interface FormattedAdviceProps {
  content: string;
  className?: string;
  variant?: 'contained' | 'plain';
  threatLevel?: 'high' | 'medium' | 'low' | null;
}

export const FormattedAdvice = ({ content, className, variant = 'contained', threatLevel }: FormattedAdviceProps) => {
  // Define colors based on threat level
  const getColors = () => {
    if (!threatLevel) {
      // Default chatbot colors (cyan/blue)
      return {
        headerColor: 'text-cyan-300',
        bulletColor: 'from-cyan-400 to-blue-500',
        boldColor: 'text-cyan-200',
        textColor: 'text-slate-300',
        borderColor: 'border-slate-700/50',
        bgGradient: 'from-slate-800/90 via-slate-900/95 to-slate-800/90',
        overlayGradient: 'from-cyan-500/5 via-transparent to-blue-500/5',
        bottomGlow: 'from-transparent via-cyan-400/50 to-transparent'
      };
    }
    
    switch (threatLevel) {
      case 'high':
        return {
          headerColor: 'text-red-300',
          bulletColor: 'from-red-400 to-red-600',
          boldColor: 'text-red-200',
          textColor: 'text-red-100',
          borderColor: 'border-red-700/50',
          bgGradient: 'from-red-900/30 via-slate-900/95 to-red-900/30',
          overlayGradient: 'from-red-500/10 via-transparent to-red-600/10',
          bottomGlow: 'from-transparent via-red-400/50 to-transparent'
        };
      case 'medium':
        return {
          headerColor: 'text-orange-300',
          bulletColor: 'from-orange-400 to-yellow-500',
          boldColor: 'text-orange-200',
          textColor: 'text-orange-100',
          borderColor: 'border-orange-700/50',
          bgGradient: 'from-orange-900/30 via-slate-900/95 to-orange-900/30',
          overlayGradient: 'from-orange-500/10 via-transparent to-yellow-500/10',
          bottomGlow: 'from-transparent via-orange-400/50 to-transparent'
        };
      case 'low':
        return {
          headerColor: 'text-green-300',
          bulletColor: 'from-green-400 to-emerald-500',
          boldColor: 'text-green-200',
          textColor: 'text-green-100',
          borderColor: 'border-green-700/50',
          bgGradient: 'from-green-900/30 via-slate-900/95 to-green-900/30',
          overlayGradient: 'from-green-500/10 via-transparent to-emerald-500/10',
          bottomGlow: 'from-transparent via-green-400/50 to-transparent'
        };
      default:
        return {
          headerColor: 'text-cyan-300',
          bulletColor: 'from-cyan-400 to-blue-500',
          boldColor: 'text-cyan-200',
          textColor: 'text-slate-300',
          borderColor: 'border-slate-700/50',
          bgGradient: 'from-slate-800/90 via-slate-900/95 to-slate-800/90',
          overlayGradient: 'from-cyan-500/5 via-transparent to-blue-500/5',
          bottomGlow: 'from-transparent via-cyan-400/50 to-transparent'
        };
    }
  };

  const colors = getColors();

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
            <h3 className={`font-semibold ${colors.headerColor} text-lg mb-4 leading-relaxed tracking-wide`}>
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
        if (bulletText.includes('**') && bulletText.match(/\*\*[^*]+?\*\*/)) {
          // Split by bold patterns and handle mixed formatting
          const parts = bulletText.split(/(\*\*[^*]+?\*\*)/g);
          const formattedBullet = parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
              const boldText = part.slice(2, -2);
              return (
                <span key={partIndex} className={`font-semibold ${colors.boldColor} break-words`}>
                  {boldText}
                </span>
              );
            }
            return part;
          });
          
          elements.push(
            <div key={index} className="flex items-start space-x-4 mb-4 group">
              <div className={`flex-shrink-0 w-2 h-2 bg-gradient-to-r ${colors.bulletColor} rounded-full mt-2.5 group-hover:scale-110 transition-transform duration-200`} />
              <div className={`${colors.textColor} flex-1 leading-relaxed text-sm break-words overflow-wrap-anywhere min-w-0`}>
                {formattedBullet}
              </div>
            </div>
          );
        } else {
          elements.push(
            <div key={index} className="flex items-start space-x-4 mb-4 group">
              <div className={`flex-shrink-0 w-2 h-2 bg-gradient-to-r ${colors.bulletColor} rounded-full mt-2.5 group-hover:scale-110 transition-transform duration-200`} />
              <span className={`${colors.textColor} flex-1 leading-relaxed text-sm break-words overflow-wrap-anywhere min-w-0`}>{bulletText}</span>
            </div>
          );
        }
        return;
      }
      
      // Numbered items
      if (trimmedLine.match(/^\d+\./)) {
        elements.push(
          <div key={index} className="mb-4 pl-4">
            <span className={`font-medium ${colors.boldColor} leading-relaxed text-sm break-words overflow-wrap-anywhere`}>{trimmedLine}</span>
          </div>
        );
        return;
      }
      
      // Regular paragraphs
      if (trimmedLine.length > 0) {
        // Check for inline bold text with improved regex
        const parts = trimmedLine.split(/(\*\*[^*]+?\*\*)/g);
        const formattedParts = parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            const boldText = part.slice(2, -2);
            return (
              <span key={partIndex} className={`font-semibold ${colors.boldColor} break-words`}>
                {boldText}
              </span>
            );
          }
          return part;
        });
        
        elements.push(
          <p key={index} className={`${colors.textColor} leading-relaxed mb-4 text-sm break-words overflow-wrap-anywhere`}>
            {formattedParts}
          </p>
        );
      }
    });
    
    return elements;
  };

  if (variant === 'plain') {
    return (
      <div className={cn("space-y-2 break-words overflow-wrap-anywhere", className)}>
        {formatContent(content)}
      </div>
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border",
      colors.borderColor,
      `bg-gradient-to-br ${colors.bgGradient}`,
      "backdrop-blur-sm shadow-2xl break-words overflow-wrap-anywhere",
      "animate-fade-in",
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${colors.overlayGradient} pointer-events-none`} />
      
      {/* Content */}
      <div className="relative p-6">
        <div className="space-y-2">
          {formatContent(content)}
        </div>
      </div>
      
      {/* Bottom glow effect */}
      <div className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r ${colors.bottomGlow}`} />
    </div>
  );
};