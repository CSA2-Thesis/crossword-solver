from typing import List, Dict, Tuple
import time
import copy
from venv import logger
from ..core.base_solver import BaseCrosswordSolver

class DFSSolver(BaseCrosswordSolver):
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]], dict_helper, 
                 enable_memory_profiling: bool = False, **kwargs):

        super().__init__(grid, clues, enable_memory_profiling, **kwargs)
        self.setup_slots(dict_helper)
        self.slot_candidates = []
        self.backtrack_count = 0
        self.total_placement_attempts = 0
        self.final_solution_path = []
        self.current_path = []
        self.total_states_explored = 0
        
        if not hasattr(self, 'final_placements'):
            self.final_placements = []
        
        if 'final_placement_sequence' not in self.progress_data:
            self.progress_data['final_placement_sequence'] = []

    def solve(self) -> Dict:
        self._start_performance_tracking()
        
        self.record_algorithm_start("DFS Search")
        
        if not self.slots:
            logger.info("No slots to solve - puzzle already complete!")
            return self._create_result(True, 0, 0)

        self.slot_candidates = self.get_slot_candidates()
        if not self.slot_candidates:
            return self._create_result(False, 0, len(self.slots))

        self.slot_candidates.sort(key=lambda x: (
            -self.slot_certainty.get((x[0]['number'], x[0]['direction']), 0),
            len(x[1])
        ))

        self.backtrack_count = 0
        self.total_placement_attempts = 0
        self.final_solution_path = []
        self.current_path = []
        self.total_states_explored = 0

        original_solution = copy.deepcopy(self.solution)
        
        self.record_state_expansion(0, self.solution)
        
        success = self.dfs(0)
        
        if success:
            self._record_final_solving_steps()
            self.record_algorithm_completion(True, len(self.final_solution_path), len(self.slots))
        else:
            self.solution = original_solution
            self.record_algorithm_completion(False, self.count_filled_words(), len(self.slots))

        words_placed = self.count_filled_words()
        return self._create_result(success, words_placed, len(self.slots))

    def _record_final_solving_steps(self):
        """Record the complete solving steps for frontend simulation"""
        logger.info("Recording DFS final placements for frontend simulation...")
        
        for placement in self.final_solution_path:
            slot = None
            for s in self.slots:
                if s['number'] == placement['slot_number'] and s['direction'] == placement['slot_direction']:
                    slot = s
                    break
            
            if slot:
                self._record_final_placement_fixed(slot, placement['word'], 
                                                 placement['cumulative_time'], 
                                                 self._get_grid_state_at_placement(placement))

    def _record_final_placement_fixed(self, slot: Dict, word: str, cumulative_time: float, grid_state: List[List[str]] = None):
        """Fixed version of record_final_placement for DFS"""
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
        
        if not hasattr(self, 'final_placements'):
            self.final_placements = []
            
        self.final_placements.append(placement_record)
        
        if 'final_placement_sequence' not in self.progress_data:
            self.progress_data['final_placement_sequence'] = []
            
        self.progress_data['final_placement_sequence'].append({
            'slot_number': slot['number'],
            'slot_direction': slot['direction'],
            'word': word,
            'cumulative_time': cumulative_time
        })
        
        logger.info(f"FINAL PLACEMENT: '{word}' at slot {slot['number']}{slot['direction'][0]} | Cumulative Time: {cumulative_time:.3f}s")
        
        if self.placement_callback:
            self.placement_callback({
                'slot_number': slot['number'],
                'slot_direction': slot['direction'],
                'word': word,
                'cumulative_time': cumulative_time,
                'timestamp': cumulative_time
            })

    def _get_grid_state_at_placement(self, placement):
        grid_state = copy.deepcopy(self.original_grid)
        
        for prev_placement in self.final_solution_path:
            if prev_placement['cumulative_time'] <= placement['cumulative_time']:
                slot = None
                for s in self.slots:
                    if s['number'] == prev_placement['slot_number'] and s['direction'] == prev_placement['slot_direction']:
                        slot = s
                        break
                
                if slot:
                    self._place_word_in_grid(grid_state, slot, prev_placement['word'])
        
        return grid_state

    def _place_word_in_grid(self, grid, slot, word):
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            grid[y][x] = char

    def get_slot_candidates(self) -> List[Tuple[Dict, List[str]]]:
        candidates = []
        for slot in self.slots:
            candidate_tuples = self.get_candidates(slot, self.solution)
            slot_candidates = [word for word, score in candidate_tuples]
            candidates.append((slot, slot_candidates))
        return candidates

    def dfs(self, slot_idx: int) -> bool:
        self.total_states_explored += 1
        
        if self.total_states_explored % 10 == 0:
            self.record_state_expansion(self.total_states_explored, self.solution)
        
        if slot_idx >= len(self.slot_candidates):
            self.final_solution_path = copy.deepcopy(self.current_path)
            return True

        slot, candidates = self.slot_candidates[slot_idx]

        if not candidates:
            return False

        self.record_evaluation(slot, grid_state=self.solution,
                             description=f"Evaluating slot {slot['number']}{slot['direction'][0]}: {slot.get('clue', '')}")

        for word in candidates:
            self.total_placement_attempts += 1
            
            self.record_evaluation(slot, word, self.solution,
                                 description=f"Testing word '{word}' for slot {slot['number']}{slot['direction'][0]}")
            
            if not self.validate_placement(slot, word, self.solution):
                continue

            placement_time = time.time() - self.start_time
            
            path_entry = {
                'slot_number': slot['number'],
                'slot_direction': slot['direction'],
                'word': word,
                'cumulative_time': placement_time
            }
            self.current_path.append(path_entry)

            positions = self.place_word(slot, word)
            
            self.record_placement(slot, word, self.solution, {
                'placement_attempt': self.total_placement_attempts,
                'current_depth': slot_idx,
                'total_candidates': len(candidates)
            })

            current_filled = set()
            for i in range(slot_idx + 1):
                current_slot = self.slot_candidates[i][0]
                current_filled.add((current_slot['number'], current_slot['direction']))
            self.record_progress(slot_idx + 1, current_filled)

            if not self.check_future_constraints(slot_idx + 1):
                self.record_backtrack(slot_idx + 1, slot_idx, self.backtrack_count + 1,
                                    self.solution, "Constraint violation detected")
                
                self.current_path.pop()
                self.remove_word(positions)
                self.backtrack_count += 1
                continue

            if self.dfs(slot_idx + 1):
                return True

            self.record_backtrack(slot_idx + 1, slot_idx, self.backtrack_count + 1,
                                self.solution, "DFS recursion backtrack")
            
            self.current_path.pop()
            self.remove_word(positions)
            self.backtrack_count += 1

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

    def _create_result(self, success: bool, words_placed: int, total_words: int) -> Dict:
        result = super()._create_result(success, words_placed, total_words)
        
        result['debug_info'].update({
            'backtrack_count': self.backtrack_count,
            'total_placement_attempts': self.total_placement_attempts,
            'solution_path_length': len(self.final_solution_path),
            'total_states_explored': self.total_states_explored,
            'dfs_specific': {
                'backtrack_count': self.backtrack_count,
                'total_placement_attempts': self.total_placement_attempts,
                'solution_path_length': len(self.final_solution_path),
                'total_states_explored': self.total_states_explored
            }
        })
        
        logger.info(f"🔄 DFS PERFORMANCE: Backtracks: {self.backtrack_count}, "
                   f"Placement attempts: {self.total_placement_attempts}, "
                   f"Solution path length: {len(self.final_solution_path)}, "
                   f"States explored: {self.total_states_explored}")
        
        return result