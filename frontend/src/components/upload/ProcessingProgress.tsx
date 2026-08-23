import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, FileCog, Database, Cpu, Search, Tags, SplitSquareHorizontal, CheckSquare, BrainCircuit, UserCog } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProcessingProgressProps {
  progress: number;
  totalProducts: number;
}

const STAGES = [
  { id: 'ingestion', label: 'File ingestion', icon: FileCog },
  { id: 'schema', label: 'Schema detection', icon: Database },
  { id: 'extraction', label: 'Product extraction', icon: SplitSquareHorizontal },
  { id: 'brand', label: 'Brand matching', icon: Search },
  { id: 'classification', label: 'Classification', icon: Tags },
  { id: 'normalization', label: 'Attribute normalization', icon: Cpu },
  { id: 'validation', label: 'Validation', icon: CheckSquare },
  { id: 'conflict', label: 'Conflict detection', icon: SplitSquareHorizontal },
  { id: 'trust', label: 'Trust scoring', icon: BrainCircuit },
  { id: 'routing', label: 'Human review routing', icon: UserCog },
];

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ progress, totalProducts }) => {
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const startTimeRef = React.useRef(Date.now());

  useEffect(() => {
    // Map the 0-100 progress to the 10 stages
    const calculatedStage = Math.min(
      Math.floor((progress / 100) * STAGES.length),
      STAGES.length - 1
    );
    setActiveStageIdx(calculatedStage);
  }, [progress]);

  const processedCount = Math.floor((progress / 100) * totalProducts);
  const elapsedSec = Math.max(0.1, (Date.now() - startTimeRef.current) / 1000);
  const speed = Math.round(processedCount / elapsedSec);
  const remainingCount = totalProducts - processedCount;
  const remainingSec = speed > 0 ? Math.max(0, Math.ceil(remainingCount / speed)) : null;

  return (
    <div className="processing-progress-container">
      <div className="processing-header">
        <Loader2 className="spinning-icon" size={28} />
        <h2>AI Enrichment in Progress</h2>
      </div>

      <div className="progress-bar-wrapper">
        <div className="progress-bar-bg">
          <motion.div 
            className="progress-bar-fill" 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.2 }}
          />
        </div>
        <div className="progress-stats">
          <span>{processedCount.toLocaleString()} / {totalProducts.toLocaleString()} products processed</span>
          <span className="estimated-time">
            {progress >= 100 
              ? 'Finalizing results...' 
              : remainingSec !== null && remainingSec > 0 
                ? `Estimated remaining time: ~${remainingSec}s (${speed} items/sec)` 
                : speed > 0 ? `Speed: ~${speed} items/sec` : 'Processing batch...'}
          </span>
        </div>
      </div>


      <div className="stages-grid">
        {STAGES.map((stage, idx) => {
          const StageIcon = stage.icon;
          const isCompleted = idx < activeStageIdx || progress === 100;
          const isActive = idx === activeStageIdx && progress < 100;
          
          let statusClass = 'pending';
          if (isCompleted) statusClass = 'completed';
          if (isActive) statusClass = 'active';

          return (
            <motion.div 
              key={stage.id} 
              className={`stage-item ${statusClass}`}
              initial={{ opacity: 0.4, y: 10 }}
              animate={{ opacity: isCompleted || isActive ? 1 : 0.4, y: 0, scale: isActive ? 1.05 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="stage-icon-wrapper">
                {isCompleted ? (
                  <CheckCircle2 size={18} className="completed-icon" />
                ) : isActive ? (
                  <div className="active-dot"></div>
                ) : (
                  <StageIcon size={16} />
                )}
              </div>
              <span className="stage-label">{stage.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcessingProgress;
