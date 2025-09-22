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
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
          What is{" "}
          <span className="text-blue-600 dark:text-blue-400">Puzzly</span>Logic?
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          It is an app made to explore the technicalities and performances of
          the use pathfinding algorithms in solving crossword puzzles.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-700/50 p-8 mb-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Our Project
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              PuzzlyLogic is an experimental stressing of the capabilities of
              pathfinding algorithms DFS (Backtracking), A* search, and a Hybrid
              DFS-A* algorithm crossword puzzle application that to solve
              crossword puzzles to identify their efficiency.
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Whether you're a professional looking to study the algorithms or a
              developer interested in its implementation, PuzzlyLogic is an app
              offering to provide insights into these algorithms.
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-gray-700 rounded-xl p-6 border border-blue-100 dark:border-gray-600">
            <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-4">
              Technical Highlights
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 text-blue-500 dark:text-blue-400">
                  ✓
                </span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  React + Vite frontend with Tailwind CSS
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 text-blue-500 dark:text-blue-400">
                  ✓
                </span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  Python backend on Flask Framework
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 text-blue-500 dark:text-blue-400">
                  ✓
                </span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  Algorithmic stressing of DFS and A*
                </span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 text-blue-500 dark:text-blue-400">
                  ✓
                </span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  Integrating the algorithms into a Hybrid
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-700/50 p-8 mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
              Powered by Modern Technologies
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400 sm:mt-4">
              Built with the best tools for optimal performance and developer
              experience
            </p>
          </div>

          <div className="mt-10">
            <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-5 mb-10">
              {/* React */}
              <div className="col-span-1 flex justify-center items-center">
                <div className="flex flex-col items-center">
                  <a
                    href="https://react.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <img
                      className="h-16 object-contain transition-transform hover:scale-110"
                      src="/react.svg"
                      alt="React"
                    />
                  </a>
                  <span className="mt-5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    React
                  </span>
                </div>
              </div>

              {/* Vite */}
              <div className="col-span-1 flex justify-center items-center">
                <div className="flex flex-col items-center">
                  <a
                    href="https://vite.dev/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <img
                      className="h-12 object-contain transition-transform hover:scale-110"
                      src="/vite.svg"
                      alt="Vite"
                    />
                  </a>
                  <span className="mt-8 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Vite
                  </span>
                </div>
              </div>

              {/* Flask */}
              <div className="col-span-1 flex justify-center items-center">
                <div className="flex flex-col items-center">
                  <a
                    href="https://flask.palletsprojects.com/en/stable/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <img
                      className="h-16 object-contain transition-transform group-hover:scale-110 dark:invert"
                      src="/flask.svg"
                      alt="Flask"
                    />
                  </a>
                  <span className="mt-5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Flask
                  </span>
                </div>
              </div>

              {/* Tailwind CSS */}
              <div className="col-span-1 flex justify-center items-center">
                <div className="flex flex-col items-center">
                  <a
                    href="https://tailwindcss.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <img
                      className="h-10 object-contain transition-transform group-hover:scale-110"
                      src="/tailwindcss.svg"
                      alt="Tailwind CSS"
                    />
                  </a>
                  <span className="mt-9 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tailwind CSS
                  </span>
                </div>
              </div>

              {/* Python */}
              <div className="col-span-1 flex justify-center items-center">
                <div className="flex flex-col items-center">
                  <a
                    href="https://www.python.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <img
                      className="h-12 object-contain transition-transform group-hover:scale-110"
                      src="/python.svg"
                      alt="Python"
                    />
                  </a>
                  <span className="mt-8 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Python
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
              Ready to Explore Algorithm Performance?
            </h2>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link
                to="/generate"
                onClick={triggerRipple}
                className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-full transition-all hover:scale-105 duration-200 text-lg"
              >
                Start Generating!
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
