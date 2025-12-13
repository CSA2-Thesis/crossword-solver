import { useMemo } from 'react';
import { analyzeSolution } from '../utils/solutionAnalysis';

export function useSolutionAnalysis(solvedResult, originalPuzzle) {
  return useMemo(() => {
    console.log('useSolutionAnalysis called with:', {
      hasSolvedResult: !!solvedResult,
      hasOriginalPuzzle: !!originalPuzzle,
      solvedResultKeys: solvedResult ? Object.keys(solvedResult) : []
    });
    
    if (!solvedResult?.solution || !originalPuzzle?.grid) {
      console.warn('Missing data in useSolutionAnalysis');
      return getDefaultAnalysis();
    }

    try {
      return analyzeSolution(
        solvedResult.solution,
        originalPuzzle.grid,
        originalPuzzle.clues
      );
    } catch (error) {
      console.error('Error in analyzeSolution:', error);
      return getDefaultAnalysis();
    }
  }, [solvedResult, originalPuzzle]);
}

function getDefaultAnalysis() {
  return {
    correctCells: 0,
    totalCells: 0,
    accuracy: 0,
    correctWords: 0,
    totalWords: 0,
    wordAccuracy: 0,
    incorrectPositions: [],
    correctPositions: []
  };
}