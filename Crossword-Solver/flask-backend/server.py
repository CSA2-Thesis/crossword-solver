import logging
import random
import time
import traceback
from venv import logger
import pdfkit
from flask import Flask, make_response, render_template, request, jsonify
from flask_cors import CORS
from solver.dfs_solver import solve_with_dfs
from solver.astar_solver import solve_with_astar
from solver.hybrid_solver import solve_with_hybrid
from wordnet_helper import get_possible_words, get_words_by_length
from generate_downloadables import generate_png_image, generate_pdf

from generator.crossword_generator import CrosswordGenerator

app = Flask(__name__)
CORS(app) 

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
        algorithm = data.get("algorithm", "HYBRID")

        if not grid or not clues:
            return jsonify({"error": "Missing grid or clues"}), 400

        start_time = time.time()

        if algorithm == "DFS":
            result = solve_with_dfs(grid, clues)
        elif algorithm == "A*":
            result = solve_with_astar(grid, clues)
        elif algorithm == "HYBRID":
            result = solve_with_hybrid(grid, clues)
        else:
            return jsonify({"error": "Invalid algorithm"}), 400

        execution_time = time.time() - start_time

        response_data = {
            "method": algorithm,
            "success": result.get("status", "").lower() == "success",
            "solution": result.get("grid", []), 
            "metrics": {
                "execution_time": f"{execution_time:.4f}s",
                "memory_usage_kb": result.get("memory_usage_kb", 0),
                "words_placed": f"{result.get('words_placed', 0)}/{result.get('total_words', 0)}"
            },
            "details": {
                "status": result.get("status", "unknown"),
                "algorithm": algorithm
            }
        }

        return _corsify_actual_response(jsonify(response_data))

    except Exception as e:
        logger.error(f"Solve error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route("/suggest", methods=["GET", "OPTIONS"])
def suggest_words():
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()
        
    clue = request.args.get("clue", "")
    max_words = int(request.args.get("max", 20))
    words = get_possible_words(clue=clue, max_words=max_words)
    return _corsify_actual_response(jsonify(words))

@app.route('/generate', methods=['POST'])
def generate():
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
        possible_words = get_words_by_length(length=initial_length, max_words=100)
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
                words = get_words_by_length(
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
            
            return jsonify({
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
            })

    except Exception as e:
        logging.error(f"Generation error: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": str(e)
        }), 500

@app.route('/download', methods=['POST'])
def download():
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
            return response
            
        elif format == 'pdf':
            pdf_data = generate_pdf(puzzle, show_answers)
            response = make_response(pdf_data)
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=crossword.pdf'
            return response
            
        return jsonify({'error': 'Invalid format'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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