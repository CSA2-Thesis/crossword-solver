import json
import os
import logging
import re
import random
from typing import List, Dict, Optional
from collections import defaultdict, Counter

logger = logging.getLogger(__name__)

class DictionaryHelper:
    # Letter frequency scores for word placement optimization
    LETTER_SCORES = {
        'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
        'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
        'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
    }
    
    # Letter frequency in English language (for more natural word distribution)
    LETTER_FREQUENCY = {
        'A': 8.2, 'B': 1.5, 'C': 2.8, 'D': 4.3, 'E': 12.7, 'F': 2.2, 'G': 2.0, 'H': 6.1, 'I': 7.0,
        'J': 0.15, 'K': 0.77, 'L': 4.0, 'M': 2.4, 'N': 6.7, 'O': 7.5, 'P': 1.9, 'Q': 0.095, 'R': 6.0,
        'S': 6.3, 'T': 9.1, 'U': 2.8, 'V': 0.98, 'W': 2.4, 'X': 0.15, 'Y': 2.0, 'Z': 0.074
    }
    
    def __init__(self, dictionary_path: str):
        self.dictionary_path = dictionary_path
        self.words_by_length = defaultdict(list)
        self.words_by_first_letter = defaultdict(list)
        self.word_count_by_length = defaultdict(int)
        self.all_words = []
        self.word_to_data = {}  # Mapping from word to its data
        self._load_dictionary()
        
    def _load_dictionary(self):
        """Load and index the dictionary for faster lookups"""
        logger.info("Loading dictionary...")
        
        # Load all dictionary files
        for filename in os.listdir(self.dictionary_path):
            if filename.endswith('.json'):
                file_path = os.path.join(self.dictionary_path, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        
                        # Your JSON structure: {word: {word_data}, word2: {word_data}, ...}
                        for word_key, word_data in data.items():
                            # Extract the word from the data
                            word = word_data.get('word', word_key).upper()
                            
                            # Skip words with spaces or non-alphabetic characters
                            if ' ' in word or not self._is_valid_crossword_word(word):
                                continue
                                
                            length = len(word)
                            
                            # Create a standardized word data structure with score
                            standardized_data = {
                                'word': word,
                                'clue': self._extract_clue(word_data),
                                'definition': self._extract_definition(word_data),
                                'length': length,
                                'score': self._calculate_word_score(word)  # Add score field
                            }
                            
                            # Add to various indexes
                            self.words_by_length[length].append(standardized_data)
                            if word:  # Ensure word is not empty
                                self.words_by_first_letter[word[0]].append(standardized_data)
                            self.word_count_by_length[length] += 1
                            self.all_words.append(standardized_data)
                            self.word_to_data[word] = standardized_data
                            
                except Exception as e:
                    logger.error(f"Error loading dictionary file {filename}: {e}")
        
        logger.info(f"Dictionary loaded: {len(self.all_words)} valid crossword words")
        
    def _is_valid_crossword_word(self, word: str) -> bool:
        """Check if a word is valid for crossword puzzles"""
        # Must contain only letters (no spaces, hyphens, apostrophes, etc.)
        if not word.isalpha():
            return False
            
        # Must be between 2 and 15 letters long (typical crossword word lengths)
        if len(word) < 2 or len(word) > 15:
            return False
            
        # Should not be too obscure (you can add more filters as needed)
        return True
        
    def _calculate_word_score(self, word: str) -> int:
        """Calculate a score for a word based on letter frequency"""
        score = 0
        vowels = {'A', 'E', 'I', 'O', 'U'}
        word_upper = word.upper()
        
        # Base score from letter values
        for char in word_upper:
            score += self.LETTER_SCORES.get(char, 0)
        
        # Bonus for vowels in the middle of words
        for i in range(1, len(word)-1):
            if word_upper[i] in vowels:
                score += 2
        
        # Penalty for words with too many repeated letters
        unique_letters = set(word_upper)
        if len(unique_letters) < len(word)/2:
            score -= 3
            
        # Bonus for words starting with rare letters (but not too much)
        first_char = word[0].upper()
        rare_bonus = max(1, 10 - self.LETTER_FREQUENCY.get(first_char, 5) * 0.5)
        score += int(rare_bonus)
        
        # Ensure score is always positive
        return max(1, score)
        
    def _extract_clue(self, word_data: Dict) -> str:
        """Extract a clue from the word data"""
        # Try to get a clue from the meanings
        if 'meanings' in word_data and word_data['meanings']:
            first_meaning = word_data['meanings'][0]
            if 'def' in first_meaning:
                return first_meaning['def']
        
        # Fallback to the word itself
        return f"Definition related to {word_data.get('word', 'unknown')}"
    
    def _extract_definition(self, word_data: Dict) -> str:
        """Extract a full definition from the word data"""
        if 'meanings' in word_data:
            definitions = []
            for meaning in word_data['meanings']:
                if 'def' in meaning:
                    definitions.append(meaning['def'])
            return "; ".join(definitions)
        
        return f"Definition related to {word_data.get('word', 'unknown')}"
        
    def get_word_count_by_length(self, length: int) -> int:
        """Get the count of words of a specific length"""
        return self.word_count_by_length.get(length, 0)
        
    def get_words_by_length(self, length: int, max_words: int = None) -> List[Dict]:
        """Get words of a specific length with optional limit"""
        words = self.words_by_length.get(length, [])
        
        # Ensure diverse selection by first letter
        if max_words and len(words) > max_words:
            # Group by first letter
            by_first_letter = defaultdict(list)
            for word in words:
                by_first_letter[word['word'][0]].append(word)
            
            # Calculate how many words to take from each letter group
            total_letters = len(by_first_letter)
            words_per_letter = max(1, max_words // total_letters)
            
            # Select words from each group
            selected_words = []
            for letter, letter_words in by_first_letter.items():
                # Sort by score and take the best ones
                letter_words.sort(key=lambda x: x['score'], reverse=True)
                selected_words.extend(letter_words[:words_per_letter])
            
            # If we need more words, add the highest scoring ones regardless of letter
            if len(selected_words) < max_words:
                remaining = max_words - len(selected_words)
                all_words_sorted = sorted(words, key=lambda x: x['score'], reverse=True)
                for word in all_words_sorted:
                    if word not in selected_words:
                        selected_words.append(word)
                        remaining -= 1
                        if remaining <= 0:
                            break
            
            return selected_words[:max_words]
        
        return words
        
    def get_words_by_first_letter(self, letter: str, max_words: int = None) -> List[Dict]:
        """Get words starting with a specific letter with optional limit"""
        words = self.words_by_first_letter.get(letter.upper(), [])
        return words[:max_words] if max_words else words
        
    def find_word_by_exact_clue(self, clue: str) -> Optional[Dict]:
        """Find a word by exact clue match"""
        for word_data in self.all_words:
            if word_data['clue'].lower() == clue.lower():
                return word_data
        return None
        
    def get_possible_words(self, clue: str, max_words: int = 50, 
                          length_range: tuple = None) -> List[Dict]:
        """Get possible words for a clue with optional length constraint"""
        results = []
        clue_lower = clue.lower()
        
        # First try exact clue match
        exact_match = self.find_word_by_exact_clue(clue)
        if exact_match:
            results.append(exact_match)
        
        # Then try partial matches
        for word_data in self.all_words:
            if clue_lower in word_data['clue'].lower():
                # Check length constraint if provided
                if length_range:
                    word_len = len(word_data['word'])
                    if word_len < length_range[0] or word_len > length_range[1]:
                        continue
                
                results.append(word_data)
                if len(results) >= max_words:
                    break
        
        return results
        
    def get_words_by_pattern(self, pattern: str, clue: str = None, 
                           max_words: int = 50) -> List[Dict]:
        """Get words matching a pattern (e.g., ".A..E" for 5-letter words with A and E)"""
        results = []
        pattern_len = len(pattern)
        
        # Get words of the right length
        candidate_words = self.words_by_length.get(pattern_len, [])
        
        for word_data in candidate_words:
            word = word_data['word'].upper()
            matches = True
            
            # Check if word matches pattern
            for i, char in enumerate(pattern):
                if char != '.' and char != word[i]:
                    matches = False
                    break
            
            if matches:
                # Additional clue filtering if provided
                if clue and clue.lower() not in word_data['clue'].lower():
                    continue
                    
                results.append(word_data)
                if len(results) >= max_words:
                    break
        
        return results
        
    def get_clue_for_word(self, word: str) -> Dict:
        """Get clue for a specific word"""
        word_upper = word.upper()
        return self.word_to_data.get(word_upper, {
            'word': word_upper, 
            'clue': f"Definition related to {word_upper}",
            'score': self._calculate_word_score(word_upper)
        })
        
    def get_random_word(self, length: int = None, max_words: int = None) -> Dict:
        """Get a random word, optionally of specific length"""
        if length:
            words = self.words_by_length.get(length, [])
            if max_words:
                words = words[:max_words]
            return random.choice(words) if words else None
        else:
            words = self.all_words
            if max_words:
                words = words[:max_words]
            return random.choice(words) if words else None
            
    def get_words_with_common_letters(self, letters: str, max_words: int = 20) -> List[Dict]:
        """Get words that contain the specified letters"""
        results = []
        letters_set = set(letters.upper())
        
        for word_data in self.all_words:
            word_letters = set(word_data['word'].upper())
            if letters_set.issubset(word_letters):
                results.append(word_data)
                if len(results) >= max_words:
                    break
        
        return results