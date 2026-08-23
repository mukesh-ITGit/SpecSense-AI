import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, File, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onFileSelect, selectedFile, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (isValidFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (isValidFile(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const isValidFile = (file: File) => {
    const validExtensions = ['.csv', '.xlsx'];
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    return validExtensions.includes(extension);
  };

  if (selectedFile) {
    return (
      <motion.div 
        className="upload-dropzone file-selected"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="selected-file-info">
          <File className="file-icon" size={32} />
          <div className="file-details">
            <p className="file-name">{selectedFile.name}</p>
            <p className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.name.split('.').pop()?.toUpperCase()}</p>
          </div>
          <button className="btn-icon remove-btn" onClick={onClear} aria-label="Remove file">
            <X size={20} />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      animate={isDragging ? { scale: 1.02, borderColor: 'var(--primary-color)', backgroundColor: 'rgba(59, 130, 246, 0.05)' } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="dropzone-content">
        <motion.div
          animate={isDragging ? { y: [0, -15, 0] } : {}}
          transition={isDragging ? { repeat: Infinity, duration: 1 } : {}}
        >
          <UploadCloud size={48} className="upload-icon" />
        </motion.div>
        <h3>Drop your catalog file here</h3>
        <p className="dropzone-text">or</p>
        <button
          type="button"
          className="btn btn-primary browse-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          Browse Files
        </button>
        <input
          ref={fileInputRef}
          id="catalog-file"
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFileInput}
          className="hidden-input"
          aria-label="Choose a CSV or XLSX catalog file"
        />
        <p className="dropzone-hint">CSV • XLSX supported • Max file size 50MB</p>
      </div>
    </motion.div>
  );
};

export default UploadDropzone;
