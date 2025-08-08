import { Link } from "react-router-dom";

function MainMenu() {
  const triggerRipple = () => {
    document.dispatchEvent(
      new CustomEvent("triggerWaveRipple", {
        detail: {
          time: performance.now(),
        },
      })
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6 transition-colors duration-200">
          Crossword Puzzle Solver
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto transition-colors duration-200">
          Generate and solve crossword puzzles using A*, DFS, and hybrid algorithms
        </p>

        {/* Options Container */}
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          {/* Generate Puzzle Card */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-lg dark:shadow-gray-700/50 border border-white/20 dark:border-gray-700/50 w-full max-w-sm transition-colors duration-200">
            <Link
              to="/generate"
              onClick={triggerRipple}
              className="block bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-full transition-all hover:scale-[1.02] mb-4 text-center duration-200"
            >
              Generate Puzzle
            </Link>
            <p className="text-gray-700 dark:text-gray-300 text-center transition-colors duration-200">
              Create a new crossword puzzle with customizable size and difficulty.
            </p>
          </div>

          {/* Add this if you want a Solve Puzzle option as well */}
          {/* <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-lg dark:shadow-gray-700/50 border border-white/20 dark:border-gray-700/50 w-full max-w-sm transition-colors duration-200">
            <Link
              to="/solve"
              onClick={triggerRipple}
              className="block bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition-all hover:scale-[1.02] mb-4 text-center duration-200"
            >
              Solve Puzzle
            </Link>
            <p className="text-gray-700 dark:text-gray-300 text-center transition-colors duration-200">
              Solve existing puzzles using different algorithms.
            </p>
          </div> */}
        </div>
      </div>
    </div>
  );
}

export default MainMenu;