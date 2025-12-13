import React, { useState } from 'react';
import AlgorithmSelector from './AlgorithmSelector';
import Button from './Button';
import ProgressBar from './ProgressBar';
import { FiCheckCircle } from "react-icons/fi";
import { useSolver } from '../hooks/useSolver';

export default function PuzzleSolver({ 
  puzzle, 
  algorithms,
  onSolveComplete,
  onCancel,
  onError,
  initialSelectedAlgorithm = null
}) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(initialSelectedAlgorithm);
  const {
    isSolving,
    solveProgress,
    solveTime,
    currentPhase,
    error,
    solvePuzzle: solvePuzzleInternal,
    cancelSolve,
    setError: setSolverError
  } = useSolver();

  const handleSolve = async () => {
    if (!puzzle || !selectedAlgorithm) return;
    
    const result = await solvePuzzleInternal(puzzle, selectedAlgorithm);
    if (result && onSolveComplete) {
      // Use only the solving_steps from the performance run (first run)
      const cleanResult = {
        ...result,
        // Ensure we're using the steps from the performance run
        solving_steps: result.performance_solving_steps || result.solving_steps,
        debug_info: {
          ...result.debug_info,
          // Mark which steps we're using
          steps_source: 'performance_run'
        }
      };
      onSolveComplete(cleanResult);
    } else if (onError) {
      onError(error || "Failed to solve puzzle");
    }
  };

  const handleCancel = () => {
    cancelSolve();
    if (onCancel) onCancel();
  };

  return (
    <div className="space-y-4">
      <AlgorithmSelector
        selectedAlgorithm={selectedAlgorithm}
        onAlgorithmChange={setSelectedAlgorithm}
        algorithms={algorithms}
        isLoading={isSolving}
      />
      
      {isSolving ? (
        <ProgressBar
          isSolving={isSolving}
          solveProgress={solveProgress}
          solveTime={solveTime}
          currentPhase={currentPhase}
          selectedAlgorithm={selectedAlgorithm}
          algorithms={algorithms}
          onCancel={handleCancel}
        />
      ) : (
        <Button
          onClick={handleSolve}
          variant="primary"
          fullWidth
          disabled={!selectedAlgorithm}
          icon={<FiCheckCircle size={18} />}
        >
          {selectedAlgorithm 
            ? `Solve with ${algorithms.find((a) => a.id === selectedAlgorithm)?.name}`
            : "Select an algorithm first"
          }
        </Button>
      )}
    </div>
  );
}