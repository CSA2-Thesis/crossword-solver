// components/ProgressBar.jsx
import { FiClock, FiRotateCcw } from "react-icons/fi";
import Button from "./Button";

export default function ProgressBar({ 
  isSolving, 
  solveProgress, 
  solveTime, 
  currentPhase, 
  selectedAlgorithm,
  algorithms,
  onCancel 
}) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-700 dark:text-gray-300 flex items-center">
          <FiClock className="mr-2" />
          {currentPhase === "performance" ? "Performance Analysis" : "Memory Analysis"}
        </h4>
        <span className="text-sm text-gray-500">{solveTime.toFixed(1)}s</span>
      </div>
      
      <ProgressBarInner 
        isSolving={isSolving}
        solveProgress={solveProgress}
        solveTime={solveTime}
        currentPhase={currentPhase}
        selectedAlgorithm={selectedAlgorithm}
      />
      
      {isSolving && (
        <Button
          onClick={onCancel}
          variant="secondary"
          fullWidth
          icon={<FiRotateCcw size={16} />}
        >
          Cancel Analysis
        </Button>
      )}
    </div>
  );
}

function ProgressBarInner({ isSolving, solveProgress, solveTime, currentPhase, selectedAlgorithm }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isSolving ? (
            currentPhase === "performance" 
              ? `Measuring performance (${selectedAlgorithm})...`
              : `Measuring memory usage (${selectedAlgorithm})...`
          ) : "Ready to solve"}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {solveTime.toFixed(1)}s
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div 
          className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${solveProgress}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>0%</span>
        <span>{Math.round(solveProgress)}%</span>
        <span>100%</span>
      </div>
      {isSolving && solveProgress < 100 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          {currentPhase === "performance" && 'Running algorithm without memory profiling for accurate timing...'}
          {currentPhase === "memory" && 'Running algorithm with memory profiling to measure resource usage...'}
        </p>
      )}
      {isSolving && solveProgress === 100 && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2 text-center font-medium">
          Analysis complete! Preparing results...
        </p>
      )}
    </div>
  );
}