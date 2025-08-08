import React from "react";
import { FiInfo } from "react-icons/fi";

const AlgorithmSelector = ({
  selectedAlgorithm = "HYBRID",
  onAlgorithmChange = () => {},
  algorithms = [],
  footer = null,
  isLoading = false,
}) => {
  const defaultAlgorithms = [
    {
      id: "DFS",
      name: "Depth-First Search",
      description: "Systematic backtracking approach that explores all possibilities",
      bestFor: "Smaller puzzles or when completeness is more important than speed",
    },
    {
      id: "A*",
      name: "A* Algorithm",
      description: "Optimized heuristic search that finds the most efficient path",
      bestFor: "Larger puzzles where optimization is crucial",
    },
    {
      id: "HYBRID",
      name: "Hybrid Approach",
      description: "Combines DFS thoroughness with A* optimization",
      bestFor: "Balanced performance across different puzzle types",
    },
  ];

  const availableAlgorithms = algorithms.length ? algorithms : defaultAlgorithms;

  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm">
        Choose the algorithm that best fits your puzzle:
      </p>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {availableAlgorithms.map((algorithm) => (
          <div
            key={algorithm.id}
            onClick={() => !isLoading && onAlgorithmChange(algorithm.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
              selectedAlgorithm === algorithm.id
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            } ${isLoading ? "cursor-not-allowed opacity-70" : ""}`}
          >
            <div className="flex items-start">
              <div
                className={`h-5 w-5 rounded-full border flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 ${
                  selectedAlgorithm === algorithm.id
                    ? "border-blue-600 bg-blue-600"
                    : "border-gray-300 dark:border-gray-500"
                }`}
              >
                {selectedAlgorithm === algorithm.id && (
                  <svg
                    className="w-3.5 h-3.5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4
                    className={`font-medium ${
                      selectedAlgorithm === algorithm.id
                        ? "text-blue-900 dark:text-blue-300"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {algorithm.name}
                  </h4>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedAlgorithm === algorithm.id
                        ? "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {algorithm.id}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-tight">
                  {algorithm.description}
                </p>
                <div className="mt-2 flex items-start text-xs text-gray-500 dark:text-gray-400">
                  <FiInfo className="flex-shrink-0 mr-1.5 mt-0.5" size={12} />
                  <span>Best for: {algorithm.bestFor}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {footer && (
        <div className="pt-4 border-t border-gray-200 mt-2">
          {footer}
        </div>
      )}
    </div>
  );
};

export default AlgorithmSelector;