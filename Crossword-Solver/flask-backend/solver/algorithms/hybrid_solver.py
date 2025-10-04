import heapq
from typing import List, Dict, Set, Tuple, Optional
from ..core.base_solver import BaseCrosswordSolver
from ..core.slot_manager import SlotManager
from ..core.constraints import ConstraintChecker

class HybridSolver(BaseCrosswordSolver):
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper, 
                 enable_memory_profiling: bool = False, beam_width: int = 5, 
                 switch_threshold: float = 0.7):
        super().__init__(grid, clues, enable_memory_profiling)
        self.dict_helper = dict_helper
        self.slot_manager = SlotManager(self.solution, clues)
        self.slots = self.slot_manager.get_word_slots()
        self.slot_graph = self.slot_manager.build_slot_graph(self.slots)
        self.constraint_checker = ConstraintChecker(self.solution, self.slot_graph)
        
        self.beam_width = beam_width
        self.switch_threshold = switch_threshold
        self.state_cache = {}
        
        self.astar_expansions = 0
        self.dfs_backtracks = 0
        self.mode_switches = 0

    def solve(self) -> Dict:
        self._start_performance_tracking()
        
        if not self.slots:
            return self._create_result(True, 0, 0)
        
        success, filled_slots = self._explore_with_astar()
        
        if success:
            words_placed = self._count_filled_words()
            return self._create_result(True, words_placed, len(self.slots))
        
        self.mode_switches += 1
        
        success = self._complete_with_dfs(filled_slots)
        
        words_placed = self._count_filled_words()
        return self._create_result(success, words_placed, len(self.slots))

    def _explore_with_astar(self) -> Tuple[bool, Set[Tuple[int, str]]]:
        if self.enable_memory_profiling:
            self._record_memory_snapshot("astar_start")
        
        processing_order = self._order_slots_by_difficulty()
        initial_filled = set()
        
        initial_state = SolverState(
            grid=[row[:] for row in self.solution],
            filled_slots=initial_filled,
            cost=0,
            slot_index=0,
            processing_order=processing_order
        )
        initial_state.heuristic = self._estimate_remaining_difficulty(initial_state)
        initial_state.priority = initial_state.cost + initial_state.heuristic
        
        beam = [initial_state]
        best_state = initial_state
        
        max_expansions = min(1000, len(self.slots) * 50)
        
        while beam and self.astar_expansions < max_expansions:
            self.astar_expansions += 1
            
            current_state = heapq.heappop(beam)
            
            if current_state.slot_index >= len(processing_order):
                self._apply_state_to_solution(current_state)
                return True, current_state.filled_slots
            
            if len(current_state.filled_slots) > len(best_state.filled_slots):
                best_state = current_state
            
            successors = self._generate_successors(current_state)
            
            for successor in successors:
                heapq.heappush(beam, successor)
            
            if len(beam) > self.beam_width:
                beam = heapq.nsmallest(self.beam_width, beam)
                heapq.heapify(beam)
            
            progress_ratio = len(current_state.filled_slots) / len(self.slots)
            if progress_ratio > self.switch_threshold and len(beam) == 1:
                self._apply_state_to_solution(best_state)
                return False, best_state.filled_slots
        
        self._apply_state_to_solution(best_state)
        return False, best_state.filled_slots

    def _complete_with_dfs(self, initial_filled: Set[Tuple[int, str]]) -> bool:
        if self.enable_memory_profiling:
            self._record_memory_snapshot("dfs_start")
        
        remaining_slots = [slot for slot in self.slots 
                          if (slot['number'], slot['direction']) not in initial_filled]
        
        if not remaining_slots:
            return True
        
        ordered_slots = self._sort_remaining_slots(remaining_slots)
        slot_indices = self._convert_slots_to_indices(ordered_slots)
        
        success = self._guided_dfs(0, slot_indices, ordered_slots)
        return success

    def _generate_successors(self, state: 'SolverState') -> List['SolverState']:
        successors = []
        
        if state.slot_index >= len(state.processing_order):
            return successors
        
        slot = state.processing_order[state.slot_index]
        candidates = self._evaluate_candidates_with_fallback(slot, state.grid)
        
        if not candidates:
            return []
            
        max_candidates = min(15, len(candidates))
        
        for word, score in candidates[:max_candidates]:
            if not self._validate_word_placement(slot, word, state.grid):
                continue

            new_grid = self._apply_word_to_grid(state.grid, slot, word)
            new_filled = state.filled_slots | {(slot['number'], slot['direction'])}
            
            new_state = SolverState(
                grid=new_grid,
                filled_slots=new_filled,
                cost=state.cost + 1,
                slot_index=state.slot_index + 1,
                processing_order=state.processing_order
            )
            
            new_state.heuristic = self._estimate_remaining_difficulty(new_state)
            new_state.priority = new_state.cost + new_state.heuristic
            
            successors.append(new_state)
        
        return successors

    def _guided_dfs(self, slot_idx: int, slot_indices: List[int], ordered_slots: List[Dict]) -> bool:
        if slot_idx >= len(slot_indices):
            return True
        
        original_slot_idx = slot_indices[slot_idx]
        slot = self.slots[original_slot_idx]
        
        candidates = self._evaluate_candidates_with_fallback(slot, self.solution)
        
        if not candidates:
            self.dfs_backtracks += 1
            return False
        
        candidates.sort(key=lambda x: -x[1])
        
        for word, score in candidates:
            if not self._fits(slot, word):
                continue
            
            placed_positions = self._place_word(slot, word)
            
            if not self._verify_future_slots(slot_idx + 1, slot_indices, ordered_slots):
                self._remove_word(placed_positions)
                self.dfs_backtracks += 1
                continue
            
            if self._guided_dfs(slot_idx + 1, slot_indices, ordered_slots):
                return True
            
            self._remove_word(placed_positions)
            self.dfs_backtracks += 1
        
        return False

    def _evaluate_candidates_with_fallback(self, slot: Dict, grid: List[List[str]]) -> List[Tuple[str, int]]:
        candidates = self._evaluate_candidates(slot, grid)
        
        if candidates:
            return candidates
        
        fallback_candidates = []
        pattern = self._extract_pattern(slot, grid)
        
        fallback_methods = [
            self._fallback_by_pattern_only,
            self._fallback_by_length_only,
            self._fallback_by_alternative_spellings,
            self._fallback_by_common_words
        ]
        
        for method in fallback_methods:
            if len(fallback_candidates) >= 10:
                break
            try:
                new_candidates = method(slot, pattern, grid)
                if new_candidates:
                    fallback_candidates.extend(new_candidates)
                    self._increment_fallback_count()
            except Exception:
                continue
        
        if fallback_candidates:
            scored_fallback = []
            for word in fallback_candidates:
                score = self._compute_word_score(slot, word, grid, pattern)
                scored_fallback.append((word, score))
            scored_fallback.sort(key=lambda x: -x[1])
            return scored_fallback[:20]
        
        return []

    def _fallback_by_pattern_only(self, slot: Dict, pattern: str, grid: List[List[str]]) -> List[str]:
        candidates = []
        try:
            pattern_words = self.dict_helper.get_words_by_pattern(
                pattern=pattern, clue=None, max_words=50
            )
            for word_data in pattern_words:
                word = self._parse_candidate_word(word_data)
                if word and self._validate_word_placement(slot, word, grid):
                    candidates.append(word)
        except Exception:
            pass
        return candidates

    def _fallback_by_length_only(self, slot: Dict, pattern: str, grid: List[List[str]]) -> List[str]:
        candidates = []
        try:
            length_words = self.dict_helper.get_words_by_length(slot['length'], max_words=100)
            for word_data in length_words:
                word = self._parse_candidate_word(word_data)
                if word and self._validate_word_placement(slot, word, grid):
                    candidates.append(word)
        except Exception:
            pass
        return candidates

    def _fallback_by_alternative_spellings(self, slot: Dict, pattern: str, grid: List[List[str]]) -> List[str]:
        candidates = []
        try:
            if hasattr(self.dict_helper, 'get_alternative_spellings'):
                alt_words = self.dict_helper.get_alternative_spellings(
                    slot['clue'], slot['length'], max_words=30
                )
                for word_data in alt_words:
                    word = self._parse_candidate_word(word_data)
                    if word and len(word) == slot['length'] and self._validate_word_placement(slot, word, grid):
                        candidates.append(word)
        except Exception:
            pass
        return candidates

    def _fallback_by_common_words(self, slot: Dict, pattern: str, grid: List[List[str]]) -> List[str]:
        candidates = []
        try:
            common_words = self.dict_helper.get_words_by_length(slot['length'], max_words=50)
            common_words.sort(key=lambda x: x.get('score', 0), reverse=True)
            
            for word_data in common_words[:20]:
                word = self._parse_candidate_word(word_data)
                if word and self._validate_word_placement(slot, word, grid):
                    candidates.append(word)
        except Exception:
            pass
        return candidates

    def _order_slots_by_difficulty(self) -> List[Dict]:
        scored_slots = []
        
        for slot in self.slots:
            slot_key = (slot['number'], slot['direction'])
            constraint_degree = len(self.slot_graph.get(slot_key, []))
            candidate_estimate = max(1, self._predict_candidate_count(slot))
            difficulty_score = constraint_degree * 10 + (50 - min(candidate_estimate, 50))
            scored_slots.append((slot, difficulty_score))
        
        scored_slots.sort(key=lambda x: -x[1])
        return [slot for slot, score in scored_slots]

    def _estimate_remaining_difficulty(self, state: 'SolverState') -> int:
        remaining_slots = len(state.processing_order) - state.slot_index
        
        if remaining_slots == 0:
            return 0
        
        heuristic = remaining_slots * 5
        
        for i in range(state.slot_index, min(state.slot_index + 3, len(state.processing_order))):
            slot = state.processing_order[i]
            slot_key = (slot['number'], slot['direction'])
            constraint_degree = len(self.slot_graph.get(slot_key, []))
            heuristic += constraint_degree * 2
        
        return heuristic

    def _evaluate_candidates(self, slot: Dict, grid: List[List[str]]) -> List[Tuple[str, int]]:
        candidates = []
        pattern = self._extract_pattern(slot, grid)
        
        dict_words = self._fetch_dictionary_candidates(slot)
        
        for candidate in dict_words:
            word = self._parse_candidate_word(candidate)
            if not word or len(word) != slot['length']:
                continue
            
            if not self._validate_word_placement(slot, word, grid):
                continue
            
            score = self._compute_word_score(slot, word, grid, pattern)
            candidates.append((word, score))
        
        return candidates

    def _compute_word_score(self, slot: Dict, word: str, grid: List[List[str]], pattern: str) -> int:
        score = 0
        
        for i, (pattern_char, word_char) in enumerate(zip(pattern, word)):
            if pattern_char != '.':
                if pattern_char == word_char:
                    score += 3
                else:
                    score -= 5
        
        slot_key = (slot['number'], slot['direction'])
        if slot_key in self.slot_graph:
            for other_key in self.slot_graph[slot_key]:
                other_slot = self._locate_slot(other_key)
                if not other_slot:
                    continue
                
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
                    if other_char != '.':
                        if other_char == word[word_pos]:
                            score += 3
                        else:
                            score -= 5
        
        exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
        if exact_match and exact_match['word'].upper() == word:
            score += 5
        
        return max(0, score)

    def _verify_future_slots(self, start_idx: int, slot_indices: List[int], ordered_slots: List[Dict]) -> bool:
        for i in range(start_idx, min(start_idx + 2, len(slot_indices))):
            original_idx = slot_indices[i]
            slot = self.slots[original_idx]
            candidates = self._evaluate_candidates_with_fallback(slot, self.solution)
            if not candidates:
                return False
        return True

    def _sort_remaining_slots(self, slots: List[Dict]) -> List[Dict]:
        scored = []
        for slot in slots:
            slot_key = (slot['number'], slot['direction'])
            constraint_degree = len(self.slot_graph.get(slot_key, []))
            candidate_count = len(self._evaluate_candidates_with_fallback(slot, self.solution))
            difficulty = constraint_degree * 10 + max(0, 20 - candidate_count)
            scored.append((slot, difficulty))
        
        scored.sort(key=lambda x: -x[1])
        return [slot for slot, _ in scored]

    def _convert_slots_to_indices(self, slots: List[Dict]) -> List[int]:
        slot_to_index = { (slot['number'], slot['direction']): i 
                         for i, slot in enumerate(self.slots) }
        return [slot_to_index[(s['number'], s['direction'])] for s in slots]

    def _apply_state_to_solution(self, state: 'SolverState'):
        for i in range(len(state.grid)):
            for j in range(len(state.grid[i])):
                self.solution[i][j] = state.grid[i][j]

    def _validate_word_placement(self, slot: Dict, word: str, grid: List[List[str]]) -> bool:
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

    def _apply_word_to_grid(self, grid: List[List[str]], slot: Dict, word: str) -> List[List[str]]:
        new_grid = [row[:] for row in grid]
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                new_grid[slot['y']][slot['x'] + i] = char
            else:
                new_grid[slot['y'] + i][slot['x']] = char
        return new_grid

    def _extract_pattern(self, slot: Dict, grid: List[List[str]]) -> str:
        pattern = []
        for i in range(slot['length']):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            pattern.append(grid[y][x] if grid[y][x] != '.' else '.')
        return ''.join(pattern)

    def _predict_candidate_count(self, slot: Dict) -> int:
        try:
            words = self.dict_helper.get_possible_words(
                clue=slot['clue'], max_words=50, length_range=(slot['length'], slot['length'])
            )
            return len(words)
        except:
            return 10

    def _locate_slot(self, slot_key: Tuple[int, str]) -> Optional[Dict]:  
        for slot in self.slots:
            if (slot['number'], slot['direction']) == slot_key:
                return slot
        return None

    def _parse_candidate_word(self, candidate) -> str:
        if isinstance(candidate, dict) and 'word' in candidate:
            return candidate['word'].upper()
        elif isinstance(candidate, str):
            return candidate.upper()
        return None

    def _fetch_dictionary_candidates(self, slot: Dict) -> List:
        try:
            return self.dict_helper.get_possible_words(
                clue=slot['clue'], max_words=200, length_range=(slot['length'], slot['length'])
            )
        except:
            return []

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

    def _fits(self, slot: Dict, word: str) -> bool:
        if not self.constraint_checker.check_word_fits(slot, word):
            return False
        if not self.constraint_checker.check_perpendicular_constraints(slot, word, self.slots):
            return False
        return True

    def _place_word(self, slot: Dict, word: str) -> List[Tuple[int, int]]:
        positions = []
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            
            if self.solution[y][x] == '.':
                self.solution[y][x] = char
                positions.append((x, y))
        
        self.complexity_tracker.increment_operations(len(positions))
        return positions

    def _remove_word(self, positions: List[Tuple[int, int]]):
        for x, y in positions:
            self.solution[y][x] = '.'
        self.complexity_tracker.increment_operations(len(positions))

class SolverState:
    __slots__ = ('grid', 'filled_slots', 'cost', 'slot_index', 'processing_order', 'heuristic', 'priority')
    
    def __init__(self, grid: List[List[str]], filled_slots: Set[Tuple[int, str]], 
                 cost: int, slot_index: int, processing_order: List[Dict]):
        self.grid = grid
        self.filled_slots = filled_slots
        self.cost = cost
        self.slot_index = slot_index
        self.processing_order = processing_order
        self.heuristic = 0
        self.priority = 0
    
    def __lt__(self, other):
        return self.priority < other.priority

def solve_with_hybrid(grid: List[List[str]], clues: Dict[str, List[Dict]], 
                      beam_width: int = 5, switch_threshold: float = 0.7) -> Dict:
    from dictionary_helper import DictionaryHelper
    import os
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dict_path = os.path.join(current_dir, "..", "dictionary")
    dict_helper = DictionaryHelper(dict_path)
    
    solver = HybridSolver(grid, clues, dict_helper, beam_width=beam_width, 
                          switch_threshold=switch_threshold)
    return solver.solve()