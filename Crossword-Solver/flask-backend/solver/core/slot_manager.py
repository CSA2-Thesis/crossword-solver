from typing import List, Dict, Set, Tuple
from collections import defaultdict

class SlotManager:
    
    def __init__(self, grid: List[List[str]], clues: Dict[str, List[Dict]]):
        self.grid = grid
        self.clues = clues
        self.height = len(grid)
        self.width = len(grid[0]) if self.height > 0 else 0
        self.slot_graph = defaultdict(set)
        
    def get_word_slots(self) -> List[Dict]:
        slots = []
        
        for clue in self.clues.get('across', []):
            x, y = clue['x'], clue['y']
            length = clue['length']
            
            current_word = ''.join(self.grid[y][x + i] for i in range(length))
            if '.' not in current_word:
                continue
                
            slots.append({
                'number': clue['number'],
                'direction': 'across',
                'x': x, 'y': y, 'length': length,
                'clue': clue['clue'],
                'answer': clue.get('answer', '')
            })
        
        for clue in self.clues.get('down', []):
            x, y = clue['x'], clue['y']
            length = clue['length']
            
            current_word = ''.join(self.grid[y + i][x] for i in range(length))
            if '.' not in current_word:
                continue
                
            slots.append({
                'number': clue['number'],
                'direction': 'down',
                'x': x, 'y': y, 'length': length,
                'clue': clue['clue'],
                'answer': clue.get('answer', '')
            })
        
        return slots
        
    def build_slot_graph(self, slots: List[Dict]) -> Dict[Tuple[int, str], Set[Tuple[int, str]]]:
        position_map = {}
        graph = defaultdict(set)
        
        for slot in slots:
            for i in range(slot['length']):
                if slot['direction'] == 'across':
                    pos = (slot['x'] + i, slot['y'])
                else:
                    pos = (slot['x'], slot['y'] + i)
                
                key = (slot['number'], slot['direction'])
                
                if pos not in position_map:
                    position_map[pos] = []
                position_map[pos].append(key)
        
        for pos in position_map:
            if len(position_map[pos]) > 1:
                for slot1 in position_map[pos]:
                    for slot2 in position_map[pos]:
                        if slot1 != slot2:
                            graph[slot1].add(slot2)
                            graph[slot2].add(slot1)
        
        return graph