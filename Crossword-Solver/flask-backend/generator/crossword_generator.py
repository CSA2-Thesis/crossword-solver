# import logging
from collections import defaultdict
import random
import string
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from dictionary_helper import DictionaryHelper

# logging.basicConfig(
#     level=logging.DEBUG,
#     format='%(asctime)s - %(levelname)s - %(message)s',
#     handlers=[
#         logging.FileHandler('crossword_generator.log'),
#         logging.StreamHandler()
#     ]
# )

dict_helper = DictionaryHelper("dictionary")

@dataclass
class Point:
    x: int
    y: int

@dataclass
class WordSlot:
    x: int
    y: int
    length: int
    direction: str
    number: int = 0
    word: str = ""
    clue: str = ""
        
class CrosswordGenerator:
    def __init__(self, width=15, height=15, grid=None, words=None):
        self.width = width
        self.height = height
        self.grid = grid or [['.' for _ in range(width)] for _ in range(height)]
        self.empty_grid = [row.copy() for row in self.grid]
        self.words = set(words) if words else set()
        self.word_cache = {}
        self.word_scores = {}

    def get_optimized_word_list(self, max_length):
        lengths = sorted({
            max_length,
            max(3, max_length - 2),
            min(12, max_length + 2),
            max(3, int(max_length * 0.7)),
            min(12, int(max_length * 1.3))
        })
        
        words = []
        for length in lengths:
            words.extend(dict_helper.get_words_by_length(length, 30))
        
        scored_words = []
        for word_dict in words:
            word = word_dict['word']
            score = self._calculate_word_placement_score(word)
            
            first_char = word[0].lower()
            if first_char in {'q', 'z', 'x', 'j', 'k', 'v'}:
                score += 5
            
            scored_words.append({
                'word': word,
                'definition': word_dict['definition'],
                'score': score,
                'length': len(word)
            })
        
        scored_words.sort(key=lambda x: (-x['score'], random.random()))
        return scored_words

    def _calculate_word_placement_score(self, word):
        if word in self.word_scores:
            return self.word_scores[word]
        
        score = 0
        vowels = {'A', 'E', 'I', 'O', 'U'}
        word_upper = word.upper()
        
        for char in word_upper:
            score += dict_helper.LETTER_SCORES.get(char, 0)
        
        for i in range(1, len(word)-1):
            if word_upper[i] in vowels:
                score += 2
        
        unique_letters = set(word_upper)
        if len(unique_letters) < len(word)/2:
            score -= 3
        
        self.word_scores[word] = score
        return score

    def generate(self, initial_word=None, word_list=None, max_attempts=10):
        best_puzzle = None
        
        if word_list is None:
            word_list = self.get_optimized_word_list(self.width)
        elif not word_list:
            return None
            
        for attempt in range(max_attempts):
            if not word_list:
                word_list = self.get_optimized_word_list(self.width)
                
            if initial_word is None:
                initial_word = self._select_initial_word(word_list)
                
            puzzles = []
            for vertical in [False, True]:
                puzzle = self._place_initial_word(initial_word, vertical)
                if puzzle:
                    final_puzzle = self._generate_and_finalize(puzzle, word_list)
                    if final_puzzle and len(final_puzzle.words) > 1:
                        puzzles.append(final_puzzle)
            
            if puzzles:
                current_best = max(puzzles, key=lambda p: len(p.words))
                if not best_puzzle or len(current_best.words) > len(best_puzzle.words):
                    best_puzzle = current_best
            
            if word_list:
                initial_word_dict = max(
                    word_list, 
                    key=lambda w: w['score'] + (5 if w['word'][0].lower() in {'q','z','x','j','k','v'} else 0)
                )
                initial_word = initial_word_dict['word']
            else:
                break
        
        if best_puzzle:
            for y in range(self.height):
                for x in range(self.width):
                    if best_puzzle.empty_grid[y][x] == ' ':
                        best_puzzle.empty_grid[y][x] = '.'
            return best_puzzle
        return None

    def _select_initial_word(self, word_list):
        """Select a better initial word considering diversity"""
        if not word_list:
            return None
            
        letter_groups = defaultdict(list)
        for word_dict in word_list:
            first_char = word_dict['word'][0].lower()
            letter_groups[first_char].append(word_dict)
        
        viable_letters = [c for c in letter_groups if len(letter_groups[c]) >= 3]
        
        if not viable_letters:
            return random.choice(word_list)['word']
        
        weights = {
            'a': 10, 'b': 7, 'c': 9, 'd': 8, 'e': 9, 'f': 7,
            'g': 7, 'h': 8, 'i': 7, 'j': 5, 'k': 6, 'l': 8,
            'm': 7, 'n': 8, 'o': 7, 'p': 8, 'q': 5, 'r': 8,
            's': 9, 't': 9, 'u': 7, 'v': 6, 'w': 7, 'x': 5,
            'y': 6, 'z': 5
        }
        
        selected_letter = random.choices(
            viable_letters,
            weights=[weights.get(c, 5) for c in viable_letters],
            k=1
        )[0]
        
        return max(letter_groups[selected_letter], key=lambda w: w['score'])['word']

    def _calculate_placement_potential(self, puzzle, x, y, vertical, word):
        potential = 0
        
        if vertical:
            for i in range(len(word)):
                curr_x, curr_y = x, y + i
                if (curr_x > 0 and puzzle.grid[curr_y][curr_x-1] == '.') or \
                   (curr_x < self.width-1 and puzzle.grid[curr_y][curr_x+1] == '.'):
                    potential += 1
        else:
            for i in range(len(word)):
                curr_x, curr_y = x + i, y
                if (curr_y > 0 and puzzle.grid[curr_y-1][curr_x] == '.') or \
                   (curr_y < self.height-1 and puzzle.grid[curr_y+1][curr_x] == '.'):
                    potential += 1
        
        center_x, center_y = self.width // 2, self.height // 2
        distance = abs(x - center_x) + abs(y - center_y)
        potential += max(0, 10 - distance) // 2
        
        connections = sum(
            1 for char in word 
            if char in {c for row in puzzle.grid for c in row if c != '.'}
        )
        potential += connections * 2
        
        return potential

    def _generate_and_finalize(self, puzzle, word_list, max_attempts=100):
        # logging.debug(f"Finalizing puzzle with {len(puzzle.words)} words")
        base_puzzle = puzzle
        final_puzzle = self._generate(base_puzzle, word_list, max_attempts)
        
        iteration = 0
        while len(final_puzzle.words) > len(base_puzzle.words):
            iteration += 1
            # logging.debug(f"Expansion iteration {iteration}: {len(final_puzzle.words)} words")
            base_puzzle = final_puzzle
            final_puzzle = self._generate(base_puzzle, word_list, max_attempts)
            if iteration > 50:  # Safety check
                # logging.warning("Breaking expansion loop after 50 iterations")
                break
        
        # logging.debug(f"Finalized with {len(final_puzzle.words)} words")
        return final_puzzle

    def _get_best_word_placements(self, puzzle, word_dict):
        """Get placements with scoring based on potential future words"""
        word = word_dict['word']
        options = []
        
        for i, char in enumerate(word):
            for y in range(self.height):
                for x in range(self.width):
                    if puzzle.grid[y][x] == char:
                        h_fits = self._fits(puzzle, word, False, x-i, y)
                        if h_fits:
                            new_puzzle = self._copy_with_word(puzzle, x-i, y, False, word)
                            potential = self._calculate_placement_potential(new_puzzle, x-i, y, False, word)
                            options.append({
                                'puzzle': new_puzzle,
                                'potential': potential + word_dict['score']
                            })
                        
                        v_fits = self._fits(puzzle, word, True, x, y-i)
                        if v_fits:
                            new_puzzle = self._copy_with_word(puzzle, x, y-i, True, word)
                            potential = self._calculate_placement_potential(new_puzzle, x, y-i, True, word)
                            options.append({
                                'puzzle': new_puzzle,
                                'potential': potential + word_dict['score']
                            })
        
        return options

    def _generate(self, puzzle, word_list, max_attempts=100):
        tried_words = []
        current_puzzle = puzzle
        
        for attempt in range(max_attempts):
            if not word_list and not tried_words:
                break
                
            if not word_list:
                word_list, tried_words = tried_words, []
                
            word_dict = word_list.pop(0)
            word_str = word_dict['word']
            
            if word_str in current_puzzle.words:
                continue
                
            options = self._get_best_word_placements(current_puzzle, word_dict)
            if options:
                best_option = max(options, key=lambda opt: opt['potential'])
                current_puzzle = best_option['puzzle']
                tried_words = []
            else:
                tried_words.append(word_dict)
        
        return current_puzzle

    def _add_word(self, puzzle, word_dict):
        options = []
        word = word_dict['word']
        # logging.debug(f"Finding placements for {word} (len {len(word)})")
        
        for i, char in enumerate(word):
            for y in range(self.height):
                for x in range(self.width):
                    if puzzle.grid[y][x] == char:
                        # logging.debug(f"Match at ({x},{y}) for char {char}")
                        
                        # Try horizontal placement
                        h_fits = self._fits(puzzle, word, False, x-i, y)
                        if h_fits:
                            # logging.debug(f"Horizontal fit at ({x-i},{y})")
                            new_puzzle = self._copy_with_word(puzzle, x-i, y, False, word)
                            options.append(new_puzzle)
                        
                        # Try vertical placement
                        v_fits = self._fits(puzzle, word, True, x, y-i)
                        if v_fits:
                            # logging.debug(f"Vertical fit at ({x},{y-i})")
                            new_puzzle = self._copy_with_word(puzzle, x, y-i, True, word)
                            options.append(new_puzzle)
        
        # logging.debug(f"Total options found for {word}: {len(options)}")
        return options
    
    def _fits(self, puzzle, word, vertical, x, y):
        """Check if word fits at position, allowing proper intersections"""
        # logging.debug(f"Checking fit for {word} at ({x},{y}) {'vertical' if vertical else 'horizontal'}")
        
        connect = False
        for i in range(len(word)):
            if vertical:
                loc_x, loc_y = x, y + i
            else:
                loc_x, loc_y = x + i, y
                
            if loc_x < 0 or loc_x >= self.width or loc_y < 0 or loc_y >= self.height:
                # logging.debug(f"Out of bounds at ({loc_x},{loc_y})")
                return False
                
            existing_char = puzzle.grid[loc_y][loc_x]
            # logging.debug(f"Checking ({loc_x},{loc_y}): existing '{existing_char}' vs word char '{word[i]}'")
            
            if existing_char != '.':
                if existing_char == word[i]:
                    connect = True
                    # logging.debug(f"Valid intersection at ({loc_x},{loc_y})")
                    continue  # Skip adjacent checks for intersection points
                else:
                    # logging.debug(f"Character conflict at ({loc_x},{loc_y})")
                    return False
                    
            if vertical:
                if (loc_x > 0 and puzzle.grid[loc_y][loc_x-1] != '.') or \
                (loc_x < self.width-1 and puzzle.grid[loc_y][loc_x+1] != '.'):
                    # logging.debug(f"Vertical adjacent conflict at ({loc_x},{loc_y})")
                    return False
            else:
                if (loc_y > 0 and puzzle.grid[loc_y-1][loc_x] != '.') or \
                (loc_y < self.height-1 and puzzle.grid[loc_y+1][loc_x] != '.'):
                    # logging.debug(f"Horizontal adjacent conflict at ({loc_x},{loc_y})")
                    return False
                        
        if not connect:
            # logging.debug("No connection to existing words")
            return False
        if vertical:
            if (y > 0 and puzzle.grid[y-1][x] != '.') or \
            (y + len(word) < self.height and puzzle.grid[y + len(word)][x] != '.'):
                # logging.debug("Vertical end conflict")
                return False
        else:
            if (x > 0 and puzzle.grid[y][x-1] != '.') or \
            (x + len(word) < self.width and puzzle.grid[y][x + len(word)] != '.'):
                # logging.debug("Horizontal end conflict")
                return False
                
        # logging.debug("Word fits successfully")
        return True
    
    def _copy_with_word(self, puzzle, x, y, vertical, word):
        new_grid = [row.copy() for row in puzzle.grid]
        new_empty_grid = [row.copy() for row in puzzle.empty_grid]
        
        if vertical:
            for i, char in enumerate(word):
                new_grid[y + i][x] = char
                if new_empty_grid[y + i][x] == '.':
                    new_empty_grid[y + i][x] = '.' 
        else:
            for i, char in enumerate(word):
                new_grid[y][x + i] = char
                if new_empty_grid[y][x + i] == '.':
                    new_empty_grid[y][x + i] = '.'
        
        new_words = set(puzzle.words)
        new_words.add(word if isinstance(word, str) else word['word'])

        new_puzzle = CrosswordGenerator(
            width=self.width,
            height=self.height,
            grid=new_grid,
            words=new_words
        )
        new_puzzle.empty_grid = new_empty_grid
        return new_puzzle
    
    def _place_initial_word(self, word, vertical):
        if vertical:
            x = self.width // 2
            y = (self.height - len(word)) // 2
            if y < 0:
                return None
            new_grid = [row.copy() for row in self.grid]
            for i, char in enumerate(word):
                new_grid[y + i][x] = char
        else:
            x = (self.width - len(word)) // 2
            y = self.height // 2
            if x < 0:
                return None
            new_grid = [row.copy() for row in self.grid]
            for i, char in enumerate(word):
                new_grid[y][x + i] = char

        new_words = {word}
        
        new_empty_grid = [['.' for _ in range(self.width)] for _ in range(self.height)]
        
        return CrosswordGenerator(
            width=self.width,
            height=self.height,
            grid=new_grid,
            words=new_words
        )
    
    def analyze_grid(self, for_empty_grid=False) -> Tuple[List[WordSlot], List[WordSlot]]:
        """Analyze grid and return across/down word slots"""
        grid_to_use = self.empty_grid if for_empty_grid else self.grid
        numbered_cells = {}
        number = 1
        across = []
        down = []
        
        for y in range(self.height):
            for x in range(self.width):
                if grid_to_use[y][x] == '.':
                    continue
                    
                is_across = (x == 0 or grid_to_use[y][x-1] == '.') and (x < self.width-1 and grid_to_use[y][x+1] != '.')
                is_down = (y == 0 or grid_to_use[y-1][x] == '.') and (y < self.height-1 and grid_to_use[y+1][x] != '.')
                
                if is_across or is_down:
                    if (x, y) not in numbered_cells:
                        numbered_cells[(x, y)] = number
                        number += 1
        
        for (x, y), num in numbered_cells.items():
            if x == 0 or self.grid[y][x-1] == '.':
                length = 0
                while x + length < self.width and self.grid[y][x+length] != '.':
                    length += 1
                if length > 1:
                    word = ''.join(self.grid[y][x+i] for i in range(length))
                    clue_data = dict_helper.get_clue_for_word(word)
                    clue = clue_data.get('clue', f"Definition related to {word}")
                    across.append(WordSlot(
                        x=x, y=y, length=length, direction='across',
                        number=num, word=word, clue=clue
                    ))
            
            if y == 0 or self.grid[y-1][x] == '.':
                length = 0
                while y + length < self.height and self.grid[y+length][x] != '.':
                    length += 1
                if length > 1:
                    word = ''.join(self.grid[y+i][x] for i in range(length))
                    clue_data = dict_helper.get_clue_for_word(word)
                    clue = clue_data.get('clue', f"Definition related to {word}")
                    down.append(WordSlot(
                        x=x, y=y, length=length, direction='down',
                        number=num, word=word, clue=clue
                    ))
        
        return across, down
    
    def get_clues(self) -> Dict[str, List[Dict]]:
        across_slots, down_slots = self.analyze_grid()
        
        def format_slot(slot):
            clue_data = dict_helper.get_clue_for_word(slot.word)
            return {
                "number": slot.number,
                "clue": clue_data['clue'],
                "answer": slot.word,
                "x": slot.x,
                "y": slot.y,
                "length": len(slot.word)
            }
        
        return {
            "across": [format_slot(slot) for slot in sorted(across_slots, key=lambda s: s.number)],
            "down": [format_slot(slot) for slot in sorted(down_slots, key=lambda s: s.number)]
        }
    
    def calculate_density(self):
        filled = 0
        for row in self.grid:
            filled += sum(1 for cell in row if cell != '.')
        return filled / (self.width * self.height)

    def get_intersection_points(self):
        intersections = []
        for y in range(self.height):
            for x in range(self.width):
                if self.grid[y][x] != '.':
                    horizontal = False
                    vertical = False
                    
                    if (x > 0 and self.grid[y][x-1] != '.') or \
                       (x < self.width-1 and self.grid[y][x+1] != '.'):
                        horizontal = True
                    
                    if (y > 0 and self.grid[y-1][x] != '.') or \
                       (y < self.height-1 and self.grid[y+1][x] != '.'):
                        vertical = True
                    
                    if horizontal and vertical:
                        intersections.append(Point(x, y))
        return intersections
