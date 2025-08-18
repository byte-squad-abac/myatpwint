/**
 * Layout Analyzer - Checks document structure and formatting
 * As per Phase 4 of the implementation plan (Week 4-5)
 */

import {
  ProcessedDocument,
  LayoutIssue,
  LayoutIssueType,
  CheckResult,
  DocumentStructure,
  Header,
  Chapter,
  Paragraph
} from '../types';

// ============================================================================
// Layout Analyzer
// ============================================================================

export class LayoutAnalyzer {
  private readonly STANDARD_MARGINS = {
    top: 30,    // mm
    bottom: 30, // mm
    left: 20,   // mm
    right: 20   // mm
  };
  
  private readonly STANDARD_SPACING = {
    lineHeight: 1.8,      // for Myanmar text
    paragraphSpacing: 1.5, // em
    headerSpacing: 2.0    // em
  };
  
  /**
   * Analyze document layout and structure
   * Following plan section: Phase 4 - Layout & Structure Analysis
   */
  async analyze(document: ProcessedDocument, checkId?: string): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    
    // Check page numbering sequence
    const pageNumberingIssues = this.checkPageNumbering(document);
    results.push(...pageNumberingIssues);
    
    // Check header hierarchy
    const headerIssues = this.checkHeaderHierarchy(document.structure);
    results.push(...headerIssues);
    
    // Check chapter structure
    const chapterIssues = this.checkChapterStructure(document.structure);
    results.push(...chapterIssues);
    
    // Check paragraph formatting
    const paragraphIssues = this.checkParagraphFormatting(document.structure);
    results.push(...paragraphIssues);
    
    // Check spacing consistency
    const spacingIssues = this.checkSpacing(document);
    results.push(...spacingIssues);
    
    // Check for orphans and widows
    const orphanWidowIssues = this.checkOrphansAndWidows(document);
    results.push(...orphanWidowIssues);
    
    // Add check_id to all results
    return results.map(r => ({
      ...r,
      check_id: checkId || '',
      created_at: new Date()
    }));
  }
  
  /**
   * Check page numbering sequence
   */
  private checkPageNumbering(document: ProcessedDocument): CheckResult[] {
    const results: CheckResult[] = [];
    const pageNumbers = this.extractPageNumbers(document.content);
    
    // Check for missing page numbers
    let expectedPage = 1;
    for (const pageNum of pageNumbers) {
      if (pageNum !== expectedPage) {
        results.push({
          id: this.generateId(),
          check_id: '',
          category: 'layout',
          severity: 'error',
          page_number: expectedPage,
          issue: `Page numbering issue: Expected page ${expectedPage}, found ${pageNum}`,
          suggestion: `Ensure page numbers are sequential without gaps`,
          metadata: {
            type: 'page_numbering',
            expected: expectedPage,
            found: pageNum
          },
          created_at: new Date()
        });
      }
      expectedPage = pageNum + 1;
    }
    
    // Check if total pages match metadata
    if (document.metadata.pages && pageNumbers.length !== document.metadata.pages) {
      results.push({
        id: this.generateId(),
        check_id: '',
        category: 'layout',
        severity: 'warning',
        issue: `Page count mismatch: Document reports ${document.metadata.pages} pages but found ${pageNumbers.length} page numbers`,
        suggestion: 'Verify all pages are properly numbered',
        metadata: {
          type: 'page_numbering',
          reported_pages: document.metadata.pages,
          found_pages: pageNumbers.length
        },
        created_at: new Date()
      });
    }
    
    return results;
  }
  
  /**
   * Check header hierarchy
   */
  private checkHeaderHierarchy(structure?: DocumentStructure): CheckResult[] {
    const results: CheckResult[] = [];
    if (!structure || !structure.headers) return results;
    
    const headers = structure.headers;
    let previousLevel = 0;
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      
      // Check for skipped levels (e.g., H1 -> H3 without H2)
      if (header.level > previousLevel + 1 && previousLevel !== 0) {
        results.push({
          id: this.generateId(),
          check_id: '',
          category: 'structure',
          severity: 'warning',
          page_number: header.page,
          line_number: header.line,
          issue: `Header hierarchy issue: Level ${header.level} header follows level ${previousLevel}`,
          suggestion: `Use sequential header levels (H${previousLevel + 1} before H${header.level})`,
          original_text: header.text,
          metadata: {
            type: 'header_hierarchy',
            current_level: header.level,
            previous_level: previousLevel
          },
          created_at: new Date()
        });
      }
      
      // Check for consistent header formatting
      if (i > 0 && headers[i - 1].level === header.level) {
        const prevHeader = headers[i - 1];
        if (this.hasInconsistentFormatting(prevHeader.text, header.text)) {
          results.push({
            id: this.generateId(),
            check_id: '',
            category: 'structure',
            severity: 'suggestion',
            page_number: header.page,
            line_number: header.line,
            issue: `Inconsistent header formatting at level ${header.level}`,
            suggestion: 'Use consistent formatting for headers at the same level',
            original_text: header.text,
            metadata: {
              type: 'header_hierarchy',
              level: header.level
            },
            created_at: new Date()
          });
        }
      }
      
      previousLevel = header.level;
    }
    
    // Check for missing main header (H1)
    if (headers.length > 0 && !headers.some(h => h.level === 1)) {
      results.push({
        id: this.generateId(),
        check_id: '',
        category: 'structure',
        severity: 'warning',
        issue: 'No main header (H1) found in document',
        suggestion: 'Add a main title or chapter heading at the beginning',
        metadata: {
          type: 'header_hierarchy'
        },
        created_at: new Date()
      });
    }
    
    return results;
  }
  
  /**
   * Check chapter structure
   */
  private checkChapterStructure(structure?: DocumentStructure): CheckResult[] {
    const results: CheckResult[] = [];
    if (!structure || !structure.chapters || structure.chapters.length === 0) {
      return results;
    }
    
    const chapters = structure.chapters;
    
    // Check chapter length consistency
    const avgWordCount = chapters.reduce((sum, ch) => sum + (ch.word_count || 0), 0) / chapters.length;
    const stdDev = Math.sqrt(
      chapters.reduce((sum, ch) => sum + Math.pow((ch.word_count || 0) - avgWordCount, 2), 0) / chapters.length
    );
    
    for (const chapter of chapters) {
      // Check for very short chapters
      if (chapter.word_count && chapter.word_count < 500) {
        results.push({
          id: this.generateId(),
          check_id: '',
          category: 'structure',
          severity: 'warning',
          page_number: chapter.page_start,
          issue: `Chapter "${chapter.title}" is very short (${chapter.word_count} words)`,
          suggestion: 'Consider combining with adjacent chapter or expanding content',
          metadata: {
            type: 'chapter_structure',
            chapter_title: chapter.title,
            word_count: chapter.word_count
          },
          created_at: new Date()
        });
      }
      
      // Check for chapters significantly different from average
      if (chapter.word_count && Math.abs(chapter.word_count - avgWordCount) > 2 * stdDev) {
        results.push({
          id: this.generateId(),
          check_id: '',
          category: 'structure',
          severity: 'suggestion',
          page_number: chapter.page_start,
          issue: `Chapter "${chapter.title}" length differs significantly from average`,
          suggestion: 'Consider rebalancing chapter content for consistency',
          metadata: {
            type: 'chapter_structure',
            chapter_title: chapter.title,
            word_count: chapter.word_count,
            average_word_count: Math.round(avgWordCount)
          },
          created_at: new Date()
        });
      }
    }
    
    // Check for missing chapter numbers
    const chapterNumbers = chapters.map(ch => {
      const match = ch.title.match(/\d+/);
      return match ? parseInt(match[0]) : null;
    }).filter(n => n !== null) as number[];
    
    for (let i = 1; i < chapterNumbers.length; i++) {
      if (chapterNumbers[i] !== chapterNumbers[i - 1] + 1) {
        results.push({
          id: this.generateId(),
          check_id: '',
          category: 'structure',
          severity: 'error',
          issue: `Chapter numbering gap between ${chapterNumbers[i - 1]} and ${chapterNumbers[i]}`,
          suggestion: 'Ensure chapters are numbered sequentially',
          metadata: {
            type: 'chapter_structure',
            previous_chapter: chapterNumbers[i - 1],
            current_chapter: chapterNumbers[i]
          },
          created_at: new Date()
        });
      }
    }
    
    return results;
  }
  
  /**
   * Check paragraph formatting
   */
  private checkParagraphFormatting(structure?: DocumentStructure): CheckResult[] {
    const results: CheckResult[] = [];
    if (!structure || !structure.paragraphs) return results;
    
    const paragraphs = structure.paragraphs;
    
    // Check for very short paragraphs (potential formatting issues)
    for (const para of paragraphs) {
      if (para.content.length < 50 && para.content.length > 0) {
        // Check if it's not a heading or special element
        if (!this.isLikelyHeading(para.content)) {
          results.push({
            id: this.generateId(),
            check_id: '',
            category: 'layout',
            severity: 'suggestion',
            page_number: para.page,
            paragraph_number: para.index,
            issue: 'Very short paragraph detected',
            suggestion: 'Consider combining with adjacent paragraph or verify formatting',
            original_text: para.content.substring(0, 50),
            metadata: {
              type: 'paragraph_formatting',
              length: para.content.length
            },
            created_at: new Date()
          });
        }
      }
      
      // Check for very long paragraphs (readability issue)
      if (para.content.length > 1500) {
        results.push({
          id: this.generateId(),
          check_id: '',
          category: 'layout',
          severity: 'suggestion',
          page_number: para.page,
          paragraph_number: para.index,
          issue: 'Very long paragraph detected',
          suggestion: 'Consider breaking into smaller paragraphs for better readability',
          original_text: para.content.substring(0, 50) + '...',
          metadata: {
            type: 'paragraph_formatting',
            length: para.content.length
          },
          created_at: new Date()
        });
      }
      
      // Check for inconsistent indentation
      if (para.style?.indent !== undefined) {
        const expectedIndent = para.index === 0 ? 0 : 20; // First para no indent, others 20px
        if (Math.abs(para.style.indent - expectedIndent) > 5) {
          results.push({
            id: this.generateId(),
            check_id: '',
            category: 'layout',
            severity: 'warning',
            page_number: para.page,
            paragraph_number: para.index,
            issue: 'Inconsistent paragraph indentation',
            suggestion: `Use ${expectedIndent}px indent for ${para.index === 0 ? 'first' : 'body'} paragraphs`,
            metadata: {
              type: 'paragraph_formatting',
              current_indent: para.style.indent,
              expected_indent: expectedIndent
            },
            created_at: new Date()
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Check spacing consistency
   */
  private checkSpacing(document: ProcessedDocument): CheckResult[] {
    const results: CheckResult[] = [];
    
    // Analyze line spacing patterns
    const lineSpacingPattern = /line-height:\s*([\d.]+)/gi;
    const matches = document.content.match(lineSpacingPattern) || [];
    
    if (matches.length > 0) {
      const spacings = matches.map(m => {
        const match = m.match(/[\d.]+/);
        return match ? parseFloat(match[0]) : 0;
      });
      
      // Check for Myanmar text optimal line spacing
      const hasMyanmar = /[\u1000-\u109F]/.test(document.content);
      if (hasMyanmar) {
        const avgSpacing = spacings.reduce((a, b) => a + b, 0) / spacings.length;
        if (avgSpacing < 1.6 || avgSpacing > 2.2) {
          results.push({
            id: this.generateId(),
            check_id: '',
            category: 'layout',
            severity: 'warning',
            issue: `Line spacing ${avgSpacing.toFixed(1)} is not optimal for Myanmar text`,
            suggestion: `Use line height between 1.6 and 2.2 (recommended: 1.8) for Myanmar text`,
            metadata: {
              type: 'spacing',
              current_spacing: avgSpacing,
              recommended_spacing: this.STANDARD_SPACING.lineHeight
            },
            created_at: new Date()
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Check for orphans and widows
   */
  private checkOrphansAndWidows(document: ProcessedDocument): CheckResult[] {
    const results: CheckResult[] = [];
    const lines = document.content.split('\n');
    
    // Track potential orphans (single line at beginning of page)
    // and widows (single line at end of page)
    const estimatedLinesPerPage = 40;
    
    for (let i = 0; i < lines.length; i++) {
      const pageNumber = Math.floor(i / estimatedLinesPerPage) + 1;
      const lineOnPage = i % estimatedLinesPerPage;
      
      // Check for orphan (first line of paragraph at bottom of page)
      if (lineOnPage === estimatedLinesPerPage - 1 && i + 1 < lines.length) {
        if (lines[i].length > 0 && lines[i + 1].length > 0) {
          // Check if next line continues the paragraph
          if (!this.isLikelyParagraphBreak(lines[i], lines[i + 1])) {
            results.push({
              id: this.generateId(),
              check_id: '',
              category: 'layout',
              severity: 'suggestion',
              page_number: pageNumber,
              line_number: i + 1,
              issue: 'Potential orphan line at bottom of page',
              suggestion: 'Adjust spacing or content to keep paragraph together',
              metadata: {
                type: 'orphan_widow',
                issue_type: 'orphan'
              },
              created_at: new Date()
            });
          }
        }
      }
      
      // Check for widow (last line of paragraph at top of page)
      if (lineOnPage === 0 && i > 0) {
        if (lines[i].length > 0 && lines[i - 1].length > 0) {
          // Check if previous line was part of same paragraph
          if (!this.isLikelyParagraphBreak(lines[i - 1], lines[i])) {
            results.push({
              id: this.generateId(),
              check_id: '',
              category: 'layout',
              severity: 'suggestion',
              page_number: pageNumber,
              line_number: i + 1,
              issue: 'Potential widow line at top of page',
              suggestion: 'Adjust spacing to move more content to this page',
              metadata: {
                type: 'orphan_widow',
                issue_type: 'widow'
              },
              created_at: new Date()
            });
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Extract page numbers from content
   */
  private extractPageNumbers(content: string): number[] {
    const pageNumbers: number[] = [];
    
    // Common page number patterns
    const patterns = [
      /^[\s]*(\d+)[\s]*$/gm,        // Just number
      /^[\s]*-\s*(\d+)\s*-[\s]*$/gm, // - number -
      /Page\s+(\d+)/gi,               // Page X
      /စာမျက်နှာ\s*(\d+)/g           // Myanmar "page" + number
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const pageNum = parseInt(match[1]);
        if (!isNaN(pageNum) && pageNum > 0 && pageNum < 10000) {
          pageNumbers.push(pageNum);
        }
      }
    }
    
    // Sort and deduplicate
    return [...new Set(pageNumbers)].sort((a, b) => a - b);
  }
  
  /**
   * Check if text has inconsistent formatting
   */
  private hasInconsistentFormatting(text1: string, text2: string): boolean {
    // Check case consistency
    const isAllCaps1 = text1 === text1.toUpperCase();
    const isAllCaps2 = text2 === text2.toUpperCase();
    if (isAllCaps1 !== isAllCaps2) return true;
    
    // Check numbering format
    const hasNumber1 = /^\d+[.)]\s/.test(text1);
    const hasNumber2 = /^\d+[.)]\s/.test(text2);
    if (hasNumber1 !== hasNumber2) return true;
    
    // Check prefix patterns
    const hasChapterPrefix1 = /^(Chapter|အခန်း)\s+/i.test(text1);
    const hasChapterPrefix2 = /^(Chapter|အခန်း)\s+/i.test(text2);
    if (hasChapterPrefix1 !== hasChapterPrefix2) return true;
    
    return false;
  }
  
  /**
   * Check if text is likely a heading
   */
  private isLikelyHeading(text: string): boolean {
    // Short text that's all caps
    if (text === text.toUpperCase() && text.length < 100) return true;
    
    // Starts with chapter/section indicators
    if (/^(Chapter|Section|အခန်း|အပိုင်း)\s+/i.test(text)) return true;
    
    // Numbered heading
    if (/^\d+[.)]\s/.test(text) && text.length < 100) return true;
    
    return false;
  }
  
  /**
   * Check if there's likely a paragraph break between two lines
   */
  private isLikelyParagraphBreak(line1: string, line2: string): boolean {
    // Empty line indicates paragraph break
    if (line1.trim().length === 0 || line2.trim().length === 0) return true;
    
    // Line 1 ends with sentence ending punctuation
    if (/[.!?။]$/.test(line1.trim())) {
      // Line 2 starts with capital letter or Myanmar character
      if (/^[A-Z\u1000-\u1021]/.test(line2.trim())) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const layoutAnalyzer = new LayoutAnalyzer();