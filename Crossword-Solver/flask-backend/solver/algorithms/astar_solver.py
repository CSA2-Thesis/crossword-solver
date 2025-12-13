from typing import List, Dict, Set, Tuple
import heapq
import copy
from collections import deque
import time
from venv import logger
from ..core.base_solver import BaseCrosswordSolver

class AStarState:
    def __init__(self, grid: List[List[str]], filled_slots: Set[Tuple[int, str]], cost: int, slot_index: int, 
                 parent=None, placed_word=None, candidate_score=0):
        self.grid = grid
        self.filled_slots = filled_slots
        self.cost = cost
        self.slot_index = slot_index
        self.heuristic = 0
        self.priority = 0
        self.grid_hash = self.compute_hash()
        self.backtrack_depth = 0
        self.parent = parent
        self.placed_word = placed_word
        self.candidate_score = candidate_score
        self.placement_time = None
    
    def compute_hash(self) -> str:
        grid_str = ''.join(''.join(row) for row in self.grid)
        slots_str = ','.join(sorted(f"{num}{dir}" for num, dir in self.filled_slots))
        return f"{grid_str}|{slots_str}|{self.slot_index}"
    
    def __lt__(self, other):
        if self.priority == other.priority:
            return self.candidate_score > other.candidate_score
        return self.priority < other.priority

class AStarSolver(BaseCrosswordSolver):
    
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper, 
                enable_memory_profiling: bool = False, **kwargs):
        super().__init__(grid, clues, enable_memory_profiling, **kwargs)
        self.setup_slots(dict_helper)
        self.state_cache = {}
        self.backtrack_count = 0
        self.total_states_explored = 0
        
    def solve(self) -> Dict:
        self._start_performance_tracking()
        
        self.record_algorithm_start("A* Search")
        
        if not self.slots:
            logger.info("No slots to solve - puzzle already complete!")
            return self._create_result(True, 0, 0)
        
        order = self.slot_ordering
        logger.info(f"Starting A* search with {len(order)} slots in ordering")

        initial = AStarState(
            grid=copy.deepcopy(self.solution),
            filled_slots=set(),
            cost=0,
            slot_index=0,
            parent=None,
            placed_word=None,
            candidate_score=0
        )
        initial.heuristic = self.calc_heuristic(initial)
        initial.priority = initial.cost + initial.heuristic
        initial.placement_time = time.time() - self.start_time
        
        open_set = [initial]
        closed_set = set()
        closed_set_deque = deque()
        max_closed_size = 2000
        
        iteration = 0
        max_iter = 5000
        
        previous_best_progress = 0
        consecutive_backtracks = 0
        
        logger.info("Beginning A* algorithm execution...")
        solution_state = None

        while open_set and iteration < max_iter:
            iteration += 1
            self.total_states_explored += 1
            
            if iteration % 10 == 0:
                self.record_state_expansion(self.total_states_explored)
            
            if len(closed_set) > max_closed_size:
                remove_count = max_closed_size // 4
                for _ in range(remove_count):
                    if closed_set_deque:
                        old_hash = closed_set_deque.popleft()
                        closed_set.remove(old_hash)
            
            current = heapq.heappop(open_set)
            
            self.record_progress(current.slot_index, current.filled_slots)
            
            self.record_heuristic_calculation({
                'cost': current.cost,
                'heuristic': current.heuristic,
                'priority': current.priority,
                'slot_index': current.slot_index
            }, current.grid)
            
            if current.slot_index < previous_best_progress:
                self.backtrack_count += 1
                consecutive_backtracks += 1
                lost_slots = previous_best_progress - current.slot_index
                
                self.record_backtrack(previous_best_progress, current.slot_index, 
                                    self.backtrack_count, current.grid, 
                                    "Exploring alternative path with lower progress")
            else:
                consecutive_backtracks = 0
                previous_best_progress = max(previous_best_progress, current.slot_index)
            
            if current.slot_index >= len(order):
                solution_state = current
                self.solution = current.grid
                
                logger.info(f"SOLUTION FOUND! Completed all {len(order)} slots in {iteration} iterations")
                return self._create_result(True, len(self.slots), len(self.slots))
            
            if current.grid_hash in closed_set:
                continue
            
            closed_set.add(current.grid_hash)
            closed_set_deque.append(current.grid_hash)
            
            slot = order[current.slot_index]
            
            self.record_evaluation(slot, grid_state=current.grid,
                                 description=f"Processing slot {slot['number']}{slot['direction'][0]}")
            
            candidates = self.get_candidates(slot, current.grid)
            
            for word, score in candidates:
                self.record_evaluation(slot, word, current.grid,
                                     description=f"Testing candidate '{word}' (score: {score})")
                
                new_grid = self.place_word(current.grid, slot, word)
                new_filled = current.filled_slots | {(slot['number'], slot['direction'])}
                
                self.record_placement(slot, word, new_grid, {
                    'candidate_score': score,
                    'state_cost': current.cost + 1,
                    'heuristic': self.calc_heuristic_from_state(new_grid, new_filled, current.slot_index + 1)
                })
                
                new_state = AStarState(
                    grid=new_grid,
                    filled_slots=new_filled,
                    cost=current.cost + 1,
                    slot_index=current.slot_index + 1,
                    parent=current,
                    placed_word=word,
                    candidate_score=score
                )
                new_state.heuristic = self.calc_heuristic(new_state)
                new_state.priority = new_state.cost + new_state.heuristic
                new_state.placement_time = time.time() - self.start_time
                
                if new_state.grid_hash not in closed_set:
                    heapq.heappush(open_set, new_state)
            
            self.complexity_tracker.increment_operations()
        
        if iteration >= max_iter:
            logger.warning(f"A* search reached maximum iterations ({max_iter})")
        
        if open_set:
            best = min(open_set, key=lambda s: (s.heuristic, -s.slot_index))
            self.solution = best.grid
            
            self.record_progress(best.slot_index, best.filled_slots)
            filled = self.count_filled_words()
            logger.info(f"Best partial solution found: {filled}/{len(self.slots)} words placed ({best.slot_index}/{len(order)} slots filled)")
            return self._create_result(False, filled, len(self.slots))
        
        logger.error("No solution found - open set exhausted")
        return self._create_result(False, 0, len(self.slots))
    
    def calc_heuristic_from_state(self, grid: List[List[str]], filled_slots: Set[Tuple[int, str]], slot_index: int) -> int:
        remaining_slots = len(self.slots) - slot_index
        base_cost = remaining_slots * 5
        
        certainty_penalty = 0
        for i in range(slot_index, len(self.slots)):
            slot = self.slots[i]
            certainty = self.slot_certainty.get((slot['number'], slot['direction']), 0)
            certainty_penalty += (3 - certainty) * 3
        
        return base_cost + certainty_penalty
    
    def get_candidates(self, slot: Dict, grid: List[List[str]]) -> List[Tuple[str, int]]:
        clue_candidates = self.get_clue_candidates(slot)
        
        fitting = []
        for candidate in clue_candidates:
            word = candidate['word'].upper()
            if self.validate_placement(slot, word, grid):
                fitting.append((word, candidate))
        
        if len(fitting) == 0:
            self._increment_fallback_count()
            return self.get_pattern_fallback(slot, grid)
        elif len(fitting) == 1:
            return [(fitting[0][0], 1000)]
        else:
            scored = []
            for word, candidate_data in fitting:
                score = self.calculate_score(slot, word, grid, candidate_data)
                scored.append((word, score))
            
            scored.sort(key=lambda x: (-x[1]))
            return scored[:3]
    
    def calc_heuristic(self, state: AStarState) -> int:
        remaining_slots = len(self.slots) - state.slot_index
        base_cost = remaining_slots * 5
        
        certainty_penalty = 0
        for i in range(state.slot_index, len(self.slots)):
            slot = self.slots[i]
            certainty = self.slot_certainty.get((slot['number'], slot['direction']), 0)
            certainty_penalty += (3 - certainty) * 3
        
        return base_cost + certainty_penalty
    
    def place_word(self, grid: List[List[str]], slot: Dict, word: str) -> List[List[str]]:
        """Place a word in the grid"""
        new_grid = [row[:] for row in grid]
        
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            new_grid[y][x] = char
        
        return new_grid
