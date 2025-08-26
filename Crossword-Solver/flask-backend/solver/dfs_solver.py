from typing import List, Dict, Tuple, Set
import time
import tracemalloc
from dictionary_helper import DictionaryHelper
import os
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('dfs_solver.log')
    ]
)
logger = logging.getLogger(__name__)

class DFSCrosswordSolver:
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]]):
        """Initialize DFS solver with grid and clues."""
        logger.info("Initializing DFSCrosswordSolver")
        self.original_grid = [row[:] for row in grid]
        self.height = len(grid)
        self.width = len(grid[0]) if self.height > 0 else 0
        self.clues = clues
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        dict_path = os.path.join(current_dir, "..", "dictionary")
        logger.debug(f"Loading dictionary from: {dict_path}")
        self.dict_helper = DictionaryHelper(dict_path)

        self.solution = [
            [cell if cell not in [' ', '.'] else '.' for cell in row] 
            for row in grid
        ]
        logger.debug("Initial grid state:")
        for row in self.solution:
            logger.debug(' '.join(row))
        
        logger.debug("Identifying word slots")
        self.slots = self._get_word_slots()
        logger.info(f"Found {len(self.slots)} slots to fill")
        self.slot_graph = self._build_slot_graph()
        logger.debug(f"Built slot graph with {len(self.slot_graph)} connections")

    def _get_word_slots(self) -> List[Dict]:
        """Identify all word slots in the grid."""
        slots = []
        
        for clue in self.clues.get('across', []):
            x, y = clue['x'], clue['y']
            length = clue['length']
            
            current_word = ''.join(self.solution[y][x + i] for i in range(length))
            if '.' not in current_word:
                logger.debug(f"Skipping filled across slot {clue['number']} at ({x},{y})")
                continue
                
            slots.append({
                'number': clue['number'],
                'direction': 'across',
                'x': x, 'y': y, 'length': length,
                'clue': clue['clue'],
                'answer': clue.get('answer', '')
            })
            logger.debug(f"Added across slot {clue['number']} at ({x},{y}), length {length}")
        
        for clue in self.clues.get('down', []):
            x, y = clue['x'], clue['y']
            length = clue['length']
            
            current_word = ''.join(self.solution[y + i][x] for i in range(length))
            if '.' not in current_word:
                logger.debug(f"Skipping filled down slot {clue['number']} at ({x},{y})")
                continue
                
            slots.append({
                'number': clue['number'],
                'direction': 'down',
                'x': x, 'y': y, 'length': length,
                'clue': clue['clue'],
                'answer': clue.get('answer', '')
            })
            logger.debug(f"Added down slot {clue['number']} at ({x},{y}), length {length}")
        
        return slots

    def _build_slot_graph(self) -> Dict[Tuple[int, str], Set[Tuple[int, str]]]:
        """Build graph of intersecting slots."""
        graph = {}
        position_map = {}
        
        logger.debug("Building slot intersection graph")
        
        for slot in self.slots:
            for i in range(slot['length']):
                if slot['direction'] == 'across':
                    pos = (slot['x'] + i, slot['y'])
                else:
                    pos = (slot['x'], slot['y'] + i)
                
                key = (slot['number'], slot['direction'])
                if key not in graph:
                    graph[key] = set()
                
                if pos not in position_map:
                    position_map[pos] = []
                position_map[pos].append(key)
        
        for pos in position_map:
            if len(position_map[pos]) > 1:
                for slot1 in position_map[pos]:
                    for slot2 in position_map[pos]:
                        if slot1 != slot2:
                            graph[slot1].add(slot2)
                            graph[slot2].add(slot1)
                            logger.debug(f"Intersection at {pos}: {slot1} crosses {slot2}")
        
        return graph

    def solve(self) -> Dict:
        """Solve the crossword using DFS with backtracking."""
        logger.info("Starting DFS solve")
        start_time = time.time()
        tracemalloc.start()
        
        slot_candidates = []
        for slot in self.slots:
            logger.debug(f"Getting candidates for slot {slot['number']} {slot['direction']}")
            
            exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
            if exact_match and len(exact_match['word']) == slot['length']:
                candidates = [exact_match['word'].upper()]
                logger.debug(f"Found exact match: {exact_match['word']}")
            else:
                if slot.get('answer'):
                    answer_info = self.dict_helper.get_clue_for_word(slot['answer'])
                    if answer_info and answer_info['clue'].lower() == slot['clue'].lower():
                        candidates = [slot['answer'].upper()]
                        logger.debug(f"Using provided answer: {slot['answer']}")
                    else:
                        candidates = self._get_candidates_for_slot(slot)
                else:
                    candidates = self._get_candidates_for_slot(slot)
            
            if not candidates:
                logger.warning(f"No candidates found for slot {slot['number']} {slot['direction']}")
                return self._create_result(False, start_time)
            
            slot_candidates.append((slot, candidates))
            logger.debug(f"Found {len(candidates)} candidates for slot {slot['number']}")

        slot_candidates.sort(key=lambda x: (
            len(x[1]),
            -len(self.slot_graph.get((x[0]['number'], x[0]['direction']), set()))
        ))
        
        logger.info("Slot processing order:")
        for i, (slot, candidates) in enumerate(slot_candidates):
            logger.info(f"  {i+1}. Slot {slot['number']} {slot['direction']}: {len(candidates)} candidates")

        success = self._dfs(0, slot_candidates)
        
        if success:
            logger.info("Solution found!")
            logger.debug("Final grid state:")
            for row in self.solution:
                logger.debug(' '.join(row))
        else:
            logger.warning("No solution found")
        
        return self._create_result(success, start_time)

    def _get_candidates_for_slot(self, slot: Dict) -> List[str]:
        exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
        if exact_match and len(exact_match['word']) == slot['length']:
            return [exact_match['word'].upper()]
        
        possible_words = self.dict_helper.get_possible_words(
            clue=slot['clue'],
            max_words=100,
            length_range=(slot['length'], slot['length'])
        )
        candidates = [w['word'].upper() for w in possible_words]
        
        valid_words = []
        pattern = []
        for i in range(slot['length']):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            pattern.append(self.solution[y][x] if self.solution[y][x] != '.' else None)
        
        for word in candidates:
            if len(word) != slot['length']:
                continue
                
            valid = True
            for i in range(slot['length']):
                if pattern[i] is not None and pattern[i] != word[i]:
                    valid = False
                    break
            
            if valid and self._check_perpendicular_constraints(slot, word):
                valid_words.append(word)
        
        return valid_words

    def _check_perpendicular_constraints(self, slot: Dict, word: str) -> bool:
        slot_key = (slot['number'], slot['direction'])
        
        if slot_key not in self.slot_graph:
            return True
            
        for other_slot_key in self.slot_graph[slot_key]:
            other_slot = next(
                (s for s in self.slots 
                 if s['number'] == other_slot_key[0] and s['direction'] == other_slot_key[1]),
                None
            )
            if not other_slot:
                continue
                
            if slot['direction'] == 'across' and other_slot['direction'] == 'down':
                intersect_x = other_slot['x']
                intersect_y = slot['y']
                word_pos = intersect_x - slot['x']
                other_pos = intersect_y - other_slot['y']
            elif slot['direction'] == 'down' and other_slot['direction'] == 'across':
                intersect_x = slot['x']
                intersect_y = other_slot['y']
                word_pos = intersect_y - slot['y']
                other_pos = intersect_x - other_slot['x']
            else:
                continue
            other_char = self.solution[intersect_y][intersect_x]
            if other_char == '.':
                continue
                
            if word[word_pos] != other_char:
                logger.debug(f"Perpendicular conflict with slot {other_slot['number']} at ({intersect_x},{intersect_y})")
                return False
                
        return True

    def _dfs(self, slot_index: int, slot_candidates: List[Tuple[Dict, List[str]]]) -> bool:
        """Recursive DFS with backtracking."""
        if slot_index >= len(slot_candidates):
            return True
        
        slot, candidates = slot_candidates[slot_index]
        logger.debug(f"Processing slot {slot['number']} {slot['direction']} (index {slot_index})")
        
        for word in candidates:
            logger.debug(f"Trying word {word} in slot {slot['number']}")
            
            if not self._is_valid_placement(slot, word):
                logger.debug(f"Word {word} is not valid placement")
                continue
                
            placed_positions = self._place_word(slot, word)
            logger.debug(f"Placed word {word}, affected positions: {placed_positions}")
            logger.debug("Current grid state:")
            for row in self.solution:
                logger.debug(' '.join(row))
            
            if self._dfs(slot_index + 1, slot_candidates):
                return True
                
            self._remove_word(placed_positions)
            logger.debug(f"Backtracked word {word} from slot {slot['number']}")
            logger.debug("Grid after backtracking:")
            for row in self.solution:
                logger.debug(' '.join(row))
        
        logger.debug(f"Exhausted all candidates for slot {slot['number']}")
        return False

    def _is_valid_placement(self, slot: Dict, word: str) -> bool:
        for i in range(len(word)):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            
            if self.solution[y][x] != '.' and self.solution[y][x] != word[i]:
                logger.debug(f"Conflict at ({x},{y}): grid has {self.solution[y][x]}, word has {word[i]}")
                return False
            
            if not self._check_perpendicular_constraints(slot, word):
                return False
        
        return True

    def _place_word(self, slot: Dict, word: str) -> List[Tuple[int, int]]:
        """Place a word in the grid and return affected positions."""
        positions = []
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            
            if self.solution[y][x] == '.':
                self.solution[y][x] = char
                positions.append((x, y))
        
        return positions

    def _remove_word(self, positions: List[Tuple[int, int]]):
        """Remove a word from the grid."""
        for x, y in positions:
            self.solution[y][x] = '.'

    def _create_result(self, success: bool, start_time: float) -> Dict:
        exec_time = time.time() - start_time
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        words_placed = sum(1 for row in self.solution for cell in row if cell != '.') - sum(1 for row in self.original_grid for cell in row if cell != '.')
        total_words = len(self.slots)
        
        logger.info(f"Solve completed in {exec_time:.2f}s")
        logger.info(f"Peak memory usage: {peak // 1024} KB")
        logger.info(f"Words placed: {words_placed}/{total_words}")
        
        formatted_solution = []
        for row in self.solution:
            formatted_row = []
            for cell in row:
                if cell == '.':
                    formatted_row.append('.')
                else:
                    formatted_row.append(cell)
            formatted_solution.append(formatted_row)
        
        return {
            "status": "success" if success else "partial",
            "grid": formatted_solution,
            "memory_usage_kb": peak // 1024,
            "words_placed": words_placed,
            "total_words": total_words
        }

def solve_with_dfs(grid: List[List[str]], clues: Dict[str, List[Dict]]) -> Dict:
    """Public interface for DFS solver."""
    solver = DFSCrosswordSolver(grid, clues)
    return solver.solve()