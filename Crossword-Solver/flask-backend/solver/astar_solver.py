import tracemalloc
from typing import List, Dict, Optional, Set, Tuple
import heapq
from dictionary_helper import DictionaryHelper
import logging
import os
from collections import defaultdict

class AStarCrosswordSolver:
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]]):
        """Initialize solver with grid and clues."""
        self.original_grid = [row[:] for row in grid]
        self.height = len(grid)
        self.width = len(grid[0]) if self.height > 0 else 0
        self.clues = clues
        
        current_dir = os.path.dirname(os.path.abspath(__file__))
        dict_path = os.path.join(current_dir, "..", "dictionary")
        self.dict_helper = DictionaryHelper(dict_path)

        self.solved = [
            [cell if cell not in [' ', '.'] else '.' for cell in row] 
            for row in grid
        ]
        self._initialize_slots()
        
    def _initialize_slots(self):
        """Initialize slot tracking structures."""
        self.slot_graph = defaultdict(set)
        self.slot_by_position = {}
        self.across_clues = {c['number']: c for c in self.clues.get('across', [])}
        self.down_clues = {c['number']: c for c in self.clues.get('down', [])}

    def _get_word_slots(self) -> List[Dict]:
        """Identify all empty word slots in the grid."""
        slots = []
        
        for number, clue in self.across_clues.items():
            x, y = clue['x'], clue['y']
            length = clue['length']
            
            current_word = ''.join(self.solved[y][x + i] for i in range(length))
            if '.' not in current_word and not any(c.islower() for c in current_word):
                continue
                
            slots.append({
                'number': number,
                'direction': 'across',
                'x': x, 'y': y, 'length': length,
                'clue': clue['clue']
            })
        
        for number, clue in self.down_clues.items():
            x, y = clue['x'], clue['y']
            length = clue['length']
            
            current_word = ''.join(self.solved[y + i][x] for i in range(length))
            if '.' not in current_word and not any(c.islower() for c in current_word):
                continue
                
            slots.append({
                'number': number,
                'direction': 'down',
                'x': x, 'y': y, 'length': length,
                'clue': clue['clue']
            })
        
        return slots

    def solve(self) -> Dict:
        """Main solving method using A* algorithm."""
        slots = self._get_word_slots()
        if not slots:
            return {
                "grid": self.solved,
                "words_placed": 0,
                "status": "success",
                "memory_usage_kb": self._get_memory_usage()
            }

        open_set = []
        slot_data = []
        tracemalloc.start()
        
        for i, slot in enumerate(slots):
            candidates = self._get_constrained_candidates(slot)
            if not candidates:
                return {
                    "grid": self.solved,
                    "words_placed": 0,
                    "status": "failed",
                    "memory_usage_kb": self._get_memory_usage()
                }
                
            priority = len(candidates)
            heapq.heappush(open_set, (priority, i))
            
            slot_data.append({
                'slot': slot,
                'candidates': candidates,
                'tried': set()
            })

        placed_words = 0
        while open_set:
            _, slot_idx = heapq.heappop(open_set)
            slot_info = slot_data[slot_idx]
            slot = slot_info['slot']
            
            for candidate in slot_info['candidates']:
                if candidate in slot_info['tried']:
                    continue
                    
                if not self._check_forward_constraints(slot, candidate):
                    slot_info['tried'].add(candidate)
                    continue
                    
                self._fill_word_in_grid(slot, candidate)
                slot_info['tried'].add(candidate)
                placed_words += 1
                
                updated_slots = self._update_affected_slots(slot, slot_data)
                for idx in updated_slots:
                    heapq.heappush(open_set, (len(slot_data[idx]['candidates']), idx))
                
                break
            else:
                self._backtrack(slot)
                placed_words -= 1
                
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        status = "success" if placed_words == len(slots) else "partial"
        return {
            "grid": self.solved,
            "words_placed": placed_words,
            "total_words": len(slots),
            "status": status,
            "memory_usage_kb": peak // 1024
        }

    def _get_constrained_candidates(self, slot: Dict) -> List[str]:
        """Get candidates with all current constraints applied."""
        candidates = []
        
        exact_match = self.dict_helper.find_word_by_exact_clue(slot['clue'])
        if exact_match and len(exact_match['word']) == slot['length']:
            candidates.append(exact_match['word'].upper())
        
        if not candidates:
            dict_candidates = self.dict_helper.get_possible_words(
                clue=slot['clue'],
                max_words=100,
                length_range=(slot['length'], slot['length'])
            )
            candidates = [c['word'].upper() for c in dict_candidates]
        
        constrained = []
        for word in candidates:
            if len(word) != slot['length']:
                continue
                
            valid = True
            for i in range(slot['length']):
                if slot['direction'] == 'across':
                    x, y = slot['x'] + i, slot['y']
                else:
                    x, y = slot['x'], slot['y'] + i
                
                if self.solved[y][x] != '.' and self.solved[y][x] != word[i]:
                    valid = False
                    break
                
                other_dir = 'down' if slot['direction'] == 'across' else 'across'
                if (x, y, other_dir) in self.slot_by_position:
                    other_slot = self.slot_by_position[(x, y, other_dir)]
                    if self.solved[y][x] == '.':
                        pass
            
            if valid:
                constrained.append(word)
        
        return constrained

    def _check_forward_constraints(self, slot: Dict, word: str) -> bool:
        for i in range(len(word)):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            
            other_dir = 'down' if slot['direction'] == 'across' else 'across'
            if (x, y, other_dir) in self.slot_by_position:
                other_slot = self.slot_by_position[(x, y, other_dir)]
                
                if self.solved[y][x] == '.':
                    if other_slot['direction'] == 'across':
                        pos_in_other = x - other_slot['x']
                    else:
                        pos_in_other = y - other_slot['y']
                    
                    other_candidates = self._get_constrained_candidates(other_slot)
                    if not any(cand[pos_in_other] == word[i] for cand in other_candidates):
                        return False
        
        return True

    def _update_affected_slots(self, placed_slot: Dict, slot_data: List[Dict]) -> Set[int]:
        """Find and update slots affected by a placement."""
        affected_indices = set()
        
        for i in range(placed_slot['length']):
            if placed_slot['direction'] == 'across':
                x, y = placed_slot['x'] + i, placed_slot['y']
            else:
                x, y = placed_slot['x'], placed_slot['y'] + i
            
            other_dir = 'down' if placed_slot['direction'] == 'across' else 'across'
            if (x, y, other_dir) in self.slot_by_position:
                other_slot = self.slot_by_position[(x, y, other_dir)]
                
                # Find the index of this slot in slot_data
                for idx, data in enumerate(slot_data):
                    if (data['slot']['number'] == other_slot['number'] and 
                        data['slot']['direction'] == other_slot['direction']):
                        # Recalculate candidates with new constraint
                        data['candidates'] = self._get_constrained_candidates(data['slot'])
                        affected_indices.add(idx)
                        break
        
        return affected_indices

    def _backtrack(self, slot: Dict):
        """Backtrack by removing a word from the grid."""
        for i in range(slot['length']):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            
            # Only clear if no intersecting word exists
            other_dir = 'down' if slot['direction'] == 'across' else 'across'
            if (x, y, other_dir) not in self.slot_by_position:
                self.solved[y][x] = '.'

    def _fill_word_in_grid(self, slot: Dict, word: str):
        """Place a word in the grid."""
        for i, char in enumerate(word):
            if slot['direction'] == 'across':
                self.solved[slot['y']][slot['x'] + i] = char
            else:
                self.solved[slot['y'] + i][slot['x']] = char

    def _get_memory_usage(self) -> int:
        """Get approximate memory usage in KB."""
        grid_size = self.width * self.height * 2
        dict_size = len(self.dict_helper.dictionary) * 100
        return (grid_size + dict_size) // 1024

def solve_with_astar(grid: List[List[str]], clues: Dict[str, List[Dict]]) -> Dict:
    """Public interface for A* solver."""
    solver = AStarCrosswordSolver(grid, clues)
    return solver.solve()