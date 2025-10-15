import heapq
from typing import List, Dict, Set, Tuple
from ..core.base_solver import BaseCrosswordSolver

class SolverState:
    __slots__ = ('grid', 'filled_slots', 'cost', 'slot_index', 'processing_order', 'heuristic', 'priority')
    
    def __init__(self, grid: List[List[str]], filled_slots: Set[Tuple[int, str]], 
                 cost: int, slot_index: int, processing_order: List[Dict]):
        self.grid = grid
        self.filled_slots = filled_slots
        self.cost = cost
        self.slot_index = slot_index
        self.processing_order = processing_order
        self.heuristic = 0
        self.priority = 0
    
    def __lt__(self, other):
        return self.priority < other.priority

class HybridSolver(BaseCrosswordSolver):
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper, 
                 enable_memory_profiling: bool = False, beam_width: int = 5, 
                 switch_threshold: float = 0.7):
        super().__init__(grid, clues, enable_memory_profiling)
        self.setup_slots(dict_helper)
        
        self.beam_width = beam_width
        self.switch_threshold = switch_threshold
        
        self.astar_expansions = 0
        self.dfs_backtracks = 0
        self.mode_switches = 0

    def solve(self) -> Dict:
        self._start_performance_tracking()
        
        if not self.slots:
            return self._create_result(True, 0, 0)
        
        order = self.slot_ordering
        
        success, filled_slots = self.explore_astar(order)
        
        if success:
            words_placed = self.count_filled_words()
            return self._create_result(True, words_placed, len(self.slots))
        
        self.mode_switches += 1
        
        success = self.complete_dfs(filled_slots, order)
        
        words_placed = self.count_filled_words()
        return self._create_result(success, words_placed, len(self.slots))

    def explore_astar(self, order: List[Dict]) -> Tuple[bool, Set[Tuple[int, str]]]:
        if self.enable_memory_profiling:
            self._record_memory_snapshot("astar_start")
        
        initial_filled = set()
        
        initial_state = SolverState(
            grid=[row[:] for row in self.solution],
            filled_slots=initial_filled,
            cost=0,
            slot_index=0,
            processing_order=order
        )
        initial_state.heuristic = self.estimate_difficulty(initial_state)
        initial_state.priority = initial_state.cost + initial_state.heuristic
        
        beam = [initial_state]
        best_state = initial_state
        
        max_expansions = min(1000, len(self.slots) * 50)
        
        while beam and self.astar_expansions < max_expansions:
            self.astar_expansions += 1
            
            current = heapq.heappop(beam)
            
            if current.slot_index >= len(order):
                self.apply_state(current)
                return True, current.filled_slots
            
            if len(current.filled_slots) > len(best_state.filled_slots):
                best_state = current
            
            successors = self.generate_successors(current)
            
            for successor in successors:
                heapq.heappush(beam, successor)
            
            if len(beam) > self.beam_width:
                beam = heapq.nsmallest(self.beam_width, beam)
                heapq.heapify(beam)
            
            progress = len(current.filled_slots) / len(self.slots)
            if progress > self.switch_threshold and len(beam) == 1:
                self.apply_state(best_state)
                return False, best_state.filled_slots
        
        self.apply_state(best_state)
        return False, best_state.filled_slots

    def complete_dfs(self, initial_filled: Set[Tuple[int, str]], order: List[Dict]) -> bool:
        if self.enable_memory_profiling:
            self._record_memory_snapshot("dfs_start")
        
        remaining = [slot for slot in order 
                    if (slot['number'], slot['direction']) not in initial_filled]
        
        if not remaining:
            return True
        
        return self.guided_dfs(0, remaining)

    def guided_dfs(self, slot_idx: int, remaining: List[Dict]) -> bool:
        if slot_idx >= len(remaining):
            return True
        
        slot = remaining[slot_idx]
        candidates = self.get_candidates(slot, self.solution)
        
        if not candidates:
            self.dfs_backtracks += 1
            return False
        
        for word, score in candidates:
            if not self.validate_placement(slot, word, self.solution):
                continue
            
            positions = []
            for i, char in enumerate(word):
                if slot['direction'] == 'across':
                    x, y = slot['x'] + i, slot['y']
                else:
                    x, y = slot['x'], slot['y'] + i
                
                if self.solution[y][x] == '.':
                    self.solution[y][x] = char
                    positions.append((x, y))
            
            if self.verify_future(slot_idx + 1, remaining):
                if self.guided_dfs(slot_idx + 1, remaining):
                    return True
            
            for x, y in positions:
                self.solution[y][x] = '.'
            self.dfs_backtracks += 1
        
        return False

    def verify_future(self, start_idx: int, remaining: List[Dict]) -> bool:
        for i in range(start_idx, min(start_idx + 2, len(remaining))):
            slot = remaining[i]
            candidates = self.get_candidates(slot, self.solution)
            if not candidates:
                return False
        return True

    def generate_successors(self, state: SolverState) -> List[SolverState]:
        successors = []
        
        if state.slot_index >= len(state.processing_order):
            return successors
        
        slot = state.processing_order[state.slot_index]
        candidates = self.get_candidates(slot, state.grid)
        
        if not candidates:
            return []
            
        max_candidates = min(self.beam_width, len(candidates))
        
        for word, score in candidates[:max_candidates]:
            if not self.validate_placement(slot, word, state.grid):
                continue

            new_grid = self.place_word(state.grid, slot, word)
            new_filled = state.filled_slots | {(slot['number'], slot['direction'])}
            
            new_state = SolverState(
                grid=new_grid,
                filled_slots=new_filled,
                cost=state.cost + 1,
                slot_index=state.slot_index + 1,
                processing_order=state.processing_order
            )
            
            new_state.heuristic = self.estimate_difficulty(new_state)
            new_state.priority = new_state.cost + new_state.heuristic
            
            successors.append(new_state)
        
        return successors

    def place_word(self, grid: List[List[str]], slot: Dict, word: str) -> List[List[str]]:
        new_grid = [row[:] for row in grid]
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                new_grid[slot['y']][slot['x'] + i] = char
            else:
                new_grid[slot['y'] + i][slot['x']] = char
        return new_grid

    def estimate_difficulty(self, state: SolverState) -> int:
        remaining = len(state.processing_order) - state.slot_index
        
        if remaining == 0:
            return 0
        
        heuristic = remaining * 5
        
        for i in range(state.slot_index, min(state.slot_index + 3, len(state.processing_order))):
            slot = state.processing_order[i]
            slot_key = (slot['number'], slot['direction'])
            constraint_degree = len(self.slot_graph.get(slot_key, []))
            heuristic += constraint_degree * 2
        
        return heuristic

    def apply_state(self, state: SolverState):
        for i in range(len(state.grid)):
            for j in range(len(state.grid[i])):
                self.solution[i][j] = state.grid[i][j]