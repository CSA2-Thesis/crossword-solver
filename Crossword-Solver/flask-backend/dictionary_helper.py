import json
import os
import random
import re
from collections import defaultdict
from typing import List, Dict, Optional, Tuple
import string

LETTER_SCORES = {
    'E': 13, 'T': 12, 'A': 11, 'O': 10, 'I': 9, 'N': 8,
    'S': 7, 'H': 6, 'R': 5, 'D': 4, 'L': 3, 'C': 2,
    'U': 1, 'M': 1, 'W': 1, 'F': 1, 'G': 1, 'Y': 1,
    'P': 1, 'B': 1, 'V': 1, 'K': 1, 'J': 1, 'X': 1,
    'Q': 1, 'Z': 1
}

BLACKLIST_WORDS = {
    'a', 'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 
    'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their',
    'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were',
    'be', 'being', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can',
    'could', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'as', 'at',
    'by', 'in', 'of', 'on', 'to', 'with', 'from', 'into', 'about', 'over',
    'anal'
}

class DictionaryHelper:
    def __init__(self, dictionary_path: str = "Dictionary"):
        """Initialize the dictionary helper with the path to the JSON files"""
        self.dictionary_path = os.path.abspath(dictionary_path)  # Store the absolute path
        self.dictionary = {}
        self.word_length_index = defaultdict(list)
        self.letter_index = defaultdict(list)
        self.load_dictionary(self.dictionary_path)  # Pass the stored path
        
    def load_dictionary(self, directory: str):
        """Load all JSON dictionary files from the specified directory"""
        for letter in string.ascii_lowercase:
            file_path = os.path.join(directory, f"{letter}.json")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for word, entry in data.items():
                        # Skip words that are exactly two letters (too short)
                        if len(word) <= 2:
                            continue
                            
                        # Skip words with apostrophes or other non-alphabetic characters
                        if not word.isalpha():
                            continue
                            
                        # Skip blacklisted words
                        if word.lower() in BLACKLIST_WORDS:
                            continue
                            
                        # Store the word in our dictionary
                        self.dictionary[word.lower()] = entry
                        
                        # Index by word length
                        self.word_length_index[len(word)].append(word.lower())
                        
                        # Index by first letter
                        first_char = word[0].lower()
                        self.letter_index[first_char].append(word.lower())
            except FileNotFoundError:
                print(f"Warning: Dictionary file not found for letter {letter}")
            except json.JSONDecodeError:
                print(f"Error: Could not parse JSON file for letter {letter}")
    
    def _is_valid_word(self, word: str, length_range: Tuple[int, int] = (3, 12)) -> bool:
        """Check if a word meets our criteria"""
        min_len, max_len = length_range
        return (word.isalpha() and 
                min_len <= len(word) <= max_len and 
                word == word.lower() and
                not word.endswith('s') and
                word in self.dictionary)
    
    def get_best_starting_letter(self, existing_words: List[str] = []) -> str:
        if not existing_words:
            letter_weights = {
                'a': 10, 'b': 5, 'c': 8, 'd': 7, 'e': 9, 'f': 5,
                'g': 6, 'h': 7, 'i': 7, 'j': 3, 'k': 4, 'l': 8,
                'm': 6, 'n': 8, 'o': 7, 'p': 7, 'q': 2, 'r': 8,
                's': 9, 't': 9, 'u': 5, 'v': 4, 'w': 5, 'x': 2,
                'y': 4, 'z': 2
            }
            letters = list(letter_weights.keys())
            weights = list(letter_weights.values())
            return random.choices(letters, weights=weights, k=1)[0]
        
        letter_counts = defaultdict(int)
        for word in existing_words:
            for letter in word.lower():
                if letter.isalpha():
                    letter_counts[letter] += 1
        
        connection_scores = defaultdict(int)
        for letter in string.ascii_lowercase:
            if letter not in self.letter_index:
                continue
                
            for word in self.letter_index[letter]:
                unique_letters = set(word)
                for l in unique_letters:
                    connection_scores[letter] += letter_counts.get(l, 0)
        
        if not connection_scores:
            return random.choice(['e', 's', 't', 'a', 'r']) 
        
        top_letters = sorted(connection_scores.items(), key=lambda x: -x[1])[:3]
        return random.choice(top_letters)[0]

    def _word_score(self, word: str) -> int:
        """Calculate a score for the word based on letter frequency, with less penalty for uncommon letters"""
        score = sum(LETTER_SCORES.get(c.upper(), 0) for c in word)
        
        obscure_letters = {'q', 'z', 'x', 'j', 'k', 'v'}
        unique_letters = set(word.lower())
        score -= len(unique_letters & obscure_letters)
        
        return max(1, score)
    
    def get_possible_words(self, clue: str = "", max_words: int = 100, length_range: Tuple[int, int] = (3, 12)) -> List[Dict]:
        """Get possible words that match the clue and length requirements.
        
        Args:
            clue: The clue/definition to match words against
            max_words: Maximum number of words to return
            length_range: Tuple of (min_length, max_length) for words
            
        Returns:
            List of dictionaries containing word, definition, and relevance score
        """
        def score_word_definition(word: str, meaning: Dict, clue_words: List[str]) -> int:
            """Calculate relevance score between word meaning and clue words."""
            definition = meaning['def'].lower()
            example = meaning.get('example', '').lower()
            
            # Calculate base relevance from definition matches
            relevance = sum(
                10 for cw in clue_words 
                if cw in definition
            )
            
            # Bonus for example matches
            if example:
                relevance += sum(
                    5 for cw in clue_words
                    if cw in example
                )
            
            # Bonus for noun meanings
            if meaning.get('speech_part') == 'noun':
                relevance += 2
                
            return relevance

        def get_fallback_words() -> List[Dict]:
            """Get fallback words when no matches are found."""
            fallback_list = [
                {'word': 'AGILE', 'definition': 'moving quickly and lightly', 'relevance_score': 10},
                {'word': 'APT', 'definition': 'at risk of or subject to experiencing something usually unpleasant', 'relevance_score': 10},
                {'word': 'IRA', 'definition': 'Irish Republican Army or Individual Retirement Account', 'relevance_score': 10},
                {'word': 'REAL', 'definition': 'actually existing as a thing or occurring in fact', 'relevance_score': 10},
                {'word': 'ACTIVE', 'definition': 'engaged in or ready for action', 'relevance_score': 10},
                {'word': 'EASY', 'definition': 'posing no difficulty', 'relevance_score': 10},
                {'word': 'WAN', 'definition': '(of light) lacking in intensity or brightness', 'relevance_score': 10},
                {'word': 'ABLE', 'definition': 'having the necessary means or skill', 'relevance_score': 10},
                {'word': 'PYTHON', 'definition': 'a large snake or programming language', 'relevance_score': 10},
                {'word': 'JAVA', 'definition': 'coffee or programming language', 'relevance_score': 10},
            ]
            return [
                w for w in fallback_list 
                if length_range[0] <= len(w['word']) <= length_range[1]
            ][:max_words]

        try:
            # Handle case when no clue is provided
            if not clue:
                words = []
                for length in range(length_range[0], length_range[1] + 1):
                    if length in self.word_length_index:
                        for word in self.word_length_index[length]:
                            entry = self.dictionary[word]
                            score = self._word_score(word)
                            if any(m['speech_part'] == 'noun' for m in entry['meanings']):
                                score += 2
                            words.append({
                                'word': word.upper(),
                                'definition': entry['meanings'][0]['def'][:200] if entry['meanings'] else "",
                                'relevance_score': score
                            })
                words.sort(key=lambda w: -w['relevance_score'])
                return words[:max_words]

            # Process clue and find matching words
            normalized_clue = re.sub(r'[^\w\s]', '', clue.lower())
            clue_words = {
                w for w in normalized_clue.split() 
                if w not in BLACKLIST_WORDS and len(w) > 1
            }
            
            if not clue_words:
                return get_fallback_words()

            # Find all potential matches across word lengths
            matches = []
            for length in range(length_range[0], length_range[1] + 1):
                if length not in self.word_length_index:
                    continue
                    
                for word in self.word_length_index[length]:
                    entry = self.dictionary[word]
                    for meaning in entry['meanings']:
                        score = score_word_definition(word, meaning, clue_words)
                        if score > 0:
                            matches.append({
                                'word': word.upper(),
                                'definition': meaning['def'][:200],
                                'relevance_score': score,
                                'speech_part': meaning['speech_part']
                            })

            # Deduplicate and select best matches
            best_matches = {}
            for match in matches:
                word = match['word']
                if word not in best_matches or match['relevance_score'] > best_matches[word]['relevance_score']:
                    best_matches[word] = match

            results = sorted(
                best_matches.values(), 
                key=lambda x: -x['relevance_score']
            )[:max_words]

            # Add fallback words if we don't have enough matches
            if len(results) < max(5, max_words // 2):
                fallback = self.get_possible_words("", max_words, length_range)
                results.extend(fallback[:max_words - len(results)])
                results = sorted(results, key=lambda x: -x.get('relevance_score', 0))[:max_words]

            return results

        except Exception as e:
            print(f"Error in get_possible_words: {str(e)}")
            return get_fallback_words()
    
    def get_clue_for_word(self, word: str) -> Dict[str, str]:
        """Get a clue/definition for a given word with exact matching from JSON files."""
        if not word:
            return {"word": "", "clue": ""}
        
        word_lower = word.lower()
        
        # First try exact match in our preloaded dictionary
        if word_lower in self.dictionary:
            entry = self.dictionary[word_lower]
            return {
                "word": word.upper(),
                "clue": entry['meanings'][0]['def'][:200]
            }
        
        # If not found, try direct JSON file lookup
        first_char = word_lower[0] if word_lower else 'a'
        json_file = f"{first_char}.json"
        json_path = os.path.join(self.dictionary_path, json_file)
        
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if word_lower in data:
                    entry = data[word_lower]
                    return {
                        "word": word.upper(),
                        "clue": entry['meanings'][0]['def'][:200]
                    }
        except (FileNotFoundError, json.JSONDecodeError, KeyError):
            pass
        
        # Fallback to first definition found
        if word_lower in self.dictionary:
            entry = self.dictionary[word_lower]
            if entry['meanings']:
                return {
                    "word": word.upper(),
                    "clue": entry['meanings'][0]['def'][:200]
                }
        
        # Final fallback
        return {
            "word": word.upper(),
            "clue": f"Definition related to {word.lower()}"
        }
    
    def find_word_by_exact_clue(self, clue: str) -> Optional[Dict]:
        if not clue:
            return None
        
        for letter in string.ascii_lowercase:
            json_file = f"{letter}.json"
            json_path = os.path.join(self.dictionary_path, json_file)
            
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for word, entry in data.items():
                        for meaning in entry.get('meanings', []):
                            if meaning['def'].lower() == clue.lower():
                                return {
                                    'word': word.upper(),
                                    'definition': meaning['def'],
                                    'speech_part': meaning.get('speech_part', '')
                                }
            except (FileNotFoundError, json.JSONDecodeError):
                continue
        
        return None

    def get_words_by_length(self, length: int, max_words: int = 50) -> List[Dict]:
        """Get words of a specific length"""
        if length not in self.word_length_index:
            return []
        
        words = []
        for word in self.word_length_index[length]:
            entry = self.dictionary[word]
            definition = entry['meanings'][0]['def'] if entry['meanings'] else ""
            
            words.append({
                'word': word.upper(),
                'definition': definition[:200],
                'score': self._word_score(word)
            })
            
            if len(words) >= max_words:
                break
        
        words.sort(key=lambda w: -w['score'])
        return words
    
    def verify_solution(self, solution_word: str, expected_word: str) -> bool:
        """Check if the solution matches the expected word"""
        if not solution_word or not expected_word:
            return False
        
        if solution_word.upper() == expected_word.upper():
            return True
        
        # Check if words are synonyms by looking at their definitions
        sol_lower = solution_word.lower()
        exp_lower = expected_word.lower()
        
        if sol_lower not in self.dictionary or exp_lower not in self.dictionary:
            return False
        
        # Get all definitions for both words
        sol_defs = set()
        for meaning in self.dictionary[sol_lower]['meanings']:
            sol_defs.add(meaning['def'].lower())
        
        exp_defs = set()
        for meaning in self.dictionary[exp_lower]['meanings']:
            exp_defs.add(meaning['def'].lower())
        
        # Check if any definitions are similar
        for sol_def in sol_defs:
            for exp_def in exp_defs:
                # Simple check for shared words in definitions
                sol_words = set(re.findall(r'\w+', sol_def))
                exp_words = set(re.findall(r'\w+', exp_def))
                if len(sol_words & exp_words) >= 2:  # At least 2 shared words
                    return True
        
        return False
    
    def get_random_word_by_letter(self, letter: str, length: int) -> Dict:
        """Get a random word starting with the specified letter and of the specified length"""
        letter = letter.lower()
        if letter not in self.letter_index:
            return None
            
        candidates = [w for w in self.letter_index[letter] if len(w) == length]
        if not candidates:
            return None
            
        word = random.choice(candidates)
        entry = self.dictionary[word]
        definition = entry['meanings'][0]['def'] if entry['meanings'] else ""
        
        return {
            'word': word.upper(),
            'definition': definition[:200]
        }