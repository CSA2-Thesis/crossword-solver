from wordnet_helper import get_possible_words
import time
import tracemalloc

def solve_with_dfs(grid, clues):
    start_time = time.time()
    tracemalloc.start()

    rows, cols = len(grid), len(grid[0])
    words = get_possible_words(clues['across']) + get_possible_words(clues['down'])
    words = list(set([word.lower() for word in words if len(word) <= max(rows, cols)]))

    solution = [row[:] for row in grid]  # deep copy

    def is_valid(word, r, c, direction):
        if direction == "across":
            if c + len(word) > cols:
                return False
            return all(solution[r][c+i] in ('.', word[i]) for i in range(len(word)))
        if direction == "down":
            if r + len(word) > rows:
                return False
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

    def dfs(index):
        if index >= len(words):
            return True
        word = words[index]
        for r in range(rows):
            for c in range(cols):
                for direction in ["across", "down"]:
                    if is_valid(word, r, c, direction):
                        placed = place_word(word, r, c, direction)
                        if dfs(index + 1):
                            return True
                        remove_word(placed)
        return False

    success = dfs(0)

    exec_time = time.time() - start_time
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    return {
        "method": "DFS",
        "success": success,
        "solution": solution if success else [],
        "metrics": {
            "execution_time": f"{exec_time:.4f}s",
            "memory_usage_kb": peak // 1024
        }
    }
