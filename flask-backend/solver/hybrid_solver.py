from wordnet_helper import get_possible_words
import time
import tracemalloc

def heuristic(word, grid, r, c, direction):
    intersections = 0
    for i in range(len(word)):
        if direction == "across" and grid[r][c+i] != '.' and grid[r][c+i] == word[i]:
            intersections += 1
        elif direction == "down" and grid[r+i][c] != '.' and grid[r+i][c] == word[i]:
            intersections += 1
    return intersections

def solve_with_hybrid(grid, clues):
    start_time = time.time()
    tracemalloc.start()

    rows, cols = len(grid), len(grid[0])
    words = list(set([
        w.lower() for w in (get_possible_words(clues['across']) + get_possible_words(clues['down']))
        if len(w) <= max(rows, cols)
    ]))

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
        placed = []
        if direction == "across":
            for i in range(len(word)):
                if solution[r][c+i] == '.':
                    solution[r][c+i] = word[i]
                    placed.append((r, c+i))
        elif direction == "down":
            for i in range(len(word)):
                if solution[r+i][c] == '.':
                    solution[r+i][c] = word[i]
                    placed.append((r+i, c))
        return placed

    def remove_word(placed):
        for r, c in placed:
            solution[r][c] = '.'

    def hybrid_dfs(remaining_words):
        if not remaining_words:
            return True

        sorted_candidates = []
        for r in range(rows):
            for c in range(cols):
                for direction in ["across", "down"]:
                    for word in remaining_words:
                        if can_place(word, r, c, direction):
                            score = heuristic(word, solution, r, c, direction)
                            sorted_candidates.append((score, word, r, c, direction))

        sorted_candidates.sort(reverse=True)

        for _, word, r, c, direction in sorted_candidates:
            placed = place_word(word, r, c, direction)
            new_remaining = [w for w in remaining_words if w != word]
            if hybrid_dfs(new_remaining):
                return True
            remove_word(placed)

        return False

    success = hybrid_dfs(words)

    exec_time = time.time() - start_time
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    return {
        "method": "Hybrid",
        "success": success,
        "solution": solution if success else [],
        "metrics": {
            "execution_time": f"{exec_time:.4f}s",
            "memory_usage_kb": peak // 1024
        }
    }
