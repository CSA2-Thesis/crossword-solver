from wordnet_helper import get_possible_words
import time
import heapq
import tracemalloc

def heuristic(word, grid, r, c, direction):
    intersections = 0
    for i in range(len(word)):
        if direction == "across" and grid[r][c+i] != '.' and grid[r][c+i] == word[i]:
            intersections += 1
        elif direction == "down" and grid[r+i][c] != '.' and grid[r+i][c] == word[i]:
            intersections += 1
    return -intersections  # More intersections = better score

def solve_with_astar(grid, clues):
    start_time = time.time()
    tracemalloc.start()

    rows, cols = len(grid), len(grid[0])
    words = get_possible_words(clues['across']) + get_possible_words(clues['down'])
    words = list(set([word.lower() for word in words if len(word) <= max(rows, cols)]))
    solution = [row[:] for row in grid]

    def can_place(word, r, c, direction):
        if direction == "across":
            if c + len(word) > cols: return False
            return all(solution[r][c+i] in ('.', word[i]) for i in range(len(word)))
        if direction == "down":
            if r + len(word) > rows: return False
            return all(solution[r+i][c] in ('.', word[i]) for i in range(len(word)))
        return False

    def place_word(word, r, c, direction):
        positions = []
        if direction == "across":
            for i in range(len(word)):
                if solution[r][c+i] == '.':
                    solution[r][c+i] = word[i]
                    positions.append((r, c+i))
        elif direction == "down":
            for i in range(len(word)):
                if solution[r+i][c] == '.':
                    solution[r+i][c] = word[i]
                    positions.append((r+i, c))
        return positions

    def remove_word(positions):
        for r, c in positions:
            solution[r][c] = '.'

    open_set = []
    heapq.heapify(open_set)

    for word in words:
        for r in range(rows):
            for c in range(cols):
                for direction in ['across', 'down']:
                    if can_place(word, r, c, direction):
                        h = heuristic(word, solution, r, c, direction)
                        heapq.heappush(open_set, (h, word, r, c, direction))

    used_words = set()
    while open_set and len(used_words) < len(words):
        _, word, r, c, direction = heapq.heappop(open_set)
        if word in used_words: continue
        if not can_place(word, r, c, direction): continue
        place_word(word, r, c, direction)
        used_words.add(word)

    success = len(used_words) > 0
    exec_time = time.time() - start_time
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    return {
        "method": "A*",
        "success": success,
        "solution": solution if success else [],
        "metrics": {
            "execution_time": f"{exec_time:.4f}s",
            "memory_usage_kb": peak // 1024
        }
    }
