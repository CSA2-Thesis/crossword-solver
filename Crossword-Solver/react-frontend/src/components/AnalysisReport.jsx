// components/AnalysisReport.jsx
import React from 'react';

export const AnalysisReport = ({ data, filteredData }) => {
  const getPerformanceSummary = () => {
    if (filteredData.length === 0 || data.length === 0) return null;

    const accuracyTolerance = 0.02; 
    const timeTolerance = 0.1;
    const memoryTolerance = 1024; 

    const bestAlgorithms = data.reduce((best, current) => {
      if (best.length === 0) return [current];
      
      const bestAccuracy = best[0].avgAccuracy;
      const currentAccuracy = current.avgAccuracy;
      
      if (Math.abs(currentAccuracy - bestAccuracy) < accuracyTolerance) {
        return [...best, current];
      } else if (currentAccuracy > bestAccuracy) {
        return [current];
      }
      return best;
    }, []);

    const fastestAlgorithms = data.reduce((fastest, current) => {
      if (fastest.length === 0) return [current];
      
      const bestTime = fastest[0].avgExecutionTime;
      const currentTime = current.avgExecutionTime;
      
      if (Math.abs(currentTime - bestTime) < timeTolerance) {
        return [...fastest, current];
      } else if (currentTime < bestTime) {
        return [current];
      }
      return fastest;
    }, []);

    const mostEfficientAlgorithms = data.reduce((efficient, current) => {
      if (efficient.length === 0) return [current];
      
      const bestEfficiency = efficient[0].avgMemoryUsage / efficient[0].avgAccuracy;
      const currentEfficiency = current.avgMemoryUsage / current.avgAccuracy;
      
      if (Math.abs(currentEfficiency - bestEfficiency) < memoryTolerance) {
        return [...efficient, current];
      } else if (currentEfficiency < bestEfficiency) {
        return [current];
      }
      return efficient;
    }, []);

    return {
      bestAlgorithms,
      fastestAlgorithms,
      mostEfficientAlgorithms,
      totalRuns: filteredData.length,
      avgAccuracy: (filteredData.reduce((sum, item) => sum + item.cellAccuracy, 0) / filteredData.length * 100).toFixed(2),
      avgExecutionTime: (filteredData.reduce((sum, item) => sum + item.executionTime, 0) / filteredData.length).toFixed(3),
      accuracyTolerance,
      timeTolerance,
      memoryTolerance
    };
  };

  const formatAlgorithmList = (algorithms) => {
    if (algorithms.length === 1) {
      return algorithms[0].algorithm;
    }
    return algorithms.map(a => a.algorithm).join(', ');
  };

  const getPerformanceInsights = (summary) => {
    const insights = [];
    const { bestAlgorithms, fastestAlgorithms, mostEfficientAlgorithms } = summary;

    if (bestAlgorithms.length === 1) {
      insights.push(` ${bestAlgorithms[0].algorithm} achieved the highest accuracy at ${(bestAlgorithms[0].avgAccuracy * 100).toFixed(2)}%`);
    } else if (bestAlgorithms.length === data.length) {
      insights.push(` All algorithms showed similar accuracy performance (within ${(summary.accuracyTolerance * 100).toFixed(1)}%)`);
    } else {
      insights.push(` ${formatAlgorithmList(bestAlgorithms)} showed the best accuracy at ~${(bestAlgorithms[0].avgAccuracy * 100).toFixed(2)}%`);
    }

    if (fastestAlgorithms.length === 1) {
      insights.push(` ${fastestAlgorithms[0].algorithm} was the fastest with ${fastestAlgorithms[0].avgExecutionTime.toFixed(3)}s average execution time`);
    } else if (fastestAlgorithms.length === data.length) {
      insights.push(` All algorithms showed similar execution times (within ${summary.timeTolerance}s)`);
    } else {
      insights.push(` ${formatAlgorithmList(fastestAlgorithms)} were the fastest with ~${fastestAlgorithms[0].avgExecutionTime.toFixed(3)}s average time`);
    }

    if (mostEfficientAlgorithms.length === 1) {
      insights.push(` ${mostEfficientAlgorithms[0].algorithm} showed the best memory efficiency`);
    } else if (mostEfficientAlgorithms.length === data.length) {
      insights.push(` All algorithms showed similar memory efficiency`);
    } else {
      insights.push(` ${formatAlgorithmList(mostEfficientAlgorithms)} showed the best memory efficiency`);
    }

    const bestOverall = data.reduce((best, current) => {
      const currentScore = current.avgAccuracy * 0.4 + (1 / current.avgExecutionTime) * 0.3 + (1 / current.avgMemoryUsage) * 3000;
      const bestScore = best.avgAccuracy * 0.4 + (1 / best.avgExecutionTime) * 0.3 + (1 / best.avgMemoryUsage) * 3000;
      return currentScore > bestScore ? current : best;
    }, data[0]);

    insights.push(` ${bestOverall.algorithm} demonstrated the best overall balance of accuracy, speed, and efficiency`);

    if (data.length >= 3) {
      const accuracyRange = Math.max(...data.map(d => d.avgAccuracy)) - Math.min(...data.map(d => d.avgAccuracy));
      if (accuracyRange < 0.05) {
        insights.push(` Algorithm accuracy varies by less than 5%, suggesting similar solution quality`);
      }
      
      const timeRange = Math.max(...data.map(d => d.avgExecutionTime)) - Math.min(...data.map(d => d.avgExecutionTime));
      if (timeRange > 2) {
        insights.push(` Execution times vary significantly (${timeRange.toFixed(1)}s difference), indicating different computational approaches`);
      }
    }

    return insights;
  };

  const summary = getPerformanceSummary();

  if (!summary) return null;

  const insights = getPerformanceInsights(summary);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 mb-8">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Performance Summary Report</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-300">Total Runs Analyzed</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.totalRuns}</p>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-300">Overall Accuracy</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.avgAccuracy}%</p>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-300">Avg Execution Time</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.avgExecutionTime}s</p>
        </div>
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-300">Top Performer</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {summary.bestAlgorithms.length === 1 ? summary.bestAlgorithms[0].algorithm : 'Multiple'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Key Insights:</h4>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-500 dark:text-blue-400 mr-2">•</span>
              {insight}
            </li>
          ))}
        </ul>
        
        {summary.bestAlgorithms.length > 1 && (
          <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              💡 <strong>Note:</strong> Multiple algorithms show similar performance. 
              The difference is less than {(summary.accuracyTolerance * 100).toFixed(1)}% in accuracy, 
              {summary.timeTolerance}s in execution time, or {summary.memoryTolerance/1024}MB in memory usage.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm overflow-hidden">
        <h5 className="font-semibold text-gray-900 dark:text-white p-4 border-b dark:border-gray-600">
          Algorithm Comparison Summary
        </h5>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-600">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Algorithm</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Accuracy</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Time (s)</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Memory</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Runs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {data.map((algo, index) => (
                <tr key={index} className={summary.bestAlgorithms.includes(algo) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{algo.algorithm}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                    {(algo.avgAccuracy * 100).toFixed(2)}%
                    {summary.bestAlgorithms.includes(algo) && ' 🏆'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                    {algo.avgExecutionTime.toFixed(3)}s
                    {summary.fastestAlgorithms.includes(algo) && ' ⚡'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                    {Math.round(algo.avgMemoryUsage)}KB
                    {summary.mostEfficientAlgorithms.includes(algo) && ' 💾'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">{algo.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};