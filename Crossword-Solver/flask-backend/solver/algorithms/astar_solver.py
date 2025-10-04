import heapq
from typing import List, Dict, Set, Tuple, Optional
from ..core.base_solver import BaseCrosswordSolver
from ..core.slot_manager import SlotManager
from ..core.constraints import ConstraintChecker

class AStarSolver(BaseCrosswordSolver):
    
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper, enable_memory_profiling: bool = False):
        super().__init__(grid, clues, enable_memory_profiling)
        self.dict_helper = dict_helper
        self.slot_manager = SlotManager(self.solution, clues)
        self.slots = self.slot_manager.get_word_slots()
        self.slot_graph = self.slot_manager.build_slot_graph(self.slots)
        self.constraint_checker = ConstraintChecker(self.solution, self.slot_graph)
        
        self.slot_constraints = self._compute_constraints()
        self.slot_ordering = self._get_ordering()
        
        self._state_cache = {}
        self._candidate_cache = {}
        
    def _compute_constraints(self) -> Dict[Tuple[int, str], int]:
        constraints = {}
        for slot in self.slots:
            slot_key = (slot['number'], slot['direction'])
            degree = len(self.slot_graph[slot_key]) if slot_key in self.slot_graph else 0
            constraints[slot_key] = degree
        return constraints
    
    def _get_ordering(self) -> List[Dict]:
        scored_slots = []
        for slot in self.slots:
            slot_key = (slot['number'], slot['direction'])
            
            pattern = self._get_pattern(slot)
            fixed_chars = sum(1 for c in pattern if c != '.')
            
            candidate_estimate = max(1, self.dict_helper.get_word_count_by_length(slot['length']) // max(1, fixed_chars * 5))
            
            constraint_score = self.slot_constraints[slot_key] * 10
            candidate_score = max(0, 50 - candidate_estimate)

            total_score = constraint_score + candidate_score
            scored_slots.append((slot, total_score))
        
        scored_slots.sort(key=lambda x: -x[1])
        return [slot for slot, score in scored_slots]
    
    def _get_pattern(self, slot: Dict) -> str:
        pattern = []
        for i in range(slot['length']):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            pattern.append(self.solution[y][x] if 0 <= y < len(self.solution) and 0 <= x < len(self.solution[0]) else '#')
        return ''.join(pattern)
    
    def _get_candidates(self, slot: Dict, grid: List[List[str]], use_fallback: bool = True) -> List[Tuple[str, int]]:
        cache_key = (slot['number'], slot['direction'], self._hash_grid(grid))
        if cache_key in self._candidate_cache:
            return self._candidate_cache[cache_key]
        
        candidates = []
        
        dict_words = self._get_dict_candidates(slot)
        for candidate in dict_words:
            word = self._extract_word(candidate)
            if not word:
                continue
            if len(word) == slot['length'] and self._fits(slot, word, grid):
                score = self._calculate_score(slot, word, grid)
                candidates.append((word, score))
        
        if not candidates and use_fallback:
            candidates = self._get_fallback_candidates(slot, grid)
        
        candidates.sort(key=lambda x: -x[1])
        self._candidate_cache[cache_key] = candidates
        return candidates
    
    def _get_dict_candidates(self, slot: Dict) -> List:
        try:
            return self.dict_helper.get_possible_words(
                clue=slot['clue'],
                max_words=500,
                length_range=(slot['length'], slot['length'])
            )
        except Exception:
            return []
    
    def _extract_word(self, candidate) -> str:
        if isinstance(candidate, dict) and 'word' in candidate:
            return candidate['word'].upper()
        return str(candidate).upper()
    
    def _get_fallback_candidates(self, slot: Dict, grid: List[List[str]]) -> List[Tuple[str, int]]:
        candidates = []
        
        if hasattr(self.dict_helper, 'get_alternative_spellings'):
            try:
                alt_words = self.dict_helper.get_alternative_spellings(slot['clue'], slot['length'])
                for candidate in alt_words:
                    word = self._extract_word(candidate)
                    if len(word) == slot['length'] and self._fits(slot, word, grid):
                        score = self._calculate_score(slot, word, grid)
                        candidates.append((word, score))
                        self._increment_fallback_count()
            except Exception:
                pass
        
        if not candidates:
            pattern = self._get_pattern_from_grid(slot, grid)
            try:
                pattern_words = self.dict_helper.get_words_by_pattern(pattern=pattern, clue=None, max_words=100)
                for candidate in pattern_words:
                    word = candidate['word'].upper()
                    if self._fits(slot, word, grid):
                        score = self._calculate_score(slot, word, grid)
                        candidates.append((word, score))
            except Exception:
                pass
        
        return candidates
    
    def _get_pattern_from_grid(self, slot: Dict, grid: List[List[str]]) -> str:
        pattern = []
        for i in range(slot['length']):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            pattern.append(grid[y][x] if grid[y][x] != '.' else '.')
        return ''.join(pattern)
    
    def _calculate_score(self, slot: Dict, word: str, grid: List[List[str]]) -> int:
        score = 0
        
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            
            if grid[y][x] != '.' and grid[y][x] == char:
                score += 3
        
        slot_key = (slot['number'], slot['direction'])
        if slot_key in self.slot_graph:
            for other_key in self.slot_graph[slot_key]:
                other_slot = self._find_slot(other_key)
                if other_slot:
                    if slot['direction'] == 'across' and other_slot['direction'] == 'down':
                        intersect_x = other_slot['x']
                        intersect_y = slot['y']
                        word_pos = intersect_x - slot['x']
                        other_pos = intersect_y - other_slot['y']
                    else:
                        intersect_x = slot['x']
                        intersect_y = other_slot['y']
                        word_pos = intersect_y - slot['y']
                        other_pos = intersect_x - other_slot['x']
                    
                    if 0 <= word_pos < len(word) and 0 <= other_pos < other_slot['length']:
                        other_char = grid[other_slot['y'] + (0 if other_slot['direction'] == 'across' else other_pos)][other_slot['x'] + (other_pos if other_slot['direction'] == 'across' else 0)]
                        if other_char != '.' and other_char == word[word_pos]:
                            score += 2
        
        exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
        if exact_match and exact_match['word'].upper() == word:
            score += 4
        
        word_data = self.dict_helper.get_clue_for_word(word)
        score += min(word_data.get('score', 0) // 5, 3)
        
        return score
    
    def _find_slot(self, slot_key: Tuple[int, str]) -> Optional[Dict]:
        for slot in self.slots:
            if (slot['number'], slot['direction']) == slot_key:
                return slot
        return None
    
    def _fits(self, slot: Dict, word: str, grid: List[List[str]]) -> bool:
        if len(word) != slot['length']:
            return False
        
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            
            if not (0 <= y < len(grid) and 0 <= x < len(grid[0])):
                return False
            
            if grid[y][x] != '.' and grid[y][x] != char:
                return False
        
        return True
    
    def solve(self) -> Dict:
        self._start_performance_tracking()
        
        if not self.slots:
            return self._create_result(True, 0, 0)
        
        processing_order = self.slot_ordering
        
        initial_state = AStarState(
            grid=self.solution,
            filled_slots=set(),
            cost=0,
            slot_index=0
        )
        initial_state.heuristic = self._calculate_heuristic(initial_state)
        initial_state.priority = initial_state.cost + initial_state.heuristic
        
        open_set = [initial_state]
        closed_set = set()
        self._state_cache = {initial_state.grid_hash: initial_state}
        
        iteration = 0
        max_iterations = 5000
        
        while open_set and iteration < max_iterations:
            iteration += 1
            
            current_state = heapq.heappop(open_set)
            
            if current_state.slot_index >= len(processing_order):
                self.solution = current_state.grid
                return self._create_result(True, len(self.slots), len(self.slots))
            
            if current_state.grid_hash in closed_set:
                continue
            
            closed_set.add(current_state.grid_hash)
            
            successors = self._get_successors(current_state, processing_order)
            
            for next_state in successors:
                if next_state.grid_hash in closed_set:
                    continue
                
                if next_state.grid_hash in self._state_cache:
                    existing = self._state_cache[next_state.grid_hash]
                    if next_state.cost >= existing.cost:
                        continue
                
                self._state_cache[next_state.grid_hash] = next_state
                heapq.heappush(open_set, next_state)
            
            self.complexity_tracker.increment_operations()
        
        if open_set:
            best_state = min(open_set, key=lambda s: s.heuristic)
            self.solution = best_state.grid
            filled_count = self._count_filled_words()
            return self._create_result(False, filled_count, len(self.slots))
        
        return self._create_result(False, 0, len(self.slots))
    
    def _get_successors(self, state: 'AStarState', processing_order: List[Dict]) -> List['AStarState']:
        successors = []
        current_index = state.slot_index
        
        if current_index >= len(processing_order):
            return successors
        
        slot = processing_order[current_index]
        candidates = self._get_candidates(slot, state.grid)
        
        max_candidates = min(20, len(candidates))
        
        for word, score in candidates[:max_candidates]:
            if not self._fits(slot, word, state.grid):
                continue
            
            new_grid = self._place_word(state.grid, slot, word)
            new_filled_slots = state.filled_slots | {(slot['number'], slot['direction'])}
            
            new_state = AStarState(
                grid=new_grid,
                filled_slots=new_filled_slots,
                cost=state.cost + 1,
                slot_index=current_index + 1
            )
            new_state.heuristic = self._calculate_heuristic(new_state)
            new_state.priority = new_state.cost + new_state.heuristic
            
            successors.append(new_state)
        
        return successors
    
    def _calculate_heuristic(self, state: 'AStarState') -> int:
        remaining = len(self.slots) - state.slot_index
        
        if remaining == 0:
            return 0
        
        heuristic = remaining * 10 
        
        for i in range(state.slot_index, min(state.slot_index + 3, len(self.slot_ordering))):
            if i < len(self.slot_ordering):
                slot = self.slot_ordering[i]
                slot_key = (slot['number'], slot['direction'])
                heuristic += self.slot_constraints.get(slot_key, 0) * 5
        
        return heuristic
    
    def _place_word(self, grid: List[List[str]], slot: Dict, word: str) -> List[List[str]]:
        new_grid = [row[:] for row in grid]
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                new_grid[slot['y']][slot['x'] + i] = char
            else:
                new_grid[slot['y'] + i][slot['x']] = char
        return new_grid
    
    def _hash_grid(self, grid: List[List[str]]) -> str:
        return ''.join(''.join(row) for row in grid)
    
    def _count_filled_words(self) -> int:
        filled = 0
        for slot in self.slots:
            is_filled = True
            for i in range(slot['length']):
                if slot['direction'] == 'across':
                    x, y = slot['x'] + i, slot['y']
                else:
                    x, y = slot['x'], slot['y'] + i
                if self.solution[y][x] == '.':
                    is_filled = False
                    break
            if is_filled:
                filled += 1
        return filled


class AStarState:
    
    def __init__(self, grid: List[List[str]], filled_slots: Set[Tuple[int, str]], cost: int, slot_index: int):
        self.grid = grid
        self.filled_slots = filled_slots
        self.cost = cost
        self.slot_index = slot_index
        self.heuristic = 0
        self.priority = 0
        self.grid_hash = self._compute_hash()
    
    def _compute_hash(self) -> str:
        grid_str = ''.join(''.join(row) for row in self.grid)
        slots_str = ','.join(sorted(f"{num}{dir}" for num, dir in self.filled_slots))
        return f"{grid_str}|{slots_str}|{self.slot_index}"
    
    def __lt__(self, other):
        return self.priority < other.priority