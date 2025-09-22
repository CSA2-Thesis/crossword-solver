import React from 'react';

export default function ProgressBar({ progress, algorithm }) {
  const { iteration, filled_slots, total_slots, completion_percentage, status } = progress;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
        Solving with {algorithm}
      </h3>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Progress</span>
            <span>{Math.round(completion_percentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${completion_percentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <div className="text-blue-600 dark:text-blue-400 font-semibold">{filled_slots}/{total_slots}</div>
            <div className="text-gray-600 dark:text-gray-400">Filled Slots</div>
          </div>
          
          <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <div className="text-purple-600 dark:text-purple-400 font-semibold">{iteration}</div>
            <div className="text-gray-600 dark:text-gray-400">Iterations</div>
          </div>
        </div>
        
        {status === 'processing' && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Solving in progress...
          </div>
        )}
        
        {status === 'completed' && (
          <div className="text-center text-sm text-green-600 dark:text-green-400">
            Solving completed!
          </div>
        )}
        
        {status === 'max_iterations_reached' && (
          <div className="text-center text-sm text-yellow-600 dark:text-yellow-400">
            Maximum iterations reached
          </div>
        )}
      </div>
    </div>
  );
}
