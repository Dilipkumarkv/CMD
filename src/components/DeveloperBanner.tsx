import React, { useState, useEffect, useRef } from 'react';
import { ShellMode } from '../types/terminal';

interface DeveloperBannerProps {
  content?: string;
  shell?: ShellMode;
  isBooting?: boolean;
  hasCustomColor?: boolean;
}

type BannerPhase = 'idle' | 'typing' | 'holding' | 'deleting' | 'vanished';

export const DeveloperBanner: React.FC<DeveloperBannerProps> = ({
  content,
  isBooting = false,
  hasCustomColor = false,
}) => {
  const targetDevText = (content || '').trim() || 'Developed by Dilip Kumar KV';

  const [displayedDevText, setDisplayedDevText] = useState('');
  const [phase, setPhase] = useState<BannerPhase>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear any active timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isBooting) {
      setDisplayedDevText('');
      setPhase('idle');
      return;
    }

    // Start typing forward character-by-character
    setPhase('typing');
    let currentIndex = 0;

    intervalRef.current = setInterval(() => {
      currentIndex++;
      if (currentIndex >= targetDevText.length) {
        setDisplayedDevText(targetDevText);
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase('holding');

        // Once completely shown, hold for 1.2 seconds so it is clearly readable
        timerRef.current = setTimeout(() => {
          setPhase('deleting');
          let delIndex = targetDevText.length;

          // Delete backwards like pressing/holding delete or backspace key
          intervalRef.current = setInterval(() => {
            delIndex--;
            if (delIndex <= 0) {
              setDisplayedDevText('');
              if (intervalRef.current) clearInterval(intervalRef.current);

              // After last character is deleted, cleanly vanish from the screen
              timerRef.current = setTimeout(() => {
                setPhase('vanished');
              }, 120);
            } else {
              setDisplayedDevText(targetDevText.slice(0, delIndex));
            }
          }, 24); // Snappy backspace speed per character
        }, 1200);
      } else {
        setDisplayedDevText(targetDevText.slice(0, currentIndex));
      }
    }, 35);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isBooting, targetDevText]);

  // Once vanished or if idle during boot, remove completely from display
  if (phase === 'vanished' || (phase === 'idle' && isBooting)) {
    return null;
  }

  const textColorClass = hasCustomColor ? '' : 'text-neutral-300';
  const showCursor = phase === 'typing' || phase === 'holding' || phase === 'deleting';

  return (
    <div className={`whitespace-pre-wrap font-mono leading-relaxed pl-1 my-0.5 select-text ${textColorClass}`}>
      <div className="flex items-center flex-wrap min-h-[1.4em]">
        <span>{displayedDevText}</span>
        {showCursor && <span className="terminal-block-cursor opacity-80" />}
      </div>
    </div>
  );
};
