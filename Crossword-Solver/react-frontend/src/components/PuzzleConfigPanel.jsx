import React, { useEffect } from "react";
import Button from "./Button";

const PuzzleConfigPanel = ({
  gridSize,
  onGridSizeChange,
  difficulty,
  onDifficultyChange,
  onGenerate,
  isLoading,
  onReset,
}) => {
  // Load settings from sessionStorage on component mount
  useEffect(() => {
    const savedSettings = sessionStorage.getItem("puzzleSettings");
    if (savedSettings) {
      try {
        const { size, difficulty } = JSON.parse(savedSettings);
        if (size) onGridSizeChange(size);
        if (difficulty) onDifficultyChange(difficulty);
      } catch (e) {
        console.error("Failed to parse saved settings", e);
      }
    }
  }, [onGridSizeChange, onDifficultyChange]);

  // Save settings whenever they change
  useEffect(() => {
    const settings = { size: gridSize, difficulty };
    sessionStorage.setItem("puzzleSettings", JSON.stringify(settings));
  }, [gridSize, difficulty]);

  const handleGenerate = () => {
    // Save settings before generating
    sessionStorage.setItem(
      "puzzleSettings",
      JSON.stringify({
        size: gridSize,
        difficulty,
      })
    );
    onGenerate();
  };

  const handleReset = () => {
    // Clear both puzzle and settings
    sessionStorage.removeItem("puzzleSettings");
    sessionStorage.removeItem("crosswordPuzzle");
    onReset();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-700/50 p-6 transition-colors duration-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        Puzzle Configuration
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Grid Size:{" "}
            <span className="font-bold">
              {gridSize}x{gridSize}
            </span>
          </label>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="range"
                min="7"
                max="21"
                step="1"
                value={gridSize}
                onChange={(e) => onGridSizeChange(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
                <span>Small</span>
                <span className="absolute right-0 -translate-x-3">Large</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Word Density
          </label>
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="easy">Easy (More black spaces)</option>
            <option value="medium">Medium (Balanced)</option>
            <option value="hard">Hard (More words)</option>
          </select>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleGenerate}
            loading={isLoading}
            fullWidth
            variant="primary"
          >
            {isLoading ? "Generating..." : "Generate Puzzle"}
          </Button>

          <Button
            onClick={handleReset}
            fullWidth
            variant="secondary"
            disabled={isLoading}
          >
            Clear Puzzle
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PuzzleConfigPanel;
