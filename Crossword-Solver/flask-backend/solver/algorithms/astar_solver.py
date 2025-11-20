from typing import List, Dict, Set, Tuple
import heapq
import copy
from collections import deque
from ..core.base_solver import BaseCrosswordSolver

class AStarState:
    def __init__(self, grid: List[List[str]], filled_slots: Set[Tuple[int, str]], cost: int, slot_index: int):
        self.grid = grid
        self.filled_slots = filled_slots
        self.cost = cost
        self.slot_index = slot_index
        self.heuristic = 0
        self.priority = 0
        self.grid_hash = self.compute_hash()
    
    def compute_hash(self) -> str:
        grid_str = ''.join(''.join(row) for row in self.grid)
        slots_str = ','.join(sorted(f"{num}{dir}" for num, dir in self.filled_slots))
        return f"{grid_str}|{slots_str}|{self.slot_index}"
    
    def __lt__(self, other):
        return self.priority < other.priority

class AStarSolver(BaseCrosswordSolver):
    
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper, enable_memory_profiling: bool = False):
        super().__init__(grid, clues, enable_memory_profiling)
        self.setup_slots(dict_helper)
        self.state_cache = {}
        
    def solve(self) -> Dict:
        self._start_performance_tracking()
        
        if not self.slots:
            return self._create_result(True, 0, 0)
        
        order = self.slot_ordering
        
        initial = AStarState(
            grid=copy.deepcopy(self.solution),
            filled_slots=set(),
            cost=0,
            slot_index=0
        )
        initial.heuristic = self.calc_heuristic(initial)
        initial.priority = initial.cost + initial.heuristic
        
        open_set = [initial]
        closed_set = set()
        closed_set_deque = deque()
        max_closed_size = 2000
        
        iteration = 0
        max_iter = 5000
        
        while open_set and iteration < max_iter:
            iteration += 1
            
            if len(closed_set) > max_closed_size:
                remove_count = max_closed_size // 4
                for _ in range(remove_count):
                    if closed_set_deque:
                        old_hash = closed_set_deque.popleft()
                        closed_set.remove(old_hash)
            
            current = heapq.heappop(open_set)
            
            if current.slot_index >= len(order):
                self.solution = current.grid
                return self._create_result(True, len(self.slots), len(self.slots))
            
            if current.grid_hash in closed_set:
                continue
            
            closed_set.add(current.grid_hash)
            closed_set_deque.append(current.grid_hash)
            
            slot = order[current.slot_index]
            candidates = self.get_candidates(slot, current.grid)
            
            for word, score in candidates:
                new_grid = self.place_word(current.grid, slot, word)
                new_filled = current.filled_slots | {(slot['number'], slot['direction'])}
                
                new_state = AStarState(
                    grid=new_grid,
                    filled_slots=new_filled,
                    cost=current.cost + 1,
                    slot_index=current.slot_index + 1
                )
                new_state.heuristic = self.calc_heuristic(new_state)
                new_state.priority = new_state.cost + new_state.heuristic
                
                if new_state.grid_hash not in closed_set:
                    heapq.heappush(open_set, new_state)
            
            self.complexity_tracker.increment_operations()
        
        if open_set:
            best = min(open_set, key=lambda s: (s.heuristic, -s.slot_index))
            self.solution = best.grid
            filled = self.count_filled_words()
            return self._create_result(False, filled, len(self.slots))
        
        return self._create_result(False, 0, len(self.slots))
    
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
        new_grid = [row[:] for row in grid]
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                new_grid[slot['y']][slot['x'] + i] = char
            else:
                new_grid[slot['y'] + i][slot['x']] = char
        return new_grid