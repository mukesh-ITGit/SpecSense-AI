import React, { useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: number | string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ 
  value, 
  duration = 1.5, 
  prefix = '', 
  suffix = '',
  decimals = 0
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  // Try to parse string to number
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, "")) : value;

  useEffect(() => {
    if (isNaN(numValue)) return;
    
    let start = 0;
    const end = numValue;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    
    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayValue(end);
      return;
    }

    const totalFrames = Math.round(duration * 60);
    let frame = 0;
    
    const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);

    const timer = setInterval(() => {
      frame++;
      const progress = easeOutQuart(frame / totalFrames);
      const current = start + (end - start) * progress;
      
      setDisplayValue(current);

      if (frame === totalFrames) {
        clearInterval(timer);
        setDisplayValue(end);
      }
    }, 1000 / 60);

    return () => clearInterval(timer);
  }, [numValue, duration]);

  if (isNaN(numValue)) {
    return <span>{value}</span>;
  }

  return (
    <span>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
};
