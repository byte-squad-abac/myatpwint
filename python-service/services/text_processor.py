"""
Text Processor - Handles Myanmar and English text processing
Specialized for book content processing and language detection
"""

import re
import hashlib
import logging
from typing import Dict, Any, List, Optional
import unicodedata

try:
    from langdetect import detect, DetectorFactory
    # Set seed for consistent language detection
    DetectorFactory.seed = 0
    LANGDETECT_AVAILABLE = True
except ImportError:
    LANGDETECT_AVAILABLE = False

logger = logging.getLogger(__name__)

class TextProcessor:
    """
    Advanced text processor optimized for Myanmar and English text
    Handles normalization, cleaning, and language detection
    """
    
    def __init__(self):
        self.myanmar_unicode_range = (0x1000, 0x109F)
        self.myanmar_extended_range = (0xAA60, 0xAA7F)
        self.stats = {
            "texts_processed": 0,
            "myanmar_texts": 0,
            "english_texts": 0,
            "mixed_texts": 0
        }
    
    def process_book_text(self, book_data: Dict[str, Any]) -> str:
        """
        Process book data into a clean, embeddable text format
        
        Args:
            book_data: Dictionary containing book information
            
        Returns:
            Clean, processed text suitable for embedding generation
        """
        text_parts = []
        
        # Process title/name
        if book_data.get('name'):
            title = self.clean_text(book_data['name'])
            text_parts.append(f"Title: {title}")
        
        # Process author
        if book_data.get('author'):
            author = self.clean_text(book_data['author'])
            text_parts.append(f"Author: {author}")
        
        # Process description
        if book_data.get('description'):
            description = self.clean_text(book_data['description'])
            text_parts.append(f"Description: {description}")
        
        # Process category
        if book_data.get('category'):
            category = self.clean_text(book_data['category'])
            text_parts.append(f"Category: {category}")
        
        # Process tags
        if book_data.get('tags'):
            if isinstance(book_data['tags'], list):
                tags = [self.clean_text(tag) for tag in book_data['tags']]
                tags_text = ', '.join(tags)
                text_parts.append(f"Tags: {tags_text}")
            elif isinstance(book_data['tags'], str):
                # Handle JSON string format
                try:
                    import json
                    tags = json.loads(book_data['tags'])
                    if isinstance(tags, list):
                        clean_tags = [self.clean_text(tag) for tag in tags]
                        tags_text = ', '.join(clean_tags)
                        text_parts.append(f"Tags: {tags_text}")
                except:
                    # If JSON parsing fails, treat as regular text
                    tags_text = self.clean_text(book_data['tags'])
                    text_parts.append(f"Tags: {tags_text}")
        
        # Add price information for context (helps with similar pricing)
        if book_data.get('price'):
            price_range = self.get_price_range(book_data['price'])
            text_parts.append(f"Price Range: {price_range}")
        
        # Combine all parts
        combined_text = '. '.join(text_parts)
        
        # Final cleanup and normalization
        processed_text = self.normalize_text(combined_text)
        
        self.stats["texts_processed"] += 1
        
        return processed_text
    
    def clean_text(self, text: str) -> str:
        """
        Clean and standardize text for processing
        
        Args:
            text: Raw input text
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Convert to string if not already
        text = str(text).strip()
        
        # Unicode normalization (important for Myanmar text)
        text = unicodedata.normalize('NFC', text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters but keep Myanmar script
        # Keep alphanumeric, Myanmar script, common punctuation
        text = re.sub(r'[^\w\s\u1000-\u109F\u1040-\u1049\uAA60-\uAA7F.,!?;:()\-\'\"]+', ' ', text)
        
        # Clean up multiple punctuation
        text = re.sub(r'[.,!?;:]+', '.', text)
        
        # Final cleanup
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def normalize_text(self, text: str) -> str:
        """
        Normalize text for consistent processing
        
        Args:
            text: Input text to normalize
            
        Returns:
            Normalized text
        """
        if not text:
            return ""
        
        # Unicode normalization
        text = unicodedata.normalize('NFC', text)
        
        # Myanmar-specific normalizations
        text = self.normalize_myanmar_text(text)
        
        # General normalizations
        text = text.lower()  # Convert to lowercase for consistency
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        text = text.strip()
        
        return text
    
    def normalize_myanmar_text(self, text: str) -> str:
        """
        Apply Myanmar-specific text normalizations
        
        Args:
            text: Text containing Myanmar script
            
        Returns:
            Normalized Myanmar text
        """
        if not self.contains_myanmar(text):
            return text
        
        # Myanmar-specific normalizations can be added here
        # For now, we'll do basic cleanup
        
        # Normalize Myanmar digits to ASCII if needed for consistency
        myanmar_to_ascii = {
            '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4',
            '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9'
        }
        
        for mm_digit, ascii_digit in myanmar_to_ascii.items():
            text = text.replace(mm_digit, ascii_digit)
        
        return text
    
    def contains_myanmar(self, text: str) -> bool:
        """
        Check if text contains Myanmar script
        
        Args:
            text: Text to check
            
        Returns:
            True if text contains Myanmar characters
        """
        if not text:
            return False
        
        for char in text:
            char_code = ord(char)
            if (self.myanmar_unicode_range[0] <= char_code <= self.myanmar_unicode_range[1] or
                self.myanmar_extended_range[0] <= char_code <= self.myanmar_extended_range[1]):
                return True
        
        return False
    
    def detect_language(self, text: str) -> str:
        """
        Detect the primary language of the text
        
        Args:
            text: Text to analyze
            
        Returns:
            Language code ('myanmar', 'english', 'mixed', 'unknown')
        """
        if not text:
            return "unknown"
        
        has_myanmar = self.contains_myanmar(text)
        
        # Use langdetect for non-Myanmar languages
        detected_lang = "unknown"
        if LANGDETECT_AVAILABLE:
            try:
                # Remove Myanmar text for langdetect (it doesn't handle Myanmar well)
                english_text = re.sub(r'[\u1000-\u109F\uAA60-\uAA7F]+', '', text)
                if english_text.strip():
                    detected_lang = detect(english_text.strip())
            except:
                detected_lang = "unknown"
        
        # Determine final language classification
        if has_myanmar and detected_lang in ['en', 'unknown']:
            if len(re.sub(r'[\u1000-\u109F\uAA60-\uAA7F\s]+', '', text)) > 10:
                result = "mixed"
                self.stats["mixed_texts"] += 1
            else:
                result = "myanmar"
                self.stats["myanmar_texts"] += 1
        elif has_myanmar:
            result = "mixed"
            self.stats["mixed_texts"] += 1
        elif detected_lang == 'en':
            result = "english"
            self.stats["english_texts"] += 1
        else:
            # Default to English for unknown languages with Latin script
            if re.search(r'[a-zA-Z]+', text):
                result = "english"
                self.stats["english_texts"] += 1
            else:
                result = "unknown"
        
        return result
    
    def get_price_range(self, price: float) -> str:
        """
        Categorize price into ranges for better recommendations
        
        Args:
            price: Book price in MMK
            
        Returns:
            Price range category
        """
        if price < 5000:
            return "budget"
        elif price < 15000:
            return "affordable"
        elif price < 25000:
            return "moderate"
        else:
            return "premium"
    
    def extract_keywords(self, text: str, max_keywords: int = 10) -> List[str]:
        """
        Extract important keywords from text
        
        Args:
            text: Text to extract keywords from
            max_keywords: Maximum number of keywords to return
            
        Returns:
            List of important keywords
        """
        if not text:
            return []
        
        # Clean text
        cleaned = self.clean_text(text.lower())
        
        # Simple keyword extraction (can be enhanced with more sophisticated methods)
        # Remove common stop words
        stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'this', 'these', 'they', 'them',
            'book', 'author', 'title', 'description', 'category', 'tags'
        }
        
        # Extract words
        words = re.findall(r'\b\w+\b', cleaned)
        
        # Filter out stop words and short words
        keywords = [
            word for word in words 
            if len(word) > 2 and word not in stop_words
        ]
        
        # Count frequency and return most common
        from collections import Counter
        word_freq = Counter(keywords)
        
        return [word for word, _ in word_freq.most_common(max_keywords)]
    
    def generate_text_hash(self, text: str) -> str:
        """
        Generate a hash for text content to detect changes
        
        Args:
            text: Text to hash
            
        Returns:
            MD5 hash of the text
        """
        if not text:
            return ""
        
        return hashlib.md5(text.encode('utf-8')).hexdigest()
    
    def prepare_search_text(self, text: str) -> str:
        """
        Prepare text specifically for search indexing
        
        Args:
            text: Text to prepare for search
            
        Returns:
            Search-optimized text
        """
        if not text:
            return ""
        
        # Clean and normalize
        cleaned = self.clean_text(text)
        normalized = self.normalize_text(cleaned)
        
        # Extract keywords for search
        keywords = self.extract_keywords(normalized, max_keywords=20)
        
        # Combine original text with keywords for better search coverage
        search_text = f"{normalized} {' '.join(keywords)}"
        
        return search_text.strip()
    
    def get_text_statistics(self, text: str) -> Dict[str, Any]:
        """
        Get comprehensive statistics about the text
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary containing text statistics
        """
        if not text:
            return {
                "character_count": 0,
                "word_count": 0,
                "sentence_count": 0,
                "language": "unknown",
                "has_myanmar": False,
                "readability": "unknown"
            }
        
        # Basic counts
        char_count = len(text)
        word_count = len(text.split())
        sentence_count = len(re.split(r'[.!?]+', text))
        
        # Language detection
        language = self.detect_language(text)
        has_myanmar = self.contains_myanmar(text)
        
        # Simple readability assessment
        if word_count > 0:
            avg_word_length = char_count / word_count
            if avg_word_length < 4:
                readability = "easy"
            elif avg_word_length < 6:
                readability = "moderate"
            else:
                readability = "complex"
        else:
            readability = "unknown"
        
        return {
            "character_count": char_count,
            "word_count": word_count,
            "sentence_count": sentence_count,
            "language": language,
            "has_myanmar": has_myanmar,
            "readability": readability,
            "avg_word_length": char_count / word_count if word_count > 0 else 0
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Get processing statistics"""
        return self.stats.copy()