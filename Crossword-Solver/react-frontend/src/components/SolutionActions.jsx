import React from 'react';
import Button from './Button';
import { 
  FiXCircle, 
  FiDownload, 
  FiBarChart2, 
  FiRefreshCw 
} from 'react-icons/fi';

export default function SolutionActions({
  onBackToPuzzle,
  onTryAnotherAlgorithm,
  onExportSolution,
  onSaveAnalytics
}) {
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
      <Button
        onClick={onBackToPuzzle}
        variant="secondary"
        icon={<FiXCircle size={16} className="sm:w-4 sm:h-4" />}
        className="text-sm sm:text-base"
      >
        Back to Puzzle
      </Button>
      <Button
        onClick={onTryAnotherAlgorithm}
        variant="primary"
        icon={<FiRefreshCw size={16} className="sm:w-4 sm:h-4" />}
        className="text-sm sm:text-base"
      >
        Try Another Algorithm
      </Button>
      <Button
        onClick={onExportSolution}
        variant="secondary"
        icon={<FiDownload size={16} className="sm:w-4 sm:h-4" />}
        className="text-sm sm:text-base"
      >
        Export Solution
      </Button>
      <Button
        onClick={onSaveAnalytics}
        variant="primary"
        icon={<FiBarChart2 size={16} className="sm:w-4 sm:h-4" />}
        className="text-sm sm:text-base"
      >
        Save to Analytics
      </Button>
    </div>
  );
}