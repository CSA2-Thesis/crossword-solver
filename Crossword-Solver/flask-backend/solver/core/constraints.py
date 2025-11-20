from typing import List, Dict, Set, Tuple

class ConstraintChecker:
    
    def __init__(self, grid: List[List[str]], slot_graph: Dict[Tuple[int, str], Set[Tuple[int, str]]]):
        self.grid = grid
        self.slot_graph = slot_graph
        
    def check_word_fits(self, slot: Dict, word: str) -> bool:
        for i in range(len(word)):
            if slot['direction'] == 'across':
                x, y = slot['x'] + i, slot['y']
            else:
                x, y = slot['x'], slot['y'] + i
            
            if self.grid[y][x] != '.' and self.grid[y][x] != word[i]:
                return False
                
        return True
        
    def check_perpendicular_constraints(self, slot: Dict, word: str, slots: List[Dict]) -> bool:
        slot_key = (slot['number'], slot['direction'])
        
        if slot_key not in self.slot_graph:
            return True
            
        for other_slot_key in self.slot_graph[slot_key]:
            other_slot = next(
                (s for s in slots 
                 if s['number'] == other_slot_key[0] and s['direction'] == other_slot_key[1]),
                None
            )
            if not other_slot:
                continue
                
            if slot['direction'] == 'across' and other_slot['direction'] == 'down':
                intersect_x = other_slot['x']
                intersect_y = slot['y']
                word_pos = intersect_x - slot['x']
                other_pos = intersect_y - other_slot['y']
            elif slot['direction'] == 'down' and other_slot['direction'] == 'across':
                intersect_x = slot['x']
                intersect_y = other_slot['y']
                word_pos = intersect_y - slot['y']
                other_pos = intersect_x - other_slot['x']
            else:
                continue
                
            if self.grid[intersect_y][intersect_x] != '.':
                if word[word_pos] != self.grid[intersect_y][intersect_x]:
                    return False
                    
        return True