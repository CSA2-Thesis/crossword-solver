import { useState, useCallback } from 'react';
import axios from 'axios';
import { generateSimulationSteps, extractWordPlacements, calculateAlgorithmStats } from '../utils/solutionAnalysis';

export function useComparison(originalPuzzle) {
  const [comparisonSimulations, setComparisonSimulations] = useState({});
  const [selectedComparisonAlgo, setSelectedComparisonAlgo] = useState('');
  const [isComparing, setIsComparing] = useState(false);

  const runComparison = useCallback(async (algoId) => {
    if (!originalPuzzle) {
      console.error('No original puzzle available for comparison');
      return;
    }
    
    setIsComparing(true);
    setSelectedComparisonAlgo(algoId);

    try {
      // Prepare the empty grid for solving
      const gridToSolve = originalPuzzle.empty_grid
        ? originalPuzzle.empty_grid.map((row) =>
            row.map((cell) => (cell === "." || cell === " " ? "." : "."))
          )
        : originalPuzzle.grid.map((row) =>
            row.map((cell) => (cell === "." || cell === " " ? "." : "."))
          );

      console.log(`Running comparison with ${algoId} algorithm...`);

      // Run performance (no memory profiling)
      const performanceResponse = await axios.post("http://localhost:5000/solve_sync", {
        grid: gridToSolve,
        clues: originalPuzzle.clues,
        algorithm: algoId,
        enable_memory_profiling: false,
      });

      // Run with memory profiling
      const memoryResponse = await axios.post("http://localhost:5000/solve_sync", {
        grid: gridToSolve,
        clues: originalPuzzle.clues,
        algorithm: algoId,
        enable_memory_profiling: true,
      });

      console.log(`Comparison algorithm ${algoId} completed`);
      
      // Combine results
      const result = {
        solution: performanceResponse.data.solution,
        method: algoId,
        metrics: {
          execution_time: performanceResponse.data.metrics?.execution_time || "N/A",
          words_placed: performanceResponse.data.metrics?.words_placed || "N/A",
          time_complexity: performanceResponse.data.metrics?.time_complexity || {},
          space_complexity: performanceResponse.data.metrics?.space_complexity || {},
          fallback_usage_count: performanceResponse.data.metrics?.fallback_usage_count || 0,
          memory_usage_kb: memoryResponse.data.metrics?.memory_usage_kb || "N/A",
          peak_memory_kb: memoryResponse.data.metrics?.peak_memory_kb || "N/A",
          min_memory_kb: memoryResponse.data.metrics?.min_memory_kb || "N/A",
          memory_profiling_enabled: true,
        },
        success: performanceResponse.data.success || false,
        solving_steps: performanceResponse.data.solving_steps || [],
        across_placements: performanceResponse.data.across_placements || [],
        down_placements: performanceResponse.data.down_placements || [],
        progress_data: performanceResponse.data.progress_data || {},
        debug_info: {
          performance_run: performanceResponse.data.debug_info || {},
          memory_run: memoryResponse.data.debug_info || {},
          dual_run: true,
        }
      };

      // Generate simulation steps
      console.log(`Generating simulation steps for ${algoId}...`);
      const simulationSteps = generateSimulationSteps(result, originalPuzzle);
      
      // Extract word placements
      console.log(`Extracting word placements for ${algoId}...`);
      const placements = extractWordPlacements(result.solving_steps);
      
      // Calculate algorithm stats
      console.log(`Calculating stats for ${algoId}...`);
      const algorithmStats = calculateAlgorithmStats(result.solving_steps);
      
      console.log(`${algoId} simulation data:`, {
        steps: simulationSteps.length,
        placements: placements.across.length + placements.down.length,
        stats: algorithmStats
      });

      setComparisonSimulations((prev) => ({
        ...prev,
        [algoId]: {
          result,
          simulationSteps,
          wordPlacements: placements,
          algorithmStats,
        },
      }));

    } catch (error) {
      console.error(`Comparison algorithm ${algoId} error:`, error);
      alert(`Failed to run comparison with ${algoId} algorithm. Please try again.`);
      
      // Clear the selected algorithm on error
      setSelectedComparisonAlgo('');
    } finally {
      setIsComparing(false);
    }
  }, [originalPuzzle]);

  return {
    comparisonSimulations,
    selectedComparisonAlgo,
    isComparing,
    runComparison,
    setSelectedComparisonAlgo
  };
}