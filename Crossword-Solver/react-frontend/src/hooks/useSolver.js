import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export function useSolver() {
  const [isSolving, setIsSolving] = useState(false);
  const [solveProgress, setSolveProgress] = useState(0);
  const [solveTime, setSolveTime] = useState(0);
  const [solveStartTime, setSolveStartTime] = useState(null);
  const [currentPhase, setCurrentPhase] = useState("");
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);

  const resetProgress = () => {
    setSolveProgress(0);
    setSolveTime(0);
    setSolveStartTime(null);
    setCurrentPhase("");
  };

  useEffect(() => {
    let progressInterval;
    if (isSolving && solveStartTime) {
      progressInterval = setInterval(() => {
        const elapsed = (Date.now() - solveStartTime) / 1000;
        setSolveTime(elapsed);
        
        if (solveProgress < 95) {
          const baseIncrement = currentPhase === "memory" ? 0.3 : 0.7;
          setSolveProgress(prev => Math.min(prev + baseIncrement, 95));
        }
      }, 500);
    }
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isSolving, solveStartTime, solveProgress, currentPhase]);

  const solvePuzzle = async (puzzle, algorithm) => {
    if (!puzzle || !algorithm) return null;
    
    setIsSolving(true);
    setError(null);
    resetProgress();
    setSolveStartTime(Date.now());
    
    abortControllerRef.current = new AbortController();
    
    try {
      const gridToSolve = puzzle.empty_grid.map((row) =>
        row.map((cell) => {
          if (cell === "." || cell === " ") return ".";
          return ".";
        })
      );

      setCurrentPhase("performance");
      setSolveProgress(30);
      
      console.log(`🔄 Phase 1: Solving without memory profiling (${algorithm})`);
      
      // FIRST RUN: Performance (no memory profiling)
      const performanceResponse = await axios.post("http://localhost:5000/solve_sync", {
        grid: gridToSolve,
        clues: puzzle.clues,
        algorithm: algorithm,
        enable_memory_profiling: false,
      }, {
        signal: abortControllerRef.current.signal
      });

      if (abortControllerRef.current.signal.aborted) return null;

      setCurrentPhase("memory");
      setSolveProgress(70);
      
      console.log(`🔄 Phase 2: Solving with memory profiling (${algorithm})`);
      
      // SECOND RUN: Memory profiling
      const memoryResponse = await axios.post("http://localhost:5000/solve_sync", {
        grid: gridToSolve,
        clues: puzzle.clues,
        algorithm: algorithm,
        enable_memory_profiling: true,
      }, {
        signal: abortControllerRef.current.signal
      });

      if (abortControllerRef.current.signal.aborted) return null;

      setSolveProgress(100);

      // Combine results but keep both sets of steps for reference
      const combinedResult = {
        // Solution and method from first run
        solution: performanceResponse.data.solution,
        method: performanceResponse.data.method || algorithm,
        success: performanceResponse.data.success || false,
        
        // Metrics combined from both runs
        metrics: {
          execution_time: performanceResponse.data.metrics?.execution_time || "N/A",
          words_placed: performanceResponse.data.metrics?.words_placed || "N/A",
          time_complexity: performanceResponse.data.metrics?.time_complexity || {},
          space_complexity: performanceResponse.data.metrics?.space_complexity || {},
          fallback_usage_count: performanceResponse.data.metrics?.fallback_usage_count || 0,
          
          // Memory metrics from second run
          memory_usage_kb: memoryResponse.data.metrics?.memory_usage_kb || "N/A",
          peak_memory_kb: memoryResponse.data.metrics?.peak_memory_kb || "N/A",
          min_memory_kb: memoryResponse.data.metrics?.min_memory_kb || "N/A",
          memory_profiling_enabled: true,
        },
        
        // STEPS FROM FIRST RUN (for simulation)
        solving_steps: performanceResponse.data.solving_steps || [],
        across_placements: performanceResponse.data.across_placements || [],
        down_placements: performanceResponse.data.down_placements || [],
        progress_data: performanceResponse.data.progress_data || {},
        
        // STEPS FROM SECOND RUN (for reference only)
        memory_solving_steps: memoryResponse.data.solving_steps || [],
        
        debug_info: {
          performance_run: performanceResponse.data.debug_info || {},
          memory_run: memoryResponse.data.debug_info || {},
          dual_run: true,
          performance_steps: performanceResponse.data.solving_steps?.length || 0,
          memory_steps: memoryResponse.data.solving_steps?.length || 0,
          algorithm_type: algorithm,
          
          // Statistics from FIRST RUN only
          total_placements: (performanceResponse.data.solving_steps?.filter(step => 
            step.step_type === 'placement').length || 0),
          total_backtracks: (performanceResponse.data.solving_steps?.filter(step => 
            step.step_type === 'backtrack').length || 0),
          total_evaluations: (performanceResponse.data.solving_steps?.filter(step => 
            step.step_type === 'evaluation').length || 0),
        }
      };

      console.log(`Performance run: ${combinedResult.debug_info.performance_steps} steps, ${combinedResult.debug_info.total_placements} placements`);
      console.log(`Memory run: ${combinedResult.debug_info.memory_steps} steps`);

      return combinedResult;
      
    } catch (err) {
      if (err.name !== 'CanceledError' && !axios.isCancel(err)) {
        handleError(err, "Failed to solve puzzle");
      }
      return null;
    } finally {
      setIsSolving(false);
      abortControllerRef.current = null;
    }
  };

  const cancelSolve = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsSolving(false);
    resetProgress();
  };

  const handleError = (err, defaultMessage) => {
    let errorMessage = defaultMessage;
    if (err.response) {
      errorMessage = err.response.data?.error || `Server error: ${err.response.status}`;
    } else if (err.request) {
      errorMessage = "No response from server";
    } else {
      errorMessage = err.message;
    }
    setError(errorMessage);
    console.error("Error:", err);
  };

  return {
    isSolving,
    solveProgress,
    solveTime,
    currentPhase,
    error,
    solvePuzzle,
    cancelSolve,
    resetProgress,
    setError
  };
}