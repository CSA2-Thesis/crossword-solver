from collections import defaultdict
import random
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from dictionary_helper import DictionaryHelper

# Initialize dictionary helper for word lookup and scoring
dict_helper = DictionaryHelper("dictionary")

@dataclass
class Point:
    """Represents a coordinate point in the grid"""
    x: int
    y: int

@dataclass
class WordSlot:
    """Represents a word position in the crossword puzzle"""
    x: int
    y: int
    length: int
    direction: str
    number: int = 0  # Crossword numbering
    word: str = ""   # The actual word
    clue: str = ""   # Clue for the word
        
class CrosswordGenerator:
    def __init__(self, width=15, height=15, grid=None, words=None):
        """Initialize the crossword generator with grid dimensions and empty state"""
        self.width = width
        self.height = height
        # Main grid showing current word placements
        self.grid = grid or [['.' for _ in range(width)] for _ in range(height)]
        # Tracking of original empty state
        self.empty_grid = [row.copy() for row in self.grid]
        # Set of words already placed in the puzzle
        self.words = set(words) if words else set()
        # Cache for word data and scores
        self.word_cache = {}
        self.word_scores = {}
        # Track starting letters used for diversity
        self.used_starting_letters = set()

    def get_optimized_word_list(self, max_length):
        """
        Get a diverse set of words optimized for crossword generation
        - Filters words by appropriate lengths
        - Scores and sorts words for better puzzle quality
        - Adds randomness to avoid repetitive patterns
        """
        words = []
        # Get words of various lengths around the target max_length
        for length in range(max(3, max_length-2), min(12, max_length+2)+1):
            # Get limited number of words per length for diversity
            words.extend(dict_helper.get_words_by_length(length, 20))
        
        # Sort by score (higher scores first) with some randomness
        words.sort(key=lambda x: (-x['score'], random.random()))
        return words

    def _calculate_word_placement_score(self, word):
        """Calculate score for word placement priority"""
        return dict_helper._calculate_word_score(word)

    def generate(self, initial_word=None, word_list=None, max_attempts=10):
        """
        MAIN GENERATION ENTRY POINT
        Generate a complete crossword puzzle through multiple attempts
        Returns the best puzzle found across all attempts
        """
        best_puzzle = None
        
        # Initialize word list if not provided
        if word_list is None:
            word_list = self.get_optimized_word_list(self.width)
        elif not word_list:
            return None
            
        # Try multiple generation attempts
        for attempt in range(max_attempts):
            # Refresh word list if exhausted
            if not word_list:
                word_list = self.get_optimized_word_list(self.width)
                
            # Select initial word if not provided
            if initial_word is None:
                initial_word = self._select_initial_word(word_list)
                
            # Try both orientations for the initial word
            puzzles = []
            for vertical in [False, True]:
                puzzle = self._place_initial_word(initial_word, vertical)
                if puzzle:
                    # Expand puzzle with additional words
                    final_puzzle = self._generate_and_finalize(puzzle, word_list)
                    if final_puzzle and len(final_puzzle.words) > 1:
                        puzzles.append(final_puzzle)
            
            # Track the best puzzle found
            if puzzles:
                current_best = max(puzzles, key=lambda p: len(p.words))
                if not best_puzzle or len(current_best.words) > len(best_puzzle.words):
                    best_puzzle = current_best
            
            # Prepare for next attempt with different initial word
            if word_list:
                if initial_word:
                    self.used_starting_letters.add(initial_word[0].lower())
                
                # Select new initial word from top candidates
                initial_word_dict = random.choice(word_list[:min(10, len(word_list))])
                initial_word = initial_word_dict['word']
            else:
                break
        
        # Reset tracking for future generations
        self.used_starting_letters = set()
        
        # Final cleanup and return
        if best_puzzle:
            for y in range(self.height):
                for x in range(self.width):
                    if best_puzzle.empty_grid[y][x] == ' ':
                        best_puzzle.empty_grid[y][x] = '.'
            return best_puzzle
        return None

    def _select_initial_word(self, word_list):
        """
        Select the first word to place in the puzzle
        Prefers words with starting letters not yet used for diversity
        """
        if not word_list:
            return None
            
        # Prefer words with new starting letters
        unused_letter_words = [w for w in word_list if w['word'][0].lower() not in self.used_star0ting_letters]
        
        if unused_letter_words:
            return random.choice(unused_letter_words[:min(5, len(unused_letter_words))])['word']
        else:
            # Fallback to random selection from top candidates
            return random.choice(word_list[:10])['word']

    def _place_initial_word(self, word, vertical):
        """
        Place the first word in the center of the grid
        Returns a new puzzle instance with the initial word placed
        """
        if vertical:
            # Center vertically, checking bounds
            x = self.width // 2
            y = (self.height - len(word)) // 2
            if y < 0:  # Word too long for grid
                return None
            new_grid = [row.copy() for row in self.grid]
            for i, char in enumerate(word):
                new_grid[y + i][x] = char
        else:
            # Center horizontally, checking bounds
            x = (self.width - len(word)) // 2
            y = self.height // 2
            if x < 0:  # Word too long for grid
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

    def _generate_and_finalize(self, puzzle, word_list, max_attempts=100):
        """
        Expand the puzzle by adding words iteratively
        Continues expansion until no more words can be added
        """
        base_puzzle = puzzle
        final_puzzle = self._generate(base_puzzle, word_list, max_attempts)
        
        # Keep expanding while we're making progress
        iteration = 0
        while len(final_puzzle.words) > len(base_puzzle.words):
            iteration += 1
            base_puzzle = final_puzzle
            final_puzzle = self._generate(base_puzzle, word_list, max_attempts)
            if iteration > 50:  # Safety limit
                break
        
        return final_puzzle

    def _generate(self, puzzle, word_list, max_attempts=100):
        """
        CORE PUZZLE GENERATION ALGORITHM
        Iteratively adds words to the puzzle using best-fit approach
        Uses placement scoring to prioritize high-quality placements
        """
        tried_words = []  # Words that couldn't be placed
        current_puzzle = puzzle
        
        for attempt in range(max_attempts):
            # Exit if no words left to try
            if not word_list and not tried_words:
                break
                
            # Refresh word list from tried words if needed
            if not word_list:
                word_list, tried_words = tried_words, []
                
            # Get next word to try
            word_dict = word_list.pop(0)
            word_str = word_dict['word']
            
            # Skip if word already used
            if word_str in current_puzzle.words:
                continue
                
            # Find all possible placements for this word
            options = self._get_best_word_placements(current_puzzle, word_dict)
            if options:
                # Choose the placement with highest potential
                best_option = max(options, key=lambda opt: opt['potential'])
                current_puzzle = best_option['puzzle']
                tried_words = []  # Reset tried words on success
            else:
                # Word couldn't be placed, save for later
                tried_words.append(word_dict)
        
        return current_puzzle

    def _get_best_word_placements(self, puzzle, word_dict):
        """
        Find all valid placements for a word and score them
        Returns list of placement options with their potential scores
        """
        word = word_dict['word']
        options = []
        
        # Look for matching characters in existing puzzle
        for i, char in enumerate(word):
            for y in range(self.height):
                for x in range(self.width):
                    if puzzle.grid[y][x] == char:
                        # Try horizontal placement
                        h_fits = self._fits(puzzle, word, False, x-i, y)
                        if h_fits:
                            new_puzzle = self._copy_with_word(puzzle, x-i, y, False, word)
                            potential = self._calculate_placement_potential(new_puzzle, x-i, y, False, word)
                            options.append({
                                'puzzle': new_puzzle,
                                'potential': potential + word_dict['score']
                            })
                        
                        # Try vertical placement
                        v_fits = self._fits(puzzle, word, True, x, y-i)
                        if v_fits:
                            new_puzzle = self._copy_with_word(puzzle, x, y-i, True, word)
                            potential = self._calculate_placement_potential(new_puzzle, x, y-i, True, word)
                            options.append({
                                'puzzle': new_puzzle,
                                'potential': potential + word_dict['score']
                            })
        
        return options

    def _calculate_placement_potential(self, puzzle, x, y, vertical, word):
        """
        Score a potential word placement based on:
        - Adjacent empty cells (future expansion potential)
        - Distance from center (prefer central placements)
        - Connections to existing words
        """
        potential = 0
        
        # Check adjacent empty cells for expansion potential
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
        
        # Prefer placements closer to center
        center_x, center_y = self.width // 2, self.height // 2
        distance = abs(x - center_x) + abs(y - center_y)
        potential += max(0, 10 - distance) // 2
        
        # Reward connections to existing words
        connections = sum(
            1 for char in word 
            if char in {c for row in puzzle.grid for c in row if c != '.'}
        )
        potential += connections * 2
        
        return potential

    def _fits(self, puzzle, word, vertical, x, y):
        """
        COMPREHENSIVE WORD PLACEMENT VALIDATION
        Check if a word can be placed at given position following crossword rules:
        - Must stay within grid boundaries
        - Must match existing characters at intersection points
        - Must connect to existing words
        - Must not have adjacent characters in perpendicular direction
        - Must have proper spacing at ends
        """
        if ' ' in word:
            return False
        
        connect = False  # Track if word connects to existing words
        for i in range(len(word)):
            # Calculate current position in grid
            if vertical:
                loc_x, loc_y = x, y + i
            else:
                loc_x, loc_y = x + i, y
                
            # Check grid boundaries
            if loc_x < 0 or loc_x >= self.width or loc_y < 0 or loc_y >= self.height:
                return False
                
            existing_char = puzzle.grid[loc_y][loc_x]
            
            # Handle character conflicts and intersections
            if existing_char != '.':
                if existing_char == word[i]:
                    connect = True  # Valid intersection found
                    continue  # Skip adjacent checks for intersection points
                else:
                    return False  # Character conflict
                    
            # Check adjacent cells in perpendicular direction
            if vertical:
                if (loc_x > 0 and puzzle.grid[loc_y][loc_x-1] != '.') or \
                (loc_x < self.width-1 and puzzle.grid[loc_y][loc_x+1] != '.'):
                    return False
            else:
                if (loc_y > 0 and puzzle.grid[loc_y-1][loc_x] != '.') or \
                (loc_y < self.height-1 and puzzle.grid[loc_y+1][loc_x] != '.'):
                    return False
                        
        # Must connect to existing words (except first word)
        if not connect:
            return False
            
        # Check ends of word for proper spacing
        if vertical:
            if (y > 0 and puzzle.grid[y-1][x] != '.') or \
            (y + len(word) < self.height and puzzle.grid[y + len(word)][x] != '.'):
                return False
        else:
            if (x > 0 and puzzle.grid[y][x-1] != '.') or \
            (x + len(word) < self.width and puzzle.grid[y][x + len(word)] != '.'):
                return False
                
        return True

    def _copy_with_word(self, puzzle, x, y, vertical, word):
        """
        Create a new puzzle instance with the given word added
        Returns a deep copy with updated grid and word set
        """
        new_grid = [row.copy() for row in puzzle.grid]
        new_empty_grid = [row.copy() for row in puzzle.empty_grid]
        
        # Place word in grid
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
        
        # Update word set
        new_words = set(puzzle.words)
        new_words.add(word if isinstance(word, str) else word['word'])

        # Create new puzzle instance
        new_puzzle = CrosswordGenerator(
            width=self.width,
            height=self.height,
            grid=new_grid,
            words=new_words
        )
        new_puzzle.empty_grid = new_empty_grid
        return new_puzzle

    # POST-GENERATION ANALYSIS METHODS

    def analyze_grid(self, for_empty_grid=False) -> Tuple[List[WordSlot], List[WordSlot]]:
        """
        Analyze the completed grid to identify all word positions
        Returns across and down word slots with proper numbering
        """
        grid_to_use = self.empty_grid if for_empty_grid else self.grid
        numbered_cells = {}
        number = 1
        across = []
        down = []
        
        # First pass: Number the starting cells
        for y in range(self.height):
            for x in range(self.width):
                if grid_to_use[y][x] == '.':
                    continue
                    
                # Check if this cell starts an across word
                is_across = (x == 0 or grid_to_use[y][x-1] == '.') and (x < self.width-1 and grid_to_use[y][x+1] != '.')
                # Check if this cell starts a down word
                is_down = (y == 0 or grid_to_use[y-1][x] == '.') and (y < self.height-1 and grid_to_use[y+1][x] != '.')
                
                if is_across or is_down:
                    if (x, y) not in numbered_cells:
                        numbered_cells[(x, y)] = number
                        number += 1
        
        # Second pass: Extract complete words
        for (x, y), num in numbered_cells.items():
            # Extract across words
            if x == 0 or self.grid[y][x-1] == '.':
                length = 0
                while x + length < self.width and self.grid[y][x+length] != '.':
                    length += 1
                if length > 1:  # Only words of 2+ letters
                    word = ''.join(self.grid[y][x+i] for i in range(length))
                    clue_data = dict_helper.get_clue_for_word(word)
                    clue = clue_data.get('clue', f"Definition related to {word}")
                    across.append(WordSlot(
                        x=x, y=y, length=length, direction='across',
                        number=num, word=word, clue=clue
                    ))
            
            # Extract down words
            if y == 0 or self.grid[y-1][x] == '.':
                length = 0
                while y + length < self.height and self.grid[y+length][x] != '.':
                    length += 1
                if length > 1:  # Only words of 2+ letters
                    word = ''.join(self.grid[y+i][x] for i in range(length))
                    clue_data = dict_helper.get_clue_for_word(word)
                    clue = clue_data.get('clue', f"Definition related to {word}")
                    down.append(WordSlot(
                        x=x, y=y, length=length, direction='down',
                        number=num, word=word, clue=clue
                    ))
        
        return across, down
    
    def get_clues(self) -> Dict[str, List[Dict]]:
        """Generate formatted clues for the completed puzzle"""
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
        """Calculate the fill percentage of the grid"""
        filled = 0
        for row in self.grid:
            filled += sum(1 for cell in row if cell != '.')
        return filled / (self.width * self.height)

    def get_intersection_points(self):
        """Find all points where words intersect (cross each other)"""
        intersections = []
        for y in range(self.height):
            for x in range(self.width):
                if self.grid[y][x] != '.':
                    horizontal = False
                    vertical = False
                    
                    # Check if part of horizontal word
                    if (x > 0 and self.grid[y][x-1] != '.') or \
                       (x < self.width-1 and self.grid[y][x+1] != '.'):
                        horizontal = True
                    
                    # Check if part of vertical word
                    if (y > 0 and self.grid[y-1][x] != '.') or \
                       (y < self.height-1 and self.grid[y+1][x] != '.'):
                        vertical = True
                    
                    # Intersection if part of both horizontal and vertical words
                    if horizontal and vertical:
                        intersections.append(Point(x, y))
        return intersections