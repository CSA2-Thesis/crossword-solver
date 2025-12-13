import logging
import random
import time
import uuid
import threading
from flask import Flask, make_response, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dictionary_helper import DictionaryHelper
from generate_downloadables import generate_png_image, generate_pdf
from generator.crossword_generator import CrosswordGenerator

from solver.algorithms.astar_solver import AStarSolver
from solver.algorithms.dfs_solver import DFSSolver
from solver.algorithms.hybrid_solver import HybridSolver
from solver.analysis.visualizer import ComplexityVisualizer

app = Flask(__name__)
app.config['SECRET_KEY'] = 'crossword-secret-key'
CORS(app) 

socketio = SocketIO(app, cors_allowed_origins="http://localhost:5173", async_mode='threading')

dict_helper = DictionaryHelper("dictionary")

complexity_trackers = {}
solving_sessions = {}

@socketio.on('connect')
def handle_connect():
    logging.info(f"Client connected: {request.sid}")
    emit('connection_status', {'status': 'connected', 'message': 'Successfully connected to solver'})

@socketio.on('disconnect')
def handle_disconnect():
    logging.info(f"Client disconnected: {request.sid}")

@socketio.on('join_session')
def handle_join_session(data):
    session_id = data.get('session_id')
    if session_id in solving_sessions:
        emit('session_joined', {'session_id': session_id, 'status': 'joined'})
        logging.info(f"Client joined session: {session_id}")
    else:
        emit('session_error', {'error': 'Session not found'})

@socketio.on('cancel_solve')
def handle_cancel_solve(data):
    session_id = data.get('session_id')
    if session_id in solving_sessions:
        solving_sessions[session_id]['cancelled'] = True
        emit('solve_cancelled', {'session_id': session_id})
        logging.info(f"Solve cancelled for session: {session_id}")

def emit_progress(session_id, progress_data):
    """Emit progress update to specific session"""
    socketio.emit('progress_update', {
        'session_id': session_id,
        **progress_data
    }, room=session_id)

def emit_placement(session_id, placement_data):
    """Emit word placement to specific session"""
    socketio.emit('word_placed', {
        'session_id': session_id,
        **placement_data
    }, room=session_id)

def emit_backtrack(session_id, backtrack_data):
    """Emit backtrack event to specific session"""
    socketio.emit('backtrack_event', {
        'session_id': session_id,
        **backtrack_data
    }, room=session_id)

def create_progress_callback(session_id):
    """Create a progress callback function for a specific session"""
    def progress_callback(progress_data):
        emit_progress(session_id, progress_data)
    return progress_callback

def create_placement_callback(session_id):
    """Create a placement callback function for a specific session"""
    def placement_callback(placement_data):
        emit_placement(session_id, placement_data)
    return placement_callback

def create_backtrack_callback(session_id):
    """Create a backtrack callback function for a specific session"""
    def backtrack_callback(backtrack_data):
        emit_backtrack(session_id, backtrack_data)
    return backtrack_callback

def run_solver_in_thread(session_id, data):
    """Run the solver in a separate thread with progress callbacks"""
    try:
        grid = data.get("grid")
        clues = data.get("clues")
        algorithm = data.get("algorithm", "HYBRID").upper()
        enable_memory_profiling = data.get("enable_memory_profiling", False)

        progress_cb = create_progress_callback(session_id)
        placement_cb = create_placement_callback(session_id)
        backtrack_cb = create_backtrack_callback(session_id)

        if algorithm == "DFS":
            solver = DFSSolver(grid, clues, dict_helper, enable_memory_profiling, 
                             progress_callback=progress_cb,
                             placement_callback=placement_cb,
                             backtrack_callback=backtrack_cb)
        elif algorithm == "A*":
            solver = AStarSolver(grid, clues, dict_helper, enable_memory_profiling,
                               progress_callback=progress_cb,
                               placement_callback=placement_cb, 
                               backtrack_callback=backtrack_cb)
        elif algorithm == "HYBRID":
            solver = HybridSolver(grid, clues, dict_helper, enable_memory_profiling,
                                progress_callback=progress_cb,
                                placement_callback=placement_cb,
                                backtrack_callback=backtrack_cb)
        else:
            solving_sessions[session_id] = {
                'status': 'error',
                'error': 'Invalid algorithm',
                'progress': 0
            }
            return

        solving_sessions[session_id] = {
            'status': 'running',
            'algorithm': algorithm,
            'progress': 0,
            'start_time': time.time()
        }

        result = solver.solve()
        execution_time = time.time() - solving_sessions[session_id]['start_time']

        debug_info = result.get("debug_info", {})
        solving_steps_count = len(result.get("solving_steps", []))
        debug_steps_count = debug_info.get("debug_steps_count", 0)
        
        logging.info(f"Solve completed for session {session_id} in {execution_time:.2f}s - "
                    f"{solving_steps_count} final placements, {debug_steps_count} debug steps")

        solving_sessions[session_id] = {
            'status': 'completed',
            'result': result,
            'progress': 100,
            'execution_time': execution_time,
            'algorithm': algorithm
        }

        socketio.emit('solve_completed', {
            'session_id': session_id,
            'result': result,
            'execution_time': execution_time
        }, room=session_id)

    except Exception as e:
        logging.error(f"Solve error in session {session_id}: {str(e)}", exc_info=True)
        solving_sessions[session_id] = {
            'status': 'error',
            'error': str(e),
            'progress': 0
        }
        socketio.emit('solve_error', {
            'session_id': session_id,
            'error': str(e)
        }, room=session_id)

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
        enable_memory_profiling = data.get("enable_memory_profiling", False)

        if not grid or not clues:
            return jsonify({"error": "Missing grid or clues"}), 400

        session_id = str(uuid.uuid4())

        thread = threading.Thread(target=run_solver_in_thread, args=(session_id, data))
        thread.daemon = True
        thread.start()

        return _corsify_actual_response(jsonify({
            "session_id": session_id,
            "status": "started",
            "algorithm": algorithm,
            "message": f"Solver started with session ID: {session_id}"
        }))

    except Exception as e:
        logging.error(f"Solve error: {str(e)}", exc_info=True)
        return jsonify({
            "error": "Internal server error",
            "details": str(e)
        }), 500

@app.route("/solve_status/<session_id>", methods=["GET"])
def get_solve_status(session_id):
    """Get current status of a solving session"""
    if session_id in solving_sessions:
        return _corsify_actual_response(jsonify(solving_sessions[session_id]))
    else:
        return _corsify_actual_response(jsonify({
            "error": "Session not found"
        }), 404)

@app.route("/solve_sync", methods=["POST", "OPTIONS"])
def solve_sync():
    """Synchronous solve endpoint for backward compatibility"""
    if request.method == "OPTIONS":
        return _build_cors_preflight_response()

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data received"}), 400

        grid = data.get("grid")
        clues = data.get("clues")
        algorithm = data.get("algorithm", "HYBRID").upper()
        enable_memory_profiling = data.get("enable_memory_profiling", False)

        if not grid or not clues:
            return jsonify({"error": "Missing grid or clues"}), 400

        start_time = time.time()

        if algorithm == "DFS":
            solver = DFSSolver(grid, clues, dict_helper, enable_memory_profiling)
        elif algorithm == "A*":
            solver = AStarSolver(grid, clues, dict_helper, enable_memory_profiling)
        elif algorithm == "HYBRID":
            solver = HybridSolver(grid, clues, dict_helper, enable_memory_profiling)
        else:
            return jsonify({"error": "Invalid algorithm"}), 400

        complexity_trackers[algorithm] = solver.complexity_tracker
        
        # MODIFY THIS: Add periodic cancellation check during solving
        result = solver.solve()
        execution_time = time.time() - start_time

        # Check if client is still connected before sending response
        # This helps prevent sending data to disconnected clients
        # Note: This is a basic check - for more robust cancellation, 
        # you'd need to modify the solver algorithms to support interruption
        
        memory_metrics = {
            "memory_usage_kb": result.get("memory_usage_kb", 0),
            "min_memory_kb": result.get("min_memory_kb", 0),
            "peak_memory_kb": result.get("peak_memory_kb", 0),
            "memory_profiling_enabled": enable_memory_profiling
        }

        solving_steps = result.get("solving_steps", [])
        across_placements = result.get("across_placements", [])
        down_placements = result.get("down_placements", [])
        
        debug_info = result.get("debug_info", {})
        logging.info(f"Sync solve completed - {len(solving_steps)} final placements, "
                    f"{debug_info.get('debug_steps_count', 0)} debug steps")

        response_data = {
            "method": algorithm,
            "success": result.get("status", "").lower() == "success",
            "solution": result.get("solution", result.get("grid", [])),
            "metrics": {
                "execution_time": f"{execution_time:.4f}s",
                **memory_metrics,
                "words_placed": f"{result.get('words_placed', 0)}/{result.get('total_words', 0)}",
                "time_complexity": result.get("time_complexity", {}),
                "space_complexity": result.get("space_complexity", {}),
                "fallback_usage_count": result.get("fallback_usage_count", 0),
            },
            "details": {
                "status": result.get("status", "unknown"),
                "algorithm": algorithm
            },
            "solving_steps": solving_steps,
            "across_placements": across_placements,
            "down_placements": down_placements,
            "progress_data": result.get("progress_data", {}),
            "debug_info": debug_info
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
            
            # Log algorithm-specific debug info
            debug_info = result.get("debug_info", {})
            solving_steps_count = len(result.get("solving_steps", []))
            debug_steps_count = debug_info.get("debug_steps_count", 0)
            
            logging.info(f"Algorithm {algo_name}: {solving_steps_count} final placements, "
                        f"{debug_steps_count} debug steps, {execution_time:.3f}s")
            
            results[algo_name] = {
                "success": result.get("status", "").lower() == "success",
                "solution": result.get("solution", result.get("grid", [])),
                "metrics": {
                    "execution_time": f"{execution_time:.4f}s",
                    "memory_usage_kb": result.get("memory_usage_kb", 0),
                    "words_placed": f"{result.get('words_placed', 0)}/{result.get('total_words', 0)}",
                    "time_complexity": result.get("time_complexity", {}),
                    "space_complexity": result.get("space_complexity", {})
                },
                "details": {
                    "status": result.get("status", "unknown")
                },
                # Include clean solving steps for frontend
                "solving_steps": result.get("solving_steps", []),
                "across_placements": result.get("across_placements", []),
                "down_placements": result.get("down_placements", []),
                # Include debug info for analysis
                "debug_info": debug_info
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
            # Create proper empty grid - maintain structure but make word cells empty
            empty_grid = []
            for y in range(final_puzzle.height):
                row = []
                for x in range(final_puzzle.width):
                    # Copy the structure but make word cells empty
                    if final_puzzle.grid[y][x] == '.':
                        row.append('.')  # Black cell
                    else:
                        row.append('')   # Empty cell for words
                empty_grid.append(row)
            
            # Get the clues - this should already include proper numbering
            clues = final_puzzle.get_clues()
            
            return _corsify_actual_response(jsonify({
                "success": True,
                "grid": final_puzzle.grid,
                "empty_grid": empty_grid,   
                "clues": clues,
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
    logging.info("Starting Crossword Solver Server with WebSocket support...")
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)