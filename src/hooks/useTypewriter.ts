import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
  content: string;
  speedModifier?: number;
  onTick?: () => void;
  onComplete?: () => void;
}

export function useTypewriter({ content, speedModifier = 1, onTick, onComplete }: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);
  
  useEffect(() => {
    onTickRef.current = onTick;
    onCompleteRef.current = onComplete;
  }, [onTick, onComplete]);

  useEffect(() => {
    if (!content) {
      setDisplayedText('');
      setIsTyping(false);
      onCompleteRef.current?.();
      return;
    }

    setIsTyping(true);
    let i = 0;
    // Calculate chunk size for typing speed. 
    // Aim to complete within a reasonable time to avoid forcing the user to wait too long.
    const charsPerFrame = Math.max(1, Math.ceil(content.length / (30 * speedModifier)));

    const interval = setInterval(() => {
      i += charsPerFrame;
      if (i >= content.length) {
        setDisplayedText(content);
        setIsTyping(false);
        clearInterval(interval);
        onCompleteRef.current?.();
      } else {
        setDisplayedText(content.slice(0, i));
      }
      
      if (onTickRef.current) {
        onTickRef.current();
      }
    }, 16);

    return () => clearInterval(interval);
  }, [content, speedModifier]);

  return { displayedText, isTyping };
}
