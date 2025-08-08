import React from 'react';
import Button from './Button';

const PuzzleConfigPanel = ({
  gridSize,
  onGridSizeChange,
  difficulty,
  onDifficultyChange,
  onGenerate,
  isLoading,
  onReset
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Puzzle Configuration</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Grid Size: <span className="font-bold">{gridSize}x{gridSize}</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="7"
              max="21"
              step="1"
              value={gridSize}
              onChange={(e) => onGridSizeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm w-12 text-center font-medium bg-gray-100 px-2 py-1 rounded">
              {gridSize}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Small</span>
            <span>Large</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Word Density
          </label>
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="easy">Easy (More black spaces)</option>
            <option value="medium">Medium (Balanced)</option>
            <option value="hard">Hard (More words)</option>
          </select>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            onClick={onGenerate}
            loading={isLoading}
            fullWidth
            variant="primary"
          >
            {isLoading ? 'Generating...' : 'Generate Puzzle'}
          </Button>
          
          <Button
            onClick={onReset}
            fullWidth
            variant="secondary"
            disabled={isLoading}
          >
            Reset Settings
          </Button>
        </div>
      </div>
    </div>
  );
};


export default PuzzleConfigPanel;