export interface ConfidenceTag {
  value: any;
  tag: 'Verified' | 'Inferred' | 'AI Recommended' | 'Missing / Invalid';
  why: string[];
}

export interface ConflictValue {
  source: string;
  value: any;
}

export interface Conflict {
  field: string;
  conflict: boolean;
  values: ConflictValue[];
  recommended_value: any;
  reason: string;
}

export interface TrustBreakdown {
  completeness: number;
  validation: number;
  source_reliability: number;
  extraction_confidence: number;
  conflict_penalty: number;
}

export interface ProductOutput {
  product_id: string;
  part_number: string;
  brand: string;
  manufacturer: string;
  category: string;
  attributes: Record<string, any>;
  invoice_description: string;
  mobile_description: string;
  product_title: string;
  long_description: string;
  validation: {
    overall_status: 'valid' | 'invalid';
    errors: string[];
    warnings: string[];
    [key: string]: any;
  };
  trust_score: number;
  trust_breakdown?: TrustBreakdown;
  confidence_tags: Record<string, ConfidenceTag>;
  conflicts: Conflict[];
  needs_review: boolean;
  review_reasons?: string[];
  why?: string[];
}

export interface BatchJobItem {
  status: 'success' | 'failed';
  result?: ProductOutput;
  error?: string;
  original_row: Record<string, any>;
}

export interface BatchJobResult {
  job_id: string;
  total: number;
  processed: number;
  successful: number;
  failed: number;
  needs_review: number;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  results: BatchJobItem[];
}

export interface ColumnMapping {
  originalCol: string;
  mappedField: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string;
  avatar_url?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
}

