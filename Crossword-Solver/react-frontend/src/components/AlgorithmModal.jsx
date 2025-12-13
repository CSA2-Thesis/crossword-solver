import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import AlgorithmSelector from './AlgorithmSelector';
import { useSolver } from '../hooks/useSolver';

const AlgorithmModal = ({
  algorithms,
  originalPuzzle,
  onClose,
  onSolveComplete
}) => {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(algorithms[0]?.id || null);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState(null);
  
  const {
    isSolving: solverIsSolving,
    solveProgress,
    solveTime,
    currentPhase,
    solvePuzzle: solvePuzzleInternal,
    cancelSolve
  } = useSolver();

  const algorithmDetails = {
    "DFS": {
      name: "Depth-First Search",
      description: "Systematic backtracking approach that explores all possibilities",
      bestFor: "Smaller puzzles or when completeness is more important than speed",
    },
    "A*": {
      name: "A* Algorithm", 
      description: "Optimized heuristic search that finds the most efficient path",
      bestFor: "Larger puzzles where optimization is crucial",
    },
    "HYBRID": {
      name: "Hybrid Approach",
      description: "Combines DFS thoroughness with A* optimization",
      bestFor: "Balanced performance across different puzzle types",
    }
  };

  const enhancedAlgorithms = algorithms.map(algo => ({
    ...algo,
    ...algorithmDetails[algo.id]
  }));

  const handleSolve = async () => {
    if (!selectedAlgorithm || !originalPuzzle) return;
    
    setIsSolving(true);
    setError(null);
    
    try {
      const result = await solvePuzzleInternal(originalPuzzle, selectedAlgorithm);
      
      if (result) {
        const formattedResult = {
          ...result,
          performance_solving_steps: result.performance_solving_steps || result.solving_steps,
          method: selectedAlgorithm,
          algorithm: selectedAlgorithm,
          metrics: result.metrics || {
            solving_time: result.solving_time,
            memory_usage: result.memory_usage,
            steps_count: result.steps_count,
            fallback_usage_count: result.fallback_usage_count || 0
          }
        };
        
        onSolveComplete(formattedResult);
        onClose();
      } else {
        setError("Failed to solve the puzzle. The algorithm might have timed out or encountered an error.");
      }
    } catch (err) {
      console.error('Error solving puzzle:', err);
      setError(err.message || "An error occurred during solving. Please try again.");
    } finally {
      setIsSolving(false);
    }
  };

  const handleCancel = () => {
    if (solverIsSolving) {
      cancelSolve();
    }
    onClose();
  };

  const modalFooter = (
    <div className="flex gap-3 w-full">
      <Button
        onClick={handleCancel}
        variant="secondary"
        disabled={isSolving || solverIsSolving}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button
        onClick={handleSolve}
        variant="primary"
        disabled={!selectedAlgorithm || isSolving || solverIsSolving}
        isLoading={isSolving || solverIsSolving}
        className="flex-1"
      >
        {isSolving || solverIsSolving ? 'Solving...' : 'Solve'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Try Another Algorithm"
      footer={modalFooter}
      size="lg"
      closeOnBackdropClick={!isSolving && !solverIsSolving}
    >
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Select a different algorithm to solve the same puzzle and compare the results. 
          Each algorithm has different strengths and weaknesses.
        </p>
        
        <AlgorithmSelector
          selectedAlgorithm={selectedAlgorithm}
          onAlgorithmChange={setSelectedAlgorithm}
          algorithms={enhancedAlgorithms}
          isLoading={isSolving || solverIsSolving}
        />
        
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}
        
        {(isSolving || solverIsSolving) && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Solving in progress...
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {solveTime > 0 ? `${solveTime.toFixed(2)}s` : 'Starting...'}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${solveProgress}%` }}
              ></div>
            </div>
            {currentPhase && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Current phase: {currentPhase}
              </p>
            )}
          </div>
        )}
        
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Tip:</strong> The system will solve the same puzzle with a different algorithm of your choice. 
            You can compare the results on the solution page.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default AlgorithmModal;