import time
import tracemalloc
import random
from abc import ABC, abstractmethod
from typing import List, Dict, Set, Tuple
import logging
from ..analysis.complexity import ComplexityTracker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseCrosswordSolver(ABC):
    
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], enable_memory_profiling: bool = False):
        self.original_grid = [row[:] for row in grid]
        self.height = len(grid)
        self.width = len(grid[0]) if self.height > 0 else 0
        self.clues = clues
        self.enable_memory_profiling = enable_memory_profiling
        
        self.solution = [
            [cell if cell not in [' ', '.'] else '.' for cell in row] 
            for row in grid
        ]
        
        self.complexity_tracker = ComplexityTracker()
        self.start_time = 0
        self._tracing = False
        self.memory_samples = []
        self.fallback_usage_count = 0
        
    @abstractmethod
    def solve(self) -> Dict:
        pass

    def setup_slots(self, dict_helper):
        from ..core.slot_manager import SlotManager
        from ..core.constraints import ConstraintChecker
        
        self.dict_helper = dict_helper
        self.slot_manager = SlotManager(self.solution, self.clues)
        self.slots = self.slot_manager.get_word_slots()
        self.slot_graph = self.slot_manager.build_slot_graph(self.slots)
        self.constraint_checker = ConstraintChecker(self.solution, self.slot_graph)
        self.slot_certainty = {}
        self.analyze_certainty()
        self.slot_ordering = self.get_certainty_ordering()

    def analyze_certainty(self):
        for slot in self.slots:
            clue_words = self.dict_helper.get_words_for_crossword_slot(
                slot['clue'], slot['length'], max_words=100
            )
            
            if len(clue_words) == 1:
                certainty = 3
            elif len(clue_words) > 1:
                certainty = 2
            else:
                pattern = self.get_slot_pattern(slot)
                pattern_words = self.dict_helper.get_words_by_pattern(pattern, None, 10)
                certainty = 1 if pattern_words else 0
                
            self.slot_certainty[(slot['number'], slot['direction'])] = certainty

    def get_certainty_ordering(self) -> List[Dict]:
        certain = []
        uncertain = []
        
        for slot in self.slots:
            certainty = self.slot_certainty[(slot['number'], slot['direction'])]
            if certainty >= 2:
                certain.append(slot)
            else:
                uncertain.append(slot)
        
        certain.sort(key=lambda s: len(self.get_clue_candidates(s)))
        return certain + uncertain

    def get_slot_pattern(self, slot: Dict, grid=None) -> str:
        if grid is None:
            grid = self.solution
        pattern = []
        for i in range(slot['length']):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            pattern.append(grid[y][x] if grid[y][x] != '.' else '.')
        return ''.join(pattern)

    def get_clue_candidates(self, slot: Dict) -> List[Dict]:
        return self.dict_helper.get_words_for_crossword_slot(
            slot['clue'], slot['length'], max_words=200
        )

    def get_pattern_candidates(self, slot: Dict, grid: List[List[str]]) -> List[Dict]:
        pattern = self.get_slot_pattern(slot, grid)
        return self.dict_helper.get_words_by_pattern(pattern, None, 50)

    def validate_placement(self, slot: Dict, word: str, grid: List[List[str]]) -> bool:
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

    def calculate_score(self, slot: Dict, word: str, grid: List[List[str]], candidate_data: Dict) -> int:
        score = 0
        
        exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
        if exact_match and exact_match['word'].upper() == word:
            score += 100
        
        grid_compat = 0
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            
            if grid[y][x] != '.' and grid[y][x] == char:
                grid_compat += 5
        score += grid_compat
        
        score += candidate_data.get('score', 0) // 10
        return score

    def get_candidates(self, slot: Dict, grid: List[List[str]]) -> List[Tuple[str, int]]:
        clue_candidates = self.get_clue_candidates(slot)
        
        fitting = []
        for candidate in clue_candidates:
            word = candidate['word'].upper()
            if self.validate_placement(slot, word, grid):
                fitting.append((word, candidate))
        
        if len(fitting) == 0:
            return self.get_pattern_fallback(slot, grid)
        elif len(fitting) == 1:
            return [(fitting[0][0], 1000)]
        else:
            scored = []
            for word, candidate_data in fitting:
                score = self.calculate_score(slot, word, grid, candidate_data)
                scored.append((word, score))
            
            scored.sort(key=lambda x: (-x[1], random.random()))
            return scored[:3]

    def get_pattern_fallback(self, slot: Dict, grid: List[List[str]]) -> List[Tuple[str, int]]:
        pattern_candidates = self.get_pattern_candidates(slot, grid)
        
        fitting = []
        for candidate in pattern_candidates:
            word = candidate['word'].upper()
            if self.validate_placement(slot, word, grid):
                score = candidate.get('score', 0) // 20
                fitting.append((word, score))
        
        fitting.sort(key=lambda x: -x[1])
        return fitting[:2]

    def count_filled_words(self) -> int:
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
        
    def _start_performance_tracking(self):
        self.start_time = time.time()
        if self.enable_memory_profiling:
            tracemalloc.start()
            self._tracing = True
        self.memory_samples.clear()
        self.complexity_tracker.reset()
        self._record_memory_snapshot("start")

    def _record_memory_snapshot(self, label: str = ""):
        if self._tracing and self.enable_memory_profiling:
            current, peak = tracemalloc.get_traced_memory()
            current_kb = round(current / 1024.0, 2)
            peak_kb = round(peak / 1024.0, 2)
            self.memory_samples.append(current_kb)
            logger.debug(f"[MEMORY] {label}: current={current_kb} KB, peak={peak_kb} KB")

    def _increment_fallback_count(self):
        self.fallback_usage_count += 1

    def _stop_performance_tracking(self) -> Dict:
        exec_time = time.time() - self.start_time
        
        min_memory_kb = 0.0
        avg_memory_kb = 0.0
        peak_memory_kb = 0.0

        if self._tracing and self.enable_memory_profiling:
            current, peak = tracemalloc.get_traced_memory()
            self._record_memory_snapshot("end")
            tracemalloc.stop()
            self._tracing = False

            if self.memory_samples:
                min_memory_kb = round(min(self.memory_samples), 2)
                avg_memory_kb = round(sum(self.memory_samples) / len(self.memory_samples), 2)
            peak_memory_kb = round(peak / 1024.0, 2)

        logger.info(
            f"Memory usage → min: {min_memory_kb} KB, avg: {avg_memory_kb} KB, peak: {peak_memory_kb} KB"
        )
        
        return {
            "execution_time": exec_time,
            "min_memory_kb": min_memory_kb,
            "avg_memory_kb": avg_memory_kb,
            "peak_memory_kb": peak_memory_kb,
            "time_complexity": self.complexity_tracker.time_complexity(),
            "space_complexity": self.complexity_tracker.space_complexity(),
            "fallback_usage_count": self.fallback_usage_count
        }
        
    def _create_result(self, success: bool, words_placed: int, total_words: int) -> Dict:
        metrics = self._stop_performance_tracking()
        
        formatted_solution = []
        for row in self.solution:
            formatted_row = []
            for cell in row:
                formatted_row.append('.' if cell in [' ', '.'] else cell)
            formatted_solution.append(formatted_row)
        
        return {
            "status": "success" if success else "partial",
            "grid": formatted_solution,
            "min_memory_kb": metrics["min_memory_kb"],
            "memory_usage_kb": metrics["avg_memory_kb"],
            "peak_memory_kb": metrics["peak_memory_kb"],
            "execution_time": metrics["execution_time"],
            "time_complexity": metrics["time_complexity"],
            "space_complexity": metrics["space_complexity"],
            "words_placed": words_placed,
            "total_words": total_words,
            "fallback_usage_count": metrics["fallback_usage_count"],
            "memory_profiling_enabled": self.enable_memory_profiling
        }