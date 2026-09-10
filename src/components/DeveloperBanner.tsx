import React, { useState, useEffect } from 'react';
import { ShellMode } from '../types/terminal';

interface DeveloperBannerProps {
  content?: string;
  shell?: ShellMode;
  isBooting?: boolean;
  hasCustomColor?: boolean;
}

export const DeveloperBanner: React.FC<DeveloperBannerProps> = ({
  content,
  isBooting = false,
  hasCustomColor = false,
}) => {
  const targetDevText = (content || '').trim() || 'Developed by Dilip Kumar KV';

  const [displayedDevText, setDisplayedDevText] = useState('');
  const [isTyping, setIsTyping] = useState(!isBooting);

  useEffect(() => {
    if (isBooting) {
      setDisplayedDevText('');
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    let index = 0;
    const interval = setInterval(() => {
      index++;
      if (index >= targetDevText.length) {
        setDisplayedDevText(targetDevText);
        setIsTyping(false);
        clearInterval(interval);
      } else {
        setDisplayedDevText(targetDevText.slice(0, index));
      }
    }, 35);

    return () => clearInterval(interval);
  }, [isBooting, targetDevText]);

  const textColorClass = hasCustomColor ? '' : 'text-neutral-300';

  return (
    <div className={`whitespace-pre-wrap font-mono leading-relaxed pl-1 my-0.5 select-text ${textColorClass}`}>
      <div className="flex items-center flex-wrap min-h-[1.4em]">
        <span>{displayedDevText}</span>
        {isTyping && <span className="terminal-block-cursor opacity-80" />}
      </div>
    </div>
  );
};
