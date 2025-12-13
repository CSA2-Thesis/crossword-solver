import React from 'react';
import { FaMemory } from 'react-icons/fa';
import { FiAlertTriangle } from 'react-icons/fi';

export default function SolutionHeader({ 
  analysis = {}, 
  metrics = {}, 
  solvedResult = {},
  fallbackCount = 0
}) {
  // Provide default values for destructuring
  const { 
    accuracy = 0, 
    wordAccuracy = 0, 
    correctCells = 0, 
    totalCells = 0, 
    correctWords = 0, 
    totalWords = 0 
  } = analysis;

  const formatMemoryUsage = (kb) => {
    if (!kb || kb === "N/A" || isNaN(Number(kb)) || Number(kb) <= 0) return "N/A";
    const numKb = Number(kb);
    if (numKb >= 1024) {
      return `${(numKb / 1024).toFixed(2)} MB`;
    }
    return `${numKb.toFixed(2)} KB`;
  };

  return (
    <>
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Algorithm Solution Analysis
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Review {solvedResult?.method || 'algorithm'} execution and solution performance
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">Accuracy Metrics</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalCells > 0 ? `${Math.round(accuracy * 100)}%` : "N/A"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Cell Accuracy</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {correctCells}/{totalCells}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                {totalWords > 0 ? `${Math.round(wordAccuracy * 100)}%` : "N/A"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Word Accuracy</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {correctWords}/{totalWords}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-center">
            <FaMemory className="mr-1" size={14} /> Performance
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Time:</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                {metrics.execution_time || "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Method:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {solvedResult?.method || "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Words:</span>
              <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                {metrics.words_placed || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Memory Usage Card */}
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-center">
            <FaMemory className="mr-1" size={14} /> Memory Usage
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Average:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {formatMemoryUsage(metrics.memory_usage_kb)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Peak:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatMemoryUsage(metrics.peak_memory_kb)}
              </span>
            </div>
          </div>
        </div>

        {/* Algorithm Stats Card */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 text-center">
            Algorithm Behavior
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <div className="font-semibold text-blue-600 dark:text-blue-400">
                {solvedResult?.debug_info?.total_placements || 0}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Placements</div>
            </div>
            {/* <div className="text-center">
              <div className="font-semibold text-orange-600 dark:text-orange-400">
                {solvedResult?.debug_info?.total_backtracks || 0}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Backtracks</div>
            </div> */}
            <div className="text-center">
              <div className="font-semibold text-yellow-600 dark:text-yellow-400">
                {solvedResult?.debug_info?.total_evaluations || 0}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Evaluations</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-purple-600 dark:text-purple-400">
                {solvedResult?.debug_info?.performance_steps || 0}
              </div>
              <div className="text-center text-gray-500 dark:text-gray-400">Steps</div>
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            Total Steps: {solvedResult?.solving_steps?.length || 0}
          </div>
        </div>
      </div>

      {fallbackCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center mb-2">
            <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm sm:text-base">Pattern Matching Fallback System Used</h3>
          </div>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
            The algorithm used the last fallback strategy <strong>{fallbackCount} time(s)</strong> to find suitable words in a slot based on the pattern.
          </p>
          <div className="text-xs text-yellow-600 dark:text-yellow-500">
            This indicates the puzzle used the pattern matching approach to find the correct answer and may result to answers that may more likely be wrong.
          </div>
        </div>
      )}
    </>
  );
}