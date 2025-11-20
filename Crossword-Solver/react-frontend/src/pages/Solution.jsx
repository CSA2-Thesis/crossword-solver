import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CrosswordGrid from '../components/CrosswordGrid';
import Button from '../components/Button';
import { FiXCircle, FiCheckCircle, FiBarChart2, FiDownload, FiCpu, FiAlertTriangle } from 'react-icons/fi';
import { FaMemory } from 'react-icons/fa';

function analyzeSolution(solvedGrid = [[]], correctGrid = [[]], clues = { across: [], down: [] }) {
  if (!Array.isArray(solvedGrid)) solvedGrid = [[]];
  if (!Array.isArray(correctGrid)) correctGrid = [[]];
  const height = correctGrid.length;
  const width = height > 0 ? correctGrid[0].length : 0;
  let correctCells = 0;
  let totalCells = 0;
  const incorrectPositions = [];
  const correctPositions = [];
  const acrossClues = clues.across || [];
  const downClues = clues.down || [];
  const allClues = [...acrossClues, ...downClues];
  let correctWords = 0;
  let totalWords = allClues.length;

  // Cell-level analysis
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

  // Word-level analysis - IMPROVED VERSION
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
          
          // Check if cell is filled
          if (!solvedChar.trim()) isComplete = false;
          
          // Check if character matches
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
          
          // Check if cell is filled
          if (!solvedChar.trim()) isComplete = false;
          
          // Check if character matches
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

    // Debug log for each word
    console.log(`Clue ${number} ${direction}:`, {
      solved: solvedWord,
      correct: correctWord,
      isComplete,
      isCorrect,
      length
    });

    // A word is correct only if it's complete AND all characters match
    if (isComplete && isCorrect) {
      correctWords++;
    }
  });

  const accuracy = totalCells > 0 ? correctCells / totalCells : 1;
  const wordAccuracy = totalWords > 0 ? correctWords / totalWords : 1;
  
  // Debug summary
  console.log('Analysis Summary:', {
    correctCells,
    totalCells,
    accuracy,
    correctWords,
    totalWords,
    wordAccuracy,
    incorrectPositionsCount: incorrectPositions.length
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

const Solution = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { solvedResult, originalPuzzle } = location.state || {};
  const [view, setView] = useState("overlay"); 
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!solvedResult || !originalPuzzle) {
      setHasError(true);
    }
  }, [solvedResult, originalPuzzle]);

  const analysis = analyzeSolution(
    solvedResult?.solution,
    originalPuzzle?.grid,
    originalPuzzle?.clues
  );

  const {
    correctCells,
    totalCells,
    accuracy,
    incorrectPositions = [],
    correctPositions = [],
    correctWords,
    totalWords,
    wordAccuracy
  } = analysis;

  const formatMemoryUsage = (kb) => {
    if (!kb || kb === "N/A" || isNaN(Number(kb)) || Number(kb) <= 0) return "N/A";
    const numKb = Number(kb);
    if (numKb >= 1024) {
      return `${(numKb / 1024).toFixed(2)} MB`;
    }
    return `${numKb.toFixed(2)} KB`;
  };

  const metrics = solvedResult?.metrics || solvedResult || {};
  const fallbackCount = metrics.fallback_usage_count || 0;
  const avgMemory = metrics.memory_usage_kb || 0;
  const peakMemory = metrics.peak_memory_kb || 0;


  if (hasError) {
    return (
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center max-w-md">
          <FiXCircle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error Displaying Solution</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Unable to load the solution data. Please try again.</p>
          <Button onClick={() => navigate(-1)} variant="primary">
            Go Back
          </Button>
        </div>
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

  const renderGrid = (
    grid,
    clues,
    cellSize,
    highlightErrors = false,
    errorPositions = [],
    highlightCorrect = false,
    correctPositionsProp = [] 
  ) => {
    try {
      if (!Array.isArray(grid)) {
        throw new Error("Grid is not an array");
      }
      const safeGrid = grid.length > 0 ? grid : [[]];
      const safeClues = clues || { across: [], down: [] };
      return (
        <CrosswordGrid
          grid={safeGrid}
          clues={safeClues}
          cellSize={cellSize}
          showAnswers
          highlightErrors={highlightErrors}
          errorPositions={errorPositions}
          highlightCorrect={highlightCorrect}
          correctPositions={correctPositionsProp}
        />
      );
    } catch (error) {
      console.error("Grid rendering error:", error);
      setHasError(true);
      return null;
    }
  };

  const handleBackToPuzzle = () => {
    navigate("/generate", { 
      state: { 
        puzzle: originalPuzzle,
        keepPuzzle: true
      } 
    });
  };

  const handleShowAnalytics = () => {
    navigate('/analytics', { 
      state: { 
        analysisData: analysis,
        originalPuzzle: originalPuzzle, 
        solvedResult: solvedResult 
      } 
    });
  };

  const handleDownloadSolution = () => {
    try {
      const url = window.URL.createObjectURL(
        new Blob([JSON.stringify(originalPuzzle, null, 2)], {
          type: "application/json",
        })
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `solution-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download solution.");
    }
  };

  const MemoryUsageCard = () => {
  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-center">
        <FiCpu className="mr-1" size={14} /> Memory Usage
      </h3>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Average:</span>
          <span className="font-semibold text-blue-600 dark:text-blue-400">
            {formatMemoryUsage(avgMemory)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Peak:</span>
          <span className="font-semibold text-red-600 dark:text-red-400">
            {formatMemoryUsage(peakMemory)}
          </span>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Solution Analysis
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Review your crossword solution performance
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-center">Accuracy Metrics</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totalCells > 0 ? `${Math.round(accuracy * 100)}%` : "N/A"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Cell Accuracy</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {correctCells}/{totalCells}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {totalWords > 0 ? `${Math.round(wordAccuracy * 100)}%` : "N/A"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Word Accuracy</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {correctWords}/{totalWords}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-center">
              <FaMemory className="mr-1" size={14} /> Performance
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Time:</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  {metrics.execution_time || "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Method:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {solvedResult?.method || "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Words:</span>
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                  {metrics.words_placed || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <MemoryUsageCard />
        </div>

        {fallbackCount > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-center mb-2">
              <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 text-sm sm:text-base">Pattern Matching Fallback System Used</h3>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
              The algorithm used the last fallback strategy <strong>{fallbackCount} time(s)</strong> to find suitable words in a slot based on the pattern.
            </p>
            <div className="text-xs text-yellow-600 dark:text-yellow-500">
              This indicates the puzzle used the pattern matching approach to find the correct answer and may result to answers that may more likely be wrong.
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center">
          {[
            { id: "side-by-side", label: "Side by Side" },
            { id: "overlay", label: "Overlay" },
            { id: "differences", label: "Only Differences" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition ${
                view === tab.id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              } border border-gray-300 dark:border-gray-600`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/50 p-3 sm:p-4 lg:p-6 border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8 transition-colors duration-200">
          {view === "side-by-side" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4 text-center">
                  Your Solution
                </h3>
                <div className="flex justify-center">
                  {renderGrid(
                    solvedResult?.solution,
                    originalPuzzle?.clues,
                    getOptimalCellSize(),
                    false, 
                    [],   
                    false,
                    []    
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4 text-center">
                  Correct Answers
                </h3>
                <div className="flex justify-center">
                  {renderGrid(
                    originalPuzzle?.grid,
                    originalPuzzle?.clues,
                    getOptimalCellSize(),
                    false, 
                    [],    
                    false, 
                    []     
                  )}
                </div>
              </div>
            </div>
          )}
          {view === "overlay" && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4 text-center">
                Solution Overlay <span className="text-sm font-normal">(Green = Correct, Red = Incorrect)</span>
              </h3>
              <div className="flex justify-center">
                {renderGrid(
                  originalPuzzle?.grid,
                  originalPuzzle?.clues,
                  getOptimalCellSize(),
                  true,                   
                  incorrectPositions,     
                  true,                  
                  correctPositions         
                )}
              </div>
              <div className="flex justify-center mt-4 space-x-4 sm:space-x-6 text-sm flex-wrap gap-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-200 dark:bg-green-800 border border-gray-300 dark:border-gray-600 mr-1 sm:mr-2"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">Correct Letter</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-200 dark:bg-red-800 border border-gray-300 dark:border-gray-600 mr-1 sm:mr-2"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">Incorrect Letter</span>
                </div>
              </div>
            </div>
          )}
          {view === "differences" && incorrectPositions.length > 0 && (
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white mb-3 sm:mb-4 text-center">
                Incorrect Cells
              </h3>
              <div className="flex justify-center">
                {renderGrid(
                  originalPuzzle?.grid, 
                  originalPuzzle?.clues,
                  getOptimalCellSize(),
                  true,              
                  incorrectPositions, 
                  false,             
                  []                 
                )}
              </div>
              <div className="flex justify-center mt-4 space-x-4 sm:space-x-6 text-sm flex-wrap gap-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 mr-1 sm:mr-2"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">Correct Cell</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-200 dark:bg-red-800 border border-gray-300 dark:border-gray-600 mr-1 sm:mr-2"></div>
                  <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm">Incorrect Cell</span>
                </div>
              </div>
            </div>
          )}
          {view === "differences" && incorrectPositions.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <FiCheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 dark:text-green-400 mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-green-600 dark:text-green-400 mb-1 sm:mb-2">Perfect Solution!</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">No errors found.</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
          <Button
            onClick={handleBackToPuzzle}
            variant="secondary"
            icon={<FiXCircle size={16} className="sm:w-4 sm:h-4" />}
            className="text-sm sm:text-base"
          >
            Back to Puzzle
          </Button>
          <Button
            onClick={handleDownloadSolution}
            variant="secondary"
            icon={<FiDownload size={16} className="sm:w-4 sm:h-4" />}
            className="text-sm sm:text-base"
          >
            Export Solution
          </Button>
          <Button
            onClick={handleShowAnalytics}
            variant="primary"
            icon={<FiBarChart2 size={16} className="sm:w-4 sm:h-4" />}
            className="text-sm sm:text-base"
          >
            Save to Analytics
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Solution;