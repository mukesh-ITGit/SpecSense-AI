import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface FileValidationCardProps {
  isValidating: boolean;
  fileSize: number;
  rowCount: number | null;
  duplicateRows: number;
  emptyDescriptions: number;
  hasRequiredColumns: boolean;
}

const FileValidationCard: React.FC<FileValidationCardProps> = ({
  isValidating,
  fileSize,
  rowCount,
  duplicateRows,
  emptyDescriptions,
  hasRequiredColumns
}) => {
  if (isValidating) {
    return (
      <div className="card validation-card validating">
        <div className="spinner"></div>
        <p>Analyzing file structure...</p>
      </div>
    );
  }

  const hasErrors = !hasRequiredColumns;

  return (
    <div className="card validation-card">
      <h3 className="card-title">File Validation</h3>
      <div className="validation-list">
        <div className="validation-item">
          <CheckCircle2 className="icon-success" size={20} />
          <span>File format valid ({(fileSize / (1024 * 1024)).toFixed(2)} MB)</span>
        </div>
        
        {rowCount !== null && (
          <div className="validation-item">
            <CheckCircle2 className="icon-success" size={20} />
            <span>{rowCount.toLocaleString()} records detected</span>
          </div>
        )}

        {hasRequiredColumns ? (
          <div className="validation-item">
            <CheckCircle2 className="icon-success" size={20} />
            <span>Required columns detected</span>
          </div>
        ) : (
          <div className="validation-item error">
            <XCircle className="icon-danger" size={20} />
            <span>Missing required columns (needs mapping)</span>
          </div>
        )}

        {duplicateRows > 0 && (
          <div className="validation-item warning">
            <AlertTriangle className="icon-warning" size={20} />
            <span>{duplicateRows} duplicate rows detected</span>
          </div>
        )}

        {emptyDescriptions > 0 && (
          <div className="validation-item warning">
            <AlertTriangle className="icon-warning" size={20} />
            <span>{emptyDescriptions} records missing description/title</span>
          </div>
        )}
      </div>

      {hasErrors && (
        <div className="validation-error-banner">
          Please map the required columns below before continuing.
        </div>
      )}
    </div>
  );
};

export default FileValidationCard;
