import logging
from typing import List, Dict, Tuple, Set, Optional
from ..core.base_solver import BaseCrosswordSolver
from ..core.slot_manager import SlotManager
from ..core.constraints import ConstraintChecker

logger = logging.getLogger(__name__)


class DFSSolver(BaseCrosswordSolver):
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper):
        super().__init__(grid, clues, False)
        self.dict_helper = dict_helper
        self.slot_manager = SlotManager(self.solution, clues)
        self.slots = self.slot_manager.get_word_slots()
        self.slot_graph = self.slot_manager.build_slot_graph(self.slots)
        self.constraint_checker = ConstraintChecker(self.solution, self.slot_graph)
        self.slot_candidates: List[Tuple[Dict, List[str]]] = []

        logger.info(f"DFSSolver initialized with {len(self.slots)} slots")
        logger.debug("Initial grid state:")
        for row in self.solution:
            logger.debug(' '.join(row))

    def solve(self) -> Dict:
        logger.info("Starting DFS solve")
        self._start_performance_tracking()
        
        if not self.slots:
            logger.info("No slots to fill")
            return self._create_result(True, 0, 0)

        self.slot_candidates = self._get_slot_candidates()
        if not self.slot_candidates:
            logger.warning("No valid candidates found")
            return self._create_result(False, 0, len(self.slots))

        self.slot_candidates.sort(key=lambda x: (len(x[1]), -self._get_constraint_level(x[0])))

        logger.info("Slot processing order:")
        for i, (slot, candidates) in enumerate(self.slot_candidates):
            logger.info(f"  {i+1}. Slot {slot['number']} {slot['direction']}: {len(candidates)} candidates")

        success = self._dfs(0)

        if success:
            logger.info("Solution found!")
            logger.debug("Final grid state:")
            for row in self.solution:
                logger.debug(' '.join(row))
        else:
            logger.warning("No solution found")

        words_placed = self._count_filled_words()
        return self._create_result(success, words_placed, len(self.slots))

    def _get_slot_candidates(self) -> List[Tuple[Dict, List[str]]]:
        candidates_list = []

        for slot in self.slots:
            logger.debug(f"Getting candidates for slot {slot['number']} {slot['direction']}")

            candidates = self._get_candidates(slot)

            if not candidates:
                logger.warning(f"No candidates for slot {slot['number']}, trying fallback")
                candidates = self._get_fallback_candidates(slot)

                if not candidates:
                    logger.warning(f"Fallback failed for slot {slot['number']}")
                    return []

            candidates_list.append((slot, candidates))

        return candidates_list

    def _get_candidates(self, slot: Dict) -> List[str]:
        self.complexity_tracker.increment_operations()

        slot_len = slot['length']
        valid_words = []

        try:
            if hasattr(self.dict_helper, 'find_word_by_exact_clue'):
                exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
                if exact_match and len(exact_match.get('word', '')) == slot_len:
                    word = exact_match['word'].upper()
                    if self._fits(slot, word):
                        valid_words.append(word)
        except Exception:
            logger.exception("Error in exact clue match")

        try:
            if not valid_words and slot.get('answer'):
                if hasattr(self.dict_helper, 'get_clue_for_word'):
                    answer_info = self.dict_helper.get_clue_for_word(slot['answer'])
                    if answer_info and answer_info.get('clue', '').lower() == slot['clue'].lower():
                        word = slot['answer'].upper()
                        if len(word) == slot_len and self._fits(slot, word):
                            valid_words.append(word)
        except Exception:
            logger.exception("Error checking slot answer")

        try:
            dict_words = self._get_dict_candidates(slot, slot_len)
            for candidate in dict_words:
                word = self._extract_word(candidate)
                if word and len(word) == slot_len and self._fits(slot, word):
                    valid_words.append(word)
        except Exception:
            logger.exception("Error getting dictionary candidates")

        return list(dict.fromkeys(valid_words))

    def _get_dict_candidates(self, slot: Dict, slot_len: int) -> List:
        try:
            return self.dict_helper.get_possible_words(
                clue=slot['clue'], max_words=1000, length_range=(slot_len, slot_len)
            )
        except TypeError:
            return self.dict_helper.get_possible_words(max_words=1000, length_range=(slot_len, slot_len))
        except Exception:
            return []

    def _extract_word(self, candidate) -> Optional[str]:
        if isinstance(candidate, dict) and 'word' in candidate:
            return candidate['word'].upper()
        elif isinstance(candidate, str):
            return candidate.upper()
        return None

    def _get_fallback_candidates(self, slot: Dict) -> List[str]:
        slot_len = slot['length']
        candidates = []
        seen = set()

        def add_candidate(word: str):
            if not word or len(word) != slot_len:
                return
            word = word.upper()
            if word not in seen and self._fits(slot, word):
                seen.add(word)
                candidates.append(word)

        if slot.get('answer') and hasattr(self.dict_helper, 'get_spelling_variants'):
            try:
                variants = self.dict_helper.get_spelling_variants(slot['answer'])
                for variant in variants:
                    add_candidate(variant)
                if candidates:
                    logger.info(f"Found {len(candidates)} spelling variants for slot {slot['number']}")
                    self._increment_fallback_count()
                    return candidates
            except Exception:
                logger.exception("Error getting spelling variants")

        broad_candidates = self._get_broad_candidates(slot, slot_len)
        for candidate in broad_candidates:
            add_candidate(self._extract_word(candidate))
        
        if candidates:
            logger.info(f"Found {len(candidates)} broad matches for slot {slot['number']}")
            self._increment_fallback_count()
            return candidates

        pattern_candidates = self._get_pattern_candidates(slot, slot_len)
        for candidate in pattern_candidates:
            add_candidate(self._extract_word(candidate))
        
        if candidates:
            logger.info(f"Found {len(candidates)} pattern matches for slot {slot['number']}")
            self._increment_fallback_count()
            return candidates

        heuristic_candidates = self._get_heuristic_candidates(slot, slot_len)
        for candidate in heuristic_candidates:
            add_candidate(self._extract_word(candidate))
        
        if candidates:
            logger.info(f"Found {len(candidates)} heuristic matches for slot {slot['number']}")
            self._increment_fallback_count()

        return candidates

    def _get_broad_candidates(self, slot: Dict, slot_len: int) -> List:
        try:
            return self.dict_helper.get_possible_words(
                clue=slot['clue'], max_words=5000, length_range=(slot_len, slot_len)
            )
        except TypeError:
            return self.dict_helper.get_possible_words(max_words=5000, length_range=(slot_len, slot_len))
        except Exception:
            return []

    def _get_pattern_candidates(self, slot: Dict, slot_len: int) -> List:
        pattern = self._get_pattern(slot)
        if pattern and hasattr(self.dict_helper, 'get_words_by_pattern'):
            try:
                return self.dict_helper.get_words_by_pattern(
                    pattern=pattern, clue=slot.get('clue', ''), max_words=2000
                )
            except Exception:
                logger.exception("Error in pattern matching")
        return []

    def _get_heuristic_candidates(self, slot: Dict, slot_len: int) -> List:
        pattern = self._get_pattern(slot)
        if not pattern:
            return []

        fixed_positions = [i for i, ch in enumerate(pattern) if ch != '.']
        candidate_pool = self._get_broad_candidates(slot, slot_len)
        
        scored = []
        for candidate in candidate_pool:
            word = self._extract_word(candidate)
            if not word or len(word) != slot_len:
                continue
            
            score = sum(1 for idx in fixed_positions if pattern[idx] == word[idx])
            if score > 0:
                scored.append((score, word))

        scored.sort(key=lambda x: (-x[0], x[1]))
        return [word for _, word in scored[:200]]

    def _get_constraint_level(self, slot: Dict) -> int:
        slot_key = (slot['number'], slot['direction'])
        return len(self.slot_graph.get(slot_key, set()))

    def _get_pattern(self, slot: Dict) -> str:
        pattern = []
        for i in range(slot['length']):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i

            if 0 <= y < len(self.solution) and 0 <= x < len(self.solution[0]):
                pattern.append(self.solution[y][x])
            else:
                pattern.append('#')
        return ''.join(pattern)

    def _fits(self, slot: Dict, word: str) -> bool:
        for i, ch in enumerate(word):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i

            if not (0 <= y < len(self.solution) and 0 <= x < len(self.solution[0])):
                return False
            if self.solution[y][x] != '.' and self.solution[y][x] != ch:
                return False

        try:
            if (hasattr(self.constraint_checker, 'check_word_fits') and 
                not self.constraint_checker.check_word_fits(slot, word)):
                return False
                
            if (hasattr(self.constraint_checker, 'check_perpendicular_constraints') and 
                not self.constraint_checker.check_perpendicular_constraints(slot, word, self.slots)):
                return False
        except Exception:
            logger.exception("Constraint check error")
            return False

        return True

    def _dfs(self, slot_idx: int) -> bool:
        if slot_idx >= len(self.slot_candidates):
            return True

        slot, candidates = self.slot_candidates[slot_idx]
        logger.debug(f"Processing slot {slot['number']} {slot['direction']} (index {slot_idx})")

        for word in candidates:
            logger.debug(f"Trying '{word}' in slot {slot['number']}")

            if not self._fits(slot, word):
                logger.debug(f"Word '{word}' doesn't fit")
                continue

            placed_positions = self._place_word(slot, word)
            logger.debug(f"Placed '{word}', affected {len(placed_positions)} cells")

            affected_slots = self._get_affected_slots(slot)
            future_slots = {idx for idx in affected_slots if idx > slot_idx}

            if not self._check_future_constraints(future_slots):
                logger.debug(f"Future constraints failed for '{word}'")
                self._remove_word(placed_positions)
                continue

            if self._dfs(slot_idx + 1):
                return True

            self._remove_word(placed_positions)
            logger.debug(f"Backtracked '{word}' from slot {slot['number']}")

        logger.debug(f"No solution found for slot {slot['number']}")
        return False

    def _check_future_constraints(self, affected_slots: Set[int]) -> bool:
        for slot_idx in affected_slots:
            if slot_idx >= len(self.slot_candidates):
                continue

            slot, _ = self.slot_candidates[slot_idx]
            current_candidates = self._get_candidates(slot)
            if not current_candidates:
                logger.debug(f"Slot {slot['number']} has no candidates")
                return False
        return True

    def _get_affected_slots(self, placed_slot: Dict) -> Set[int]:
        affected = set()
        placed_key = (placed_slot['number'], placed_slot['direction'])

        if placed_key in self.slot_graph:
            for other_key in self.slot_graph[placed_key]:
                for idx, (slot, _) in enumerate(self.slot_candidates):
                    if (slot['number'], slot['direction']) == other_key:
                        affected.add(idx)
                        break
        return affected

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


def solve_with_dfs(grid: List[List[str]], clues: Dict[str, List[Dict]]) -> Dict:
    from dictionary_helper import DictionaryHelper
    import os

    current_dir = os.path.dirname(os.path.abspath(__file__))
    dict_path = os.path.join(current_dir, "..", "dictionary")
    dict_helper = DictionaryHelper(dict_path)

    solver = DFSSolver(grid, clues, dict_helper)
    return solver.solve()