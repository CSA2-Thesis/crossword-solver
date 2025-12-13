import React from 'react';
import { useSimulation } from '../hooks/useSimulation';
import SimulationControls from './SimulationControls';
import SimulationStepInfo from './SimulationStepInfo';
import CrosswordGrid from './CrosswordGrid';
import WordPlacementList from './WordPlacementList';

export default function AlgorithmSimulation({
  simulationSteps,
  originalPuzzle,
  algorithmName,
  algorithmStats,
  wordPlacements
}) {
  const {
    isPlaying,
    currentStep,
    simulationSpeed,
    playPauseSimulation,
    restartSimulation,
    nextStep,
    prevStep,
    handleStepChange,
    setSimulationSpeed
  } = useSimulation(simulationSteps);

  const currentStepData = simulationSteps[currentStep] || {};

  if (simulationSteps.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading simulation data...</p>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 text-center">
          {algorithmName} Algorithm Simulation
        </h3>
      </div>

      <SimulationControls
        isPlaying={isPlaying}
        currentStep={currentStep}
        totalSteps={simulationSteps.length}
        simulationSpeed={simulationSpeed}
        onPlayPause={playPauseSimulation}
        onRestart={restartSimulation}
        onPrev={prevStep}
        onNext={nextStep}
        onStepChange={handleStepChange}
        onSpeedChange={setSimulationSpeed}
      />

      <SimulationStepInfo stepData={currentStepData} />

      <div className="flex justify-center">
        <CrosswordGrid
          grid={currentStepData?.grid}
          clues={originalPuzzle?.clues}
          cellSize={getOptimalCellSize()}
          showAnswers
          highlightTarget={currentStepData?.targetPosition}
          conflictPositions={currentStepData?.conflictPositions}
          placedLetters={currentStepData?.placedLetters}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <WordPlacementList
          direction="across"
          placements={wordPlacements.across}
          algorithmName={algorithmName}
        />
        <WordPlacementList
          direction="down"
          placements={wordPlacements.down}
          algorithmName={algorithmName}
        />
      </div>
    </div>
  );
}