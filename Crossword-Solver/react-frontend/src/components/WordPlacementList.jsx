import React from 'react';
import { FiClock } from 'react-icons/fi';

export default function WordPlacementList({ direction, placements }) {
  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return "0.00s";
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(2)}s`;
  };

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {placements.length > 0 ? (
        placements.map((placement, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded border border-blue-100 dark:border-blue-900">
            <div className="flex items-center">
              <span className="font-semibold text-blue-600 dark:text-blue-400 text-sm w-6">
                {placement.number}.
              </span>
              <div className="ml-2">
                <span className="font-mono text-sm font-bold">{placement.word}</span>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                  {placement.clue}
                </div>
              </div>
            </div>
            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/50 px-2 py-1 rounded">
              <FiClock size={10} className="mr-1" />
              {formatTime(placement.time)}
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
          No {direction} words placed
        </p>
      )}
    </div>
  );
}