import React from 'react';
import Layout from '../components/Layout';

const License = () => {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
              License Information
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Attribution and licensing information for the data used in this application
            </p>
          </div>

          <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Wordset Database
                </h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  CC BY-SA 4.0
                </span>
              </div>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 min-w-24">Provided by:</span>
                  <span>Wordset, Inc.</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 min-w-24">License:</span>
                  <span>Creative Commons Attribution-ShareAlike 4.0 International</span>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 min-w-24">Source:</span>
                  <a 
                    href="https://github.com/wordset/wordset-dictionary" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
                  >
                    https://github.com/wordset/wordset-dictionary
                  </a>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 min-w-24">License Link:</span>
                  <a 
                    href="https://creativecommons.org/licenses/by-sa/4.0/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
                  >
                    https://creativecommons.org/licenses/by-sa/4.0/
                  </a>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                As per the Creative Commons Attribution-ShareAlike 4.0 International License this work shares the same license.
                To view a copy of this work, visit our{' '}
                <a 
                    href="https://github.com/CSA2-Thesis/crossword-solver" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
                >
                    Github
                </a>
                {' '}link.
                </p>           
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  WordNet 3.0 Lexical Database
                </h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Princeton University
                </span>
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300 font-semibold">
                  WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved.
                </p>
                
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-yellow-300">
                    <strong>Disclaimer:</strong> THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON UNIVERSITY 
                    MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED. BY WAY OF EXAMPLE, BUT NOT LIMITATION, 
                    PRINCETON UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES OF MERCHANTABILITY OR FITNESS FOR ANY 
                    PARTICULAR PURPOSE OR THAT THE USE OF THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT 
                    INFRINGE ANY THIRD PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.
                  </p>
                </div>
                
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  <p>
                    For more information about WordNet, please visit:{' '}
                    <a 
                      href="https://wordnet.princeton.edu/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
                    >
                      https://wordnet.princeton.edu/
                    </a>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
                Crossword Puzzle Generator & Solver
              </h2>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p>
                  This application is built for educational and research purposes to demonstrate 
                  various algorithms (DFS, A*, and Hybrid) for crossword puzzle generation and solving.
                </p>
                
                <p>
                  The application frontend is built with React and Vite, while the backend uses 
                  Python with Flask. The algorithms implemented include Depth-First Search (Backtracking), 
                  A* Search, and a Hybrid approach combining both methods.
                </p>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> This application is intended for academic and research purposes. 
                    Please ensure proper attribution when using the included datasets and respect the 
                    respective licenses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default License;