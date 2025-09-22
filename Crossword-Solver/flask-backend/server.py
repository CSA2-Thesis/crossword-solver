import logging
import random
import time
import traceback
from flask import Flask, make_response, request, jsonify
from flask_cors import CORS
from dictionary_helper import DictionaryHelper
from generate_downloadables import generate_png_image, generate_pdf
from generator.crossword_generator import CrosswordGenerator

from solver.algorithms.astar_solver import AStarSolver
from solver.algorithms.dfs_solver import DFSSolver
from solver.algorithms.hybrid_solver import HybridSolver
from solver.analysis.visualizer import ComplexityVisualizer

app = Flask(__name__)
CORS(app) 

dict_helper = DictionaryHelper("dictionary")

complexity_trackers = {}

@app.route("/solve", methods=["POST", "OPTIONS"])
def solve():
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400

        grid = data.get("grid")
        clues = data.get("clues")
        algorithm = data.get("algorithm", "HYBRID").upper()

        if not grid or not clues:
            return jsonify({"error": "Missing grid or clues"}), 400

        start_time = time.time()

        if algorithm == "DFS":
            solver = DFSSolver(grid, clues, dict_helper)
        elif algorithm == "A*":
            solver = AStarSolver(grid, clues, dict_helper)
        elif algorithm == "HYBRID":
            solver = HybridSolver(grid, clues, dict_helper)
        else:
            return jsonify({"error": "Invalid algorithm"}), 400

        complexity_trackers[algorithm] = solver.complexity_tracker
        
        result = solver.solve()
        execution_time = time.time() - start_time

        response_data = {
            "method": algorithm,
            "success": result.get("status", "").lower() == "success",
            "solution": result.get("grid", []), 
            "metrics": {
                "execution_time": f"{execution_time:.4f}s",
                "memory_usage_kb": result.get("memory_usage_kb", 0),
                "words_placed": f"{result.get('words_placed', 0)}/{result.get('total_words', 0)}",
                "time_complexity": result.get("time_complexity", {}),
                "space_complexity": result.get("space_complexity", {})
            },
            "details": {
                "status": result.get("status", "unknown"),
                "algorithm": algorithm
            }
        }

        return _corsify_actual_response(jsonify(response_data))

    except Exception as e:
        logging.error(f"Solve error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route("/analyze", methods=["POST", "OPTIONS"])
def analyze_complexity():
    """Run all algorithms and compare their complexity"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400

        grid = data.get("grid")
        clues = data.get("clues")

        if not grid or not clues:
            return jsonify({"error": "Missing grid or clues"}), 400

        algorithms = {
            "DFS": DFSSolver(grid, clues, dict_helper),
            "A*": AStarSolver(grid, clues, dict_helper),
            "HYBRID": HybridSolver(grid, clues, dict_helper)
        }
        
        results = {}
        for algo_name, solver in algorithms.items():
            start_time = time.time()
            result = solver.solve()
            execution_time = time.time() - start_time
            
            complexity_trackers[algo_name] = solver.complexity_tracker
            
            results[algo_name] = {
                "success": result.get("status", "").lower() == "success",
                "solution": result.get("grid", []),
                "metrics": {
                    "execution_time": f"{execution_time:.4f}s",
                    "memory_usage_kb": result.get("memory_usage_kb", 0),
                    "words_placed": f"{result.get('words_placed', 0)}/{result.get('total_words', 0)}",
                    "time_complexity": result.get("time_complexity", {}),
                    "space_complexity": result.get("space_complexity", {})
                },
                "details": {
                    "status": result.get("status", "unknown")
                }
            }

        return _corsify_actual_response(jsonify(results))

    except Exception as e:
        logging.error(f"Analysis error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route("/visualize", methods=["GET", "OPTIONS"])
def visualize_complexity():
    """Generate complexity visualization for the last run algorithms"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
        
    try:
        algorithm = request.args.get("algorithm", "").upper()
        chart_type = request.args.get("type", "combined")
        
        if algorithm and algorithm in complexity_trackers:
            trackers = {algorithm: complexity_trackers[algorithm]}
            title = f"{algorithm} Algorithm Complexity"
        else:
            trackers = complexity_trackers
            title = "Algorithm Complexity Comparison"
        
        if not trackers:
            return jsonify({"error": "No complexity data available. Run solvers first."}), 400
            
        if chart_type == "time":
            ComplexityVisualizer.plot_time_complexity(trackers, title)
        elif chart_type == "space":
            ComplexityVisualizer.plot_space_complexity(trackers, title)
        else:
            ComplexityVisualizer.plot_combined_complexity(trackers, title)
            
        return jsonify({
            "success": True,
            "message": f"Complexity visualization generated for {len(trackers)} algorithm(s)"
        })
        
    except Exception as e:
        logging.error(f"Visualization error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Failed to generate visualization",
            "details": str(e)
        }), 500

@app.route("/suggest", methods=["GET", "OPTIONS"])
def suggest_words():
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
        
    clue = request.args.get("clue", "")
    max_words = int(request.args.get("max", 20))
    words = dict_helper.get_possible_words(clue=clue, max_words=max_words)
    return _corsify_actual_response(jsonify(words))

@app.route('/generate', methods=['POST', 'OPTIONS'])
def generate():
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
        
    try:
        data = request.get_json()
        size = int(data.get('size', 15))
        difficulty = data.get('difficulty', 'medium')

        DENSITY_BOUNDS = {
            'easy': (0.35, 0.50),
            'medium': (0.60, 0.69),
            'hard': (0.80, 1.00)
        }
        min_density, max_density = DENSITY_BOUNDS[difficulty]

        if difficulty == 'easy':
            min_word_length = max(3, size//3)
            max_word_length = min(12, size)
            max_attempts = 3
            word_count_multiplier = 0.7
        elif difficulty == 'hard':
            min_word_length = 3
            max_word_length = size
            max_attempts = 5
            word_count_multiplier = 1.3
        else:
            min_word_length = max(3, size//4)
            max_word_length = min(10, size)
            max_attempts = 4
            word_count_multiplier = 1.0

        base_word_count = size * 1.5
        target_word_count = int(base_word_count * word_count_multiplier)

        initial_length = random.randint(min_word_length, min(max_word_length, size//2))
        possible_words = dict_helper.get_words_by_length(length=initial_length, max_words=100)
        if not possible_words:
            return jsonify({
                "success": False,
                "error": "No suitable initial words found",
                "message": "Try a smaller grid size or different difficulty"
            }), 400

        MAX_GENERATION_TRIES = 15
        generated_puzzle = None
        best_puzzle = None
        best_density = 0.0

        for attempt in range(MAX_GENERATION_TRIES):
            logging.info(f"Attempt {attempt + 1}/{MAX_GENERATION_TRIES} [diff={difficulty}]")

            word_list = []
            dynamic_max_len = max_word_length + (attempt % 2)
            for length in range(min_word_length, dynamic_max_len + 1):
                words = dict_helper.get_words_by_length(
                    length=length,
                    max_words=int(target_word_count / 2) + random.randint(0, 20)
                )
                word_list.extend(words)
            random.shuffle(word_list)

            initial_word = random.choice(possible_words)['word']

            generator = CrosswordGenerator(size, size)
            puzzle = generator.generate(
                initial_word=initial_word,
                word_list=word_list,
                max_attempts=max_attempts
            )

            if not puzzle:
                continue

            density = puzzle.calculate_density()

            if density > best_density:
                best_density = density
                best_puzzle = puzzle

            if min_density <= density <= max_density:
                generated_puzzle = puzzle
                break

        final_puzzle = generated_puzzle or best_puzzle

        if not final_puzzle:
            return jsonify({
                "success": False,
                "error": "Failed to generate any valid puzzle",
                "message": "Please try again with different settings."
            }), 400

        final_density = final_puzzle.calculate_density()
        used_fallback = generated_puzzle is None

        if used_fallback:
            logging.warning(f"Used fallback puzzle with density={final_density:.2%} "
                          f"(target: {min_density:.2%}-{max_density:.2%})")

        if final_puzzle:
            empty_grid = final_puzzle.empty_grid
            
            across, down = final_puzzle.analyze_grid(for_empty_grid=True)
            numbered_positions = {(slot.x, slot.y): slot.number for slot in across + down}
            
            for y in range(final_puzzle.height):
                for x in range(final_puzzle.width):
                    if (x, y) in numbered_positions:
                        empty_grid[y][x] = str(numbered_positions[(x, y)])
            
            return _corsify_actual_response(jsonify({
                "success": True,
                "grid": final_puzzle.grid,
                "empty_grid": empty_grid,   
                "clues": final_puzzle.get_clues(),
                "stats": {
                    "word_count": len(final_puzzle.words),
                    "difficulty": difficulty,
                    "size": size,
                    "density": final_puzzle.calculate_density()
                }
            }))

    except Exception as e:
        logging.error(f"Generation error: {str(e)}", exc_info=True)
        return _corsify_actual_response(jsonify({
            "success": False,
            "error": "Internal server error",
            "message": str(e)
        }), 500)

@app.route('/download', methods=['POST', 'OPTIONS'])
def download():
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
        
    try:
        data = request.get_json()
        puzzle = data.get('puzzle')
        format = data.get('format', 'png').lower()
        show_answers = data.get('showAnswers', False)
        
        if format == 'png':
            image_data = generate_png_image(puzzle, show_answers)
            response = make_response(image_data)
            response.headers['Content-Type'] = 'image/png'
            response.headers['Content-Disposition'] = 'attachment; filename=crossword.png'
            return _corsify_actual_response(response)
            
        elif format == 'pdf':
            pdf_data = generate_pdf(puzzle, show_answers)
            response = make_response(pdf_data)
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=crossword.pdf'
            return _corsify_actual_response(response)
            
        return _corsify_actual_response(jsonify({'error': 'Invalid format'}), 400)
        
    except Exception as e:
        return _corsify_actual_response(jsonify({'error': str(e)}), 500)

def _build_cors_preflight_response():
    response = jsonify({"message": "Preflight Request Accepted"})
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    return response

def _corsify_actual_response(response, status_code=None):
    response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
    if status_code:
        response.status_code = status_code
    return response

if __name__ == "__main__":
    app.run(debug=True, port=5000)