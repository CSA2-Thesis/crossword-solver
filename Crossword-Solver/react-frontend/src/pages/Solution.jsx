import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CrosswordGrid from '../components/CrosswordGrid';
import Button from '../components/Button';
import { FiXCircle, FiCheckCircle, FiBarChart2, FiDownload, FiCpu } from 'react-icons/fi';

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

    try {
      if (direction === "across") {
        for (let i = 0; i < length; i++) {
          const solvedChar = solvedGrid[y]?.[x + i] || "";
          const correctChar = correctGrid[y]?.[x + i] || "";
          solvedWord += solvedChar;
          correctWord += correctChar;
          if (!solvedChar) isComplete = false;
        }
      } else if (direction === "down") {
        for (let i = 0; i < length; i++) {
          const solvedChar = solvedGrid[y + i]?.[x] || "";
          const correctChar = correctGrid[y + i]?.[x] || "";
          solvedWord += solvedChar;
          correctWord += correctChar;
          if (!solvedChar) isComplete = false;
        }
      }
    } catch (e) {
      console.error(`Error extracting words for clue ${number} ${direction}:`, e);
      isComplete = false;
    }

    if (isComplete && solvedWord.toUpperCase() === correctWord.toUpperCase()) {
      correctWords++;
    }
  });

  const accuracy = totalCells > 0 ? correctCells / totalCells : 1;
  const wordAccuracy = totalWords > 0 ? correctWords / totalWords : 1;
  
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
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)} MB`;
    }
    return `${kb.toFixed(2)} KB`;
  };

  if (hasError) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-900 transition-colors duration-200">
        <FiXCircle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto" />
        <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mt-4">Error Displaying Solution</h3>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Solution Analysis</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Review your crossword solution performance</p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cell Accuracy</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalCells > 0 ? `${Math.round(accuracy * 100)}%` : "N/A"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {correctCells} / {totalCells} cells correct
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Word Accuracy</h3>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {totalWords > 0 ? `${Math.round(wordAccuracy * 100)}%` : "N/A"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {correctWords} / {totalWords} words correct
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Method</h3>
            <p className="text-xl font-semibold text-purple-600 dark:text-purple-400 mt-1">{solvedResult?.method || "N/A"}</p>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">Execution Time</h3>
            <p className="text-xl font-semibold text-orange-600 dark:text-orange-400 mt-1">{solvedResult?.metrics?.execution_time || "N/A"}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Memory Usage</h3>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {solvedResult?.metrics?.memory_usage_kb ? 
                formatMemoryUsage(solvedResult.metrics.memory_usage_kb) : "N/A"}
            </p>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">Words Placed</h3>
            <p className="text-xl font-semibold text-cyan-600 dark:text-cyan-400 mt-1">
              {solvedResult?.metrics?.words_placed || "N/A"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {[
          { id: "side-by-side", label: "Side by Side" },
          { id: "overlay", label: "Overlay" },
          { id: "differences", label: "Only Differences" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              view === tab.id
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            } border border-gray-300 dark:border-gray-600`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/50 p-6 border border-gray-200 dark:border-gray-700 mb-8 transition-colors duration-200">
        {view === "side-by-side" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 justify-items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
                Your Solution
              </h3>
              {renderGrid(
                solvedResult?.solution,
                originalPuzzle?.clues,
                Math.min(36, 600 / (originalPuzzle?.grid?.length || 1)),
                false, 
                [],   
                false,
                []    
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
                Correct Answers
              </h3>
              {renderGrid(
                originalPuzzle?.grid,
                originalPuzzle?.clues,
                Math.min(36, 600 / (originalPuzzle?.grid?.length || 1)),
                false, 
                [],    
                false, 
                []     
              )}
            </div>
          </div>
        )}
        {view === "overlay" && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
              Solution Overlay (Green = Correct, Red = Incorrect)
            </h3>
            <div className="flex justify-center">
              {renderGrid(
                originalPuzzle?.grid,
                originalPuzzle?.clues,
                Math.min(36, 800 / (originalPuzzle?.grid?.length || 1)),
                true,                   
                incorrectPositions,     
                true,                  
                correctPositions         
              )}
            </div>
            <div className="flex justify-center mt-4 space-x-6 text-sm">
                 <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-200 dark:bg-green-800 border border-gray-300 dark:border-gray-600 mr-1"></div>
                    <span className="text-gray-700 dark:text-gray-300">Correct Letter</span>
                 </div>
                 <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-200 dark:bg-red-800 border border-gray-300 dark:border-gray-600 mr-1"></div>
                    <span className="text-gray-700 dark:text-gray-300">Incorrect Letter</span>
                 </div>
            </div>
          </div>
        )}
        {view === "differences" && incorrectPositions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
              Incorrect Cells
            </h3>
            <div className="flex justify-center">
              {renderGrid(
                originalPuzzle?.grid, 
                originalPuzzle?.clues,
                Math.min(36, 800 / (originalPuzzle?.grid?.length || 1)),
                true,              
                incorrectPositions, 
                false,             
                []                 
              )}
              <div className="flex justify-center mt-4 space-x-6 text-sm">
                   <div className="flex items-center">
                      <div className="w-4 h-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 mr-1"></div>
                      <span className="text-gray-700 dark:text-gray-300">Correct Cell</span>
                   </div>
                   <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-200 dark:bg-red-800 border border-gray-300 dark:border-gray-600 mr-1"></div>
                      <span className="text-gray-700 dark:text-gray-300">Incorrect Cell</span>
                   </div>
              </div>
            </div>
          </div>
        )}
        {view === "differences" && incorrectPositions.length === 0 && (
          <div className="text-center py-12">
            <FiCheckCircle className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto" />
            <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mt-4">Perfect Solution!</h3>
            <p className="text-gray-500 dark:text-gray-400">No errors found.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          onClick={handleBackToPuzzle}
          variant="secondary"
          icon={<FiXCircle size={18} />}
        >
          Back to Puzzle
        </Button>
        <Button
          onClick={handleDownloadSolution}
          variant="secondary"
          icon={<FiDownload size={18} />}
        >
          Export Solution
        </Button>
        <Button
          onClick={handleShowAnalytics}
          variant="primary"
          icon={<FiBarChart2 size={18} />}
        >
          Save to Analytics
        </Button>
      </div>
    </div>
  );
};

export default Solution;