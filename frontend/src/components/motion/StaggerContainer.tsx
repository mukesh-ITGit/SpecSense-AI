import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  delayChildren?: number;
  staggerChildren?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({ 
  children, 
  delayChildren = 0, 
  staggerChildren = 0.1, 
  ...props 
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? "visible" : "hidden"}
      animate="visible"
      exit={shouldReduceMotion ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: shouldReduceMotion ? 1 : 0 },
        visible: {
          opacity: 1,
          transition: shouldReduceMotion ? { duration: 0 } : {
            delayChildren,
            staggerChildren
          }
        }
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

