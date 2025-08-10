import React from "react";

const About = () => {
  const teamMembers = [
    {
      id: 1,
      name: "Queency Santos",
      role: "Project Manager",
      image: "/Santos.png",
    },
    {
      id: 2,
      name: "Patrick Sios-e",
      role: "Frontend Developer",
      image: "/Sios-e.png",
    },
    {
      id: 3,
      name: "Xyro Casa",
      role: "Backend Developer",
      image: "/Casa.png",
    },
    {
      id: 4,
      name: "Katrina Villalon",
      role: "UI/UX Designer",
      image: "/Villalon.png",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/10 to-blue-100/10 dark:from-gray-800/10 dark:to-gray-900/10 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 backdrop-blur-md">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
            What is <span className="text-blue-600 dark:text-blue-400">Crossword Solver</span> ?
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            It is an app made to explore the technicalities and performances of
            the use pathfinding algorithms in solving crossword puzzles.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl dark:shadow-gray-700/50 p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Project</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                Crossword Solver is an experimental stressing of the
                capabilities of pathfinding algorithms DFS (Backtracking), A*
                search, and a Hybrid DFS-A* algorithm crossword puzzle
                application that to solve crossword puzzles with unprecedented
                efficiency.
              </p>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Whether you're a puzzle enthusiast looking for a challenge or a
                developer interested in algorithmic implementations, the
                Crossword Solver app offers an engaging experience.
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-gray-700 rounded-xl p-6 border border-blue-100 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-4">
                Technical Highlights
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-blue-500 dark:text-blue-400">✓</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    React + Vite frontend with Tailwind CSS
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-blue-500 dark:text-blue-400">✓</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    Flask Python backend with optimized algorithms
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-blue-500 dark:text-blue-400">✓</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    DFS, A*, and Hybrid puzzle solvers
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 h-6 w-6 text-blue-500 dark:text-blue-400">✓</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    WordNet integration for clues and answers
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
                        className="h-17 object-contain transition-transform hover:scale-120"
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
                        className="h-12 object-contain transition-transform hover:scale-120"
                        src="/vite.svg"
                        alt="Vite"
                      />
                    </a>
                    <span className="mt-9.5 text-sm font-medium text-gray-500 dark:text-gray-400">
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
                        className="h-17 object-contain transition-transform group-hover:scale-110 dark:invert"
                        src="/flask.svg"
                        alt="Flask"
                      />
                    </a>
                    <span className="mt-4.5 text-sm font-medium text-gray-500 dark:text-gray-400">
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
                        className="h-10 object-contain transition-transform group-hover:scale-120"
                        src="/tailwindcss.svg"
                        alt="Tailwind CSS"
                      />
                    </a>
                    <span className="mt-11 text-sm font-medium text-gray-500 dark:text-gray-400">
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
                        className="h-12 object-contain transition-transform group-hover:scale-120"
                        src="/python.svg"
                        alt="Python"
                      />
                    </a>
                    <span className="mt-10 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Python
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 text-center">
              <p className="text-base text-gray-500 dark:text-gray-400">
                Want to build something similar? These technologies are open
                source and ready to use.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 mt-16 rounded-2xl shadow-xl dark:shadow-gray-700/50 p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12 ">
            Meet the Team
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 ">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-md dark:shadow-gray-700/50 overflow-hidden transition-transform hover:scale-105 flex flex-col"
              >
                <div className="relative pt-[100%]">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="absolute top-0 left-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-6 text-center flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {member.name}
                  </h3>
                  <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-sm font-semibold rounded-full mb-4">
                    {member.role}
                  </span>
                  <div className="mt-auto flex justify-center space-x-4">
                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>
                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.25.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.318 35.318 0 011.823 6.475 8.4 8.4 0 01-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 01-3.655 5.715z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>
                    <a href="#" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                          fillRule="evenodd"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Ready to Solve Some Puzzles?
          </h2>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            Get Started
          </a>
        </div>
      </div>
    </div>
  );
};

export default About;