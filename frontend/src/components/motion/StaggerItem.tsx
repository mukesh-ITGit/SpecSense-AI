import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

interface StaggerItemProps extends HTMLMotionProps<"div"> {
  yOffset?: number;
}

export const StaggerItem: React.FC<StaggerItemProps> = ({ children, yOffset = 20, ...props }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={{
        hidden: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : yOffset },
        visible: { opacity: 1, y: 0, transition: shouldReduceMotion ? { duration: 0 } : undefined }
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

