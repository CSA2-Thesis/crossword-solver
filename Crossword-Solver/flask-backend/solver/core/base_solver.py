import time
import tracemalloc
from abc import ABC, abstractmethod
from typing import List, Dict
import logging
from ..analysis.complexity import ComplexityTracker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BaseCrosswordSolver(ABC):
    
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]]):
        self.original_grid = [row[:] for row in grid]
        self.height = len(grid)
        self.width = len(grid[0]) if self.height > 0 else 0
        self.clues = clues
        
        self.solution = [
            [cell if cell not in [' ', '.'] else '.' for cell in row] 
            for row in grid
        ]
        
        self.complexity_tracker = ComplexityTracker()
        self.start_time = 0
        self._tracing = False
        self.memory_samples = []  # store memory usage over time
        
    @abstractmethod
    def solve(self) -> Dict:
        pass
        
    def _start_performance_tracking(self):
        self.start_time = time.time()
        tracemalloc.start()
        self._tracing = True
        self.memory_samples.clear()
        self.complexity_tracker.reset()
        self._record_memory_snapshot("start")

    def _record_memory_snapshot(self, label: str = ""):
        """Record a memory snapshot during execution"""
        if self._tracing:
            current, peak = tracemalloc.get_traced_memory()
            current_kb = round(current / 1024.0, 2)
            peak_kb = round(peak / 1024.0, 2)
            self.memory_samples.append(current_kb)
            logger.debug(f"[MEMORY] {label}: current={current_kb} KB, peak={peak_kb} KB")

    def _stop_performance_tracking(self) -> Dict:
        exec_time = time.time() - self.start_time
        
        min_memory_kb = 0.0
        avg_memory_kb = 0.0
        peak_memory_kb = 0.0

        if self._tracing:
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
            "space_complexity": self.complexity_tracker.space_complexity()
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
            "avg_memory_kb": metrics["avg_memory_kb"],
            "peak_memory_kb": metrics["peak_memory_kb"],
            "execution_time": metrics["execution_time"],
            "time_complexity": metrics["time_complexity"],
            "space_complexity": metrics["space_complexity"],
            "words_placed": words_placed,
            "total_words": total_words
        }