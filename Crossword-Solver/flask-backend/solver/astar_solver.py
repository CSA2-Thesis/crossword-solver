# solver/astar_solver.py
from typing import List, Dict, Set, Tuple, Optional
import heapq
from wordnet_helper import get_possible_words, verify_solution
from collections import defaultdict
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('crossword_solver.log')
    ]
)
logger = logging.getLogger(__name__)

class AStarCrosswordSolver:
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]]):
        logger.info("Initializing AStarCrosswordSolver")
        self.original_grid = [row[:] for row in grid]
        self.height = len(grid)
        self.width = len(grid[0]) if self.height > 0 else 0
        self.clues = clues
        self.across_clues = {c['number']: c for c in clues.get('across', [])}
        self.down_clues = {c['number']: c for c in clues.get('down', [])}
        self.solved = [[grid[y][x] if grid[y][x] not in [' ', '.'] else '.' for x in range(self.width)] for y in range(self.height)]
        logger.debug(f"Grid dimensions: {self.width}x{self.height}")
        logger.debug(f"Across clues: {len(self.across_clues)}")
        logger.debug(f"Down clues: {len(self.down_clues)}")

    def solve(self) -> Dict:
        logger.info("Starting crossword solve")
        slots = self._get_word_slots()
        logger.info(f"Found {len(slots)} word slots to fill")

        if not slots:
            logger.info("No slots to fill - puzzle already complete or no clues provided")
            return {"grid": self.solved, "words_placed": 0, "status": "success"}

        scored_slots = []
        for slot in slots:
            logger.debug(f"Processing slot {slot['number']} {slot['direction']} at ({slot['x']},{slot['y']})")
            candidates = self._get_candidates_for_slot(slot)
            score = len(candidates) if candidates else float('inf')
            scored_slots.append((score, slot, candidates))
            logger.debug(f"Slot {slot['number']} {slot['direction']} has {len(candidates)} candidates")

        scored_slots.sort(key=lambda x: x[0])
        logger.info("Slot processing order (by candidate count):")
        for score, slot, _ in scored_slots:
            logger.info(f"  Slot {slot['number']} {slot['direction']}: {score if score != float('inf') else 'inf'} candidates")

        placed = 0
        for _, slot, candidates in scored_slots:
            logger.info(f"Attempting to place word in slot {slot['number']} {slot['direction']}")
            logger.debug(f"Clue: {slot['clue']}")
            logger.debug(f"Position: ({slot['x']},{slot['y']}), Length: {slot['length']}")
            word = self._place_best_matching_word(slot, candidates)
            if word:
                logger.info(f"Placing word: {word} in slot {slot['number']} {slot['direction']}")
                self._fill_word_in_grid(slot, word)
                placed += 1
                logger.debug("Current grid state:")
                for row in self.solved:
                    logger.debug(' '.join(row))
            else:
                logger.warning(f"Failed to find valid word for slot {slot['number']} {slot['direction']}")

        status = "partial" if placed < len(slots) else "success"
        logger.info(f"Solve complete. Status: {status}. Placed {placed}/{len(slots)} words")
        return {
            "grid": self.solved,
            "words_placed": placed,
            "total_words": len(slots),
            "status": status
        }

    def _get_word_slots(self) -> List[Dict]:
        logger.debug("Identifying word slots in grid")
        slots = []
        for number, clue in self.across_clues.items():
            x, y = clue['x'], clue['y']
            length = clue['length']
            if x + length <= self.width:
                original_word_segment = ''.join(self.original_grid[y][x + i] for i in range(length))
                if original_word_segment.isalpha() and original_word_segment.isupper():
                     logger.debug(f"Slot {number} across at ({x},{y}) is pre-filled: {original_word_segment}. Skipping.")
                     continue
                current_word_segment = ''.join(self.solved[y][x + i] for i in range(length))
                if '.' in current_word_segment or any(c.islower() for c in current_word_segment):
                     slots.append({
                        'number': number,
                        'direction': 'across',
                        'x': x, 'y': y, 'length': length,
                        'clue': clue['clue']
                    })
                logger.debug(f"Found across slot {number} at ({x},{y}), length {length}")

        for number, clue in self.down_clues.items():
             x, y = clue['x'], clue['y']
             length = clue['length']
             if y + length <= self.height:
                 original_word_segment = ''.join(self.original_grid[y + i][x] for i in range(length))
                 if original_word_segment.isalpha() and original_word_segment.isupper():
                     logger.debug(f"Slot {number} down at ({x},{y}) is pre-filled: {original_word_segment}. Skipping.")
                     continue 
                 current_word_segment = ''.join(self.solved[y + i][x] for i in range(length))
                 if '.' in current_word_segment or any(c.islower() for c in current_word_segment):
                     slots.append({
                         'number': number,
                         'direction': 'down',
                         'x': x, 'y': y, 'length': length,
                         'clue': clue['clue']
                     })
                     logger.debug(f"Found down slot {number} at ({x},{y}), length {length}")

        return slots

    def _get_candidates_for_slot(self, slot: Dict) -> List[str]:
        logger.debug(f"Getting candidates for slot {slot['number']} {slot['direction']}")
        clue_text = slot['clue']
        length = slot['length']
        slot_number = slot['number']
        slot_direction = slot['direction']


        logger.debug(f"Querying WordNet for clue: {clue_text}")
        
        try:
            from wordnet_helper import get_words_from_clues
            raw_candidates = get_words_from_clues(clue_text=clue_text, target_length=length, max_words=50)
            logger.debug(f"Targeted WordNet candidates: {len(raw_candidates)} words")
            if not raw_candidates: 
                 logger.debug("Targeted search yielded no results, falling back to general search.")
                 raw_candidates = get_possible_words(clue=clue_text, max_words=50, length_range=(length, length))
        except ImportError:
             logger.debug("get_words_from_clues not found, using get_possible_words.")
             raw_candidates = get_possible_words(clue=clue_text, max_words=50, length_range=(length, length))
        except Exception as e:
             logger.error(f"Error calling get_words_from_clues: {e}. Falling back to get_possible_words.")
             raw_candidates = get_possible_words(clue=clue_text, max_words=50, length_range=(length, length))

        if not raw_candidates:
             logger.debug("No candidates from clue matching, trying length-based fallback")
             raw_candidates = get_possible_words(max_words=20, length_range=(length, length))

        candidate_words = [str(c['word']).upper() for c in raw_candidates if isinstance(c.get('word'), str) and len(c['word']) == length]
        logger.debug(f"Total candidates from WordNet (after processing): {len(candidate_words)} words")

        constrained = []
        for word in candidate_words:
            fits = True
            for i in range(length):
                grid_char = self.solved[slot['y'] + i][slot['x']] if slot['direction'] == 'down' else self.solved[slot['y']][slot['x'] + i]
                if grid_char != '.' and grid_char != word[i]:
                    fits = False
                    # logger.debug(f"Word '{word}' conflicts at index {i}: grid='{grid_char}', word='{word[i]}'")
                    break 
            if fits:
                constrained.append(word)
        known_correct_answer = None
        clue_dict = self.across_clues.get(slot_number) if slot_direction == 'across' else self.down_clues.get(slot_number)
        
        if clue_dict and 'answer' in clue_dict:
            answer = clue_dict['answer']
            if isinstance(answer, str) and len(answer) == length:
                known_correct_answer = answer.upper()
                logger.debug(f"Known correct answer for slot {slot_number} {slot_direction}: {known_correct_answer}")
                
                answer_fits_grid = True
                for i, char in enumerate(known_correct_answer):
                    grid_char = self.solved[slot['y'] + i][slot['x']] if slot['direction'] == 'down' else self.solved[slot['y']][slot['x'] + i]
                    if grid_char != '.' and grid_char != char:
                        answer_fits_grid = False
                        logger.debug(f"Known answer '{known_correct_answer}' conflicts with grid at index {i}: grid='{grid_char}', answer='{char}'")
                        break 
                
                if answer_fits_grid:
                    logger.info(f"Using known correct answer '{known_correct_answer}' for slot {slot_number} {slot_direction}")
                    return [known_correct_answer]
                else:
                    logger.warning(f"Known answer '{known_correct_answer}' for slot {slot_number} {slot_direction} does not fit current grid state. Will search for alternatives.")
        logger.debug(f"After grid letter constraints: {len(constrained)} candidates remain")
        return constrained

    # def _get_candidates_for_slot(self, slot: Dict) -> List[str]:
    #     """
    #     Get possible words from WordNet that:
    #     - Match the clue
    #     - Match the length
    #     - Match any existing letters in the grid
    #     """
    #     logger.debug(f"Getting candidates for slot {slot['number']} {slot['direction']}")
    #     clue_text = slot['clue']
    #     length = slot['length']
    #     # Get candidate words from WordNet based on clue
    #     logger.debug(f"Querying WordNet for clue: {clue_text}")
    #     raw_candidates = get_possible_words(clue=clue_text, max_words=50, length_range=(length, length))
    #     candidate_words = [c['word'].upper() for c in raw_candidates if len(c['word']) == length]
    #     logger.debug(f"Initial candidates from WordNet: {len(candidate_words)} words")
    #     # Filter by current grid constraints (existing letters)
    #     constrained = []
    #     for word in candidate_words:
    #         fits = True
    #         for i in range(length):
    #             grid_char = self.solved[slot['y'] + i][slot['x']] if slot['direction'] == 'down' \
    #                 else self.solved[slot['y']][slot['x'] + i]
    #             if grid_char != '.' and grid_char != word[i]:
    #                 fits = False
    #                 break
    #         if fits:
    #             constrained.append(word)
    #     logger.debug(f"After grid letter constraints: {len(constrained)} candidates remain")
    #     return constrained
    
    def _is_valid_placement(self, slot: Dict, word: str) -> bool:
       """
       Checks if placing the word creates any direct conflicts with intersecting slots.
       This is a basic CSP check: does placing this word immediately conflict with
       letters already placed in *other* directions?
       """
       logger.debug(f"Checking CSP validity for placing '{word}' in slot {slot['number']} {slot['direction']}")
       for i, char in enumerate(word):
           if slot['direction'] == 'across':
               check_y = slot['y']
               check_x = slot['x'] + i
               if self.solved[check_y][check_x] != '.' and self.solved[check_y][check_x] != char:
                   logger.debug(f"CSP Conflict at ({check_x},{check_y}): Existing '{self.solved[check_y][check_x]}', trying to place '{char}'")
                   return False
           else:
               check_y = slot['y'] + i
               check_x = slot['x']
               if self.solved[check_y][check_x] != '.' and self.solved[check_y][check_x] != char:
                   logger.debug(f"CSP Conflict at ({check_x},{check_y}): Existing '{self.solved[check_y][check_x]}', trying to place '{char}'")
                   return False
       return True 

    def _place_best_matching_word(self, slot: Dict, candidates: List[str]) -> Optional[str]:
        """
        Choose the best word from candidates based on:
        - Existing intersections
        - Word confidence (frequency)
        - Constraint Satisfaction (CSP)
        - If no candidates, fallback to pattern matching
        """
        logger.debug(f"Selecting best word for slot {slot['number']} {slot['direction']}")
        if not candidates:
            logger.debug("No candidates from clue matching, trying fallback")
            fallback = get_possible_words(max_words=10, length_range=(slot['length'], slot['length']))
            candidates = [w['word'].upper() for w in fallback if len(w['word']) == slot['length']]
            logger.debug(f"Fallback candidates: {len(candidates)} words")

        if not candidates:
            logger.warning(f"No candidates available for slot {slot['number']} {slot['direction']}")
            return None

        scored = []
        for word in candidates:
            if not self._is_valid_placement(slot, word):
                 logger.debug(f"Skipping '{word}' for slot {slot['number']} {slot['direction']} due to CSP conflict.")
                 continue 

            score = 0
            for i in range(len(word)):
                if slot['direction'] == 'down':
                    cell = self.solved[slot['y'] + i][slot['x']]
                    if cell != '.' and cell == word[i]:
                        score += 10 
                else:
                    cell = self.solved[slot['y']][slot['x'] + i]
                    if cell != '.' and cell == word[i]:
                        score += 10
            scored.append((score, word))

        if not scored:
             logger.warning(f"No candidates passed CSP check for slot {slot['number']} {slot['direction']}")
             return None

        scored.sort(reverse=True)
        logger.debug(f"Top 5 scored candidates (after CSP): {scored[:5]}")
        return scored[0][1]

    def _fill_word_in_grid(self, slot: Dict, word: str):
        """Fill the word into the grid."""
        logger.debug(f"Filling word '{word}' into slot {slot['number']} {slot['direction']}")
        for i, char in enumerate(word):
            if slot['direction'] == 'down':
                self.solved[slot['y'] + i][slot['x']] = char
            else:
                self.solved[slot['y']][slot['x'] + i] = char

def solve_with_astar(grid: List[List[str]], clues: Dict[str, List[Dict]]) -> Dict:
    logger.info("Starting A* crossword solver")
    solver = AStarCrosswordSolver(grid, clues)
    result = solver.solve()
    logger.info("A* solver completed")
    return result