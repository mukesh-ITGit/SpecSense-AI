import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

export const AnimatedCard: React.FC<HTMLMotionProps<"div">> = ({ children, className = '', ...props }) => {
  return (
    <motion.div
      className={`card ${className}`}
      whileHover={{ y: -4, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", borderColor: "#cbd5e1" }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};
