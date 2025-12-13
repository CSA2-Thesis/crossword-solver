import React from 'react';
import { 
  FiPlay, FiPause, FiSkipForward, FiSkipBack, 
  FiRotateCcw, FiClock 
} from 'react-icons/fi';

export default function SimulationPlayer({
  title,
  simulationSteps,
  currentStep,
  isPlaying,
  simulationSpeed,
  algorithmStats,
  onPlayPause,
  onRestart,
  onPrev,
  onNext,
  onStepChange,
  onSpeedChange,
  children,
  showControls = true,
  showStats = true
}) {
  if (simulationSteps.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Loading simulation data...</p>
      </div>
    );
  }

  const currentStepData = simulationSteps[currentStep] || {};
  const totalSteps = simulationSteps.length;

  const getSliderBackground = () => {
    if (totalSteps <= 1) return undefined;
    const percent = (currentStep / (totalSteps - 1)) * 100;
    return {
      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percent}%, #e5e7eb ${percent}%, #e5e7eb 100%)`
    };
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return "0.00s";
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    return `${seconds.toFixed(2)}s`;
  };

  const getStepColor = (stepType) => {
    switch (stepType) {
      case "algorithm_start": 
      case "start": 
        return "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600";
      case "evaluating": 
      case "evaluation": 
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "placing": 
      case "placement": 
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "complete": 
      case "completion": 
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      case "conflict": 
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    //   case "backtracking": 
    //   case "backtrack": 
        return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
      case "heuristic_calc": 
        return "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800";
      case "state_expansion": 
        return "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800";
      default: 
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {title && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 text-center">
            {title}
          </h3>
          
          {showStats && algorithmStats && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  {algorithmStats.totalSteps || totalSteps}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Total Steps</div>
              </div>
              <div>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  {algorithmStats.placements || 0}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Placements</div>
              </div>
              {/* <div>
                <div className="font-semibold text-orange-600 dark:text-orange-400">
                  {algorithmStats.backtracks || 0}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Backtracks</div>
              </div> */}
              <div>
                <div className="font-semibold text-purple-600 dark:text-purple-400">
                  {formatTime(simulationSteps[simulationSteps.length - 1]?.cumulativeTime || 0)}
                </div>
                <div className="text-gray-600 dark:text-gray-400">Total Time</div>
              </div>
            </div>
          )}
        </div>
      )}

      {showControls && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={onRestart}
                className="p-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                title="Restart Simulation"
              >
                <FiRotateCcw size={16} />
              </button>
              <button
                onClick={onPrev}
                disabled={currentStep === 0}
                className="p-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous Step"
              >
                <FiSkipBack size={16} />
              </button>
              <button
                onClick={onPlayPause}
                className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
              </button>
              <button
                onClick={onNext}
                disabled={currentStep === totalSteps - 1}
                className="p-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next Step"
              >
                <FiSkipForward size={16} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">Speed:</span>
              <select
                value={simulationSpeed}
                onChange={(e) => onSpeedChange(Number(e.target.value))}
                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={2000}>Slow</option>
                <option value={1000}>Normal</option>
                <option value={500}>Fast</option>
                <option value={250}>Very Fast</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStep + 1} of {totalSteps}
            </div>
          </div>

          <div className="mt-4">
            <input
              type="range"
              min="0"
              max={totalSteps - 1}
              value={currentStep}
              onChange={(e) => onStepChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              style={getSliderBackground()}
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Start</span>
              <span>End</span>
            </div>
          </div>
        </div>
      )}

      {currentStepData && (
        <div className={`text-center p-4 rounded-lg border-2 ${getStepColor(currentStepData?.stepType)}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="font-semibold text-gray-800 dark:text-white">{currentStepData?.description}</span>
          </div>
          
          {currentStepData?.cumulativeTime !== undefined && (
            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-2">
              <FiClock size={14} />
              <span>Time: {formatTime(currentStepData.cumulativeTime)}</span>
            </div>
          )}
          
          {currentStepData?.placedWord && (
            <div className="text-sm opacity-80 mt-2">
              Placed: <strong className="font-mono">{currentStepData.placedWord.answer}</strong> 
              <span className="mx-2">•</span>
              {currentStepData.placedWord.direction.toUpperCase()} {currentStepData.placedWord.number}
            </div>
          )}
        </div>
      )}

      {children && (
        <div className="flex justify-center">
          <div className="relative">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}