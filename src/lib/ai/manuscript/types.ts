/**
 * Type definitions for AI Manuscript Checker System
 */

// ============================================================================
// Core Types
// ============================================================================

export interface ManuscriptCheck {
  id: string;
  manuscript_id?: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url: string;
  file_type: 'docx' | 'pdf' | 'txt' | 'rtf';
  file_size: number;
  total_pages?: number;
  total_words?: number;
  language_detected?: string[];
  processing_started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CheckResult {
  id: string;
  check_id: string;
  category: CheckCategory;
  severity: Severity;
  page_number?: number;
  line_number?: number;
  paragraph_number?: number;
  position?: {
    x: number;
    y: number;
  };
  issue: string;
  original_text?: string;
  suggestion?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface AnalysisReport {
  id: string;
  check_id: string;
  total_issues: number;
  critical_issues: number;
  warnings: number;
  suggestions: number;
  score: number; // 0-100
  summary: string;
  recommendations: string[];
  report_data: ReportData;
  created_at: Date;
}

// ============================================================================
// Enums and Constants
// ============================================================================

export type CheckCategory = 'spelling' | 'layout' | 'typography' | 'structure' | 'color' | 'grammar';
export type Severity = 'error' | 'warning' | 'suggestion' | 'info';
export type FileType = 'docx' | 'pdf' | 'txt' | 'rtf';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ============================================================================
// Document Processing Types
// ============================================================================

export interface ProcessedDocument {
  id: string;
  content: string;
  chunks: DocumentChunk[];
  metadata: DocumentMetadata;
  structure: DocumentStructure;
}

export interface DocumentChunk {
  id: string;
  index: number;
  content: string;
  tokens: number;
  metadata?: {
    page?: number;
    paragraph?: number;
    section?: string;
  };
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  pages?: number;
  words?: number;
  characters?: number;
  language?: string[];
  fonts?: FontInfo[];
  created_date?: Date;
  modified_date?: Date;
}

export interface DocumentStructure {
  chapters?: Chapter[];
  sections?: Section[];
  headers?: Header[];
  paragraphs?: Paragraph[];
  images?: ImageInfo[];
  tables?: TableInfo[];
}

export interface Chapter {
  id: string;
  title: string;
  page_start: number;
  page_end: number;
  word_count: number;
  sections?: Section[];
}

export interface Section {
  id: string;
  title: string;
  level: number;
  page: number;
  content?: string;
}

export interface Header {
  id: string;
  text: string;
  level: number; // h1=1, h2=2, etc.
  page: number;
  line: number;
}

export interface Paragraph {
  id: string;
  content: string;
  page: number;
  index: number;
  style?: ParagraphStyle;
}

export interface ParagraphStyle {
  font?: string;
  fontSize?: number;
  lineHeight?: number;
  alignment?: 'left' | 'right' | 'center' | 'justify';
  indent?: number;
}

export interface ImageInfo {
  id: string;
  page: number;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  caption?: string;
  alt?: string;
}

export interface TableInfo {
  id: string;
  page: number;
  rows: number;
  columns: number;
  headers?: string[];
  caption?: string;
}

// ============================================================================
// Myanmar Language Types
// ============================================================================

export interface MyanmarTextInfo {
  original: string;
  unicode: string;
  encoding: 'zawgyi' | 'unicode';
  syllables: string[];
  words: string[];
  stats: {
    totalSyllables: number;
    totalWords: number;
    uniqueWords: number;
  };
}

export interface SpellingIssue {
  word: string;
  suggestions: string[];
  position: {
    page?: number;
    line?: number;
    char?: number;
  };
  confidence: number;
  type: 'misspelling' | 'zawgyi_unicode' | 'unknown_word';
}

export interface MyanmarDictionaryEntry {
  id: number;
  word: string;
  word_unicode?: string;
  word_zawgyi?: string;
  frequency: number;
  is_valid: boolean;
  alternatives?: string[];
  part_of_speech?: string;
  definition?: string;
}

// ============================================================================
// Typography & Layout Types
// ============================================================================

export interface FontInfo {
  name: string;
  size: number;
  type?: 'serif' | 'sans-serif' | 'monospace';
  isMyanmar?: boolean;
  isCompatible?: boolean;
  usage?: FontUsage[];
}

export interface FontUsage {
  page: number;
  element: 'heading' | 'paragraph' | 'caption' | 'footnote';
  count: number;
}

export interface LayoutIssue {
  type: LayoutIssueType;
  description: string;
  location?: {
    page?: number;
    element?: string;
  };
  current_value?: any;
  recommended_value?: any;
}

export type LayoutIssueType = 
  | 'page_numbering'
  | 'margin'
  | 'spacing'
  | 'alignment'
  | 'header_hierarchy'
  | 'chapter_structure'
  | 'orphan_widow'
  | 'inconsistent_format';

export interface TypographyIssue {
  type: TypographyIssueType;
  font?: string;
  suggestion?: string;
  pages?: number[];
  description: string;
}

export type TypographyIssueType = 
  | 'incompatible_font'
  | 'font_size_too_small'
  | 'font_size_too_large'
  | 'inconsistent_fonts'
  | 'poor_line_spacing'
  | 'poor_letter_spacing';

export interface ColorAnalysis {
  primary_colors: ColorInfo[];
  contrast_issues: ContrastIssue[];
  recommendations: string[];
}

export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  usage: 'text' | 'background' | 'accent';
  frequency: number;
}

export interface ContrastIssue {
  foreground: string;
  background: string;
  ratio: number;
  wcag_level: 'fail' | 'aa' | 'aaa';
  location?: string;
}

// ============================================================================
// Processing Types
// ============================================================================

export interface ChunkOptions {
  maxTokens: number;
  overlap: number;
  preserveStructure: boolean;
  splitBySentence?: boolean;
  splitByParagraph?: boolean;
}

export interface ProcessingQueue {
  id: string;
  check_id: string;
  chunk_index: number;
  chunk_content: string;
  chunk_metadata?: any;
  status: ProcessingStatus;
  attempts: number;
  last_error?: string;
  processed_at?: Date;
}

export interface ProcessingProgress {
  check_id: string;
  current_step: string;
  progress: number; // 0-100
  total_chunks?: number;
  processed_chunks?: number;
  estimated_time_remaining?: number; // seconds
  messages?: string[];
}

// ============================================================================
// Report Types
// ============================================================================

export interface ReportData {
  overview: ReportOverview;
  issues_by_category: IssuesByCategory;
  issues_by_page: IssuesByPage;
  typography_analysis?: TypographyAnalysis;
  layout_analysis?: LayoutAnalysis;
  language_analysis?: LanguageAnalysis;
  recommendations: Recommendation[];
}

export interface ReportOverview {
  manuscript_title?: string;
  author?: string;
  total_pages: number;
  total_words: number;
  languages_detected: string[];
  processing_time: number; // seconds
  quality_score: number; // 0-100
  summary: string;
}

export interface IssuesByCategory {
  spelling: IssueSummary;
  grammar: IssueSummary;
  layout: IssueSummary;
  typography: IssueSummary;
  structure: IssueSummary;
  color?: IssueSummary;
}

export interface IssueSummary {
  total: number;
  errors: number;
  warnings: number;
  suggestions: number;
  top_issues: string[];
}

export interface IssuesByPage {
  [page: number]: {
    total: number;
    categories: string[];
    critical: boolean;
  };
}

export interface TypographyAnalysis {
  fonts_used: FontInfo[];
  recommended_fonts: string[];
  consistency_score: number;
  myanmar_compatibility: boolean;
  issues: TypographyIssue[];
}

export interface LayoutAnalysis {
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    unit: string;
  };
  line_spacing: number;
  paragraph_spacing: number;
  alignment_consistency: number;
  issues: LayoutIssue[];
}

export interface LanguageAnalysis {
  primary_language: string;
  encoding: 'unicode' | 'zawgyi' | 'mixed';
  zawgyi_percentage?: number;
  spelling_accuracy: number;
  common_mistakes: Array<{
    word: string;
    frequency: number;
    correction: string;
  }>;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  category: CheckCategory;
  title: string;
  description: string;
  action_items?: string[];
  estimated_impact?: 'critical' | 'major' | 'minor';
}

// ============================================================================
// API Types
// ============================================================================

export interface ManuscriptUploadRequest {
  file: File;
  manuscript_id?: string;
  options?: {
    quick_check?: boolean;
    check_categories?: CheckCategory[];
    language?: string;
  };
}

export interface ManuscriptCheckResponse {
  check_id: string;
  status: ProcessingStatus;
  message: string;
  estimated_time?: number;
}

export interface CheckStatusResponse {
  check_id: string;
  status: ProcessingStatus;
  progress: number;
  current_step?: string;
  messages?: string[];
  completed_at?: Date;
  report_url?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ManuscriptCheckerConfig {
  processing: {
    max_file_size: number; // bytes
    max_concurrent_jobs: number;
    chunk_size: number; // tokens
    chunk_overlap: number;
    timeout: number; // seconds
  };
  api_limits: {
    language_tool: number; // requests per minute
    azure_vision: number; // requests per second
    google_vision: number; // requests per second
  };
  quality_thresholds: {
    min_score: number;
    max_errors_per_page: number;
    max_warnings_per_page: number;
  };
  myanmar: {
    default_fonts: string[];
    min_font_size: number;
    line_height: number;
    letter_spacing: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export class ManuscriptProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ManuscriptProcessingError';
  }
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  check_id?: string;
}