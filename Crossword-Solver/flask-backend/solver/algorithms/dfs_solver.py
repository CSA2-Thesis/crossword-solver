from typing import List, Dict, Tuple
from ..core.base_solver import BaseCrosswordSolver

class DFSSolver(BaseCrosswordSolver):
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper, enable_memory_profiling: bool = False):
        super().__init__(grid, clues, enable_memory_profiling)
        self.setup_slots(dict_helper)
        self.slot_candidates = []

    def solve(self) -> Dict:
        self._start_performance_tracking()
        
        if not self.slots:
            return self._create_result(True, 0, 0)

        self.slot_candidates = self.get_slot_candidates()
        if not self.slot_candidates:
            return self._create_result(False, 0, len(self.slots))

        self.slot_candidates.sort(key=lambda x: (
            -self.slot_certainty.get((x[0]['number'], x[0]['direction']), 0),
            len(x[1])
        ))

        success = self.dfs(0)
        words_placed = self.count_filled_words()
        return self._create_result(success, words_placed, len(self.slots))

    def get_slot_candidates(self) -> List[Tuple[Dict, List[str]]]:
        candidates = []
        for slot in self.slots:
            candidate_tuples = self.get_candidates(slot, self.solution)
            slot_candidates = [word for word, score in candidate_tuples]
            candidates.append((slot, slot_candidates))
        return candidates

    def dfs(self, slot_idx: int) -> bool:
        if slot_idx >= len(self.slot_candidates):
            return True

        slot, candidates = self.slot_candidates[slot_idx]

        if not candidates:
            return False

        for word in candidates:
            if not self.validate_placement(slot, word, self.solution):
                continue

            positions = self.place_word(slot, word)

            if not self.check_future_constraints(slot_idx + 1):
                self.remove_word(positions)
                continue

            if self.dfs(slot_idx + 1):
                return True

            self.remove_word(positions)

        return False

    def check_future_constraints(self, start_idx: int) -> bool:
        lookahead = min(3, len(self.slot_candidates) - start_idx)
        
        for i in range(start_idx, start_idx + lookahead):
            if i >= len(self.slot_candidates):
                continue
                
            slot, _ = self.slot_candidates[i]
            has_valid = False
            for candidate_word in self.slot_candidates[i][1]:
                if self.validate_placement(slot, candidate_word, self.solution):
                    has_valid = True
                    break
            
            if not has_valid:
                return False
        
        return True

    def place_word(self, slot: Dict, word: str) -> List[Tuple[int, int]]:
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

    def remove_word(self, positions: List[Tuple[int, int]]):
        for x, y in positions:
            self.solution[y][x] = '.'