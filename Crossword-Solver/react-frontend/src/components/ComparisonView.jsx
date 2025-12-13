import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { useSolutionAnalysis } from '../hooks/useSolutionAnalysis';
import SimulationPlayer from './SimulationPlayer';
import CrosswordGrid from './CrosswordGrid';
import OverlayView from './OverlayView';
import Button from './Button';
import { generateSimulationSteps, calculateAlgorithmStats } from '../utils/solutionAnalysis';

export default function ComparisonView({
  currentAlgorithm,
  currentAlgorithmData,
  comparisonData,
  selectedAlgo,
  isComparing,
  onRunComparison,
  originalPuzzle,
  algorithms
}) {
  useEffect(() => {
    console.log('ComparisonView Debug:', {
      currentAlgorithm,
      hasCurrentAlgorithmData: !!currentAlgorithmData,
      currentAlgorithmSteps: currentAlgorithmData?.simulationSteps?.length,
      selectedAlgo,
      hasComparisonData: !!comparisonData[selectedAlgo],
      comparisonDataKeys: Object.keys(comparisonData),
      isComparing
    });
    
    if (comparisonData[selectedAlgo]) {
      console.log(`${selectedAlgo} data:`, {
        result: !!comparisonData[selectedAlgo].result,
        simulationSteps: comparisonData[selectedAlgo].simulationSteps?.length,
        algorithmStats: comparisonData[selectedAlgo].algorithmStats
      });
    }
  }, [currentAlgorithm, currentAlgorithmData, selectedAlgo, comparisonData, isComparing]);

  const currentSimulation = useSimulation(currentAlgorithmData?.simulationSteps || []);
  
  const [comparisonSimulation, setComparisonSimulation] = useState({
    currentStep: 0,
    isPlaying: false,
    simulationSpeed: 1000
  });

  const comparisonIntervalRef = useRef(null);

  const getOptimalCellSize = () => {
    const gridSize = originalPuzzle?.grid?.length || 15;
    return Math.max(20, Math.min(30, 400 / gridSize));
  };

  const getOverlayCellSize = () => {
    const gridSize = originalPuzzle?.grid?.length || 15;
    const maxGridWidth = Math.min(600, window.innerWidth - 100);
    return Math.max(25, Math.min(40, maxGridWidth / gridSize));
  };

  const comparisonAlgoData = comparisonData[selectedAlgo];
  const comparisonSimulationSteps = useMemo(() => {
    if (!comparisonAlgoData?.result) return [];
    
    if (comparisonAlgoData.simulationSteps?.length > 0) {
      console.log(`Using existing simulation steps for ${selectedAlgo}:`, comparisonAlgoData.simulationSteps.length);
      return comparisonAlgoData.simulationSteps;
    }
    
    console.log(`Generating simulation steps for ${selectedAlgo}...`);
    return generateSimulationSteps(comparisonAlgoData.result, originalPuzzle);
  }, [comparisonAlgoData, originalPuzzle, selectedAlgo]);

  const currentAnalysis = useSolutionAnalysis(currentAlgorithmData?.result, originalPuzzle);
  const comparisonAnalysis = useSolutionAnalysis(comparisonAlgoData?.result, originalPuzzle);

  useEffect(() => {
    if (currentAnalysis || comparisonAnalysis) {
      console.log('Analysis Data:', {
        currentAlgorithm: {
          hasAnalysis: !!currentAnalysis,
          accuracy: currentAnalysis?.accuracy,
          correctCells: `${currentAnalysis?.correctCells}/${currentAnalysis?.totalCells}`,
          incorrectPositions: currentAnalysis?.incorrectPositions?.length
        },
        comparisonAlgorithm: {
          hasAnalysis: !!comparisonAnalysis,
          accuracy: comparisonAnalysis?.accuracy,
          correctCells: `${comparisonAnalysis?.correctCells}/${comparisonAnalysis?.totalCells}`,
          incorrectPositions: comparisonAnalysis?.incorrectPositions?.length
        }
      });
    }
  }, [currentAnalysis, comparisonAnalysis]);

  const currentStepData = currentAlgorithmData?.simulationSteps?.[currentSimulation.currentStep] || {};
  const comparisonStepData = comparisonSimulationSteps[comparisonSimulation.currentStep] || {};

  useEffect(() => {
    if (comparisonIntervalRef.current) {
      clearInterval(comparisonIntervalRef.current);
      comparisonIntervalRef.current = null;
    }

    if (comparisonSimulation.isPlaying && comparisonSimulationSteps.length > 0) {
      comparisonIntervalRef.current = setInterval(() => {
        setComparisonSimulation(prev => {
          if (prev.currentStep >= comparisonSimulationSteps.length - 1) {
            return { ...prev, isPlaying: false };
          }
          return { ...prev, currentStep: prev.currentStep + 1 };
        });
      }, comparisonSimulation.simulationSpeed);
    }

    return () => {
      if (comparisonIntervalRef.current) {
        clearInterval(comparisonIntervalRef.current);
        comparisonIntervalRef.current = null;
      }
    };
  }, [comparisonSimulation.isPlaying, comparisonSimulation.simulationSpeed, comparisonSimulationSteps]);

  const handleComparisonPlayPause = () => {
    if (comparisonSimulation.currentStep >= (comparisonSimulationSteps.length - 1)) {
      setComparisonSimulation(prev => ({ ...prev, currentStep: 0 }));
    }
    setComparisonSimulation(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleComparisonStepChange = (step) => {
    setComparisonSimulation(prev => ({
      ...prev,
      currentStep: step,
      isPlaying: false
    }));
  };

  const handleComparisonSpeedChange = (speed) => {
    setComparisonSimulation(prev => ({
      ...prev,
      simulationSpeed: speed
    }));
  };

  const handleComparisonRestart = () => {
    setComparisonSimulation({
      currentStep: 0,
      isPlaying: false,
      simulationSpeed: 1000
    });
  };

  const handleComparisonPrev = () => {
    if (comparisonSimulation.currentStep > 0) {
      setComparisonSimulation(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        isPlaying: false
      }));
    }
  };

  const handleComparisonNext = () => {
    const maxSteps = comparisonSimulationSteps.length || 0;
    if (comparisonSimulation.currentStep < maxSteps - 1) {
      setComparisonSimulation(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1
      }));
    } else {
      setComparisonSimulation(prev => ({ ...prev, isPlaying: false }));
    }
  };

  if (!selectedAlgo) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">Algorithm Comparison</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Select an algorithm to compare with {currentAlgorithm}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          {algorithms.map(algo => (
            <Button
              key={algo.id}
              onClick={() => onRunComparison(algo.id)}
              variant="secondary"
              disabled={isComparing}
              className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {isComparing ? "Comparing..." : `Compare with ${algo.name}`}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (isComparing || !comparisonAlgoData) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Running {selectedAlgo} algorithm for comparison...</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          This may take a moment depending on puzzle complexity
        </p>
      </div>
    );
  }

  const comparisonStats = comparisonAlgoData.algorithmStats || calculateAlgorithmStats(comparisonAlgoData.result?.solving_steps || []);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          Algorithm Simulation Comparison: {currentAlgorithm} vs {selectedAlgo}
        </h3>
        <div className="flex gap-3 justify-center mb-4">
          {algorithms.map(algo => (
            <Button
              key={algo.id}
              onClick={() => onRunComparison(algo.id)}
              variant={selectedAlgo === algo.id ? "primary" : "secondary"}
              size="sm"
              disabled={isComparing}
              className={selectedAlgo !== algo.id ? "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600" : ""}
            >
              {selectedAlgo === algo.id ? "✓ " : ""}{algo.name}
            </Button>
          ))}
        </div>
      </div>

      {currentAlgorithmData?.result && comparisonAlgoData?.result && (
        <div className="mb-8">
          <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
            Final Solution Comparison
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-semibold text-blue-600 dark:text-blue-400">
                  {currentAlgorithm}
                </h5>
                {currentAlgorithmData.result.execution_time && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    {currentAlgorithmData.result.execution_time}ms
                  </span>
                )}
              </div>
              
              {currentAnalysis ? (
                <OverlayView
                  solvedResult={currentAlgorithmData.result}
                  originalPuzzle={originalPuzzle}
                  analysis={currentAnalysis}
                  getOptimalCellSize={getOverlayCellSize}
                />
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Unable to analyze {currentAlgorithm} solution</p>
                  <p className="text-sm mt-1">Check console for details</p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-semibold text-green-600 dark:text-green-400">
                  {selectedAlgo}
                </h5>
                {comparisonAlgoData.result.execution_time && (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                    {comparisonAlgoData.result.execution_time}ms
                  </span>
                )}
              </div>
              
              {comparisonAnalysis ? (
                <OverlayView
                  solvedResult={comparisonAlgoData.result}
                  originalPuzzle={originalPuzzle}
                  analysis={comparisonAnalysis}
                  getOptimalCellSize={getOverlayCellSize}
                />
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Unable to analyze {selectedAlgo} solution</p>
                  <p className="text-sm mt-1">Check console for details</p>
                </div>
              )}
            </div>
          </div>
          
          {currentAnalysis && comparisonAnalysis && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <ComparisonMetric 
                title="Cell Accuracy" 
                value1={`${Math.round(currentAnalysis.accuracy * 100)}%`}
                value2={`${Math.round(comparisonAnalysis.accuracy * 100)}%`}
                color1="blue"
                color2="green"
              />
              <ComparisonMetric 
                title="Word Accuracy" 
                value1={`${Math.round(currentAnalysis.wordAccuracy * 100)}%`}
                value2={`${Math.round(comparisonAnalysis.wordAccuracy * 100)}%`}
                color1="blue"
                color2="green"
              />
              <ComparisonMetric 
                title="Correct Cells" 
                value1={`${currentAnalysis.correctCells}/${currentAnalysis.totalCells}`}
                value2={`${comparisonAnalysis.correctCells}/${comparisonAnalysis.totalCells}`}
                color1="blue"
                color2="green"
              />
              <ComparisonMetric 
                title="Errors" 
                value1={currentAnalysis.incorrectPositions?.length || 0}
                value2={comparisonAnalysis.incorrectPositions?.length || 0}
                color1="blue"
                color2="green"
                lowerIsBetter
              />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <SimulationPlayer
            title={currentAlgorithm}
            simulationSteps={currentAlgorithmData?.simulationSteps || []}
            currentStep={currentSimulation.currentStep}
            isPlaying={currentSimulation.isPlaying}
            simulationSpeed={currentSimulation.simulationSpeed}
            algorithmStats={currentAlgorithmData?.algorithmStats}
            onPlayPause={currentSimulation.playPauseSimulation}
            onRestart={currentSimulation.restartSimulation}
            onPrev={currentSimulation.prevStep}
            onNext={currentSimulation.nextStep}
            onStepChange={currentSimulation.handleStepChange}
            onSpeedChange={currentSimulation.setSimulationSpeed}
          >
            {currentStepData && (
              <CrosswordGrid
                grid={currentStepData.grid}
                clues={originalPuzzle?.clues}
                cellSize={getOptimalCellSize()}
                showAnswers
                highlightTarget={currentStepData?.targetPosition}
                conflictPositions={currentStepData?.conflictPositions}
                placedLetters={currentStepData?.placedLetters}
              />
            )}
          </SimulationPlayer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <SimulationPlayer
            title={selectedAlgo}
            simulationSteps={comparisonSimulationSteps}
            currentStep={comparisonSimulation.currentStep}
            isPlaying={comparisonSimulation.isPlaying}
            simulationSpeed={comparisonSimulation.simulationSpeed}
            algorithmStats={comparisonStats}
            onPlayPause={handleComparisonPlayPause}
            onRestart={handleComparisonRestart}
            onPrev={handleComparisonPrev}
            onNext={handleComparisonNext}
            onStepChange={handleComparisonStepChange}
            onSpeedChange={handleComparisonSpeedChange}
          >
            {comparisonStepData && (
              <CrosswordGrid
                grid={comparisonStepData.grid}
                clues={originalPuzzle?.clues}
                cellSize={getOptimalCellSize()}
                showAnswers
                highlightTarget={comparisonStepData?.targetPosition}
                conflictPositions={comparisonStepData?.conflictPositions}
                placedLetters={comparisonStepData?.placedLetters}
              />
            )}
          </SimulationPlayer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-center mb-3">
            {currentAlgorithm} Performance
          </h4>
          <div className="space-y-2">
            <MetricRow label="Execution Time" value={currentAlgorithmData?.result?.execution_time || currentAlgorithmData?.result?.metrics?.execution_time || "N/A"} />
            <MetricRow label="Memory Usage" value={formatMemoryUsage(currentAlgorithmData?.result?.memory_usage_kb || currentAlgorithmData?.result?.metrics?.memory_usage_kb)} />
            <MetricRow label="Placements" value={currentAlgorithmData?.algorithmStats?.placements || 0} />
            {/* <MetricRow label="Backtracks" value={currentAlgorithmData?.algorithmStats?.backtracks || 0} /> */}
            <MetricRow label="Total Steps" value={currentAlgorithmData?.algorithmStats?.totalSteps || 0} />
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-800 dark:text-green-300 text-center mb-3">
            {selectedAlgo} Performance
          </h4>
          <div className="space-y-2">
            <MetricRow label="Execution Time" value={comparisonAlgoData.result?.execution_time || comparisonAlgoData.result?.metrics?.execution_time || "N/A"} />
            <MetricRow label="Memory Usage" value={formatMemoryUsage(comparisonAlgoData.result?.memory_usage_kb || comparisonAlgoData.result?.metrics?.memory_usage_kb)} />
            <MetricRow label="Placements" value={comparisonStats.placements || 0} />
            {/* <MetricRow label="Backtracks" value={comparisonStats.backtracks || 0} /> */}
            <MetricRow label="Total Steps" value={comparisonStats.totalSteps || 0} />
          </div>
        </div>
      </div>
      
      {/* Debug info panel (remove in production) */}
      {/* <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">Debug Information</summary>
          <div className="mt-2 space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div><strong>Current Algorithm:</strong> {currentAlgorithm}</div>
            <div><strong>Comparison Algorithm:</strong> {selectedAlgo}</div>
            <div><strong>Current Algorithm Steps:</strong> {currentAlgorithmData?.simulationSteps?.length || 0}</div>
            <div><strong>Comparison Algorithm Steps:</strong> {comparisonSimulationSteps.length || 0}</div>
            <div><strong>Comparison Data Status:</strong> {comparisonAlgoData ? 'Loaded' : 'Not loaded'}</div>
            <div><strong>Simulation Steps Generated:</strong> {comparisonSimulationSteps.length > 0 ? 'Yes' : 'No'}</div>
            <div><strong>Current Analysis Status:</strong> {currentAnalysis ? 'Loaded' : 'Not loaded'}</div>
            <div><strong>Comparison Analysis Status:</strong> {comparisonAnalysis ? 'Loaded' : 'Not loaded'}</div>
          </div>
        </details>
      </div> */}
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}:</span>
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</span>
    </div>
  );
}

function ComparisonMetric({ title, value1, value2, color1 = "blue", color2 = "green", lowerIsBetter = false }) {
  const getColorClass = (color) => {
    const colorClasses = {
      blue: "text-blue-600 dark:text-blue-400",
      green: "text-green-600 dark:text-green-400",
      red: "text-red-600 dark:text-red-400"
    };
    return colorClasses[color] || colorClasses.blue;
  };

  const getNumericValue = (val) => {
    if (typeof val === 'string') {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    }
    return Number(val) || 0;
  };

  const numValue1 = getNumericValue(value1);
  const numValue2 = getNumericValue(value2);
  const isBetter = lowerIsBetter ? numValue2 < numValue1 : numValue2 > numValue1;

  return (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 text-center">
        {title}
      </div>
      <div className="flex justify-between items-center">
        <div className="text-center flex-1">
          <div className={`text-sm font-semibold ${getColorClass(color1)}`}>
            {value1}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Algorithm 1</div>
        </div>
        <div className="mx-2 text-gray-300 dark:text-gray-600">vs</div>
        <div className="text-center flex-1">
          <div className={`text-sm font-semibold ${getColorClass(color2)} flex items-center justify-center`}>
            {value2}
            {isBetter && (
              <span className="ml-1 text-green-600 dark:text-green-400 text-lg">✓</span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Algorithm 2</div>
        </div>
      </div>
    </div>
  );
}

function formatMemoryUsage(kb) {
  if (!kb || kb === "N/A" || isNaN(Number(kb)) || Number(kb) <= 0) return "N/A";
  const numKb = Number(kb);
  if (numKb >= 1024) {
    return `${(numKb / 1024).toFixed(2)} MB`;
  }
  return `${numKb.toFixed(2)} KB`;
}