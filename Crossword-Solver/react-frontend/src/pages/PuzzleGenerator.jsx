import axios from "axios";
import CrosswordGrid from "../components/CrosswordGrid";
import Button from "../components/Button";
import PuzzleConfigPanel from "../components/PuzzleConfigPanel";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import React, { useState } from "react";
import AlgorithmSelector from "../components/AlgorithmSelector";
import { FiCheckCircle, FiDownload, FiInfo, FiRefreshCw } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function PuzzleGenerator() {
  const [gridSize, setGridSize] = useState(15);
  const [difficulty, setDifficulty] = useState("medium");
  const [generatedPuzzle, setGeneratedPuzzle] = useState(null);
  const [solvedPuzzle, setSolvedPuzzle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showAlgorithmModal, setShowAlgorithmModal] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("HYBRID");

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
      setShowAnswers(false);
    } catch (err) {
      handleError(err, "Failed to generate puzzle");
    } finally {
      setIsLoading(false);
    }
  };

  const solvePuzzle = async () => {
    if (!generatedPuzzle) return;
    setIsSolving(true);
    setError(null);
    try {
      const gridToSolve = generatedPuzzle.empty_grid.map(row =>
        row.map(cell => {
          if (cell === '.' || cell === ' ') return '.';
          return '.';
        })
      );

      const response = await axios.post("http://localhost:5000/solve", {
        grid: gridToSolve,
        clues: generatedPuzzle.clues,
        algorithm: selectedAlgorithm,
      });

      navigate("/solution", {
        state: {
          solvedResult: {
            solution: response.data.solution,
            method: response.data.method || selectedAlgorithm,
            metrics: response.data.metrics || {},
            success: response.data.success || false
          },
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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 flex-1 pb-12 bg-white/10 dark:bg-gray-800/10 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Crossword Puzzle Generator
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors duration-200">
            Create, solve, and download custom crossword puzzles with advanced
            algorithms
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-700 flex justify-between items-center transition-colors duration-200">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
            >
              <svg
                className="w-5 h-5"
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/50 p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <PuzzleConfigPanel
                gridSize={gridSize}
                onGridSizeChange={setGridSize}
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
                onGenerate={generatePuzzle}
                isLoading={isLoading}
                onReset={() => {
                  setGeneratedPuzzle(null);
                  setSolvedPuzzle(null);
                  setError(null);
                }}
              />
            </div>

            {generatedPuzzle && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/50 p-6 border border-gray-200 dark:border-gray-700 space-y-4 transition-colors duration-200">
                <h1 className="flex items-center justify-center text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                  Export Puzzle
                </h1>
                <div className="flex items-center justify-between">
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

                <div className="grid grid-cols-2 gap-3">
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

          <div className="lg:col-span-3">
            {generatedPuzzle ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-700/50 p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    Your Crossword Puzzle
                  </h2>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                      {gridSize}x{gridSize}
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-full">
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="w-full overflow-auto mb-6 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-center p-4">
                    <CrosswordGrid
                      grid={solvedPuzzle?.grid || generatedPuzzle.grid}
                      clues={generatedPuzzle.clues}
                      editable={false}
                      cellSize={Math.min(40, 800 / gridSize)}
                      showAnswers={showAnswers}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">
                      Across
                    </h3>
                    <ul className="space-y-3">
                      {generatedPuzzle.clues.across.map((clue) => (
                        <li
                          key={`across-${clue.number}`}
                          className="text-sm grid grid-cols-12 gap-2 items-baseline"
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
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">
                      Down
                    </h3>
                    <ul className="space-y-3">
                      {generatedPuzzle.clues.down.map((clue) => (
                        <li
                          key={`down-${clue.number}`}
                          className="text-sm grid grid-cols-12 gap-2 items-baseline"
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
                    className={`p-4 rounded-full ${
                      isLoading
                        ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 animate-pulse"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                    } transition-colors duration-200`}
                  >
                    <svg
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 001-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
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