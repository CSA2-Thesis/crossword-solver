from typing import List, Dict, Set, Tuple
import heapq
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
            grid=self.solution,
            filled_slots=set(),
            cost=0,
            slot_index=0
        )
        initial.heuristic = self.calc_heuristic(initial)
        initial.priority = initial.cost + initial.heuristic
        
        open_set = [initial]
        closed_set = set()
        
        iteration = 0
        max_iter = 5000
        
        while open_set and iteration < max_iter:
            iteration += 1
            
            current = heapq.heappop(open_set)
            
            if current.slot_index >= len(order):
                self.solution = current.grid
                return self._create_result(True, len(self.slots), len(self.slots))
            
            if current.grid_hash in closed_set:
                continue
            
            closed_set.add(current.grid_hash)
            
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
            best = min(open_set, key=lambda s: s.heuristic)
            self.solution = best.grid
            filled = self.count_filled_words()
            return self._create_result(False, filled, len(self.slots))
        
        return self._create_result(False, 0, len(self.slots))
    
    def calc_heuristic(self, state: AStarState) -> int:
        return (len(self.slots) - state.slot_index) * 10
    
    
    def place_word(self, grid: List[List[str]], slot: Dict, word: str) -> List[List[str]]:
        new_grid = [row[:] for row in grid]
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                new_grid[slot['y']][slot['x'] + i] = char
            else:
                new_grid[slot['y'] + i][slot['x']] = char
        return new_grid