import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Download, Play, ShieldCheck, Database, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeIn, AnimatedCard } from '../components/motion';
import './BulkUpload.css';

import type { ColumnMapping, BatchJobResult } from '../types';
import { api } from '../services/api';
import BackButton from '../components/BackButton';

import { useAuth } from '../context/AuthContext';
import UploadDropzone from '../components/upload/UploadDropzone';
import FileValidationCard from '../components/upload/FileValidationCard';
import ColumnMapper from '../components/upload/ColumnMapper';
import DataPreview from '../components/upload/DataPreview';
import ProcessingProgress from '../components/upload/ProcessingProgress';
import BatchStats from '../components/upload/BatchStats';
import BatchResultTable from '../components/upload/BatchResultTable';

const REQUIRED_MAPPINGS = ['product_name', 'description', 'part_number'];
const BULK_JOB_ID_KEY = 'specsense_active_bulk_job_id';
const BULK_RESULT_KEY = 'specsense_last_bulk_result';

const BulkUpload: React.FC = () => {
  const { connectionStatus } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  
  // Validation stats
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [duplicateRows, setDuplicateRows] = useState(0);
  const [emptyDescriptions, setEmptyDescriptions] = useState(0);

  // Processing state
  const [isRestoring, setIsRestoring] = useState<boolean>(() => {
    return !!sessionStorage.getItem(BULK_JOB_ID_KEY) && !sessionStorage.getItem(BULK_RESULT_KEY);
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BatchJobResult | null>(() => {
    try {
      const saved = sessionStorage.getItem(BULK_RESULT_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore ongoing job or completed result on mount
  useEffect(() => {
    const savedJobId = sessionStorage.getItem(BULK_JOB_ID_KEY);
    if (savedJobId && !result) {
      setIsProcessing(true);
      setIsRestoring(false);
      pollJobStatus(savedJobId);
    } else {
      setIsRestoring(false);
    }

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setIsValidating(true);
    setResult(null);
    setProgress(0);
    sessionStorage.removeItem(BULK_RESULT_KEY);
    sessionStorage.removeItem(BULK_JOB_ID_KEY);
    
    const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    
    if (extension === '.csv') {
      parseCSV(selectedFile);
    } else {
      parseExcel(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, any>[];
        processParsedData(data);
      },
      error: (error) => {
        console.error("CSV Parse Error", error);
        setIsValidating(false);
      }
    });
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      processParsedData(json as Record<string, any>[]);
    };
    reader.onerror = () => setIsValidating(false);
    reader.readAsArrayBuffer(file);
  };

  const processParsedData = (data: Record<string, any>[]) => {
    setParsedData(data);
    setRowCount(data.length);
    
    // Basic validation logic
    let duplicates = 0;
    let emptyDesc = 0;
    const seen = new Set();
    
    const initialMappings: ColumnMapping[] = [];
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        initialMappings.push({ originalCol: col, mappedField: autoDetectMapping(col) });
      });
    }
    setMappings(initialMappings);

    data.forEach(row => {
      // Very naive duplicate check for demo
      const str = JSON.stringify(row);
      if (seen.has(str)) duplicates++;
      else seen.add(str);

      // Check empty description (using mapped field if possible, else guessing)
      const descCol = Object.keys(row).find(k => k.toLowerCase().includes('desc') || k.toLowerCase().includes('name'));
      if (!descCol || !row[descCol]) emptyDesc++;
    });

    setDuplicateRows(duplicates);
    setEmptyDescriptions(emptyDesc);
    setIsValidating(false);
  };

  const autoDetectMapping = (colName: string): string | null => {
    const name = colName.toLowerCase();
    if (name.includes('product') && name.includes('name')) return 'product_name';
    if (name.includes('title')) return 'product_name';
    if (name.includes('desc')) return 'description';
    if (name.includes('sku') || name.includes('part')) return 'part_number';
    if (name.includes('brand')) return 'brand';
    if (name.includes('mfg') || name.includes('manufacturer')) return 'manufacturer';
    if (name.includes('cat')) return 'category';
    return null;
  };

  const handleMappingChange = (originalCol: string, mappedField: string | null) => {
    setMappings(prev => prev.map(m => m.originalCol === originalCol ? { ...m, mappedField } : m));
  };

  const hasRequiredColumns = REQUIRED_MAPPINGS.some(req => mappings.some(m => m.mappedField === req)) || mappings.some(m => m.mappedField === 'description');

  const startProcessing = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    setErrorMessage(null);

    try {
      // Step 1: Upload file, get job_id
      const uploadResponse = await api.uploadCatalog(file);
      
      if (!uploadResponse || !uploadResponse.job_id) {
        throw new Error('No job ID returned from server');
      }

      sessionStorage.setItem(BULK_JOB_ID_KEY, uploadResponse.job_id);

      // Step 2: Poll job status with fast adaptive intervals
      pollJobStatus(uploadResponse.job_id);
    } catch (err: any) {
      console.error('Upload failed:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Error starting catalog processing. Please verify backend connection.';
      setErrorMessage(msg);
      setIsProcessing(false);
      sessionStorage.removeItem(BULK_JOB_ID_KEY);
    }
  };

  const pollJobStatus = (jobId: string) => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);

    const checkStatus = async () => {
      try {
        const jobStatus = await api.getJobStatus(jobId);
        
        // Update real progress
        if (jobStatus.total && jobStatus.total > 0) {
          const currentProgress = Math.min(100, Math.floor((jobStatus.processed / jobStatus.total) * 100));
          setProgress(currentProgress);
        } else if (jobStatus.status === 'QUEUED') {
          setProgress(5);
        }

        if (jobStatus.status === 'COMPLETED') {
          setProgress(100);
          setResult(jobStatus);
          setIsProcessing(false);
          sessionStorage.setItem(BULK_RESULT_KEY, JSON.stringify(jobStatus));
          sessionStorage.removeItem(BULK_JOB_ID_KEY);
          return;
        }

        if (jobStatus.status === 'FAILED') {
          setIsProcessing(false);
          const err = (jobStatus as any).error || 'Batch processing failed on backend';
          setErrorMessage(err);
          sessionStorage.removeItem(BULK_JOB_ID_KEY);
          return;
        }

        // Schedule next check quickly (200ms)
        pollTimeoutRef.current = setTimeout(checkStatus, 200);
      } catch (err) {
        console.error('Error polling job status:', err);
        // Retry with backoff if network hiccup
        pollTimeoutRef.current = setTimeout(checkStatus, 500);
      }
    };

    // Immediate initial poll
    pollTimeoutRef.current = setTimeout(checkStatus, 80);
  };

  const loadDemoCatalog = async () => {
    try {
      const response = await fetch('/demo_catalog.csv');
      const blob = await response.blob();
      const demoFile = new File([blob], 'demo_catalog.csv', { type: 'text/csv' });
      handleFileSelect(demoFile);
    } catch (err) {
      console.error("Failed to load demo catalog", err);
    }
  };

  const clearWorkspace = () => {
    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    sessionStorage.removeItem(BULK_JOB_ID_KEY);
    sessionStorage.removeItem(BULK_RESULT_KEY);
    setFile(null);
    setParsedData([]);
    setResult(null);
    setProgress(0);
    setIsProcessing(false);
    setErrorMessage(null);
  };

  return (
    <div className="bulk-upload-page">
      <div className="page-header">
        <div>
          <BackButton fallbackUrl="/" />
          <h1 className="page-title">Bulk Upload & Batch Intelligence</h1>
          <p className="page-subtitle">Transform thousands of messy industrial product records into trusted, commerce-ready data.</p>
        </div>
        <div className="header-actions">
          <div className={`flex items-center gap-2 mr-4 text-sm font-medium ${connectionStatus === 'connected' ? 'text-success' : connectionStatus === 'offline' ? 'text-danger' : 'text-primary'}`}>
            <ShieldCheck size={16} /> {connectionStatus === 'connected' ? 'API Connected' : connectionStatus === 'offline' ? 'API Offline' : 'API Connecting...'}
          </div>
          <button className="btn btn-secondary" onClick={loadDemoCatalog}>Load Demo Catalog</button>
          <button className="btn btn-secondary" onClick={() => api.downloadTemplate()}><Download size={16} /> Download Template</button>
        </div>
      </div>

      {errorMessage && (
        <div className="card mb-6 p-4 border-danger bg-danger-light text-danger flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setErrorMessage(null)}>Dismiss</button>
        </div>
      )}

      {isRestoring && (
        <div className="card p-8 flex flex-col items-center justify-center text-center">
          <div className="spinner mb-4" />
          <p className="text-secondary font-medium">Checking active batch job status...</p>
        </div>
      )}

      {!isRestoring && !isProcessing && !result && (
        <FadeIn delay={0.1}>
          <UploadDropzone 
            onFileSelect={handleFileSelect} 
            selectedFile={file} 
            onClear={clearWorkspace} 
          />
        </FadeIn>
      )}

      {!isRestoring && !isProcessing && !result && file && (
            <FadeIn delay={0.2} className="upload-workspace">
              <FileValidationCard 
                isValidating={isValidating}
                fileSize={file.size}
                rowCount={rowCount}
                duplicateRows={duplicateRows}
                emptyDescriptions={emptyDescriptions}
                hasRequiredColumns={hasRequiredColumns}
              />

              {!isValidating && parsedData.length > 0 && (
                <FadeIn delay={0.3}>
                  <ColumnMapper 
                    mappings={mappings}
                    onMappingChange={handleMappingChange}
                    onAutoDetect={() => {
                      setMappings(prev => prev.map(m => ({ ...m, mappedField: autoDetectMapping(m.originalCol) })));
                    }}
                    onReset={() => {
                      setMappings(prev => prev.map(m => ({ ...m, mappedField: null })));
                    }}
                  />

                  <DataPreview data={parsedData} mappings={mappings} />

                  <div className="action-bar">
                    <div className="flex items-center mr-4 text-muted">
                      {rowCount?.toLocaleString()} products ready to enrich
                    </div>
                    <button className="btn btn-primary btn-lg" onClick={startProcessing} disabled={!hasRequiredColumns}>
                      Start AI Enrichment <Play size={18} fill="currentColor" />
                    </button>
                  </div>
                </FadeIn>
              )}
            </FadeIn>
          )}

      {isProcessing && (
        <FadeIn>
          <ProcessingProgress progress={progress} totalProducts={rowCount || 0} />
        </FadeIn>
      )}

      {result && !isProcessing && (
        <FadeIn className="results-dashboard">
          <AnimatedCard className="wow-transformation">
            <div className="wow-bg-pattern"></div>
            <div className="wow-content">
              <div className="wow-box">
                <h4>Messy Industrial Data</h4>
                <div className="wow-text-messy">
                  "DCB518ASTS06G Diablo 1/2"x18" - Sanding Belt 6pc"
                </div>
              </div>
              <div className="wow-arrow">
                <Database size={24} />
                <span className="wow-arrow-label">SpecSense AI</span>
                <div className="wow-connector-beam">
                  <motion.div 
                    className="wow-beam-dot"
                    animate={{ y: [0, 16, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  />
                </div>
                <ArrowRight size={24} />
              </div>
              <div className="wow-box">
                <h4>Trusted Commerce Data</h4>
                <motion.div 
                  className="wow-attr-list"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
                  }}
                >
                  <motion.div variants={{ hidden: { opacity: 0, x: 10 }, visible: { opacity: 1, x: 0 } }} className="wow-attr"><span className="wow-attr-key">Brand</span><span className="wow-attr-val">DIABLO</span></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, x: 10 }, visible: { opacity: 1, x: 0 } }} className="wow-attr"><span className="wow-attr-key">Type</span><span className="wow-attr-val">Sanding Belt</span></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, x: 10 }, visible: { opacity: 1, x: 0 } }} className="wow-attr"><span className="wow-attr-key">Dimensions</span><span className="wow-attr-val text-success">1/2 in x 18 in</span></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, x: 10 }, visible: { opacity: 1, x: 0 } }} className="wow-attr"><span className="wow-attr-key">Pack</span><span className="wow-attr-val">6</span></motion.div>
                  <motion.div variants={{ hidden: { opacity: 0, x: 10 }, visible: { opacity: 1, x: 0 } }} className="wow-attr mt-2"><span className="wow-attr-key">Trust Score</span><span className="wow-attr-val text-success">93</span></motion.div>
                </motion.div>
              </div>
            </div>
          </AnimatedCard>

          <FadeIn delay={0.2} className="page-header mt-8">
            <div>
              <BackButton onClick={clearWorkspace} />
              <h2 className="page-title">Catalog Intelligence Summary</h2>
            </div>
            <div className="header-actions">
              <button className="btn btn-secondary"><Download size={16} /> Download Validation Report</button>
              <button className="btn btn-primary"><Download size={16} /> Download Enriched CSV</button>
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <BatchStats result={result} />
          </FadeIn>
          
          <FadeIn delay={0.4}>
            <BatchResultTable items={result.results} />
          </FadeIn>
          
          <div className="mt-8 text-center">
            <button className="btn btn-secondary" onClick={clearWorkspace}>Upload Another Catalog</button>
          </div>
        </FadeIn>
      )}
    </div>
  );
};

export default BulkUpload;
