import difflib
import json
import os
import logging
import random
from typing import List, Dict, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)

class DictionaryHelper:
    LETTER_SCORES = {
        'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
        'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
        'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
    }
    
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
        self.word_to_data = {}
        self._load_dictionary()
        
    def _load_dictionary(self):
        logger.info("Loading dictionary...")
        
        for filename in os.listdir(self.dictionary_path):
            if filename.endswith('.json'):
                file_path = os.path.join(self.dictionary_path, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        
                        for word_key, word_data in data.items():
                            word = word_data.get('word', word_key).upper()
                            
                            if ' ' in word or not self._is_valid_crossword_word(word):
                                continue
                                
                            length = len(word)
                            
                            standardized_data = {
                                'word': word,
                                'clue': self._extract_clue(word_data),
                                'definition': self._extract_definition(word_data),
                                'length': length,
                                'score': self._calculate_word_score(word)
                            }
                            
                            self.words_by_length[length].append(standardized_data)
                            if word:
                                self.words_by_first_letter[word[0]].append(standardized_data)
                            self.word_count_by_length[length] += 1
                            self.all_words.append(standardized_data)
                            self.word_to_data[word] = standardized_data
                            
                except Exception as e:
                    logger.error(f"Error loading dictionary file {filename}: {e}")
        
        logger.info(f"Dictionary loaded: {len(self.all_words)} valid crossword words")
        
    def _is_valid_crossword_word(self, word: str) -> bool:
        if not word.isalpha():
            return False
            
        if len(word) < 2 or len(word) > 15:
            return False
            
        return True
        
    def _calculate_word_score(self, word: str) -> int:
        score = 0
        vowels = {'A', 'E', 'I', 'O', 'U'}
        word_upper = word.upper()
        
        for char in word_upper:
            score += self.LETTER_SCORES.get(char, 0)
        
        for i in range(1, len(word)-1):
            if word_upper[i] in vowels:
                score += 2
        
        unique_letters = set(word_upper)
        if len(unique_letters) < len(word)/2:
            score -= 3
            
        first_char = word[0].upper()
        rare_bonus = max(1, 10 - self.LETTER_FREQUENCY.get(first_char, 5) * 0.5)
        score += int(rare_bonus)
        
        return max(1, score)
        
    def _extract_clue(self, word_data: Dict) -> str:
        if 'meanings' in word_data and word_data['meanings']:
            first_meaning = word_data['meanings'][0]
            if 'def' in first_meaning:
                return first_meaning['def']
        
        return f"Definition related to {word_data.get('word', 'unknown')}"
    
    def _extract_definition(self, word_data: Dict) -> str:
        if 'meanings' in word_data:
            definitions = []
            for meaning in word_data['meanings']:
                if 'def' in meaning:
                    definitions.append(meaning['def'])
            return "; ".join(definitions)
        
        return f"Definition related to {word_data.get('word', 'unknown')}"
        
    def get_word_count_by_length(self, length: int) -> int:
        return self.word_count_by_length.get(length, 0)
        
    def get_words_by_length(self, length: int, max_words: int = None) -> List[Dict]:
        words = self.words_by_length.get(length, [])
        
        if max_words and len(words) > max_words:
            by_first_letter = defaultdict(list)
            for word in words:
                by_first_letter[word['word'][0]].append(word)
            
            total_letters = len(by_first_letter)
            words_per_letter = max(1, max_words // total_letters)
            
            selected_words = []
            for letter, letter_words in by_first_letter.items():
                letter_words.sort(key=lambda x: x['score'], reverse=True)
                selected_words.extend(letter_words[:words_per_letter])
            
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
        words = self.words_by_first_letter.get(letter.upper(), [])
        return words[:max_words] if max_words else words
        
    def find_word_by_exact_clue(self, clue: str) -> Optional[Dict]:
        for word_data in self.all_words:
            if word_data['clue'].lower() == clue.lower():
                return word_data
        return None
        
    def get_possible_words(self, clue: str, max_words: int = 50, 
                          length_range: tuple = None) -> List[Dict]:
        results = []
        clue_lower = clue.lower()
        
        exact_match = self.find_word_by_exact_clue(clue)
        if exact_match:
            results.append(exact_match)
        
        for word_data in self.all_words:
            if clue_lower in word_data['clue'].lower():
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
        results = []
        pattern_len = len(pattern)
        
        candidate_words = self.words_by_length.get(pattern_len, [])
        
        for word_data in candidate_words:
            word = word_data['word'].upper()
            matches = True
            
            for i, char in enumerate(pattern):
                if char != '.' and char != word[i]:
                    matches = False
                    break
            
            if matches:
                if clue and clue.lower() not in word_data['clue'].lower():
                    continue
                    
                results.append(word_data)
                if len(results) >= max_words:
                    break
        
        return results
        
    def get_clue_for_word(self, word: str) -> Dict:
        word_upper = word.upper()
        return self.word_to_data.get(word_upper, {
            'word': word_upper, 
            'clue': f"Definition related to {word_upper}",
            'score': self._calculate_word_score(word_upper)
        })
        
    def get_random_word(self, length: int = None, max_words: int = None) -> Dict:
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
        results = []
        letters_set = set(letters.upper())
        
        for word_data in self.all_words:
            word_letters = set(word_data['word'].upper())
            if letters_set.issubset(word_letters):
                results.append(word_data)
                if len(results) >= max_words:
                    break
        
        return results
    
    def get_alternative_spellings(self, clue: str, length: int, max_words: int = 20) -> List[Dict]:

        clue_lower = clue.lower()
        results = []

        for word_data in self.all_words:
            if abs(len(word_data['word']) - length) > 1:
                continue

            similarity = difflib.SequenceMatcher(None, clue_lower, word_data['clue'].lower()).ratio()
            if similarity > 0.6:
                results.append(word_data)
                if len(results) >= max_words:
                    break

        if not results:
            for word_data in self.all_words:
                if str(length) == str(len(word_data['word'])) and clue_lower.split(" ")[0] in word_data['clue'].lower():
                    results.append(word_data)
                    if len(results) >= max_words:
                        break

        if not results:
            logger.debug(f"[Fallback] No fuzzy matches for '{clue}', using random words.")
            results = self.get_words_by_length(length, max_words=max_words)

        return results