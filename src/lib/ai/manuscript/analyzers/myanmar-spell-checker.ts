/**
 * Myanmar Language Spell Checker
 * Handles both Zawgyi and Unicode encodings
 */

import { ZawgyiDetector, ZawgyiConverter } from 'myanmar-tools';
import { createClient } from '@supabase/supabase-js';
import {
  SpellingIssue,
  MyanmarTextInfo,
  MyanmarDictionaryEntry,
  CheckResult,
  Severity
} from '../types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================================
// Myanmar Spell Checker
// ============================================================================

export class MyanmarSpellChecker {
  private detector: ZawgyiDetector;
  private converter: ZawgyiConverter;
  private dictionary: Map<string, MyanmarDictionaryEntry>;
  private commonMistakes: Map<string, string>;
  private initialized: boolean = false;
  
  constructor() {
    this.detector = new ZawgyiDetector();
    this.converter = new ZawgyiConverter();
    this.dictionary = new Map();
    this.commonMistakes = new Map();
  }
  
  /**
   * Initialize the spell checker with dictionary and common mistakes
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load dictionary from database
      await this.loadDictionary();
      
      // Load common mistakes
      await this.loadCommonMistakes();
      
      // Load default Myanmar words if dictionary is empty
      if (this.dictionary.size === 0) {
        await this.loadDefaultDictionary();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize Myanmar spell checker:', error);
      // Continue with limited functionality
      this.initialized = true;
    }
  }
  
  /**
   * Check text for spelling issues
   */
  async check(text: string, checkId?: string): Promise<CheckResult[]> {
    await this.initialize();
    
    const results: CheckResult[] = [];
    
    // Detect and convert encoding
    const textInfo = this.analyzeText(text);
    
    // Check for Zawgyi encoding (should be Unicode)
    if (textInfo.encoding === 'zawgyi') {
      results.push({
        id: this.generateId(),
        check_id: checkId || '',
        category: 'spelling',
        severity: 'warning',
        issue: 'Document uses Zawgyi encoding instead of Unicode',
        suggestion: 'Convert entire document to Unicode for better compatibility',
        confidence: 0.95,
        metadata: {
          encoding: 'zawgyi',
          zawgyi_probability: this.detector.getZawgyiProbability(text)
        },
        created_at: new Date()
      });
    }
    
    // Check each word for spelling
    const spellingIssues = await this.checkSpelling(textInfo);
    
    // Convert spelling issues to check results
    for (const issue of spellingIssues) {
      results.push({
        id: this.generateId(),
        check_id: checkId || '',
        category: 'spelling',
        severity: this.getSeverity(issue),
        page_number: issue.position.page,
        line_number: issue.position.line,
        issue: `Spelling issue: "${issue.word}"`,
        original_text: issue.word,
        suggestion: issue.suggestions.join(', '),
        confidence: issue.confidence,
        metadata: {
          type: issue.type,
          suggestions: issue.suggestions
        },
        created_at: new Date()
      });
    }
    
    // Check for common mistakes
    const mistakeResults = this.checkCommonMistakes(textInfo.unicode);
    results.push(...mistakeResults.map(m => ({
      ...m,
      check_id: checkId || '',
      created_at: new Date()
    })));
    
    return results;
  }
  
  /**
   * Analyze Myanmar text and get detailed information
   */
  analyzeText(text: string): MyanmarTextInfo {
    // Detect encoding
    const zawgyiProbability = this.detector.getZawgyiProbability(text);
    const isZawgyi = zawgyiProbability > 0.95;
    
    // Convert to Unicode if needed
    const unicodeText = isZawgyi ? this.converter.zawgyiToUnicode(text) : text;
    
    // Break into syllables
    const syllables = this.breakIntoSyllables(unicodeText);
    
    // Extract words
    const words = this.extractWords(unicodeText);
    
    return {
      original: text,
      unicode: unicodeText,
      encoding: isZawgyi ? 'zawgyi' : 'unicode',
      syllables,
      words,
      stats: {
        totalSyllables: syllables.length,
        totalWords: words.length,
        uniqueWords: new Set(words).size
      }
    };
  }
  
  /**
   * Check spelling for Myanmar text
   */
  private async checkSpelling(textInfo: MyanmarTextInfo): Promise<SpellingIssue[]> {
    const issues: SpellingIssue[] = [];
    const checkedWords = new Set<string>();
    
    let lineNumber = 1;
    let charPosition = 0;
    
    for (const word of textInfo.words) {
      // Skip if already checked
      if (checkedWords.has(word)) continue;
      checkedWords.add(word);
      
      // Skip short words (likely particles)
      if (word.length <= 2) continue;
      
      // Check if word is in dictionary
      if (!this.isValidWord(word)) {
        const suggestions = await this.getSuggestions(word);
        
        issues.push({
          word,
          suggestions,
          position: {
            line: lineNumber,
            char: charPosition
          },
          confidence: this.calculateConfidence(word, suggestions),
          type: this.classifyMistakeType(word)
        });
      }
      
      // Update position tracking
      charPosition += word.length + 1;
      if (word.includes('\n')) {
        lineNumber++;
        charPosition = 0;
      }
    }
    
    return issues;
  }
  
  /**
   * Check for common Myanmar spelling mistakes
   */
  private checkCommonMistakes(text: string): CheckResult[] {
    const results: CheckResult[] = [];
    
    for (const [incorrect, correct] of this.commonMistakes) {
      const regex = new RegExp(incorrect, 'g');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        results.push({
          id: this.generateId(),
          check_id: '',
          category: 'spelling',
          severity: 'warning',
          issue: `Common mistake: "${incorrect}" should be "${correct}"`,
          original_text: incorrect,
          suggestion: correct,
          confidence: 0.9,
          metadata: {
            type: 'common_mistake',
            position: match.index
          },
          created_at: new Date()
        });
      }
    }
    
    return results;
  }
  
  /**
   * Break text into Myanmar syllables
   */
  private breakIntoSyllables(text: string): string[] {
    const syllables: string[] = [];
    const syllablePattern = /[\u1000-\u1021][\u1000-\u1021\u103B-\u103E]*[\u102B-\u1032\u1036-\u1038]*[\u103A]?/g;
    
    let match;
    while ((match = syllablePattern.exec(text)) !== null) {
      syllables.push(match[0]);
    }
    
    return syllables;
  }
  
  /**
   * Extract words from Myanmar text
   */
  private extractWords(text: string): string[] {
    // Myanmar doesn't use spaces between words, so we need to use different approach
    // Split by spaces, punctuation, and common particles
    const words: string[] = [];
    
    // Split by spaces and Myanmar punctuation (။ ၊)
    const segments = text.split(/[\s။၊]+/);
    
    for (const segment of segments) {
      if (segment.length > 0) {
        // Further split by common particles if needed
        const subWords = this.splitByParticles(segment);
        words.push(...subWords);
      }
    }
    
    return words.filter(w => w.length > 0);
  }
  
  /**
   * Split text by common Myanmar particles
   */
  private splitByParticles(text: string): string[] {
    // Common Myanmar particles that often indicate word boundaries
    const particles = ['သည်', 'များ', 'တို့', 'ကို', 'မှ', 'သို့', 'နှင့်', 'ဖြင့်'];
    
    let words = [text];
    
    for (const particle of particles) {
      const newWords: string[] = [];
      for (const word of words) {
        const parts = word.split(particle);
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) newWords.push(parts[i]);
          // Add particle back except for last split
          if (i < parts.length - 1) newWords.push(particle);
        }
      }
      words = newWords;
    }
    
    return words;
  }
  
  /**
   * Check if a word is valid
   */
  private isValidWord(word: string): boolean {
    // Check in dictionary
    if (this.dictionary.has(word)) {
      const entry = this.dictionary.get(word)!;
      return entry.is_valid;
    }
    
    // Check if it's a number or contains numbers
    if (/[\u1040-\u1049]/.test(word)) {
      return true;
    }
    
    // Check if it's a common particle or conjunction
    const commonWords = ['သည်', 'များ', 'တို့', 'ကို', 'မှ', 'သို့', 'နှင့်', 'ဖြင့်', 'နဲ့', 'က', 'ကနေ'];
    if (commonWords.includes(word)) {
      return true;
    }
    
    // If not found, consider it potentially invalid
    return false;
  }
  
  /**
   * Get spelling suggestions for a word
   */
  private async getSuggestions(word: string): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Check for Zawgyi-Unicode confusion
    const zawgyiVersion = this.converter.unicodeToZawgyi(word);
    const unicodeVersion = this.converter.zawgyiToUnicode(word);
    
    if (zawgyiVersion !== word && this.isValidWord(zawgyiVersion)) {
      suggestions.push(zawgyiVersion);
    }
    
    if (unicodeVersion !== word && this.isValidWord(unicodeVersion)) {
      suggestions.push(unicodeVersion);
    }
    
    // Check for common typos (character substitution)
    const similarWords = this.findSimilarWords(word);
    suggestions.push(...similarWords);
    
    // Check in dictionary alternatives
    for (const [dictWord, entry] of this.dictionary) {
      if (entry.alternatives?.includes(word)) {
        suggestions.push(dictWord);
      }
    }
    
    // Limit suggestions
    return suggestions.slice(0, 5);
  }
  
  /**
   * Find words similar to the given word (edit distance)
   */
  private findSimilarWords(word: string): string[] {
    const similar: string[] = [];
    const maxDistance = 2;
    
    for (const [dictWord] of this.dictionary) {
      const distance = this.levenshteinDistance(word, dictWord);
      if (distance <= maxDistance && distance > 0) {
        similar.push(dictWord);
      }
    }
    
    return similar.slice(0, 3);
  }
  
  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Calculate confidence score for spelling issue
   */
  private calculateConfidence(word: string, suggestions: string[]): number {
    if (suggestions.length === 0) return 0.5;
    if (suggestions.length === 1) return 0.8;
    if (suggestions.length > 3) return 0.6;
    return 0.7;
  }
  
  /**
   * Classify the type of spelling mistake
   */
  private classifyMistakeType(word: string): 'misspelling' | 'zawgyi_unicode' | 'unknown_word' {
    // Check if it's likely a Zawgyi-Unicode issue
    const zawgyiProbability = this.detector.getZawgyiProbability(word);
    if (zawgyiProbability > 0.5) {
      return 'zawgyi_unicode';
    }
    
    // Check if word exists in any form in dictionary
    for (const [_, entry] of this.dictionary) {
      if (entry.alternatives?.includes(word)) {
        return 'misspelling';
      }
    }
    
    return 'unknown_word';
  }
  
  /**
   * Get severity level for spelling issue
   */
  private getSeverity(issue: SpellingIssue): Severity {
    switch (issue.type) {
      case 'zawgyi_unicode':
        return 'warning';
      case 'misspelling':
        return issue.confidence > 0.7 ? 'error' : 'warning';
      case 'unknown_word':
        return 'suggestion';
      default:
        return 'suggestion';
    }
  }
  
  /**
   * Load dictionary from database
   */
  private async loadDictionary(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('myanmar_dictionary')
        .select('*')
        .eq('is_valid', true);
      
      if (error) {
        console.error('Failed to load dictionary:', error);
        return;
      }
      
      if (data) {
        for (const entry of data) {
          this.dictionary.set(entry.word, entry);
          if (entry.word_unicode) {
            this.dictionary.set(entry.word_unicode, entry);
          }
        }
      }
    } catch (error) {
      console.error('Error loading dictionary:', error);
    }
  }
  
  /**
   * Load common spelling mistakes from database
   */
  private async loadCommonMistakes(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('myanmar_spelling_mistakes')
        .select('*');
      
      if (error) {
        console.error('Failed to load common mistakes:', error);
        return;
      }
      
      if (data) {
        for (const mistake of data) {
          this.commonMistakes.set(mistake.incorrect, mistake.correct);
        }
      }
    } catch (error) {
      console.error('Error loading common mistakes:', error);
    }
  }
  
  /**
   * Load default Myanmar dictionary
   */
  private async loadDefaultDictionary(): Promise<void> {
    // Common Myanmar words for basic checking
    const defaultWords = [
      'မြန်မာ', 'ပြည်', 'နိုင်ငံ', 'ရန်ကုန်', 'မန္တလေး',
      'စာအုပ်', 'စာမျက်နှာ', 'အခန်း', 'ပုံနှိပ်', 'ထုတ်ဝေ',
      'စာရေးဆရာ', 'ဝတ္ထု', 'ကဗျာ', 'ရုပ်ရှင်', 'သမိုင်း',
      'ယဉ်ကျေးမှု', 'ဘာသာ', 'စကား', 'အနုပညာ', 'ပညာရေး',
      'ကျောင်း', 'ဆရာ', 'ကျောင်းသား', 'သင်ရိုး', 'စာမေးပွဲ',
      'တက္ကသိုလ်', 'ဘွဲ့', 'သုတေသန', 'လေ့လာ', 'သင်ကြား',
      'မိသားစု', 'မိဘ', 'သားသမီး', 'ညီအစ်ကို', 'မောင်နှမ',
      'အိမ်', 'မြို့', 'ရွာ', 'လမ်း', 'တံတား',
      'ကျန်းမာရေး', 'ဆေးရုံ', 'ဆရာဝန်', 'ဆေး', 'ရောဂါ',
      'စီးပွားရေး', 'ကုန်သွယ်', 'ဈေး', 'ငွေ', 'ဘဏ်',
      'အစိုးရ', 'ဥပဒေ', 'တရား', 'ရဲ', 'စစ်',
      'သဘာဝ', 'ပတ်ဝန်းကျင်', 'ရာသီဥတု', 'မိုး', 'နေ'
    ];
    
    for (const word of defaultWords) {
      this.dictionary.set(word, {
        id: 0,
        word,
        frequency: 1,
        is_valid: true,
        created_at: new Date()
      });
    }
  }
  
  /**
   * Add word to dictionary
   */
  async addToDictionary(word: string, isValid: boolean = true): Promise<void> {
    try {
      const { error } = await supabase
        .from('myanmar_dictionary')
        .upsert({
          word,
          word_unicode: word,
          is_valid: isValid,
          frequency: 1
        });
      
      if (!error) {
        this.dictionary.set(word, {
          id: 0,
          word,
          frequency: 1,
          is_valid: isValid,
          created_at: new Date()
        });
      }
    } catch (error) {
      console.error('Failed to add word to dictionary:', error);
    }
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

export const myanmarSpellChecker = new MyanmarSpellChecker();