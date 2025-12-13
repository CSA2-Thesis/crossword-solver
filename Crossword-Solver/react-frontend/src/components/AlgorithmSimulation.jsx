import React, { useMemo } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import SimulationPlayer from './SimulationPlayer';
import CrosswordGrid from './CrosswordGrid';
import WordPlacementList from './WordPlacementList';

function removeConsecutiveDuplicates(steps) {
  if (steps.length === 0) return steps;

  const result = [steps[0]];

  for (let i = 1; i < steps.length; i++) {
    const prevStep = steps[i-1];
    const currentStep = steps[i];

    if (prevStep.stepType !== currentStep.stepType ||
        JSON.stringify(prevStep.grid) !== JSON.stringify(currentStep.grid) ||
        prevStep.description !== currentStep.description ||
        (prevStep.placedWord?.word !== currentStep.placedWord?.word)) {
      result.push(currentStep);
    } else {
      console.log('Removing consecutive duplicate step:', currentStep.description);
    }
  }

  return result;
}

function getPlacementSteps(steps) {
  return steps.filter(step => step.stepType === 'placement');
}

export default function AlgorithmSimulation({
  simulationSteps,
  originalPuzzle,
  algorithmName,
  algorithmStats,
  wordPlacements
}) {
  const deduplicatedSteps = useMemo(() => {
    if (!Array.isArray(simulationSteps)) return [];
    
    console.log(`Original steps: ${simulationSteps.length}`);
    
    const withoutConsecutiveDuplicates = removeConsecutiveDuplicates(simulationSteps);
    
    const meaningfulSteps = withoutConsecutiveDuplicates.filter((step, index) => {
      if (step.stepType === 'algorithm_start' || step.stepType === 'completion') {
        return true;
      }
      
      if (index > 0) {
        const prevStep = withoutConsecutiveDuplicates[index - 1];
        if (JSON.stringify(step.grid) === JSON.stringify(prevStep.grid)) {
          if (step.stepType === prevStep.stepType) {
            console.log(`Removing step with unchanged grid: ${step.description}`);
            return false;
          }
        }
      }
      
      return true;
    });
    
    console.log(`Deduplicated steps: ${meaningfulSteps.length}`);
    return meaningfulSteps;
  }, [simulationSteps]);

  const deduplicatedStats = useMemo(() => {
    if (!deduplicatedSteps || deduplicatedSteps.length === 0) {
      return algorithmStats;
    }
    
    const placementSteps = getPlacementSteps(deduplicatedSteps);
    
    return {
      totalSteps: deduplicatedSteps.length,
      placements: placementSteps.length,
      backtracks: deduplicatedSteps.filter(step => 
        step.stepType === 'backtrack' || step.stepType === 'backtracking'
      ).length,
      evaluations: deduplicatedSteps.filter(step => 
        step.stepType === 'evaluation'
      ).length,
      heuristicCalcs: deduplicatedSteps.filter(step => 
        step.stepType === 'heuristic_calculation' || step.stepType === 'heuristic_calc'
      ).length,
      stateExpansions: deduplicatedSteps.filter(step => 
        step.stepType === 'state_expansion'
      ).length
    };
  }, [deduplicatedSteps, algorithmStats]);

  const deduplicatedPlacements = useMemo(() => {
    const across = wordPlacements.across || [];
    const down = wordPlacements.down || [];
    
    const seenAcross = new Set();
    const seenDown = new Set();
    
    const uniqueAcross = across.filter(placement => {
      const key = `${placement.number}-${placement.direction}-${placement.word}`;
      if (seenAcross.has(key)) {
        console.log(`Removing duplicate across placement: ${placement.word}`);
        return false;
      }
      seenAcross.add(key);
      return true;
    });
    
    const uniqueDown = down.filter(placement => {
      const key = `${placement.number}-${placement.direction}-${placement.word}`;
      if (seenDown.has(key)) {
        console.log(`Removing duplicate down placement: ${placement.word}`);
        return false;
      }
      seenDown.add(key);
      return true;
    });
    
    console.log(`Placements: ${uniqueAcross.length} across, ${uniqueDown.length} down (deduplicated)`);
    
    return {
      across: uniqueAcross,
      down: uniqueDown
    };
  }, [wordPlacements]);

  const simulation = useSimulation(deduplicatedSteps);

  const getOptimalCellSize = () => {
    const gridSize = originalPuzzle?.grid?.length || 15;
    const screenWidth = window.innerWidth;
    
    if (screenWidth < 640) {
      return Math.max(16, Math.min(24, (screenWidth - 80) / gridSize));
    } else if (screenWidth < 1024) {
      return Math.max(20, Math.min(32, (screenWidth - 160) / gridSize));
    } else {
      return Math.max(24, Math.min(36, 600 / gridSize));
    }
  };

  const currentStepData = deduplicatedSteps[simulation.currentStep] || {};

  if (deduplicatedSteps.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Preparing simulation data...</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Processing algorithm execution steps
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SimulationPlayer
        title={`${algorithmName} Algorithm Simulation`}
        simulationSteps={deduplicatedSteps}
        currentStep={simulation.currentStep}
        isPlaying={simulation.isPlaying}
        simulationSpeed={simulation.simulationSpeed}
        algorithmStats={deduplicatedStats}
        onPlayPause={simulation.playPauseSimulation}
        onRestart={simulation.restartSimulation}
        onPrev={simulation.prevStep}
        onNext={simulation.nextStep}
        onStepChange={simulation.handleStepChange}
        onSpeedChange={simulation.setSimulationSpeed}
      >
        {currentStepData && (
          <CrosswordGrid
            grid={currentStepData?.grid}
            clues={originalPuzzle?.clues}
            cellSize={getOptimalCellSize()}
            showAnswers
            highlightTarget={currentStepData?.targetPosition}
            conflictPositions={currentStepData?.conflictPositions}
            placedLetters={currentStepData?.placedLetters}
          />
        )}
      </SimulationPlayer>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
            <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm mr-2">ACROSS</span>
            {algorithmName} Placements
            <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
              {deduplicatedPlacements.across.length} words
            </span>
          </h4>
          <WordPlacementList
            direction="across"
            placements={deduplicatedPlacements.across}
          />
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center">
            <span className="bg-purple-600 text-white px-2 py-1 rounded text-sm mr-2">DOWN</span>
            {algorithmName} Placements
            <span className="ml-auto text-xs bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full">
              {deduplicatedPlacements.down.length} words
            </span>
          </h4>
          <WordPlacementList
            direction="down"
            placements={deduplicatedPlacements.down}
          />
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 dark:text-white mb-3 text-center">
          Algorithm Execution Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {deduplicatedStats.totalSteps}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Total Steps</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {deduplicatedStats.placements}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Placements</div>
          </div>
          {/* <div className="text-center">
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {deduplicatedStats.backtracks}
            </div>
            <div className="text-gray-600 dark:text-gray-400">Backtracks</div>
          </div> */}
          <div className="text-center">
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {deduplicatedSteps.length > 0 ? 
                deduplicatedSteps[deduplicatedSteps.length - 1]?.cumulativeTime?.toFixed(2) || '0.00' : '0.00'}s
            </div>
            <div className="text-gray-600 dark:text-gray-400">Total Time</div>
          </div>
        </div>
      </div>
    </div>
  );
}