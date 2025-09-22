import heapq
import logging
from typing import List, Dict, Set, Tuple
from ..core.base_solver import BaseCrosswordSolver

logger = logging.getLogger(__name__)

class AStarSolver(BaseCrosswordSolver):
    
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper):
        super().__init__(grid, clues)
        self.dict_helper = dict_helper
        self.slots = self._get_word_slots()
        self.slot_constraints = self._precompute_slot_constraints()
        self._grid_cache = {}
        logger.info(f"AStarSolver initialized with {len(self.slots)} slots")
        
    def _get_word_slots(self) -> List[Dict]:
        self._record_memory_snapshot("_get_word_slots:start")
        slots = []
        
        for clue in self.clues.get('across', []):
            x, y = clue['x'], clue['y']
            length = clue['length']
            current_word = ''.join(self.solution[y][x + i] for i in range(length))
            if '.' not in current_word:
                continue
                
            slots.append({
                'number': clue['number'],
                'direction': 'across',
                'x': x, 'y': y, 'length': length,
                'clue': clue['clue'],
                'answer': clue.get('answer', '')
            })
        
        for clue in self.clues.get('down', []):
            x, y = clue['x'], clue['y']
            length = clue['length']
            current_word = ''.join(self.solution[y + i][x] for i in range(length))
            if '.' not in current_word:
                continue
                
            slots.append({
                'number': clue['number'],
                'direction': 'down',
                'x': x, 'y': y, 'length': length,
                'clue': clue['clue'],
                'answer': clue.get('answer', '')
            })
        
        self._record_memory_snapshot("_get_word_slots:end")
        return slots
        
    def _precompute_slot_constraints(self) -> Dict[Tuple[int, str], int]:
        self._record_memory_snapshot("_precompute_slot_constraints:start")
        constraints = {}
        for slot in self.slots:
            constraint_degree = 0
            for other_slot in self.slots:
                if slot['number'] == other_slot['number'] and slot['direction'] == other_slot['direction']:
                    continue
                if slot['direction'] != other_slot['direction']:
                    if slot['direction'] == 'across':
                        if (other_slot['y'] <= slot['y'] < other_slot['y'] + other_slot['length'] and
                            slot['x'] <= other_slot['x'] < slot['x'] + slot['length']):
                            constraint_degree += 1
                    else:
                        if (slot['y'] <= other_slot['y'] < slot['y'] + slot['length'] and
                            other_slot['x'] <= slot['x'] < other_slot['x'] + slot['length']):
                            constraint_degree += 1
            constraints[(slot['number'], slot['direction'])] = constraint_degree
        self._record_memory_snapshot("_precompute_slot_constraints:end")
        return constraints
        
    def solve(self) -> Dict:
        logger.info("Starting A* solve")
        self._start_performance_tracking()
        
        if not self.slots:
            return self._create_result(True, 0, 0)
        
        self._record_memory_snapshot("solve:init")
        initial_grid_hash = self._hash_grid(self.solution)
        initial_state = {
            'grid_hash': initial_grid_hash,
            'filled_slots': set(),
            'cost': 0,
            'heuristic': self._calculate_heuristic(self.solution, set()),
        }
        initial_state['priority'] = initial_state['cost'] + initial_state['heuristic']
        
        open_set = [(initial_state['priority'], id(initial_state), initial_state)]
        closed_set = set()
        self._grid_cache = {initial_grid_hash: [row[:] for row in self.solution]}
        
        iteration = 0
        max_iterations = 10000
        best_state = None
        best_filled = 0
        
        while open_set and iteration < max_iterations:
            iteration += 1
            self._record_memory_snapshot(f"solve:iteration:{iteration}")
            
            current_f, _, current_state = heapq.heappop(open_set)
            current_filled = len(current_state['filled_slots'])
            
            if best_state is None or current_filled > best_filled:
                best_state = current_state
                best_filled = current_filled
            
            if current_filled == len(self.slots):
                if current_state['grid_hash'] in self._grid_cache:
                    self.solution = self._grid_cache[current_state['grid_hash']]
                    return self._create_result(True, len(self.slots), len(self.slots))
                return self._create_result(False, best_filled, len(self.slots))
            
            if current_state['grid_hash'] in closed_set:
                continue
                
            closed_set.add(current_state['grid_hash'])
            
            if current_state['grid_hash'] not in self._grid_cache:
                continue
                
            current_grid = self._grid_cache[current_state['grid_hash']]
            successors = self._generate_successors(current_state, current_grid)
            
            for next_state in successors:
                if next_state['grid_hash'] in closed_set:
                    continue
                next_state['priority'] = next_state['cost'] + next_state['heuristic']
                heapq.heappush(open_set, (next_state['priority'], id(next_state), next_state))
                self.complexity_tracker.increment_operations()
        
        if best_state and best_state['grid_hash'] in self._grid_cache:
            self.solution = self._grid_cache[best_state['grid_hash']]
            return self._create_result(False, best_filled, len(self.slots))
        
        return self._create_result(False, 0, len(self.slots))
    
    def _calculate_heuristic(self, grid: List[List[str]], filled_slots: Set) -> int:
        self._record_memory_snapshot("_calculate_heuristic")
        unfilled_cells = sum(cell == '.' for row in grid for cell in row)
        constraint_penalty = sum(
            self.slot_constraints.get((slot['number'], slot['direction']), 0)
            for slot in self.slots
            if (slot['number'], slot['direction']) not in filled_slots
        )
        return unfilled_cells + constraint_penalty // 2
    
    def _generate_successors(self, state: Dict, grid: List[List[str]]) -> List[Dict]:
        self._record_memory_snapshot("_generate_successors:start")
        successors = []
        
        slot = self._get_most_constrained_slot(state['filled_slots'], grid)
        if not slot:
            return successors
        
        candidates = self._get_candidates_for_slot(slot, grid)
        max_candidates = min(10 + self.slot_constraints.get((slot['number'], slot['direction']), 0) * 2, 50)
        
        for i, word in enumerate(candidates):
            if i >= max_candidates:
                break
            new_grid = self._apply_word_to_grid(grid, slot, word)
            new_grid_hash = self._hash_grid(new_grid)
            new_filled_slots = state['filled_slots'].copy()
            new_filled_slots.add((slot['number'], slot['direction']))
            
            successor = {
                'grid_hash': new_grid_hash,
                'filled_slots': new_filled_slots,
                'cost': state['cost'] + 1,
                'heuristic': self._calculate_heuristic(new_grid, new_filled_slots),
            }
            successors.append(successor)
            if new_grid_hash not in self._grid_cache:
                self._grid_cache[new_grid_hash] = new_grid
        self._record_memory_snapshot("_generate_successors:end")
        return successors
    
    def _get_most_constrained_slot(self, filled_slots: Set, grid: List[List[str]]):
        self._record_memory_snapshot("_get_most_constrained_slot")
        available_slots = [s for s in self.slots if (s['number'], s['direction']) not in filled_slots]
        if not available_slots:
            return None
        
        min_candidates = float('inf')
        most_constrained = None
        
        for slot in available_slots:
            pattern = self._get_slot_pattern(slot, grid)
            candidate_count = self._estimate_candidates(slot, pattern)
            if candidate_count < min_candidates:
                min_candidates = candidate_count
                most_constrained = slot
            elif candidate_count == min_candidates:
                current_degree = self.slot_constraints.get((most_constrained['number'], most_constrained['direction']), 0)
                new_degree = self.slot_constraints.get((slot['number'], slot['direction']), 0)
                if new_degree > current_degree:
                    most_constrained = slot
        return most_constrained
    
    def _get_slot_pattern(self, slot: Dict, grid: List[List[str]]) -> str:
        self._record_memory_snapshot("_get_slot_pattern")
        pattern = []
        for i in range(slot['length']):
            x, y = (slot['x'] + i, slot['y']) if slot['direction'] == 'across' else (slot['x'], slot['y'] + i)
            pattern.append(grid[y][x] if 0 <= y < len(grid) and 0 <= x < len(grid[0]) else '#')
        return ''.join(pattern)
    
    def _estimate_candidates(self, slot: Dict, pattern: str) -> int:
        self._record_memory_snapshot("_estimate_candidates")
        fixed_chars = sum(1 for c in pattern if c != '.')
        if fixed_chars == 0:
            return self.dict_helper.get_word_count_by_length(slot['length'])
        return max(1, self.dict_helper.get_word_count_by_length(slot['length']) // (fixed_chars * 10))
    
    def _get_candidates_for_slot(self, slot: Dict, grid: List[List[str]]) -> List[str]:
        self._record_memory_snapshot("_get_candidates_for_slot:start")
        candidates = []
        exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
        if exact_match and len(exact_match['word']) == slot['length']:
            word = exact_match['word'].upper()
            if self._word_fits_in_slot(slot, word, grid):
                candidates.append(word)
        
        if not candidates:
            pattern = self._get_slot_pattern(slot, grid)
            dict_candidates = self.dict_helper.get_words_by_pattern(
                pattern=pattern, clue=slot['clue'], max_words=50
            )
            for candidate in dict_candidates:
                word = candidate['word'].upper()
                if len(word) == slot['length'] and self._word_fits_in_slot(slot, word, grid):
                    candidates.append(word)
        self._record_memory_snapshot("_get_candidates_for_slot:end")
        return candidates
    
    def _word_fits_in_slot(self, slot: Dict, word: str, grid: List[List[str]]) -> bool:
        self._record_memory_snapshot("_word_fits_in_slot")
        for i, char in enumerate(word):
            x, y = (slot['x'] + i, slot['y']) if slot['direction'] == 'across' else (slot['x'], slot['y'] + i)
            if not (0 <= y < len(grid) and 0 <= x < len(grid[0])):
                return False
            if grid[y][x] != '.' and grid[y][x] != char:
                return False
        return True
        
    def _apply_word_to_grid(self, grid: List[List[str]], slot: Dict, word: str) -> List[List[str]]:
        self._record_memory_snapshot("_apply_word_to_grid")
        new_grid = [row[:] for row in grid]
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                new_grid[slot['y']][slot['x'] + i] = char
            else:
                new_grid[slot['y'] + i][slot['x']] = char
        return new_grid
    
    def _hash_grid(self, grid: List[List[str]]) -> str:
        self._record_memory_snapshot("_hash_grid")
        return ''.join(''.join(row) for row in grid)
