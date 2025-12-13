import React from 'react';
import CrosswordGrid from './CrosswordGrid';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default function OverlayView({
  solvedResult,
  originalPuzzle,
  analysis,
  getOptimalCellSize
}) {
  const { incorrectPositions, correctPositions, correctCells, totalCells, accuracy, correctWords, totalWords, wordAccuracy } = analysis;

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <CrosswordGrid
          grid={solvedResult?.solution}
          clues={originalPuzzle?.clues}
          cellSize={getOptimalCellSize()}
          showAnswers
          highlightErrors
          errorPositions={incorrectPositions}
          highlightCorrect
          correctPositions={correctPositions}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center">
            <FiCheckCircle className="mr-2" size={18} />
            Correct Cells
          </h4>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
            {correctCells} / {totalCells}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            {totalCells > 0 ? `${Math.round(accuracy * 100)}%` : "N/A"} accuracy
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center">
            <FiCheckCircle className="mr-2" size={18} />
            Correct Words
          </h4>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            {correctWords} / {totalWords}
          </p>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            {totalWords > 0 ? `${Math.round(wordAccuracy * 100)}%` : "N/A"} word accuracy
          </p>
        </div>
      </div>

      {incorrectPositions.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-red-800 dark:text-red-300 mb-3 flex items-center">
            <FiXCircle className="mr-2" size={18} />
            Incorrect Cells ({incorrectPositions.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {incorrectPositions.map((pos, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded text-sm border border-red-100 dark:border-red-900">
                <div className="font-mono font-semibold">({pos.x}, {pos.y})</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Expected: <span className="font-semibold">{pos.expected}</span>
                </div>
                <div className="text-xs text-red-600 dark:text-red-400">
                  Got: <span className="font-semibold">{pos.got || "empty"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}