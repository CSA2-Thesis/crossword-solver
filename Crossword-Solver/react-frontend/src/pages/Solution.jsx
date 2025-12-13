import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSolutionAnalysis } from '../hooks/useSolutionAnalysis';
import { useSimulation } from '../hooks/useSimulation';
import { useComparison } from '../hooks/useComparison';
import SolutionHeader from '../components/SolutionHeader';
import SolutionViewTabs from '../components/SolutionViewTabs';
import OverlayView from '../components/OverlayView';
import AlgorithmSimulation from '../components/AlgorithmSimulation';
import ComparisonView from '../components/ComparisonView';
import SolutionActions from '../components/SolutionActions';
import AlgorithmModal from '../components/AlgorithmModal';
import { storeAnalyticsData } from '../utils/DataStorage';
import { 
  getFirstRunSteps,
  generateSimulationSteps, 
  extractWordPlacements, 
  calculateAlgorithmStats 
} from '../utils/solutionAnalysis';

const Solution = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { solvedResult, originalPuzzle } = location.state || {};
  const [view, setView] = useState("overlay");
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [wordPlacements, setWordPlacements] = useState({ across: [], down: [] });
  const [algorithmStats, setAlgorithmStats] = useState({
    totalSteps: 0,
    placements: 0,
    backtracks: 0,
    evaluations: 0,
    heuristicCalcs: 0,
    stateExpansions: 0
  });
  const [showAlgorithmModal, setShowAlgorithmModal] = useState(false);

  // Debug log
  useEffect(() => {
    console.log('Solution Page Data:', {
      locationState: location.state,
      hasSolvedResult: !!solvedResult,
      hasOriginalPuzzle: !!originalPuzzle,
      solvedResultKeys: solvedResult ? Object.keys(solvedResult) : 'none',
      originalPuzzleKeys: originalPuzzle ? Object.keys(originalPuzzle) : 'none'
    });
    
    if (solvedResult) {
      console.log('Solved Result Structure:', {
        hasSolution: !!solvedResult.solution,
        solutionType: typeof solvedResult.solution,
        hasSolvingSteps: !!solvedResult.solving_steps,
        solvingStepsType: typeof solvedResult.solving_steps,
        solvingStepsLength: solvedResult.solving_steps?.length || 0
      });
    }
  }, []);

  // Use custom hooks
  const analysis = useSolutionAnalysis(solvedResult, originalPuzzle);
  const simulation = useSimulation([]);
  const comparison = useComparison(originalPuzzle);

  const algorithms = [
    { id: "DFS", name: "Depth-First Search" },
    { id: "A*", name: "A* Algorithm" },
    { id: "HYBRID", name: "Hybrid Approach" }
  ];

useEffect(() => {
  const initializeData = async () => {
    setIsLoading(true);
    
    if (!solvedResult || !originalPuzzle) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    try {
      // Use FIRST RUN steps only for simulation
      const firstRunSteps = getFirstRunSteps(solvedResult);
      console.log('Using first run steps:', firstRunSteps.length);
      
      const steps = generateSimulationSteps(
        { ...solvedResult, solving_steps: firstRunSteps },
        originalPuzzle
      );
      
      simulation.setSimulationSteps(steps);
      
      // Extract word placements from FIRST RUN steps only
      const placements = extractWordPlacements(firstRunSteps);
      setWordPlacements(placements);
      
      // Calculate stats from FIRST RUN steps only
      const stats = calculateAlgorithmStats(firstRunSteps);
      setAlgorithmStats(stats);
      
    } catch (error) {
      console.error('Error initializing solution data:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  initializeData();
}, [solvedResult, originalPuzzle]);

  // Error handling
  if (hasError) {
    return (
      <div className="min-h-screen py-8 px-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-red-500 dark:text-red-400 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Error Loading Solution</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {!solvedResult ? 'No solution data found.' : 
             !originalPuzzle ? 'Original puzzle data missing.' : 
             'Unable to process the solution data.'}
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-6 text-left">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <strong>Debug Info:</strong>
              <br />• Has solvedResult: {!!solvedResult}
              <br />• Has originalPuzzle: {!!originalPuzzle}
              <br />• Data keys: {solvedResult ? Object.keys(solvedResult).join(', ') : 'none'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/generate')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Puzzle Generator
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen py-8 px-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading solution data...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Processing algorithm execution details
          </p>
        </div>
      </div>
    );
  }

  const handleBackToPuzzle = () => {
    navigate("/generate", { 
      state: { 
        puzzle: originalPuzzle,
        keepPuzzle: true
      } 
    });
  };

  const handleSaveAnalytics = async () => {
    try {
      const analyticsData = {
        algorithm: solvedResult.method || solvedResult.algorithm,
        timestamp: new Date().toISOString(),
        metrics: solvedResult.metrics || {},
        algorithm_stats: algorithmStats,
        puzzle_info: {
          size: originalPuzzle.grid?.length,
          word_count: analysis.totalWords,
          difficulty: originalPuzzle.stats?.difficulty || 'unknown'
        },
        analysis_data: analysis
      };

      await storeAnalyticsData(analyticsData);
      navigate('/analytics', { state: { analyticsData } });
    } catch (error) {
      console.error('Error saving analytics:', error);
      alert('Failed to save analytics. Please try again.');
    }
  };

  const handleExportSolution = () => {
    try {
      const dataStr = JSON.stringify({
        solvedResult,
        originalPuzzle,
        analysis,
        timestamp: new Date().toISOString()
      }, null, 2);
      
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `solution-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export solution.');
    }
  };

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6 transition-colors duration-200 ">
      <div className="max-w-7xl mx-auto">
        <SolutionHeader 
          analysis={analysis}
          metrics={solvedResult?.metrics || {}}
          solvedResult={solvedResult}
          fallbackCount={solvedResult?.metrics?.fallback_usage_count || 0}
        />

        <SolutionViewTabs currentView={view} onViewChange={setView} />

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8">
          {view === "overlay" && (
            <OverlayView
              solvedResult={solvedResult}
              originalPuzzle={originalPuzzle}
              analysis={analysis}
              getOptimalCellSize={() => {
                const gridSize = originalPuzzle?.grid?.length || 15;
                const screenWidth = window.innerWidth;
                const maxGridWidth = screenWidth < 640 ? screenWidth - 80 : Math.min(screenWidth - 200, 800);
                return Math.max(20, Math.min(40, maxGridWidth / gridSize));
              }}
            />
          )}
          
          {view === "simulation" && (
            <AlgorithmSimulation
              simulationSteps={simulation.simulationSteps}
              originalPuzzle={originalPuzzle}
              algorithmName={solvedResult?.method || solvedResult?.algorithm}
              algorithmStats={algorithmStats}
              wordPlacements={wordPlacements}
            />
          )}
          
          {view === "compare" && (
            <ComparisonView
              currentAlgorithm={solvedResult?.method || solvedResult?.algorithm}
              currentAlgorithmData={{
                simulationSteps: simulation.simulationSteps,
                algorithmStats: algorithmStats,
                wordPlacements: wordPlacements,
                result: solvedResult
              }}
              comparisonData={comparison.comparisonSimulations}
              selectedAlgo={comparison.selectedComparisonAlgo}
              isComparing={comparison.isComparing}
              onRunComparison={comparison.runComparison}
              originalPuzzle={originalPuzzle}
              algorithms={algorithms.filter(a => a.id !== (solvedResult?.method || solvedResult?.algorithm))}
            />
          )}
        </div>

        <SolutionActions
          onBackToPuzzle={handleBackToPuzzle}
          onTryAnotherAlgorithm={() => setShowAlgorithmModal(true)}
          onExportSolution={handleExportSolution}
          onSaveAnalytics={handleSaveAnalytics}
        />
      </div>

      {showAlgorithmModal && (
        <AlgorithmModal
          algorithms={algorithms.filter(a => a.id !== (solvedResult?.method || solvedResult?.algorithm))}
          originalPuzzle={originalPuzzle}
          onClose={() => setShowAlgorithmModal(false)}
          onSolveComplete={(result) => {
            navigate("/solution", {
              state: {
                solvedResult: result,
                originalPuzzle: originalPuzzle,
              },
              replace: true
            });
          }}
        />
      )}
    </div>
  );
};

export default Solution;