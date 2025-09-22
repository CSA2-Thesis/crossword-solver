import logging
from typing import List, Dict, Tuple, Set, Optional
from ..core.base_solver import BaseCrosswordSolver
from ..core.slot_manager import SlotManager
from ..core.constraints import ConstraintChecker

logger = logging.getLogger(__name__)


class DFSSolver(BaseCrosswordSolver):
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper, sample_rate: int = 500):
        super().__init__(grid, clues)
        self.dict_helper = dict_helper
        self.slot_manager = SlotManager(self.solution, clues)
        self.slots = self.slot_manager.get_word_slots()
        self.slot_graph = self.slot_manager.build_slot_graph(self.slots)
        self.constraint_checker = ConstraintChecker(self.solution, self.slot_graph)
        self.slot_candidates: List[Tuple[Dict, List[str]]] = []
        self._mem_sample_count = 0
        self._mem_sample_rate = sample_rate

        logger.info(f"DFSSolver initialized with {len(self.slots)} slots")
        logger.debug("Initial grid state:")
        for row in self.solution:
            logger.debug(' '.join(row))

        # coarse snapshot at init
        self._record_memory_snapshot("_init")

    # Lightweight sampler — only calls the (heavier) snapshot every _mem_sample_rate events
    def _maybe_snapshot(self, label: str = ""):
        try:
            self._mem_sample_count += 1
            if self._mem_sample_count % self._mem_sample_rate == 0:
                self._record_memory_snapshot(label)
        except Exception:
            # never break the solver for tracing issues
            logger.debug("Sampler snapshot failed", exc_info=True)

    def solve(self) -> Dict:
        logger.info("Starting DFS solve")
        self._start_performance_tracking()
        self._record_memory_snapshot("solve:start")

        if not self.slots:
            logger.info("No slots to fill, returning early")
            return self._create_result(True, 0, 0)

        # Collect candidates (with fallbacks)
        self.slot_candidates = self._get_all_slot_candidates()
        if not self.slot_candidates:
            logger.warning("No valid candidates found for some slots after fallbacks")
            self._record_memory_snapshot("solve:no_candidates_after_fallbacks")
            return self._create_result(False, 0, len(self.slots))

        # Order slots by fewest candidates and by constraint degree
        self.slot_candidates.sort(key=lambda x: (len(x[1]), -self._get_slot_constraint_level(x[0])))

        logger.info("Slot processing order:")
        for i, (slot, candidates) in enumerate(self.slot_candidates):
            logger.info(f"  {i+1}. Slot {slot['number']} {slot['direction']}: {len(candidates)} candidates")

        success = self._optimized_dfs(0)

        if success:
            logger.info("Solution found!")
            logger.debug("Final grid state:")
            for row in self.solution:
                logger.debug(' '.join(row))
        else:
            logger.warning("No solution found")

        words_placed = self._count_filled_words()
        self._record_memory_snapshot("solve:end")
        return self._create_result(success, words_placed, len(self.slots))

    def _get_all_slot_candidates(self) -> List[Tuple[Dict, List[str]]]:
        self._record_memory_snapshot("_get_all_slot_candidates:start")
        slot_candidates: List[Tuple[Dict, List[str]]] = []

        for slot in self.slots:
            # cheaper sampling per slot
            self._maybe_snapshot(f"_get_all_slot_candidates:slot:{slot['number']}")
            logger.debug(f"Getting candidates for slot {slot['number']} {slot['direction']}")

            candidates = self._get_constrained_candidates(slot)

            if not candidates:
                logger.warning(f"No candidates found for slot {slot['number']} {slot['direction']}, trying fallback")
                candidates = self._attempt_fallback_for_slot(slot)

                if not candidates:
                    logger.warning(f"Fallback also failed for slot {slot['number']} -> aborting candidate collection")
                    self._record_memory_snapshot("_get_all_slot_candidates:failed")
                    return []

            slot_candidates.append((slot, candidates))
            self._maybe_snapshot(f"_get_all_slot_candidates:collected_slot:{slot['number']}")

        self._record_memory_snapshot("_get_all_slot_candidates:end")
        return slot_candidates

    def _get_constrained_candidates(self, slot: Dict) -> List[str]:
        self._maybe_snapshot("_get_constrained_candidates:start")
        self.complexity_tracker.increment_operations()

        slot_len = slot['length']
        valid_candidates: List[str] = []

        # 1) exact clue match
        try:
            if hasattr(self.dict_helper, 'find_word_by_exact_clue'):
                exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
                if exact_match and len(exact_match.get('word', '')) == slot_len:
                    word = exact_match['word'].upper()
                    if self._word_fits(slot, word):
                        valid_candidates.append(word)
        except Exception:
            logger.exception("Error while checking exact clue match")

        # 2) explicit answer fallback (if slot has answer)
        try:
            if not valid_candidates and slot.get('answer'):
                if hasattr(self.dict_helper, 'get_clue_for_word'):
                    answer_info = self.dict_helper.get_clue_for_word(slot['answer'])
                    if answer_info and answer_info.get('clue', '').lower() == slot['clue'].lower():
                        word = slot['answer'].upper()
                        if len(word) == slot_len and self._word_fits(slot, word):
                            valid_candidates.append(word)
        except Exception:
            logger.exception("Error while checking slot 'answer'")

        # 3) dictionary candidate fetch (normal mode)
        try:
            dict_candidates = []
            # try the common signature first
            try:
                dict_candidates = self.dict_helper.get_possible_words(
                    clue=slot['clue'],
                    max_words=1000,
                    length_range=(slot_len, slot_len)
                )
            except TypeError:
                # if signature differs, try without clue
                try:
                    dict_candidates = self.dict_helper.get_possible_words(
                        max_words=1000,
                        length_range=(slot_len, slot_len)
                    )
                except Exception:
                    dict_candidates = []
            except Exception:
                dict_candidates = []

            # extract and filter
            for candidate in dict_candidates:
                word = candidate['word'].upper() if isinstance(candidate, dict) and 'word' in candidate else (candidate.upper() if isinstance(candidate, str) else None)
                if not word:
                    continue
                if len(word) == slot_len and self._word_fits(slot, word):
                    valid_candidates.append(word)
        except Exception:
            logger.exception("Error while fetching dictionary candidates")

        # Deduplicate while preserving order
        seen = set()
        filtered = []
        for w in valid_candidates:
            if w not in seen:
                filtered.append(w)
                seen.add(w)

        self._maybe_snapshot("_get_constrained_candidates:end")
        return filtered

    def _attempt_fallback_for_slot(self, slot: Dict) -> List[str]:
        """
        Progressive fallback strategies:
        1) Ask dict_helper for known spelling variants of given 'answer' (if available).
        2) Increase search size for get_possible_words (bigger max_words).
        3) Use pattern-based lookup if dict_helper supports it.
        4) Heuristic filter: take many same-length words and prefer words matching fixed letters.
        Note: We require the word to fit physically in the slot (using _word_fits).
        """
        self._record_memory_snapshot("_attempt_fallback_for_slot:start")
        slot_len = slot['length']
        candidates_set = []
        seen = set()

        # Helper to push a word
        def push_word(w: str):
            if not w: return
            w = w.upper()
            if len(w) != slot_len: return
            if w in seen: return
            if self._word_fits(slot, w):
                seen.add(w)
                candidates_set.append(w)

        # 1) spelling variants API (if dict_helper provides it)
        try:
            if slot.get('answer') and hasattr(self.dict_helper, 'get_spelling_variants'):
                try:
                    variants = self.dict_helper.get_spelling_variants(slot['answer'])
                    for v in variants:
                        push_word(v)
                    if candidates_set:
                        logger.info(f"Found {len(candidates_set)} fallback variant(s) from spelling variants for slot {slot['number']}")
                        self._record_memory_snapshot("_attempt_fallback_for_slot:variants")
                        return candidates_set
                except Exception:
                    logger.exception("Error calling dict_helper.get_spelling_variants")
        except Exception:
            logger.exception("Error in spelling-variants step")

        # 2) broaden get_possible_words (larger max_words)
        try:
            large_candidates = []
            try:
                large_candidates = self.dict_helper.get_possible_words(
                    clue=slot['clue'],
                    max_words=5000,
                    length_range=(slot_len, slot_len)
                )
            except TypeError:
                # alternative signature
                try:
                    large_candidates = self.dict_helper.get_possible_words(
                        max_words=5000,
                        length_range=(slot_len, slot_len)
                    )
                except Exception:
                    large_candidates = []
            except Exception:
                large_candidates = []

            for candidate in large_candidates:
                word = candidate['word'].upper() if isinstance(candidate, dict) and 'word' in candidate else (candidate.upper() if isinstance(candidate, str) else None)
                push_word(word)
            if candidates_set:
                logger.info(f"Found {len(candidates_set)} fallback(s) via broadened possible_words for slot {slot['number']}")
                self._record_memory_snapshot("_attempt_fallback_for_slot:large_possible_words")
                return candidates_set
        except Exception:
            logger.exception("Error in broadened possible_words step")

        # 3) pattern-based lookup (if available)
        try:
            pattern = self._get_slot_pattern(slot)
            if pattern and hasattr(self.dict_helper, 'get_words_by_pattern'):
                try:
                    pattern_candidates = self.dict_helper.get_words_by_pattern(pattern=pattern, clue=slot.get('clue', ''), max_words=2000)
                    for candidate in pattern_candidates:
                        word = candidate['word'].upper() if isinstance(candidate, dict) and 'word' in candidate else (candidate.upper() if isinstance(candidate, str) else None)
                        push_word(word)
                    if candidates_set:
                        logger.info(f"Found {len(candidates_set)} fallback(s) via pattern lookup for slot {slot['number']}")
                        self._record_memory_snapshot("_attempt_fallback_for_slot:pattern")
                        return candidates_set
                except Exception:
                    logger.exception("Error calling dict_helper.get_words_by_pattern")
        except Exception:
            logger.exception("Error in pattern-based fallback")

        # 4) heuristic: retrieve a large pool of same-length words and prefer those matching fixed letters
        try:
            pattern = self._get_slot_pattern(slot)
            fixed_positions = [i for i, ch in enumerate(pattern) if ch != '.']

            candidate_pool = []
            try:
                candidate_pool = self.dict_helper.get_possible_words(max_words=5000, length_range=(slot_len, slot_len))
            except TypeError:
                try:
                    candidate_pool = self.dict_helper.get_possible_words(clue=slot.get('clue', ''), max_words=5000, length_range=(slot_len, slot_len))
                except Exception:
                    candidate_pool = []
            except Exception:
                candidate_pool = []

            scored = []
            for candidate in candidate_pool:
                word = candidate['word'].upper() if isinstance(candidate, dict) and 'word' in candidate else (candidate.upper() if isinstance(candidate, str) else None)
                if not word or len(word) != slot_len:
                    continue
                # score how many fixed positions match
                score = 0
                for idx in fixed_positions:
                    if pattern[idx] == word[idx]:
                        score += 1
                if score > 0:
                    scored.append((score, word))

            # prefer highest scores
            scored.sort(key=lambda x: (-x[0], x[1]))
            for _, word in scored[:200]:  # limit how many we try
                push_word(word)

            if candidates_set:
                logger.info(f"Found {len(candidates_set)} heuristic fallback(s) for slot {slot['number']}")
                self._record_memory_snapshot("_attempt_fallback_for_slot:heuristic")
                return candidates_set
        except Exception:
            logger.exception("Error in heuristic fallback")

        # nothing found
        self._record_memory_snapshot("_attempt_fallback_for_slot:end")
        return candidates_set

    def _get_slot_constraint_level(self, slot: Dict) -> int:
        self._maybe_snapshot("_get_slot_constraint_level")
        slot_key = (slot['number'], slot['direction'])
        return len(self.slot_graph.get(slot_key, set()))

    def _get_slot_pattern(self, slot: Dict) -> str:
        self._maybe_snapshot("_get_slot_pattern")
        pattern_chars = []
        for i in range(slot['length']):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i

            if 0 <= y < len(self.solution) and 0 <= x < len(self.solution[0]):
                pattern_chars.append(self.solution[y][x])
            else:
                pattern_chars.append('#')
        return ''.join(pattern_chars)

    def _word_fits(self, slot: Dict, word: str) -> bool:
        self._maybe_snapshot("_word_fits")
        # basic grid check
        for i, ch in enumerate(word):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i

            if not (0 <= y < len(self.solution) and 0 <= x < len(self.solution[0])):
                return False
            cell = self.solution[y][x]
            if cell != '.' and cell != ch:
                return False

        # use ConstraintChecker if available for deeper checks
        try:
            if hasattr(self.constraint_checker, 'check_word_fits'):
                ok = self.constraint_checker.check_word_fits(slot, word)
                if not ok:
                    return False
            if hasattr(self.constraint_checker, 'check_perpendicular_constraints'):
                ok2 = self.constraint_checker.check_perpendicular_constraints(slot, word, self.slots)
                if not ok2:
                    return False
        except Exception:
            logger.exception("Constraint checker error during _word_fits")
            return False

        return True

    def _optimized_dfs(self, slot_index: int) -> bool:
        self._maybe_snapshot(f"_optimized_dfs:enter:{slot_index}")
        if slot_index >= len(self.slot_candidates):
            return True

        slot, candidates = self.slot_candidates[slot_index]
        logger.debug(f"Processing slot {slot['number']} {slot['direction']} (index {slot_index})")

        for word in candidates:
            self._maybe_snapshot(f"_optimized_dfs:try:{slot['number']}:{word}")
            logger.debug(f"Trying word '{word}' in slot {slot['number']}")

            if not self._word_fits(slot, word):
                logger.debug(f"Word '{word}' no longer fits due to changed constraints")
                continue

            placed_positions = self._place_word(slot, word)
            logger.debug(f"Placed word '{word}', affected {len(placed_positions)} positions")
            self._maybe_snapshot(f"_optimized_dfs:placed:{slot['number']}:{word}")

            affected_slot_indices = self._get_affected_slots(slot)
            future_affected_indices = {idx for idx in affected_slot_indices if idx > slot_index}

            if not self._check_forward_constraints(future_affected_indices):
                logger.debug(f"Forward check failed for future slots after placing '{word}'")
                self._remove_word(placed_positions)
                continue

            if self._optimized_dfs(slot_index + 1):
                return True

            self._remove_word(placed_positions)
            logger.debug(f"Backtracked word '{word}' from slot {slot['number']}")

        logger.debug(f"Exhausted all candidates for slot {slot['number']}")
        self._maybe_snapshot(f"_optimized_dfs:exit:{slot_index}")
        return False

    def _check_forward_constraints(self, affected_slot_indices: Set[int]) -> bool:
        self._maybe_snapshot("_check_forward_constraints")
        for slot_idx in affected_slot_indices:
            if slot_idx >= len(self.slot_candidates):
                continue

            slot, _ = self.slot_candidates[slot_idx]
            current_candidates = self._get_constrained_candidates(slot)
            if not current_candidates:
                logger.debug(f"Forward check failed: slot {slot['number']} has no valid candidates")
                return False

        return True

    def _get_affected_slots(self, placed_slot: Dict) -> Set[int]:
        self._maybe_snapshot("_get_affected_slots")
        affected_indices = set()
        placed_slot_key = (placed_slot['number'], placed_slot['direction'])

        if placed_slot_key in self.slot_graph:
            for other_slot_key in self.slot_graph[placed_slot_key]:
                for idx, (slot, _) in enumerate(self.slot_candidates):
                    if (slot['number'], slot['direction']) == other_slot_key:
                        affected_indices.add(idx)
                        break

        return affected_indices

    def _place_word(self, slot: Dict, word: str) -> List[Tuple[int, int]]:
        self._maybe_snapshot("_place_word")
        positions: List[Tuple[int, int]] = []
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
        self._maybe_snapshot("_remove_word")
        for x, y in positions:
            self.solution[y][x] = '.'
        self.complexity_tracker.increment_operations(len(positions))

    def _count_filled_words(self) -> int:
        self._maybe_snapshot("_count_filled_words")
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

        return filled_count


def solve_with_dfs(grid: List[List[str]], clues: Dict[str, List[Dict]]) -> Dict:
    # keep the original behavior to find dictionary helper (relative import)
    from dictionary_helper import DictionaryHelper
    import os

    current_dir = os.path.dirname(os.path.abspath(__file__))
    dict_path = os.path.join(current_dir, "..", "dictionary")
    dict_helper = DictionaryHelper(dict_path)

    solver = DFSSolver(grid, clues, dict_helper)
    return solver.solve()
