import logging
from typing import List, Dict, Set, Tuple
from ..core.base_solver import BaseCrosswordSolver
from ..core.slot_manager import SlotManager
from ..core.constraints import ConstraintChecker

logger = logging.getLogger(__name__)

class HybridSolver(BaseCrosswordSolver):
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper):
        super().__init__(grid, clues)
        self.dict_helper = dict_helper
        self.slot_manager = SlotManager(self.solution, clues)
        # record snapshot after slot manager initializes
        self._record_memory_snapshot("init:before_get_word_slots")
        self.slots = self.slot_manager.get_word_slots()
        self._record_memory_snapshot("init:after_get_word_slots")
        self.slot_graph = self.slot_manager.build_slot_graph(self.slots)
        self._record_memory_snapshot("init:after_build_slot_graph")
        self.constraint_checker = ConstraintChecker(self.solution, self.slot_graph)
        self.slot_candidates: List[Tuple[Dict, List[Tuple[str, int]]]] = []
        self.fallback_attempted = set()

    def solve(self) -> Dict:
        logger.info("Starting hybrid solve")
        self._start_performance_tracking()
        self._record_memory_snapshot("solve:start")
        
        if not self.slots:
            logger.info("No slots to fill, returning early")
            return self._create_result(True, 0, 0)
        
        self.slot_candidates = self._get_all_scored_candidates()
        if not self.slot_candidates:
            logger.warning("No valid candidates found for some slots")
            self._record_memory_snapshot("solve:no_candidates")
            return self._create_result(False, 0, len(self.slots))
        
        # Sort slots by number of candidates
        self.slot_candidates.sort(key=lambda x: len(x[1]))
        self._record_memory_snapshot("solve:after_sort_slots")
        
        logger.info("Slot processing order:")
        for i, (slot, candidates) in enumerate(self.slot_candidates):
            logger.info(f"  {i+1}. Slot {slot['number']} {slot['direction']}: {len(candidates)} candidates")
        
        success = self._heuristic_dfs(0)
        
        if not success and self.fallback_attempted:
            logger.info("Retrying solve with fallback system for ambiguous words")
            # record snapshot before fallback attempt
            self._record_memory_snapshot("solve:before_fallback_retry")
            success = self._heuristic_dfs(0, allow_fallback=True)
            self._record_memory_snapshot("solve:after_fallback_retry")
        
        self._record_memory_snapshot("solve:end")
        
        if success:
            logger.info("Solution found!")
        else:
            logger.warning("No solution found")
        
        words_placed = self._count_filled_words()
        return self._create_result(success, words_placed, len(self.slots))

    def _get_all_scored_candidates(self) -> List[Tuple[Dict, List[Tuple[str, int]]]]:
        self._record_memory_snapshot("_get_all_scored_candidates:start")
        slot_candidates = []
        
        for slot in self.slots:
            self._record_memory_snapshot(f"_get_all_scored_candidates:slot_start:{slot['number']}")
            logger.debug(f"Getting scored candidates for slot {slot['number']} {slot['direction']}")
            candidates = self._get_scored_candidates(slot)
            
            if not candidates:
                logger.warning(f"No candidates found for slot {slot['number']} {slot['direction']}")
                # mark slot for fallback later
                self.fallback_attempted.add((slot['number'], slot['direction']))
                self._record_memory_snapshot(f"_get_all_scored_candidates:marked_fallback:{slot['number']}")
                continue
            
            slot_candidates.append((slot, candidates))
            logger.debug(f"Found {len(candidates)} scored candidates for slot {slot['number']}")
            self._record_memory_snapshot(f"_get_all_scored_candidates:slot_end:{slot['number']}")
        
        self._record_memory_snapshot("_get_all_scored_candidates:end")
        return slot_candidates

    def _get_scored_candidates(self, slot: Dict, allow_fallback: bool=False) -> List[Tuple[str, int]]:
        self._record_memory_snapshot(f"_get_scored_candidates:start:{slot.get('number', 'unknown')}")
        self.complexity_tracker.increment_operations()
        candidates = []
        
        # --- try dictionary matches ---
        try:
            dict_candidates = self.dict_helper.get_possible_words(
                clue=slot['clue'],
                max_words=1000,
                length_range=(slot['length'], slot['length'])
            )
        except Exception:
            # If dict_helper signature differs or fails, try a more permissive call
            try:
                dict_candidates = self.dict_helper.get_possible_words(
                    max_words=1000,
                    length_range=(slot['length'], slot['length'])
                )
            except Exception:
                dict_candidates = []
                logger.debug(f"_get_scored_candidates: dict_helper.get_possible_words failed for slot {slot.get('number')}")

        for candidate in dict_candidates:
            try:
                word = candidate['word'].upper() if isinstance(candidate, dict) and 'word' in candidate else (candidate.upper() if isinstance(candidate, str) else None)
            except Exception:
                word = None

            if not word:
                continue

            if len(word) == slot['length'] and self._word_fits(slot, word):
                score = self._calculate_heuristic(slot, word)
                candidates.append((word, score))
        
        # --- fallback: alternative spellings ---
        if not candidates and allow_fallback:
            # be defensive: only call if helper provides the feature
            if hasattr(self.dict_helper, 'get_alternative_spellings'):
                try:
                    alt_words = self.dict_helper.get_alternative_spellings(slot['clue'], slot['length'])
                except Exception:
                    alt_words = []
                if alt_words:
                    logger.warning(f"Using fallback spellings for slot {slot['number']} {slot['direction']}")
                    for word in alt_words:
                        try:
                            w = word.upper()
                        except Exception:
                            continue
                        if len(w) == slot['length'] and self._word_fits(slot, w):
                            score = self._calculate_heuristic(slot, w)
                            candidates.append((w, score))
                    self._record_memory_snapshot(f"_get_scored_candidates:fallback_used:{slot.get('number')}")
            else:
                self._record_memory_snapshot(f"_get_scored_candidates:no_fallback_api:{slot.get('number')}")
        
        self._record_memory_snapshot(f"_get_scored_candidates:end:{slot.get('number', 'unknown')}")
        return candidates

    # -------------------------------
    # Heuristic DFS with fallback
    # -------------------------------
    def _heuristic_dfs(self, slot_index: int, allow_fallback: bool=False) -> bool:
        self._record_memory_snapshot(f"_heuristic_dfs:start:{slot_index}")
        if slot_index >= len(self.slot_candidates):
            self._record_memory_snapshot(f"_heuristic_dfs:complete:{slot_index}")
            return True
        
        slot, scored_candidates = self.slot_candidates[slot_index]
        logger.debug(f"Processing slot {slot['number']} {slot['direction']} (index {slot_index})")
        
        # Re-fetch candidates if fallback is enabled for this slot
        if allow_fallback and (slot['number'], slot['direction']) in self.fallback_attempted:
            self._record_memory_snapshot(f"_heuristic_dfs:refetch_with_fallback:{slot['number']}")
            scored_candidates = self._get_scored_candidates(slot, allow_fallback=True)
        
        # If there are still no candidates after fallback, return False early
        if not scored_candidates:
            self._record_memory_snapshot(f"_heuristic_dfs:no_candidates:{slot['number']}")
            return False
        
        # sort by descending score (best first)
        scored_candidates.sort(key=lambda x: -x[1])
        self._record_memory_snapshot(f"_heuristic_dfs:sorted_candidates:{slot['number']}")
        
        for word, score in scored_candidates:
            self._record_memory_snapshot(f"_heuristic_dfs:trying:{slot['number']}:{word}")
            logger.debug(f"Trying word '{word}' (score: {score}) in slot {slot['number']}")
            
            if not self._word_fits(slot, word):
                self._record_memory_snapshot(f"_heuristic_dfs:word_does_not_fit:{slot['number']}:{word}")
                continue
            
            placed_positions = self._place_word(slot, word)
            self._record_memory_snapshot(f"_heuristic_dfs:placed:{slot['number']}:{word}")
            
            affected_slot_indices = self._get_affected_slots(slot)
            future_affected_indices = {idx for idx in affected_slot_indices if idx > slot_index}
            
            if not self._check_forward_constraints(future_affected_indices, allow_fallback):
                self._record_memory_snapshot(f"_heuristic_dfs:forward_check_failed:{slot['number']}:{word}")
                self._remove_word(placed_positions)
                self._record_memory_snapshot(f"_heuristic_dfs:removed_after_forward_fail:{slot['number']}:{word}")
                continue
            
            if self._heuristic_dfs(slot_index + 1, allow_fallback):
                self._record_memory_snapshot(f"_heuristic_dfs:success:{slot['number']}:{word}")
                return True
            
            # backtrack
            self._remove_word(placed_positions)
            self._record_memory_snapshot(f"_heuristic_dfs:backtrack:{slot['number']}:{word}")
        
        self._record_memory_snapshot(f"_heuristic_dfs:end:{slot_index}")
        return False

    def _check_forward_constraints(self, affected_slot_indices: Set[int], allow_fallback: bool=False) -> bool:
        self._record_memory_snapshot("_check_forward_constraints:start")
        for slot_idx in affected_slot_indices:
            if slot_idx >= len(self.slot_candidates):
                continue
                
            slot, _ = self.slot_candidates[slot_idx]
            current_candidates = self._get_scored_candidates(slot, allow_fallback=allow_fallback)
            
            if not current_candidates:
                self._record_memory_snapshot(f"_check_forward_constraints:fail:{slot.get('number')}")
                return False
        
        self._record_memory_snapshot("_check_forward_constraints:end")
        return True

    # -------------------------------
    # Grid operations
    # -------------------------------
    def _place_word(self, slot: Dict, word: str) -> List[Tuple[int, int]]:
        self._record_memory_snapshot(f"_place_word:start:{slot.get('number')}")
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
        self._record_memory_snapshot(f"_place_word:end:{slot.get('number')}")
        return positions

    def _remove_word(self, positions: List[Tuple[int, int]]):
        self._record_memory_snapshot("_remove_word:start")
        for x, y in positions:
            self.solution[y][x] = '.'
        self.complexity_tracker.increment_operations(len(positions))
        self._record_memory_snapshot("_remove_word:end")

    def _get_affected_slots(self, placed_slot: Dict) -> Set[int]:
        self._record_memory_snapshot("_get_affected_slots:start")
        affected_indices = set()
        placed_slot_key = (placed_slot['number'], placed_slot['direction'])
        
        if placed_slot_key in self.slot_graph:
            for other_slot_key in self.slot_graph[placed_slot_key]:
                for idx, (slot, _) in enumerate(self.slot_candidates):
                    if (slot['number'], slot['direction']) == other_slot_key:
                        affected_indices.add(idx)
                        break
        self._record_memory_snapshot("_get_affected_slots:end")
        return affected_indices

    def _calculate_heuristic(self, slot: Dict, word: str) -> int:
        self._record_memory_snapshot(f"_calculate_heuristic:start:{slot.get('number')}")
        score = 0
        # simple scoring: prefer intersections + exact matches
        slot_key = (slot['number'], slot['direction'])
        
        if slot_key in self.slot_graph:
            for other_slot_key in self.slot_graph[slot_key]:
                other_slot = None
                for s, _ in self.slot_candidates:
                    if (s['number'], s['direction']) == other_slot_key:
                        other_slot = s
                        break
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
                
                if other_slot['direction'] == 'across':
                    other_char = self.solution[other_slot['y']][other_slot['x'] + other_pos]
                else:
                    other_char = self.solution[other_slot['y'] + other_pos][other_slot['x']]
                
                if other_char != '.' and other_char == word[word_pos]:
                    score += 2
        
        exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
        if exact_match and exact_match['word'].upper() == word:
            score += 5
        self._record_memory_snapshot(f"_calculate_heuristic:end:{slot.get('number')}")
        return score

    def _word_fits(self, slot: Dict, word: str) -> bool:
        self._record_memory_snapshot(f"_word_fits:start:{slot.get('number')}")
        if not self.constraint_checker.check_word_fits(slot, word):
            self._record_memory_snapshot(f"_word_fits:fail_constraint_fit:{slot.get('number')}")
            return False
        if not self.constraint_checker.check_perpendicular_constraints(slot, word, self.slots):
            self._record_memory_snapshot(f"_word_fits:fail_perpendicular:{slot.get('number')}")
            return False
        self._record_memory_snapshot(f"_word_fits:ok:{slot.get('number')}")
        return True

    def _count_filled_words(self) -> int:
        self._record_memory_snapshot("_count_filled_words:start")
        filled_count = 0
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
                filled_count += 1
        self._record_memory_snapshot("_count_filled_words:end")
        return filled_count


def solve_with_hybrid(grid: List[List[str]], clues: Dict[str, List[Dict]]) -> Dict:
    from dictionary_helper import DictionaryHelper
    import os
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dict_path = os.path.join(current_dir, "..", "dictionary")
    dict_helper = DictionaryHelper(dict_path)
    
    solver = HybridSolver(grid, clues, dict_helper)
    return solver.solve()
