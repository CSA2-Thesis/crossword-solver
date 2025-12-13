export function getFirstRunSteps(solvedResult) {
  if (solvedResult.debug_info?.dual_run) {
    if (solvedResult.performance_solving_steps) {
      return solvedResult.performance_solving_steps;
    }
    return solvedResult.solving_steps || [];
  }
  return solvedResult.solving_steps || [];
}

export function generateSimulationSteps(solvedResult, originalPuzzle) {
  if (!solvedResult?.solution || !originalPuzzle?.grid) return [];

  const createEmptyGrid = () => {
    const height = originalPuzzle.grid.length;
    const width = height > 0 ? originalPuzzle.grid[0].length : 0;
    return Array(height).fill().map(() => Array(width).fill('.'));
  };

  // Use FIRST RUN steps only
  const solvingSteps = getFirstRunSteps(solvedResult);
  
  console.log('DEBUG - Using solving steps:', {
    totalSteps: solvingSteps.length,
    hasDualRun: solvedResult.debug_info?.dual_run,
    stepsSource: solvedResult.debug_info?.steps_source
  });

  if (solvingSteps.length > 0) {
    console.log('DEBUG - First solving step:', solvedResult.solving_steps[0]);
    console.log('DEBUG - Step keys:', Object.keys(solvedResult.solving_steps[0]));
    
    // Check what step types are available
    const stepTypes = [...new Set(solvedResult.solving_steps.map(s => s.step_type || s.type || 'unknown'))];
    console.log('DEBUG - Available step types:', stepTypes);

    // Filter key steps - adjust based on what the backend actually provides
    const keyStepTypes = ['placement', 'backtrack', 'evaluation', 'heuristic_calculation', 'state_expansion', 'completion', 'algorithm_start'];
    const filteredSteps = solvedResult.solving_steps.filter(step => {
      const stepType = step.step_type || step.type;
      return keyStepTypes.includes(stepType) || !stepType;
    });

    console.log(`Filtered to ${filteredSteps.length} key algorithm steps from ${solvedResult.solving_steps.length} total`);

    const backendSteps = filteredSteps.map((step, index) => {
      // Use the exact field names from the backend
      const stepType = step.step_type || step.type || 'unknown';
      const word = step.word || step.placed_word || '';
      const direction = step.slot_direction || step.direction || 'across';
      const position = step.position || step.slot_position || { x: 0, y: 0 };
      const number = step.slot_number || step.number || 0;
      const length = step.length || word?.length || 0;
      const clue = step.clue || step.description || '';

      let placedWord = null;
      let placedLetters = [];
      let targetPosition = null;

      if (stepType === 'placement' && word && position && direction) {
        placedLetters = [];
        const { x, y } = position;

        for (let i = 0; i < length; i++) {
          if (direction === 'across') {
            placedLetters.push({
              x: x + i,
              y: y,
              letter: word[i]
            });
          } else if (direction === 'down') {
            placedLetters.push({
              x: x,
              y: y + i,
              letter: word[i]
            });
          }
        }

        placedWord = {
          number: number,
          direction: direction,
          answer: word,
          x: position.x,
          y: position.y,
          length: length,
          placedLetters: placedLetters
        };

        targetPosition = {
          x: position.x,
          y: position.y,
          direction: direction,
          length: length
        };
      }

      return {
        grid: step.grid_state || step.grid || step.current_grid || createEmptyGrid(),
        description: getStepDescription(step, stepType, solvedResult),
        placedWord: placedWord,
        stepType: stepType,
        targetPosition: targetPosition,
        placedLetters: placedLetters,
        conflictPositions: step.conflict_positions || step.conflicts || [],
        timestamp: step.timestamp || step.cumulative_time || step.time || index,
        cumulativeTime: step.cumulative_time || step.timestamp || step.time || index,
        additionalData: step.additional_data || {}
      };
    });

    // Ensure we have a start step
    const hasStartStep = backendSteps.some(step => 
      step.stepType === 'algorithm_start' || step.stepType === 'start'
    );
    
    if (!hasStartStep) {
      backendSteps.unshift({
        grid: createEmptyGrid(),
        description: `Starting ${solvedResult.debug_info?.algorithm_type || solvedResult.method || 'algorithm'}...`,
        placedWord: null,
        stepType: "algorithm_start",
        cumulativeTime: 0
      });
    }

    // Ensure we have a completion step
    const hasCompletionStep = backendSteps.some(step => 
      step.stepType === 'completion' || step.stepType === 'complete'
    );
    
    if (!hasCompletionStep && backendSteps.length > 0) {
      const lastStep = backendSteps[backendSteps.length - 1];
      backendSteps.push({
        grid: lastStep.grid,
        description: `Algorithm completed ${solvedResult.status === 'success' ? 'successfully' : 'with partial solution'}!`,
        placedWord: null,
        stepType: "completion",
        cumulativeTime: lastStep.cumulativeTime,
        additionalData: {
          success: solvedResult.status === 'success',
          words_placed: solvedResult.words_placed || 'N/A'
        }
      });
    }

    console.log("Generated simulation steps:", backendSteps.length);
    return backendSteps;
  }

  console.warn("No solving_steps found in backend response, creating basic simulation");
  
  // Fallback: create basic start and completion steps
  const startGrid = createEmptyGrid();
  const solutionGrid = Array.isArray(solvedResult.solution) ? 
    solvedResult.solution : 
    createEmptyGrid();
  
  return [
    {
      grid: startGrid,
      description: `Starting ${solvedResult.debug_info?.algorithm_type || solvedResult.method || 'algorithm'}...`,
      placedWord: null,
      stepType: "algorithm_start",
      cumulativeTime: 0
    },
    {
      grid: solutionGrid,
      description: solvedResult.status === 'success' ? 
        "Algorithm completed successfully!" : 
        "Algorithm completed with partial solution",
      placedWord: null,
      stepType: "completion",
      cumulativeTime: solvedResult.execution_time || solvedResult.metrics?.execution_time || 0,
      additionalData: {
        success: solvedResult.status === 'success',
        words_placed: solvedResult.words_placed || 'N/A'
      }
    }
  ];
}

function getStepDescription(step, stepType, solvedResult) {
  switch (stepType) {
    case 'algorithm_start':
    case 'start':
      return `Starting ${solvedResult.debug_info?.algorithm_type || solvedResult.method || 'algorithm'} execution`;
    case 'placement':
      const word = step.word || step.placed_word || '';
      const number = step.slot_number || step.number || 0;
      const direction = step.slot_direction || step.direction || '';
      return word ? `Placed "${word}" ${direction ? `(${direction}) ` : ''}at position (${step.position?.x || 0},${step.position?.y || 0})` : 'Placement step';
    case 'backtrack':
      return `Backtracking from previous placement`;
    case 'evaluation':
      return `Evaluating word options`;
    case 'heuristic_calculation':
      return `Calculating heuristic value`;
    case 'state_expansion':
      return `Expanding search states`;
    case 'completion':
      return `Algorithm completed`;
    default:
      if (step.description) return step.description;
      return `${stepType.replace(/_/g, ' ')} step`;
  }
}

// utils/solutionAnalysis.js - Updated extractWordPlacements function

export function extractWordPlacements(solvingSteps = []) {
  const across = [];
  const down = [];

  if (!Array.isArray(solvingSteps)) {
    console.warn('solvingSteps is not an array:', solvingSteps);
    return { across, down };
  }

  // Use a Set to track unique placements
  const seenPlacements = new Set();

  solvingSteps.forEach((step, index) => {
    const stepType = step.step_type || step.type;
    const word = step.word || step.placed_word;
    const direction = step.slot_direction || step.direction;
    const position = step.position || step.slot_position;
    const number = step.slot_number || step.number || index + 1;
    
    if (stepType === 'placement' && word && position && direction) {
      // Create a unique key for this placement
      const placementKey = `${number}-${direction}-${word}-${position.x}-${position.y}`;
      
      // Skip if we've already seen this exact placement
      if (seenPlacements.has(placementKey)) {
        console.log('Skipping duplicate placement:', placementKey);
        return;
      }
      
      seenPlacements.add(placementKey);
      
      const placement = {
        number: number,
        word: word,
        time: step.cumulative_time || step.timestamp || step.time || 0,
        clue: step.clue || step.description || `Placed ${word}`,
        direction: direction,
        timestamp: step.cumulative_time || step.timestamp || step.time || 0,
        stepType: stepType,
        additionalData: step.additional_data || {}
      };

      if (direction === 'across') {
        across.push(placement);
      } else if (direction === 'down') {
        down.push(placement);
      }
    }
  });

  across.sort((a, b) => a.time - b.time);
  down.sort((a, b) => a.time - b.time);

  console.log(`Extracted ${across.length} across and ${down.length} down placements (deduplicated)`);
  return { across, down };
}

export function calculateAlgorithmStats(solvingSteps = []) {
  if (!Array.isArray(solvingSteps)) {
    console.warn('solvingSteps is not an array for stats calculation');
    return {
      totalSteps: 0,
      placements: 0,
      backtracks: 0,
      evaluations: 0,
      heuristicCalcs: 0,
      stateExpansions: 0
    };
  }

  const stats = {
    totalSteps: solvingSteps.length,
    placements: 0,
    backtracks: 0,
    evaluations: 0,
    heuristicCalcs: 0,
    stateExpansions: 0
  };

  solvingSteps.forEach(step => {
    const stepType = step.step_type || step.type;
    switch (stepType) {
      case 'placement':
        stats.placements++;
        break;
      case 'backtrack':
        stats.backtracks++;
        break;
      case 'evaluation':
        stats.evaluations++;
        break;
      case 'heuristic_calculation':
        stats.heuristicCalcs++;
        break;
      case 'state_expansion':
        stats.stateExpansions++;
        break;
    }
  });

  console.log('Calculated algorithm stats:', stats);
  return stats;
}

// Helper function to analyze solution accuracy
export function analyzeSolution(solvedGrid = [[]], correctGrid = [[]], clues = { across: [], down: [] }) {
  console.log('DEBUG - Analyzing solution...');
  
  if (!Array.isArray(solvedGrid)) {
    console.error('solvedGrid is not an array:', solvedGrid);
    solvedGrid = [[]];
  }
  
  if (!Array.isArray(correctGrid)) {
    console.error('correctGrid is not an array:', correctGrid);
    correctGrid = [[]];
  }
  
  const height = correctGrid.length;
  const width = height > 0 ? correctGrid[0].length : 0;
  
  console.log(`Grid dimensions: ${height}x${width}`);
  
  let correctCells = 0;
  let totalCells = 0;
  const incorrectPositions = [];
  const correctPositions = [];
  const acrossClues = clues.across || [];
  const downClues = clues.down || [];
  const allClues = [...acrossClues, ...downClues];
  let correctWords = 0;
  let totalWords = allClues.length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const correct = correctGrid[y]?.[x] || ".";
      if (correct === ".") continue;
      
      totalCells++;
      const solved = solvedGrid[y]?.[x] || "";
      
      if (solved.toUpperCase() === correct.toUpperCase()) {
        correctCells++;
        correctPositions.push({ x, y });
      } else {
        incorrectPositions.push({ x, y, expected: correct, got: solved });
      }
    }
  }

  allClues.forEach(clue => {
    const { number, direction, x, y, length, answer } = clue;
    let solvedWord = "";
    let correctWord = "";
    let isComplete = true;
    let isCorrect = true;

    try {
      if (direction === "across") {
        for (let i = 0; i < length; i++) {
          const solvedChar = solvedGrid[y]?.[x + i] || "";
          const correctChar = correctGrid[y]?.[x + i] || "";
          solvedWord += solvedChar;
          correctWord += correctChar;
          
          if (!solvedChar.trim()) isComplete = false;
          if (solvedChar.toUpperCase() !== correctChar.toUpperCase()) {
            isCorrect = false;
          }
        }
      } else if (direction === "down") {
        for (let i = 0; i < length; i++) {
          const solvedChar = solvedGrid[y + i]?.[x] || "";
          const correctChar = correctGrid[y + i]?.[x] || "";
          solvedWord += solvedChar;
          correctWord += correctChar;
          
          if (!solvedChar.trim()) isComplete = false;
          if (solvedChar.toUpperCase() !== correctChar.toUpperCase()) {
            isCorrect = false;
          }
        }
      }
    } catch (e) {
      console.error(`Error extracting words for clue ${number} ${direction}:`, e);
      isComplete = false;
      isCorrect = false;
    }

    if (isComplete && isCorrect) {
      correctWords++;
    }
  });

  const accuracy = totalCells > 0 ? correctCells / totalCells : 1;
  const wordAccuracy = totalWords > 0 ? correctWords / totalWords : 1;
  
  console.log('Analysis results:', {
    correctCells,
    totalCells,
    accuracy,
    correctWords,
    totalWords,
    wordAccuracy
  });
  
  return {
    correctCells,
    totalCells,
    accuracy,
    wordAccuracy,
    correctWords,
    totalWords,
    incorrectPositions,
    correctPositions,
  };
}