import heapq
import time
import copy
from typing import List, Dict, Set, Tuple
from venv import logger
from ..core.base_solver import BaseCrosswordSolver

class SolverState:
    __slots__ = ('grid', 'filled_slots', 'cost', 'slot_index', 'processing_order', 'heuristic', 'priority', 'parent', 'placed_word', 'placement_time')
    
    def __init__(self, grid: List[List[str]], filled_slots: Set[Tuple[int, str]], 
                 cost: int, slot_index: int, processing_order: List[Dict],
                 parent=None, placed_word=None, placement_time=0.0):
        self.grid = grid
        self.filled_slots = filled_slots
        self.cost = cost
        self.slot_index = slot_index
        self.processing_order = processing_order
        self.heuristic = 0
        self.priority = 0
        self.parent = parent
        self.placed_word = placed_word
        self.placement_time = placement_time
    
    def __lt__(self, other):
        return self.priority < other.priority

class HybridSolver(BaseCrosswordSolver):
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper, 
                enable_memory_profiling: bool = False, beam_width: int = 5, 
                 switch_threshold: float = 0.7, **kwargs):
        super().__init__(grid, clues, enable_memory_profiling, **kwargs)

        self.setup_slots(dict_helper)
        
        self.beam_width = beam_width
        self.switch_threshold = switch_threshold
        
        self.astar_expansions = 0
        self.dfs_backtracks = 0
        self.mode_switches = 0
        self.total_placement_attempts = 0
        self.total_states_explored = 0
        self.final_solution_path = []
        
        # Initialize missing attributes
        if not hasattr(self, 'final_placements'):
            self.final_placements = []
        
        # Ensure progress_data has final_placement_sequence
        if 'final_placement_sequence' not in self.progress_data:
            self.progress_data['final_placement_sequence'] = []

    def solve(self) -> Dict:
        self._start_performance_tracking()
        
        # Record algorithm start
        self.record_algorithm_start("Hybrid Search (A* + DFS)")
        
        if not self.slots:
            logger.info("No slots to solve - puzzle already complete!")
            return self._create_result(True, 0, 0)
        
        order = self.slot_ordering
        
        # Record mode switch to A*
        logger.info("🔄 HYBRID MODE: Starting with A* exploration")
        self.record_algorithm_step('mode_switch', 
                                 description="🔄 HYBRID: Starting with A* beam search",
                                 grid_state=self.solution,
                                 additional_data={'phase': 'astar_start', 'beam_width': self.beam_width})
        
        success, filled_slots, best_state = self.explore_astar(order)
        
        if success:
            # Record final placements from A* solution
            self._record_astar_solution_path(best_state)
            words_placed = self.count_filled_words()
            
            # Record completion
            self.record_algorithm_completion(True, words_placed, len(self.slots))
            return self._create_result(True, words_placed, len(self.slots))
        
        self.mode_switches += 1
        
        # Record mode switch to DFS
        logger.info(f"🔄 HYBRID MODE: Switching to DFS completion (A* filled {len(filled_slots)}/{len(self.slots)} slots)")
        self.record_algorithm_step('mode_switch',
                                 description=f"🔄 HYBRID: Switching to DFS ({len(filled_slots)}/{len(self.slots)} slots filled)",
                                 grid_state=self.solution,
                                 additional_data={
                                     'phase': 'dfs_start', 
                                     'slots_filled': len(filled_slots),
                                     'total_slots': len(self.slots)
                                 })
        
        success = self.complete_dfs(filled_slots, order)
        
        words_placed = self.count_filled_words()
        
        # Record final state
        if success:
            self.record_algorithm_completion(True, words_placed, len(self.slots))
        else:
            self.record_algorithm_completion(False, words_placed, len(self.slots))

        return self._create_result(success, words_placed, len(self.slots))

    def explore_astar(self, order: List[Dict]) -> Tuple[bool, Set[Tuple[int, str]], 'SolverState']:
        if self.enable_memory_profiling:
            self._record_memory_snapshot("astar_start")
        
        initial_filled = set()
        
        initial_state = SolverState(
            grid=copy.deepcopy(self.solution),
            filled_slots=initial_filled,
            cost=0,
            slot_index=0,
            processing_order=order,
            parent=None,
            placed_word=None,
            placement_time=0.0
        )
        initial_state.heuristic = self.estimate_difficulty(initial_state)
        initial_state.priority = initial_state.cost + initial_state.heuristic
        
        beam = [initial_state]
        best_state = initial_state
        
        max_expansions = min(1000, len(self.slots) * 50)
        
        while beam and self.astar_expansions < max_expansions:
            self.astar_expansions += 1
            self.total_states_explored += 1
            
            # Record state expansion periodically
            if self.total_states_explored % 10 == 0:
                self.record_state_expansion(self.total_states_explored)
            
            current = heapq.heappop(beam)
            
            # Record progress
            self.record_progress(current.slot_index, current.filled_slots)
            
            if current.slot_index >= len(order):
                self.apply_state(current)
                return True, current.filled_slots, current
            
            if len(current.filled_slots) > len(best_state.filled_slots):
                best_state = current
            
            # Record slot evaluation step
            slot = order[current.slot_index]
            self.record_evaluation(slot, grid_state=current.grid,
                                 description=f"A*: Evaluating slot {slot['number']}{slot['direction'][0]}")
            
            successors = self.generate_successors(current)
            
            for successor in successors:
                heapq.heappush(beam, successor)
            
            if len(beam) > self.beam_width:
                beam = heapq.nsmallest(self.beam_width, beam)
                heapq.heapify(beam)
            
            progress = len(current.filled_slots) / len(self.slots)
            if progress > self.switch_threshold and len(beam) == 1:
                self.apply_state(best_state)
                return False, best_state.filled_slots, best_state
        
        self.apply_state(best_state)
        return False, best_state.filled_slots, best_state

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
            # Record candidate evaluation step
            self.record_evaluation(slot, word, state.grid,
                                 description=f"A*: Testing '{word}' for slot {slot['number']}{slot['direction'][0]}")
            
            if not self.validate_placement(slot, word, state.grid):
                continue

            # Record placement time
            placement_time = time.time() - self.start_time
            
            new_grid = self.place_word(state.grid, slot, word)
            new_filled = state.filled_slots | {(slot['number'], slot['direction'])}
            
            # Record successful placement in real-time
            self.record_placement(slot, word, new_grid, {
                'phase': 'astar',
                'beam_rank': len(successors),
                'total_candidates': len(candidates)
            })
            
            new_state = SolverState(
                grid=new_grid,
                filled_slots=new_filled,
                cost=state.cost + 1,
                slot_index=state.slot_index + 1,
                processing_order=state.processing_order,
                parent=state,
                placed_word=word,
                placement_time=placement_time
            )
            
            new_state.heuristic = self.estimate_difficulty(new_state)
            new_state.priority = new_state.cost + new_state.heuristic
            
            successors.append(new_state)
        
        return successors

    def complete_dfs(self, initial_filled: Set[Tuple[int, str]], order: List[Dict]) -> bool:
        if self.enable_memory_profiling:
            self._record_memory_snapshot("dfs_start")
        
        remaining = [slot for slot in order 
                    if (slot['number'], slot['direction']) not in initial_filled]
        
        if not remaining:
            return True
        
        # Record DFS start
        self.record_algorithm_step('mode_switch',
                                 description=f"DFS: Starting with {len(remaining)} remaining slots",
                                 grid_state=self.solution,
                                 additional_data={
                                     'phase': 'dfs_execution',
                                     'remaining_slots': len(remaining)
                                 })
        
        # Initialize DFS state tracking
        dfs_solution_path = []
        current_dfs_state = {
            'grid': copy.deepcopy(self.solution),
            'filled_slots': initial_filled.copy(),
            'placement_sequence': []
        }
        
        success = self.guided_dfs(0, remaining, current_dfs_state, dfs_solution_path)
        
        # Record DFS placements if successful
        if success:
            self._record_dfs_solution_path(dfs_solution_path)
        
        return success

    def _record_dfs_solution_path(self, dfs_solution_path: List):
        """Record DFS phase placements for frontend simulation"""
        for placement in dfs_solution_path:
            # Find the corresponding slot
            slot = None
            for s in self.slots:
                if s['number'] == placement['slot_number'] and s['direction'] == placement['slot_direction']:
                    slot = s
                    break
            
            if slot:
                # Use the fixed record_final_placement method
                self._record_final_placement_fixed(slot, placement['word'], 
                                                 placement['cumulative_time'],
                                                 self._get_grid_state_for_dfs_placement(placement, dfs_solution_path))

    def _record_final_placement_fixed(self, slot: Dict, word: str, cumulative_time: float, grid_state: List[List[str]] = None):
        """Fixed version of record_final_placement for Hybrid"""
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
        
        # Make sure final_placements exists
        if not hasattr(self, 'final_placements'):
            self.final_placements = []
            
        self.final_placements.append(placement_record)
        
        # Make sure final_placement_sequence exists
        if 'final_placement_sequence' not in self.progress_data:
            self.progress_data['final_placement_sequence'] = []
            
        # Also add to progress data for timeline
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

    def _get_grid_state_for_dfs_placement(self, placement, dfs_solution_path):
        """Get grid state at the time of DFS placement"""
        grid_state = copy.deepcopy(self.solution)
        
        # Apply all DFS placements up to this one
        for prev_placement in dfs_solution_path:
            if prev_placement['cumulative_time'] <= placement['cumulative_time']:
                slot = None
                for s in self.slots:
                    if s['number'] == prev_placement['slot_number'] and s['direction'] == prev_placement['slot_direction']:
                        slot = s
                        break
                
                if slot:
                    self._place_word_in_grid(grid_state, slot, prev_placement['word'])
        
        return grid_state

    def guided_dfs(self, slot_idx: int, remaining: List[Dict], current_state: Dict, solution_path: List) -> bool:
        self.total_states_explored += 1
        
        # Record state expansion periodically
        if self.total_states_explored % 10 == 0:
            self.record_state_expansion(self.total_states_explored, current_state['grid'])
        
        if slot_idx >= len(remaining):
            # Solution found - record the path
            solution_path.extend(current_state['placement_sequence'])
            return True
        
        slot = remaining[slot_idx]
        
        # Record DFS slot evaluation
        self.record_evaluation(slot, grid_state=current_state['grid'],
                             description=f"DFS: Evaluating slot {slot['number']}{slot['direction'][0]}")
        
        candidates = self.get_candidates(slot, current_state['grid'])
        
        if not candidates:
            self.dfs_backtracks += 1
            # Record backtrack event
            self.record_backtrack(slot_idx + len(current_state['filled_slots']), 
                                slot_idx + len(current_state['filled_slots']) - 1, 
                                self.dfs_backtracks,
                                current_state['grid'],
                                "No candidates available")
            return False
        
        for word, score in candidates:
            self.total_placement_attempts += 1
            
            # Record candidate evaluation
            self.record_evaluation(slot, word, current_state['grid'],
                                 description=f"DFS: Testing '{word}' for slot {slot['number']}{slot['direction'][0]}")
            
            # Record placement attempt time
            placement_time = time.time() - self.start_time
            
            if not self.validate_placement(slot, word, current_state['grid']):
                continue

            # Create new state for this branch
            new_grid = self.place_word_in_grid(current_state['grid'], slot, word)
            new_filled = current_state['filled_slots'] | {(slot['number'], slot['direction'])}
            new_placement_sequence = current_state['placement_sequence'] + [{
                'slot_number': slot['number'],
                'slot_direction': slot['direction'],
                'word': word,
                'cumulative_time': placement_time
            }]

            # Record placement
            self.record_placement(slot, word, new_grid, {
                'phase': 'dfs',
                'current_depth': slot_idx,
                'total_remaining': len(remaining) - slot_idx
            })

            new_state = {
                'grid': new_grid,
                'filled_slots': new_filled,
                'placement_sequence': new_placement_sequence
            }

            # Record progress
            total_filled = len(new_filled)
            self.record_progress(total_filled, new_filled)

            if not self.verify_future(slot_idx + 1, remaining, new_state['grid']):
                # Record conflict and backtrack
                self.record_backtrack(total_filled, total_filled - 1, self.dfs_backtracks + 1,
                                    new_grid, "Constraint violation in future slots")
                self.dfs_backtracks += 1
                continue

            if self.guided_dfs(slot_idx + 1, remaining, new_state, solution_path):
                return True

            # Record backtrack
            self.record_backtrack(total_filled, total_filled - 1, self.dfs_backtracks + 1,
                                new_grid, "DFS recursion backtrack")
            self.dfs_backtracks += 1
        
        return False

    def verify_future(self, start_idx: int, remaining: List[Dict], grid: List[List[str]]) -> bool:
        for i in range(start_idx, min(start_idx + 2, len(remaining))):
            slot = remaining[i]
            candidates = self.get_candidates(slot, grid)
            if not candidates:
                return False
        return True

    def place_word_in_grid(self, grid: List[List[str]], slot: Dict, word: str) -> List[List[str]]:
        """Place a word in the grid and return a new grid (immutable)"""
        new_grid = [row[:] for row in grid]
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                new_grid[slot['y']][slot['x'] + i] = char
            else:
                new_grid[slot['y'] + i][slot['x']] = char
        return new_grid

    def place_word(self, grid: List[List[str]], slot: Dict, word: str) -> List[List[str]]:
        """Place a word in the grid and return a new grid (immutable)"""
        return self.place_word_in_grid(grid, slot, word)

    def _place_word_in_grid(self, grid, slot, word):
        """Place a word in the given grid (helper method)"""
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                grid[slot['y']][slot['x'] + i] = char
            else:
                grid[slot['y'] + i][slot['x']] = char
        return grid

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
        """Apply a state to the current solution"""
        for i in range(len(state.grid)):
            for j in range(len(state.grid[i])):
                self.solution[i][j] = state.grid[i][j]

    def _record_astar_solution_path(self, solution_state: SolverState):
        """Reconstruct and record the A* phase solution path"""
        logger.info("Recording A* phase final placements...")
        
        # Traverse back through the parent chain
        placement_sequence = []
        current_state = solution_state
        
        # Collect all states in the solution path
        path_states = []
        while current_state:
            path_states.append(current_state)
            current_state = current_state.parent
        
        # Reverse to get chronological order
        path_states.reverse()
        
        # Record placements for states that actually placed words (skip initial state)
        for state in path_states[1:]:  # Skip initial state
            if state.placed_word and state.parent:
                # Find the slot that was filled in this state
                slot = None
                for s in self.slots:
                    if (s['number'], s['direction']) in state.filled_slots and (s['number'], s['direction']) not in state.parent.filled_slots:
                        slot = s
                        break
                
                if slot:
                    # Use the fixed record_final_placement method
                    self._record_final_placement_fixed(slot, state.placed_word, 
                                                     state.placement_time, state.grid)
        
        logger.info(f"Recorded {len(path_states) - 1} final placements from A* phase")

    def _create_result(self, success: bool, words_placed: int, total_words: int) -> Dict:
        """Override to include hybrid-specific metrics"""
        result = super()._create_result(success, words_placed, total_words)
        
        # Add hybrid-specific metrics to debug info
        result['debug_info'].update({
            'astar_expansions': self.astar_expansions,
            'dfs_backtracks': self.dfs_backtracks,
            'mode_switches': self.mode_switches,
            'total_placement_attempts': self.total_placement_attempts,
            'total_states_explored': self.total_states_explored,
            'hybrid_specific': {
                'astar_expansions': self.astar_expansions,
                'dfs_backtracks': self.dfs_backtracks,
                'mode_switches': self.mode_switches,
                'total_placement_attempts': self.total_placement_attempts,
                'total_states_explored': self.total_states_explored,
                'beam_width': self.beam_width,
                'switch_threshold': self.switch_threshold
            }
        })
        
        # Log hybrid performance summary
        logger.info(f"🔀 HYBRID PERFORMANCE: A* expansions: {self.astar_expansions}, "
                   f"DFS backtracks: {self.dfs_backtracks}, Mode switches: {self.mode_switches}, "
                   f"Total states: {self.total_states_explored}")
        
        return result