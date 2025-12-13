import React from 'react';

const viewTabs = [
  { id: "overlay", label: "Solution Overlay" },
  { id: "simulation", label: "Algorithm Simulation" },
  { id: "compare", label: "Compare Algorithms" },
];

export default function SolutionViewTabs({ currentView, onViewChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center">
      {viewTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition ${
            currentView === tab.id
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          } border border-gray-300 dark:border-gray-600`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}