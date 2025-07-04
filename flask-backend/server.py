from flask import Flask, request, jsonify
from flask_cors import CORS
from solver.dfs_solver import solve_with_dfs
from solver.astar_solver import solve_with_astar
from solver.hybrid_solver import solve_with_hybrid
from wordnet_helper import get_possible_words

app = Flask(__name__)
CORS(app)

@app.route("/solve", methods=["POST"])
def solve():
    data = request.json
    grid = data["grid"]
    clues = data["clues"]
    algorithm = data["algorithm"]

    if algorithm == "DFS":
        result = solve_with_dfs(grid, clues)
    elif algorithm == "A*":
        result = solve_with_astar(grid, clues)
    elif algorithm == "HYBRID":
        result = solve_with_hybrid(grid, clues)
    else:
        return jsonify({"error": "Invalid algorithm"}), 400

    return jsonify(result)

@app.route("/suggest", methods=["GET"])
def suggest_words():
    clue = request.args.get("clue", "")
    words = get_possible_words(clue)
    return jsonify(words)

if __name__ == "__main__":
    app.run(debug=True)
