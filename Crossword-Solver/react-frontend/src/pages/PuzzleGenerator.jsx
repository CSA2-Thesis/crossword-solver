import axios from "axios";
import CrosswordGrid from "../components/CrosswordGrid";
import Button from "../components/Button";
import PuzzleConfigPanel from "../components/PuzzleConfigPanel";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import React, { useState, useEffect } from "react";
import AlgorithmSelector from "../components/AlgorithmSelector";
import { FiCheckCircle, FiDownload, FiCpu, FiHelpCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function PuzzleGenerator() {
  const [gridSize, setGridSize] = useState(21);
  const [difficulty, setDifficulty] = useState("easy");
  const [generatedPuzzle, setGeneratedPuzzle] = useState(null);
  const [solvedPuzzle, setSolvedPuzzle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showAlgorithmModal, setShowAlgorithmModal] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);

  const navigate = useNavigate();

  const algorithms = [
    {
      id: "DFS",
      name: "Depth-First Search",
      description:
        "Systematic backtracking approach that explores all possibilities",
      bestFor:
        "Smaller puzzles or when completeness is more important than speed",
    },
    {
      id: "A*",
      name: "A* Algorithm",
      description:
        "Optimized heuristic search that finds the most efficient path",
      bestFor: "Larger puzzles where optimization is crucial",
    },
    {
      id: "HYBRID",
      name: "Hybrid Approach",
      description: "Combines DFS thoroughness with A* optimization",
      bestFor: "Balanced performance across different puzzle types",
    },
  ];

  const getOptimalCellSize = (size) => {
    const screenWidth = window.innerWidth;
    const maxGridWidth =
      screenWidth < 640 ? screenWidth - 80 : Math.min(screenWidth - 200, 800);
    return Math.max(20, Math.min(40, maxGridWidth / size));
  };

  const getOptimalClueFontSize = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth < 640) return "text-xs";
    if (screenWidth < 1024) return "text-sm";
    return "text-sm";
  };

  useEffect(() => {
    const savedPuzzle = sessionStorage.getItem("crosswordPuzzle");
    const navigationPuzzle = location.state?.puzzle;
    const keepPuzzle = location.state?.keepPuzzle;

    if (navigationPuzzle && keepPuzzle) {
      setGeneratedPuzzle(navigationPuzzle);
      sessionStorage.setItem(
        "crosswordPuzzle",
        JSON.stringify(navigationPuzzle)
      );
    } else if (savedPuzzle && !navigationPuzzle) {
      try {
        const parsedPuzzle = JSON.parse(savedPuzzle);
        setGeneratedPuzzle(parsedPuzzle);
      } catch (e) {
        console.error("Failed to parse saved puzzle", e);
        sessionStorage.removeItem("crosswordPuzzle");
      }
    }
  }, [location.state]);

  const generatePuzzle = async () => {
    setError(null);
    setIsLoading(true);
    setSolvedPuzzle(null);
    try {
      const response = await axios.post(
        "http://localhost:5000/generate",
        {
          size: gridSize,
          difficulty,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      if (response.data.error) throw new Error(response.data.error);
      setGeneratedPuzzle(response.data);
      sessionStorage.setItem("crosswordPuzzle", JSON.stringify(response.data));
      setShowAnswers(false);
    } catch (err) {
      handleError(err, "Failed to generate puzzle");
    } finally {
      setIsLoading(false);
    }
  };

  const clearPuzzle = () => {
    setGeneratedPuzzle(null);
    setSolvedPuzzle(null);
    setError(null);
    sessionStorage.removeItem("crosswordPuzzle");
  };

  const solvePuzzle = async () => {
  if (!generatedPuzzle) return;
  setIsSolving(true);
  setError(null);
  try {
    const gridToSolve = generatedPuzzle.empty_grid.map((row) =>
      row.map((cell) => {
        if (cell === "." || cell === " ") return ".";
        return ".";
      })
    );

    const timingResponse = await axios.post("http://localhost:5000/solve", {
      grid: gridToSolve,
      clues: generatedPuzzle.clues,
      algorithm: selectedAlgorithm,
      enable_memory_profiling: false,
    });

    const memoryResponse = await axios.post("http://localhost:5000/solve", {
      grid: gridToSolve,
      clues: generatedPuzzle.clues,
      algorithm: selectedAlgorithm,
      enable_memory_profiling: true,
    });

    // Use the nested metrics structure from server response
    const combinedResult = {
      solution: timingResponse.data.solution,
      method: timingResponse.data.method || selectedAlgorithm,
      metrics: {
        execution_time: timingResponse.data.metrics?.execution_time || "N/A",
        memory_usage_kb: memoryResponse.data.metrics?.memory_usage_kb || "N/A",
        peak_memory_kb: memoryResponse.data.metrics?.peak_memory_kb || "N/A",
        words_placed: timingResponse.data.metrics?.words_placed || "N/A",
        fallback_usage_count: timingResponse.data.metrics?.fallback_usage_count || 0,
        memory_profiling_enabled: true,
      },
      success: timingResponse.data.success || false,
    };

    navigate("/solution", {
      state: {
        solvedResult: combinedResult,
        originalPuzzle: generatedPuzzle,
        selectedAlgorithm,
      },
    });
    setShowAlgorithmModal(false);
  } catch (err) {
    handleError(err, "Failed to solve puzzle");
  } finally {
    setIsSolving(false);
  }
};

  const handleDownload = async (format) => {
    if (!generatedPuzzle || isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/download",
        {
          puzzle: generatedPuzzle,
          format,
          showAnswers,
        },
        {
          responseType: "blob",
          headers: { "Content-Type": "application/json" },
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `crossword-${new Date().toISOString().split("T")[0]}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let errorMessage = "Failed to download puzzle";
      if (err.response?.status === 404) {
        errorMessage = "Download endpoint not found";
      } else if (err.response?.status === 405) {
        errorMessage = "CORS issue: Server not configured for downloads";
      } else if (err.code === "ERR_NETWORK") {
        errorMessage = "Cannot connect to server — is backend running?";
      }
      setError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleError = (err, defaultMessage) => {
    let errorMessage = defaultMessage;
    if (err.response) {
      errorMessage =
        err.response.data?.error || `Server error: ${err.response.status}`;
    } else if (err.request) {
      errorMessage = "No response from server";
    } else {
      errorMessage = err.message;
    }
    setError(errorMessage);
    console.error("Error:", err);
  };

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6 flex-1 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 sm:mb-8 text-center px-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Crossword Puzzle Generator
          </h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Create, solve, and download custom crossword puzzles with advanced
            algorithms
          </p>
        </header>

        {error && (
          <div className="mb-4 sm:mb-6 mx-2 p-3 sm:p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-700 flex justify-between items-center transition-colors duration-200 text-sm sm:text-base">
            <span className="flex-1 mr-2">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 flex-shrink-0"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/50 p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <PuzzleConfigPanel
                gridSize={gridSize}
                onGridSizeChange={setGridSize}
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
                onGenerate={generatePuzzle}
                isLoading={isLoading}
                onReset={clearPuzzle}
              />
            </div>

            {generatedPuzzle && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/50 p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 space-y-3 sm:space-y-4 transition-colors duration-200">
                <h1 className="flex items-center justify-center text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-white">
                  Export Puzzle
                </h1>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showAnswers"
                      checked={showAnswers}
                      onChange={() => setShowAnswers(!showAnswers)}
                      className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <label
                      htmlFor="showAnswers"
                      className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                    >
                      Show answers
                    </label>
                  </div>
                  <Button
                    onClick={() => setShowAlgorithmModal(true)}
                    variant="primary"
                    size="sm"
                    loading={isSolving}
                  >
                    Solve Puzzle
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Button
                    onClick={() => handleDownload("pdf")}
                    variant="secondary"
                    fullWidth
                    disabled={isDownloading}
                    icon={<FiDownload size={16} />}
                  >
                    {isDownloading ? "Preparing..." : "PDF"}
                  </Button>
                  <Button
                    onClick={() => handleDownload("png")}
                    variant="secondary"
                    fullWidth
                    disabled={isDownloading}
                    icon={<FiDownload size={16} />}
                  >
                    {isDownloading ? "Preparing..." : "Image"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 px-2 sm:px-0">
            {generatedPuzzle ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/50 p-4 sm:p-5 lg:p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
                    Your Crossword Puzzle
                  </h2>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className="px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs sm:text-sm font-medium rounded-full">
                      {generatedPuzzle.stats.size}x{generatedPuzzle.stats.size}
                    </span>
                    <span className="px-2 sm:px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs sm:text-sm font-medium rounded-full">
                      {generatedPuzzle.stats.difficulty
                        .charAt(0)
                        .toUpperCase() +
                        generatedPuzzle.stats.difficulty.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="w-full overflow-auto mb-4 sm:mb-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-center p-2 sm:p-3 lg:p-4">
                    <CrosswordGrid
                      grid={solvedPuzzle?.grid || generatedPuzzle.grid}
                      clues={generatedPuzzle.clues}
                      editable={false}
                      cellSize={getOptimalCellSize(gridSize)}
                      showAnswers={showAnswers}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="font-medium text-base sm:text-lg text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">
                      Across
                    </h3>
                    <ul className="space-y-2 sm:space-y-3">
                      {generatedPuzzle.clues.across.map((clue) => (
                        <li
                          key={`across-${clue.number}`}
                          className={`${getOptimalClueFontSize()} grid grid-cols-12 gap-1 sm:gap-2 items-baseline`}
                        >
                          <span className="font-medium col-span-1 text-blue-600 dark:text-blue-400">
                            {clue.number}.
                          </span>
                          <span className="col-span-7 text-gray-700 dark:text-gray-300">
                            {clue.clue}
                          </span>
                          {showAnswers && (
                            <span className="col-span-4 font-mono text-right text-green-600 dark:text-green-400 font-medium">
                              {clue.answer}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="font-medium text-base sm:text-lg text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">
                      Down
                    </h3>
                    <ul className="space-y-2 sm:space-y-3">
                      {generatedPuzzle.clues.down.map((clue) => (
                        <li
                          key={`down-${clue.number}`}
                          className={`${getOptimalClueFontSize()} grid grid-cols-12 gap-1 sm:gap-2 items-baseline`}
                        >
                          <span className="font-medium col-span-1 text-purple-600 dark:text-purple-400">
                            {clue.number}.
                          </span>
                          <span className="col-span-7 text-gray-700 dark:text-gray-300">
                            {clue.clue}
                          </span>
                          {showAnswers && (
                            <span className="col-span-4 font-mono text-right text-green-600 dark:text-green-400 font-medium">
                              {clue.answer}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title={
                  isLoading
                    ? "Generating your puzzle..."
                    : "No puzzle generated yet"
                }
                description={
                  isLoading
                    ? "This may take a moment..."
                    : 'Configure your settings and click "Generate Puzzle" to begin'
                }
                icon={
                  <div
                    className={`p-3 sm:p-4 rounded-full ${
                      isLoading
                        ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 animate-pulse"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                    } transition-colors duration-200 flex items-center justify-center`}
                  >
                    <svg
                      className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2.20164 18.4695L10.1643 4.00506C10.9021 2.66498 13.0979 2.66498 13.8357 4.00506L21.7984 18.4695C22.4443 19.6428 21.4598 21 19.9627 21H4.0373C2.54022 21 1.55571 19.6428 2.20164 18.4695Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 9V13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 17.0195V17"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                }
              />
            )}
          </div>
        </div>

        <Modal
          isOpen={showAlgorithmModal}
          onClose={() => !isSolving && setShowAlgorithmModal(false)}
          title="Select Solving Algorithm"
          size="lg"
        >
          <AlgorithmSelector
            selectedAlgorithm={selectedAlgorithm}
            onAlgorithmChange={setSelectedAlgorithm}
            algorithms={algorithms}
            footer={
              <Button
                onClick={solvePuzzle}
                variant="primary"
                fullWidth
                loading={isSolving}
                icon={<FiCheckCircle size={18} />}
              >
                {isSolving
                  ? "Solving..."
                  : `Solve with ${
                      algorithms.find((a) => a.id === selectedAlgorithm)?.name
                    }`}
              </Button>
            }
            isLoading={isSolving}
          />
        </Modal>
      </div>
    </div>
  );
}
