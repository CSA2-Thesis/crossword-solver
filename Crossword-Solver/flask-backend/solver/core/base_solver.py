import time
import tracemalloc
import random
from abc import ABC, abstractmethod
from typing import List, Dict, Set, Tuple, Any, Optional, Callable
import logging
import copy
from ..analysis.complexity import ComplexityTracker

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class BaseCrosswordSolver(ABC):
    
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], 
                 enable_memory_profiling: bool = False,
                 progress_callback: Optional[Callable] = None,
                 placement_callback: Optional[Callable] = None,
                 backtrack_callback: Optional[Callable] = None):
        self.original_grid = [row[:] for row in grid]
        self.height = len(grid)
        self.width = len(grid[0]) if self.height > 0 else 0
        self.clues = clues
        self.enable_memory_profiling = enable_memory_profiling
        
        # Callbacks for real-time updates
        self.progress_callback = progress_callback
        self.placement_callback = placement_callback
        self.backtrack_callback = backtrack_callback
        
        self.solution = [
            [cell if cell not in [' ', '.'] else '.' for cell in row] 
            for row in grid
        ]
        
        self.complexity_tracker = ComplexityTracker()
        self.start_time = 0
        self._tracing = False
        self.memory_samples = []
        self.fallback_usage_count = 0
        
        # Progress tracking attributes
        self.progress_data = {
            'total_slots': 0,
            'current_progress': 0,
            'progress_history': [],
            'backtrack_events': [],
            'total_backtracked_slots': 0,
            'algorithm_steps': []  # Changed from final_placement_sequence to algorithm_steps
        }
        
        # Unified tracking for algorithm behavior (sent to frontend)
        self.algorithm_steps = []  # All algorithm steps for frontend simulation
        self.current_step_index = 0
        
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
        
        self.progress_data['total_slots'] = len(self.slots)
        logger.info(f"Initialized solver with {self.progress_data['total_slots']} total slots to fill")

    def record_algorithm_step(self, step_type: str, slot: Dict = None, word: str = None, 
                            grid_state: List[List[str]] = None, description: str = "",
                            additional_data: Dict = None):
        """Record algorithm steps for frontend simulation (REAL algorithm behavior)"""
        current_time = time.time() - self.start_time
        
        step = {
            'step_number': self.current_step_index,
            'step_type': step_type,  # 'placement', 'backtrack', 'evaluation', 'heuristic_calc', 'state_expansion', 'completion'
            'timestamp': current_time,
            'description': description,
            'grid_state': copy.deepcopy(grid_state if grid_state else self.solution),
            'cumulative_time': current_time
        }
        
        if slot:
            step.update({
                'slot_number': slot['number'],
                'slot_direction': slot['direction'],
                'position': {'x': slot['x'], 'y': slot['y']},
                'length': slot['length'],
                'clue': slot.get('clue', '')
            })
        
        if word:
            step['word'] = word
            
        if additional_data:
            step.update(additional_data)
        
        self.algorithm_steps.append(step)
        self.current_step_index += 1
        
        # Also store in progress data for timeline
        self.progress_data['algorithm_steps'].append({
            'step_type': step_type,
            'timestamp': current_time,
            'slot_number': slot['number'] if slot else None,
            'slot_direction': slot['direction'] if slot else None,
            'word': word,
            'description': description
        })
        
        logger.debug(f"ALGORITHM STEP: {step_type} - {description}")

    def record_placement(self, slot: Dict, word: str, grid_state: List[List[str]] = None, 
                       additional_data: Dict = None):
        """Record a word placement (REAL placement, not final)"""
        current_time = time.time() - self.start_time
        description = f"Placed '{word}' at slot {slot['number']}{slot['direction'][0]}"
        
        step_data = {
            'step_type': 'placement',
            'slot': slot,
            'word': word,
            'grid_state': grid_state,
            'description': description,
            'additional_data': additional_data
        }
        
        self.record_algorithm_step(**step_data)
        
        # Log the placement
        logger.info(f"PLACEMENT: '{word}' at slot {slot['number']}{slot['direction'][0]} | Time: {current_time:.3f}s")
        
        # Emit real-time placement update
        if self.placement_callback:
            self.placement_callback({
                'slot_number': slot['number'],
                'slot_direction': slot['direction'],
                'word': word,
                'cumulative_time': current_time,
                'timestamp': current_time,
                'step_type': 'placement'
            })

    def record_backtrack(self, from_slot_index: int, to_slot_index: int, backtrack_count: int,
                       grid_state: List[List[str]] = None, reason: str = ""):
        """Record a backtrack event (REAL backtrack)"""
        current_time = time.time() - self.start_time
        lost_slots = from_slot_index - to_slot_index
        
        description = f"Backtrack #{backtrack_count}: Slot {from_slot_index} → {to_slot_index}"
        if reason:
            description += f" ({reason})"
            
        additional_data = {
            'from_slot_index': from_slot_index,
            'to_slot_index': to_slot_index,
            'backtrack_count': backtrack_count,
            'filled_slots_lost': lost_slots,
            'reason': reason
        }
        
        step_data = {
            'step_type': 'backtrack',
            'grid_state': grid_state,
            'description': description,
            'additional_data': additional_data
        }
        
        self.record_algorithm_step(**step_data)
        
        # Also record in progress data for analytics
        backtrack_record = {
            'from_slot_index': from_slot_index,
            'to_slot_index': to_slot_index,
            'backtrack_count': backtrack_count,
            'filled_slots_lost': lost_slots,
            'cumulative_time': current_time,
            'reason': reason
        }
        
        self.progress_data['backtrack_events'].append(backtrack_record)
        self.progress_data['total_backtracked_slots'] += lost_slots
        
        logger.warning(f"BACKTRACK #{backtrack_count}: From slot {from_slot_index} → {to_slot_index} (lost {lost_slots} slots) | Time: {current_time:.3f}s")
        
        # Emit real-time backtrack update
        if self.backtrack_callback:
            self.backtrack_callback({
                'from_slot_index': from_slot_index,
                'to_slot_index': to_slot_index,
                'backtrack_count': backtrack_count,
                'filled_slots_lost': lost_slots,
                'cumulative_time': current_time,
                'timestamp': current_time,
                'reason': reason
            })

    def record_evaluation(self, slot: Dict, word: str = None, grid_state: List[List[str]] = None,
                        description: str = "", additional_data: Dict = None):
        """Record candidate evaluation or heuristic calculation"""
        if not description:
            if word:
                description = f"Evaluating '{word}' for slot {slot['number']}{slot['direction'][0]}"
            else:
                description = f"Evaluating slot {slot['number']}{slot['direction'][0]}"
                
        step_data = {
            'step_type': 'evaluation',
            'slot': slot,
            'word': word,
            'grid_state': grid_state,
            'description': description,
            'additional_data': additional_data
        }
        
        self.record_algorithm_step(**step_data)

    def record_heuristic_calculation(self, state_info: Dict, grid_state: List[List[str]] = None):
        """Record heuristic calculation (for A*)"""
        description = f"Heuristic calculation: cost={state_info.get('cost', 'N/A')}, heuristic={state_info.get('heuristic', 'N/A')}"
        
        step_data = {
            'step_type': 'heuristic_calc',
            'grid_state': grid_state,
            'description': description,
            'additional_data': state_info
        }
        
        self.record_algorithm_step(**step_data)

    def record_state_expansion(self, states_expanded: int, grid_state: List[List[str]] = None):
        """Record state expansion (for A*)"""
        description = f"State expansion: {states_expanded} states explored"
        
        step_data = {
            'step_type': 'state_expansion',
            'grid_state': grid_state,
            'description': description,
            'additional_data': {'states_expanded': states_expanded}
        }
        
        self.record_algorithm_step(**step_data)

    def record_algorithm_start(self, algorithm_name: str):
        """Record algorithm start"""
        description = f"Starting {algorithm_name} algorithm"
        
        step_data = {
            'step_type': 'algorithm_start',
            'description': description,
            'additional_data': {'algorithm': algorithm_name}
        }
        
        self.record_algorithm_step(**step_data)

    def record_algorithm_completion(self, success: bool, words_placed: int, total_words: int):
        """Record algorithm completion"""
        status = "success" if success else "partial"
        description = f"Algorithm completed: {words_placed}/{total_words} words placed ({status})"
        
        step_data = {
            'step_type': 'completion',
            'description': description,
            'additional_data': {
                'success': success,
                'words_placed': words_placed,
                'total_words': total_words,
                'status': status
            }
        }
        
        self.record_algorithm_step(**step_data)

    def get_algorithm_steps(self) -> List[Dict]:
        """Get all algorithm steps for frontend simulation"""
        return self.algorithm_steps

    def record_progress(self, current_slot_index: int, filled_slots: Set[Tuple[int, str]]):
        """Record current progress percentage and emit real-time update"""
        progress_percentage = (current_slot_index / self.progress_data['total_slots']) * 100
        self.progress_data['current_progress'] = progress_percentage
        
        progress_record = {
            'timestamp': time.time() - self.start_time,
            'progress': progress_percentage,
            'filled_slots': len(filled_slots),
            'current_slot_index': current_slot_index,
            'total_slots': self.progress_data['total_slots']
        }
        self.progress_data['progress_history'].append(progress_record)
        
        # Emit real-time progress update
        if self.progress_callback:
            self.progress_callback({
                'progress': progress_percentage,
                'current_slot': current_slot_index,
                'total_slots': self.progress_data['total_slots'],
                'filled_slots': len(filled_slots),
                'timestamp': progress_record['timestamp']
            })

    def record_final_placement(self, slot: Dict, word: str, cumulative_time: float, grid_state: List[List[str]] = None):
        """Record a final successful word placement for frontend simulation"""
        placement_record = {
            'step_type': 'final_placement',
            'slot_number': slot['number'],
            'slot_direction': slot['direction'],
            'word': word,
            'position': {'x': slot['x'], 'y': slot['y']},
            'length': slot['length'],
            'cumulative_time': cumulative_time,
            'description': f"Placed '{word}' at {slot['number']}{slot['direction'][0]}",
            'grid_state': copy.deepcopy(grid_state if grid_state else self.solution),
            'clue': slot.get('clue', '')
        }
        
        self.final_placements.append(placement_record)
        self.progress_data['final_placement_sequence'].append({
            'slot_number': slot['number'],
            'slot_direction': slot['direction'],
            'word': word,
            'cumulative_time': cumulative_time
        })
        
        # Log the final placement
        logger.info(f"FINAL PLACEMENT: '{word}' at slot {slot['number']}{slot['direction'][0]} | Cumulative Time: {cumulative_time:.3f}s")
        
        # Emit real-time placement update
        if self.placement_callback:
            self.placement_callback({
                'slot_number': slot['number'],
                'slot_direction': slot['direction'],
                'word': word,
                'cumulative_time': cumulative_time,
                'timestamp': cumulative_time
            })

    def record_backtrack_event(self, from_slot_index: int, to_slot_index: int, backtrack_count: int):
        """Record a backtrack event"""
        lost_slots = from_slot_index - to_slot_index
        cumulative_time = time.time() - self.start_time
        
        backtrack_record = {
            'from_slot_index': from_slot_index,
            'to_slot_index': to_slot_index,
            'backtrack_count': backtrack_count,
            'filled_slots_lost': lost_slots,
            'cumulative_time': cumulative_time
        }
        
        self.progress_data['backtrack_events'].append(backtrack_record)
        self.progress_data['total_backtracked_slots'] += lost_slots
        
        logger.warning(f"BACKTRACK #{backtrack_count}: From slot {from_slot_index} → {to_slot_index} (lost {lost_slots} slots) | Cumulative Time: {cumulative_time:.3f}s")
        
        # Emit real-time backtrack update
        if self.backtrack_callback:
            self.backtrack_callback({
                'from_slot_index': from_slot_index,
                'to_slot_index': to_slot_index,
                'backtrack_count': backtrack_count,
                'filled_slots_lost': lost_slots,
                'cumulative_time': cumulative_time,
                'timestamp': cumulative_time
            })

    def analyze_certainty(self):
        logger.info("Analyzing slot certainty levels...")
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
        logger.info(f"Slot ordering: {len(certain)} certain + {len(uncertain)} uncertain slots")
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
            logger.warning(f"No clue-based candidates for slot {slot['number']}{slot['direction'][0]}, using pattern fallback")
            self._increment_fallback_count()
            return self.get_pattern_fallback(slot, grid)
        elif len(fitting) == 1:
            logger.info(f"Only 1 candidate for slot {slot['number']}{slot['direction'][0]}: '{fitting[0][0]}'")
            return [(fitting[0][0], 1000)]
        else:
            scored = []
            for word, candidate_data in fitting:
                score = self.calculate_score(slot, word, grid, candidate_data)
                scored.append((word, score))
            
            scored.sort(key=lambda x: (-x[1], random.random()))
            logger.info(f"Slot {slot['number']}{slot['direction'][0]}: {len(scored)} candidates, returning top 3")
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
        logger.info(f"Pattern fallback for slot {slot['number']}{slot['direction'][0]}: found {len(fitting)} candidates")
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
        
        # Reset progress tracking
        self.progress_data['current_progress'] = 0
        self.progress_data['progress_history'] = []
        self.progress_data['backtrack_events'] = []
        self.progress_data['total_backtracked_slots'] = 0
        self.progress_data['algorithm_steps'] = []
        
        # Reset algorithm steps
        self.algorithm_steps = []
        self.current_step_index = 0
        
        logger.info("Starting solver performance tracking...")

    def _record_memory_snapshot(self, label: str = ""):
        if self._tracing and self.enable_memory_profiling:
            current, peak = tracemalloc.get_traced_memory()
            current_kb = round(current / 1024.0, 2)
            peak_kb = round(peak / 1024.0, 2)
            self.memory_samples.append(current_kb)

    def _increment_fallback_count(self):
        self.fallback_usage_count += 1
        logger.warning(f"Fallback usage count: {self.fallback_usage_count}")

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

        logger.info(f"Performance Summary → Total Time: {exec_time:.3f}s | Memory: min={min_memory_kb} KB, avg={avg_memory_kb} KB, peak={peak_memory_kb} KB")
        
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
        
        self.record_algorithm_completion(success, words_placed, total_words)
        
        final_progress = (words_placed / total_words) * 100 if total_words > 0 else 0
        logger.info(f"SOLVING COMPLETE: {final_progress:.1f}% success ({words_placed}/{total_words} words placed)")
        
        if self.progress_data['backtrack_events']:
            logger.info(f"Total backtracks: {len(self.progress_data['backtrack_events'])} ({self.progress_data['total_backtracked_slots']} slots backtracked)")
        
        algorithm_steps = self.get_algorithm_steps()
        placement_steps = [step for step in algorithm_steps if step.get('step_type') == 'placement']
        backtrack_steps = [step for step in algorithm_steps if step.get('step_type') == 'backtrack']
        
        logger.info(f"ALGORITHM BEHAVIOR: {len(algorithm_steps)} total steps, {len(placement_steps)} placements, {len(backtrack_steps)} backtracks")
        
        across_placements = [step for step in placement_steps if step.get('slot_direction') == 'across']
        down_placements = [step for step in placement_steps if step.get('slot_direction') == 'down']
        
        return {
            "status": "success" if success else "partial",
            "solution": formatted_solution,
            "min_memory_kb": metrics["min_memory_kb"],
            "memory_usage_kb": metrics["avg_memory_kb"],
            "peak_memory_kb": metrics["peak_memory_kb"],
            "execution_time": metrics["execution_time"],
            "time_complexity": metrics["time_complexity"],
            "space_complexity": metrics["space_complexity"],
            "words_placed": words_placed,
            "total_words": total_words,
            "fallback_usage_count": metrics["fallback_usage_count"],
            "memory_profiling_enabled": self.enable_memory_profiling,
            
            "solving_steps": algorithm_steps, 
            "across_placements": across_placements,
            "down_placements": down_placements,
            "progress_data": self.progress_data,
            
            "debug_info": {
                "total_steps": len(algorithm_steps),
                "placement_steps": len(placement_steps),
                "backtrack_steps": len(backtrack_steps),
                "total_states_explored": getattr(self, 'total_states_explored', 0),
                "backtrack_count": getattr(self, 'backtrack_count', 0),
                "algorithm_type": self.__class__.__name__
            }
        }