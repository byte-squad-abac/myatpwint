/**
 * Document Processor - Handles different file formats
 */

import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import {
  ProcessedDocument,
  DocumentChunk,
  DocumentMetadata,
  DocumentStructure,
  ChunkOptions,
  FileType,
  ManuscriptProcessingError,
  Header,
  Paragraph,
  Chapter,
  Section
} from '../types';

// ============================================================================
// Base Document Processor
// ============================================================================

export abstract class BaseDocumentProcessor {
  protected fileType: FileType;
  
  constructor(fileType: FileType) {
    this.fileType = fileType;
  }
  
  abstract extract(file: Buffer | ArrayBuffer | string): Promise<{
    content: string;
    metadata: DocumentMetadata;
    structure?: DocumentStructure;
  }>;
  
  /**
   * Process document and return structured data
   */
  async process(
    file: Buffer | ArrayBuffer | string,
    options?: ChunkOptions
  ): Promise<ProcessedDocument> {
    try {
      // Extract content and metadata
      const { content, metadata, structure } = await this.extract(file);
      
      // Chunk the document
      const chunks = this.chunkDocument(content, options || {
        maxTokens: 4000,
        overlap: 200,
        preserveStructure: true
      });
      
      return {
        id: this.generateId(),
        content,
        chunks,
        metadata,
        structure: structure || this.extractStructure(content)
      };
    } catch (error) {
      throw new ManuscriptProcessingError(
        `Failed to process ${this.fileType} document`,
        'PROCESSING_ERROR',
        error
      );
    }
  }
  
  /**
   * Chunk document into manageable pieces
   */
  protected chunkDocument(content: string, options: ChunkOptions): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    if (options.splitByParagraph) {
      return this.chunkByParagraph(content, options);
    }
    
    if (options.splitBySentence) {
      return this.chunkBySentence(content, options);
    }
    
    // Default: chunk by token count
    return this.chunkByTokens(content, options);
  }
  
  private chunkByTokens(content: string, options: ChunkOptions): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const sentences = this.splitIntoSentences(content);
    
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      const tokens = this.countTokens(sentence);
      
      if (currentTokens + tokens > options.maxTokens && currentChunk) {
        chunks.push({
          id: this.generateId(),
          index: chunkIndex++,
          content: currentChunk.trim(),
          tokens: currentTokens
        });
        
        // Start new chunk with overlap
        if (options.overlap > 0) {
          currentChunk = this.getOverlap(currentChunk, options.overlap);
          currentTokens = this.countTokens(currentChunk);
        } else {
          currentChunk = '';
          currentTokens = 0;
        }
      }
      
      currentChunk += ' ' + sentence;
      currentTokens += tokens;
    }
    
    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: this.generateId(),
        index: chunkIndex,
        content: currentChunk.trim(),
        tokens: currentTokens
      });
    }
    
    return chunks;
  }
  
  private chunkByParagraph(content: string, options: ChunkOptions): DocumentChunk[] {
    const paragraphs = content.split(/\n\n+/);
    const chunks: DocumentChunk[] = [];
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;
    let paragraphIndex = 0;
    
    for (const paragraph of paragraphs) {
      const tokens = this.countTokens(paragraph);
      
      if (currentTokens + tokens > options.maxTokens && currentChunk) {
        chunks.push({
          id: this.generateId(),
          index: chunkIndex++,
          content: currentChunk.trim(),
          tokens: currentTokens,
          metadata: { paragraph: paragraphIndex }
        });
        
        currentChunk = '';
        currentTokens = 0;
      }
      
      currentChunk += '\n\n' + paragraph;
      currentTokens += tokens;
      paragraphIndex++;
    }
    
    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: this.generateId(),
        index: chunkIndex,
        content: currentChunk.trim(),
        tokens: currentTokens,
        metadata: { paragraph: paragraphIndex }
      });
    }
    
    return chunks;
  }
  
  private chunkBySentence(content: string, options: ChunkOptions): DocumentChunk[] {
    const sentences = this.splitIntoSentences(content);
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      const tokens = this.countTokens(sentence);
      
      if (currentTokens + tokens > options.maxTokens && currentChunk.length > 0) {
        chunks.push({
          id: this.generateId(),
          index: chunkIndex++,
          content: currentChunk.join(' ').trim(),
          tokens: currentTokens
        });
        
        // Keep overlap sentences
        if (options.overlap > 0) {
          const overlapSentences = Math.ceil(options.overlap / 50); // Estimate tokens per sentence
          currentChunk = currentChunk.slice(-overlapSentences);
          currentTokens = currentChunk.reduce((sum, s) => sum + this.countTokens(s), 0);
        } else {
          currentChunk = [];
          currentTokens = 0;
        }
      }
      
      currentChunk.push(sentence);
      currentTokens += tokens;
    }
    
    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        id: this.generateId(),
        index: chunkIndex,
        content: currentChunk.join(' ').trim(),
        tokens: currentTokens
      });
    }
    
    return chunks;
  }
  
  protected splitIntoSentences(text: string): string[] {
    // Handle Myanmar sentence endings (။) and English periods
    return text.split(/[.!?။]+/).filter(s => s.trim().length > 0);
  }
  
  protected countTokens(text: string): number {
    // Rough estimate: 1 token per 4 characters for English, 1 per 2 for Myanmar
    const myanmarChars = (text.match(/[\u1000-\u109F]/g) || []).length;
    const otherChars = text.length - myanmarChars;
    return Math.ceil(myanmarChars / 2 + otherChars / 4);
  }
  
  protected getOverlap(text: string, overlapTokens: number): string {
    const words = text.split(/\s+/);
    const estimatedWords = Math.ceil(overlapTokens / 1.3); // Rough estimate
    return words.slice(-estimatedWords).join(' ');
  }
  
  protected extractStructure(content: string): DocumentStructure {
    const headers = this.extractHeaders(content);
    const paragraphs = this.extractParagraphs(content);
    const chapters = this.extractChapters(headers);
    const sections = this.extractSections(headers);
    
    return {
      chapters,
      sections,
      headers,
      paragraphs,
      images: [],
      tables: []
    };
  }
  
  protected extractHeaders(content: string): Header[] {
    const headers: Header[] = [];
    const lines = content.split('\n');
    let lineNumber = 0;
    
    for (const line of lines) {
      lineNumber++;
      
      // Check for chapter/section patterns
      if (/^(Chapter|အခန်း|Section|အပိုင်း)\s+\d+/i.test(line.trim())) {
        headers.push({
          id: this.generateId(),
          text: line.trim(),
          level: 1,
          page: Math.ceil(lineNumber / 40), // Estimate page
          line: lineNumber
        });
      }
      // Check for all caps or title case headers
      else if (line.trim().length > 0 && line.trim().length < 100) {
        if (line === line.toUpperCase() || this.isTitleCase(line)) {
          headers.push({
            id: this.generateId(),
            text: line.trim(),
            level: 2,
            page: Math.ceil(lineNumber / 40),
            line: lineNumber
          });
        }
      }
    }
    
    return headers;
  }
  
  protected extractParagraphs(content: string): Paragraph[] {
    const paragraphs = content.split(/\n\n+/);
    return paragraphs.map((para, index) => ({
      id: this.generateId(),
      content: para.trim(),
      page: Math.ceil(index / 3), // Rough estimate
      index
    }));
  }
  
  protected extractChapters(headers: Header[]): Chapter[] {
    const chapters: Chapter[] = [];
    const chapterHeaders = headers.filter(h => 
      /^(Chapter|အခန်း)\s+\d+/i.test(h.text)
    );
    
    for (let i = 0; i < chapterHeaders.length; i++) {
      const current = chapterHeaders[i];
      const next = chapterHeaders[i + 1];
      
      chapters.push({
        id: this.generateId(),
        title: current.text,
        page_start: current.page,
        page_end: next ? next.page - 1 : 999, // Estimate
        word_count: 0 // Will be calculated later
      });
    }
    
    return chapters;
  }
  
  protected extractSections(headers: Header[]): Section[] {
    return headers.map(h => ({
      id: h.id,
      title: h.text,
      level: h.level,
      page: h.page
    }));
  }
  
  protected isTitleCase(text: string): boolean {
    const words = text.split(/\s+/);
    const titleCaseWords = words.filter(word => 
      word.length > 3 && word[0] === word[0].toUpperCase()
    );
    return titleCaseWords.length > words.length * 0.7;
  }
  
  protected generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// ============================================================================
// DOCX Processor
// ============================================================================

export class DocxProcessor extends BaseDocumentProcessor {
  constructor() {
    super('docx');
  }
  
  async extract(file: Buffer | ArrayBuffer): Promise<{
    content: string;
    metadata: DocumentMetadata;
    structure?: DocumentStructure;
  }> {
    try {
      const buffer = file instanceof ArrayBuffer ? Buffer.from(file) : file;
      
      // Extract text content
      const result = await mammoth.extractRawText({ buffer });
      const content = result.value;
      
      // Extract with formatting for structure analysis
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const structure = this.extractStructureFromHtml(htmlResult.value);
      
      // Extract metadata
      const metadata: DocumentMetadata = {
        pages: Math.ceil(content.length / 3000), // Rough estimate
        words: content.split(/\s+/).length,
        characters: content.length,
        language: this.detectLanguages(content)
      };
      
      return { content, metadata, structure };
    } catch (error) {
      throw new ManuscriptProcessingError(
        'Failed to extract DOCX content',
        'DOCX_EXTRACTION_ERROR',
        error
      );
    }
  }
  
  private extractStructureFromHtml(html: string): DocumentStructure {
    const headers: Header[] = [];
    const paragraphs: Paragraph[] = [];
    
    // Parse headers from HTML
    const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
    const h2Matches = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
    const h3Matches = html.match(/<h3[^>]*>(.*?)<\/h3>/gi) || [];
    
    let headerIndex = 0;
    h1Matches.forEach(match => {
      const text = match.replace(/<[^>]*>/g, '').trim();
      headers.push({
        id: this.generateId(),
        text,
        level: 1,
        page: Math.ceil(headerIndex / 3),
        line: headerIndex * 10
      });
      headerIndex++;
    });
    
    h2Matches.forEach(match => {
      const text = match.replace(/<[^>]*>/g, '').trim();
      headers.push({
        id: this.generateId(),
        text,
        level: 2,
        page: Math.ceil(headerIndex / 3),
        line: headerIndex * 10
      });
      headerIndex++;
    });
    
    // Extract paragraphs
    const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gi) || [];
    pMatches.forEach((match, index) => {
      const text = match.replace(/<[^>]*>/g, '').trim();
      if (text.length > 0) {
        paragraphs.push({
          id: this.generateId(),
          content: text,
          page: Math.ceil(index / 3),
          index
        });
      }
    });
    
    return {
      headers,
      paragraphs,
      chapters: this.extractChapters(headers),
      sections: this.extractSections(headers)
    };
  }
  
  private detectLanguages(content: string): string[] {
    const languages: string[] = [];
    
    // Check for Myanmar text
    if (/[\u1000-\u109F]/.test(content)) {
      languages.push('my');
    }
    
    // Check for English text
    if (/[a-zA-Z]/.test(content)) {
      languages.push('en');
    }
    
    return languages.length > 0 ? languages : ['unknown'];
  }
}

// ============================================================================
// PDF Processor
// ============================================================================

export class PDFProcessor extends BaseDocumentProcessor {
  constructor() {
    super('pdf');
  }
  
  async extract(file: Buffer | ArrayBuffer): Promise<{
    content: string;
    metadata: DocumentMetadata;
    structure?: DocumentStructure;
  }> {
    try {
      const buffer = file instanceof ArrayBuffer ? Buffer.from(file) : file;
      const data = await pdfParse(buffer);
      
      const metadata: DocumentMetadata = {
        title: data.info?.Title,
        author: data.info?.Author,
        pages: data.numpages,
        words: data.text.split(/\s+/).length,
        characters: data.text.length,
        language: this.detectLanguages(data.text),
        created_date: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modified_date: data.info?.ModDate ? new Date(data.info.ModDate) : undefined
      };
      
      return {
        content: data.text,
        metadata,
        structure: this.extractStructure(data.text)
      };
    } catch (error) {
      throw new ManuscriptProcessingError(
        'Failed to extract PDF content',
        'PDF_EXTRACTION_ERROR',
        error
      );
    }
  }
  
  private detectLanguages(content: string): string[] {
    const languages: string[] = [];
    
    // Check for Myanmar text
    if (/[\u1000-\u109F]/.test(content)) {
      languages.push('my');
    }
    
    // Check for English text
    if (/[a-zA-Z]/.test(content)) {
      languages.push('en');
    }
    
    return languages.length > 0 ? languages : ['unknown'];
  }
}

// ============================================================================
// TXT Processor
// ============================================================================

export class TXTProcessor extends BaseDocumentProcessor {
  constructor() {
    super('txt');
  }
  
  async extract(file: string | Buffer): Promise<{
    content: string;
    metadata: DocumentMetadata;
    structure?: DocumentStructure;
  }> {
    try {
      const content = typeof file === 'string' ? file : file.toString('utf-8');
      
      const metadata: DocumentMetadata = {
        pages: Math.ceil(content.length / 3000),
        words: content.split(/\s+/).length,
        characters: content.length,
        language: this.detectLanguages(content)
      };
      
      return {
        content,
        metadata,
        structure: this.extractStructure(content)
      };
    } catch (error) {
      throw new ManuscriptProcessingError(
        'Failed to extract TXT content',
        'TXT_EXTRACTION_ERROR',
        error
      );
    }
  }
  
  private detectLanguages(content: string): string[] {
    const languages: string[] = [];
    
    // Check for Myanmar text
    if (/[\u1000-\u109F]/.test(content)) {
      languages.push('my');
    }
    
    // Check for English text
    if (/[a-zA-Z]/.test(content)) {
      languages.push('en');
    }
    
    return languages.length > 0 ? languages : ['unknown'];
  }
}

// ============================================================================
// Document Processor Factory
// ============================================================================

export class DocumentProcessorFactory {
  static create(fileType: FileType): BaseDocumentProcessor {
    switch (fileType) {
      case 'docx':
        return new DocxProcessor();
      case 'pdf':
        return new PDFProcessor();
      case 'txt':
        return new TXTProcessor();
      default:
        throw new ManuscriptProcessingError(
          `Unsupported file type: ${fileType}`,
          'UNSUPPORTED_FILE_TYPE'
        );
    }
  }
  
  static async process(
    file: Buffer | ArrayBuffer | string,
    fileType: FileType,
    options?: ChunkOptions
  ): Promise<ProcessedDocument> {
    const processor = DocumentProcessorFactory.create(fileType);
    return processor.process(file, options);
  }
}