import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Zap, Cpu, Trophy } from "lucide-react";

export const AnalysisReport = ({ data, filteredData }) => {
  const getPerformanceSummary = () => {
    if (filteredData.length === 0 || data.length === 0) return null;

    const accuracyTolerance = 0.01;
    const timeTolerance = 0.05;
    const memoryTolerance = 0.1;

    const findBestAlgorithms = (data, getValue, isBetter, tolerance) => {
      return data.reduce((best, current) => {
        if (best.length === 0) return [current];
        
        const bestValue = getValue(best[0]);
        const currentValue = getValue(current);
        
        const isWithinTolerance = Math.abs(currentValue - bestValue) <= (tolerance * bestValue);
        
        if (isWithinTolerance) {
          return [...best, current];
        } else if (isBetter(currentValue, bestValue)) {
          return [current];
        }
        return best;
      }, []);
    };

    const bestAlgorithms = findBestAlgorithms(
      data,
      algo => algo.avgAccuracy,
      (current, best) => current > best,
      accuracyTolerance
    );

    const fastestAlgorithms = findBestAlgorithms(
      data,
      algo => algo.avgExecutionTime,
      (current, best) => current < best,
      timeTolerance
    );

    const mostEfficientAlgorithms = findBestAlgorithms(
      data,
      algo => algo.avgMemoryUsage,
      (current, best) => current < best,
      memoryTolerance
    );

    // Calculate overall averages from filtered data
    const totalAccuracy = filteredData.reduce((sum, item) => sum + item.cellAccuracy, 0);
    const totalExecutionTime = filteredData.reduce((sum, item) => sum + item.executionTime, 0);
    
    return {
      bestAlgorithms,
      fastestAlgorithms,
      mostEfficientAlgorithms,
      totalRuns: filteredData.length,
      avgAccuracy: ((totalAccuracy / filteredData.length) * 100).toFixed(2),
      avgExecutionTime: (totalExecutionTime / filteredData.length).toFixed(3),
      accuracyTolerance,
      timeTolerance,
      memoryTolerance,
    };
  };

  const formatAlgorithmList = (algorithms) => {
    if (algorithms.length === 0) return "None";
    if (algorithms.length === 1) return algorithms[0].algorithm;
    if (algorithms.length === 2) return algorithms.map(a => a.algorithm).join(" & ");
    if (algorithms.length === data.length) return "All Algorithms";
    return algorithms.map(a => a.algorithm).join(", ");
  };

  const getPerformanceValue = (algorithms, type) => {
    if (algorithms.length === 0) return "N/A";
    
    switch (type) {
      case 'accuracy':
        return `${(algorithms[0].avgAccuracy * 100).toFixed(2)}%`;
      case 'time':
        return `${algorithms[0].avgExecutionTime.toFixed(3)}s`;
      case 'memory':
        return `${Math.round(algorithms[0].avgMemoryUsage)} KB`;
      default:
        return "N/A";
    }
  };

  const getPerformanceInsights = (summary) => {
    const insights = [];
    const { bestAlgorithms, fastestAlgorithms, mostEfficientAlgorithms } = summary;

    // Accuracy insights
    if (bestAlgorithms.length === data.length) {
      insights.push({
        type: "accuracy",
        text: `All algorithms showed comparable accuracy (within ${(summary.accuracyTolerance * 100).toFixed(1)}% tolerance)`,
      });
    } else {
      insights.push({
        type: "accuracy",
        text: `${formatAlgorithmList(bestAlgorithms)} achieved the highest accuracy at ${getPerformanceValue(bestAlgorithms, 'accuracy')}`,
      });
    }

    // Speed insights
    if (fastestAlgorithms.length === data.length) {
      insights.push({
        type: "speed",
        text: `All algorithms showed comparable execution times (within ${(summary.timeTolerance * 100).toFixed(1)}% tolerance)`,
      });
    } else {
      insights.push({
        type: "speed",
        text: `${formatAlgorithmList(fastestAlgorithms)} were the fastest with ${getPerformanceValue(fastestAlgorithms, 'time')} average time`,
      });
    }

    // Memory insights
    if (mostEfficientAlgorithms.length === data.length) {
      insights.push({
        type: "memory",
        text: `All algorithms showed comparable memory usage (within ${(summary.memoryTolerance * 100).toFixed(1)}% tolerance)`,
      });
    } else {
      insights.push({
        type: "memory",
        text: `${formatAlgorithmList(mostEfficientAlgorithms)} used the least memory at ${getPerformanceValue(mostEfficientAlgorithms, 'memory')}`,
      });
    }

    const bestOverall = data.reduce((best, current) => {
      const normalizeTime = 1 / (current.avgExecutionTime || 1);
      const normalizeMemory = 1 / (current.avgMemoryUsage || 1);
      
      const currentScore = 
        (current.avgAccuracy * 0.5) + 
        (normalizeTime * 0.3) + 
        (normalizeMemory * 0.2);
        
      const bestScore = 
        (best.avgAccuracy * 0.5) + 
        (1 / (best.avgExecutionTime || 1) * 0.3) + 
        (1 / (best.avgMemoryUsage || 1) * 0.2);
      
      return currentScore > bestScore ? current : best;
    }, data[0]);

    insights.push({
      type: "overall",
      text: `${bestOverall.algorithm} demonstrated the best overall performance balance`,
    });

    return insights;
  };

  const summary = getPerformanceSummary();
  if (!summary) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#172030] dark:to-gray-900 rounded-2xl p-8 shadow-md mb-10">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Performance Summary Report
        </h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No performance data available. Generate and solve some puzzles to see analytics.
        </div>
      </div>
    );
  }

  const insights = getPerformanceInsights(summary);

  const typeStyles = {
  accuracy: "border-green-500 text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:shadow-[0_0_15px_5px_rgba(34,197,94,0.3)] hover:border-green-300 transition-all duration-300",
  speed: "border-purple-500 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:shadow-[0_0_15px_5px_rgba(168,85,247,0.3)] hover:border-purple-300 transition-all duration-300",
  memory: "border-pink-500 text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-900/20 hover:shadow-[0_0_15px_5px_rgba(236,72,153,0.3)] hover:border-pink-300 transition-all duration-300",
  overall: "border-yellow-500 text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 hover:shadow-[0_0_15px_5px_rgba(234,179,8,0.3)] hover:border-yellow-300 transition-all duration-300",
};

  const typeIcons = {
    accuracy: <CheckCircle className="w-5 h-5" />,
    speed: <Zap className="w-5 h-5" />,
    memory: <Cpu className="w-5 h-5" />,
    overall: <Trophy className="w-5 h-5" />,
  };

  const performanceCards = [
    {
      title: "Fastest Execution Time",
      algorithms: summary.fastestAlgorithms,
      value: getPerformanceValue(summary.fastestAlgorithms, 'time'),
      bgClass: "bg-purple-100 dark:bg-purple-900/30",
      glowClass: "bg-purple-400/30",
      textClass: "text-purple-700 dark:text-purple-300"
    },
    {
      title: "Lowest Memory Usage",
      algorithms: summary.mostEfficientAlgorithms,
      value: getPerformanceValue(summary.mostEfficientAlgorithms, 'memory'),
      bgClass: "bg-pink-100 dark:bg-pink-900/30",
      glowClass: "bg-pink-400/30",
      textClass: "text-pink-700 dark:text-pink-300"
    },
    {
      title: "Highest Accuracy",
      algorithms: summary.bestAlgorithms,
      value: getPerformanceValue(summary.bestAlgorithms, 'accuracy'),
      bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
      glowClass: "bg-yellow-400/30",
      textClass: "text-yellow-700 dark:text-yellow-300"
    },
  ];

  return (
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#172030] dark:to-gray-900 rounded-2xl p-8 shadow-md mb-10">
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Performance Summary Report
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {performanceCards.map((card, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className={`relative ${card.bgClass} p-6 rounded-xl shadow-lg overflow-hidden`}
          >
            <div
              className={`absolute inset-0 rounded-xl ${card.glowClass} blur-xl`}
            ></div>
            <div className="relative flex items-center gap-3 mb-2">
              {card.icon}
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {card.title}
              </p>
            </div>
            <p className={`relative text-2xl font-bold ${card.textClass} mb-1`}>
              {formatAlgorithmList(card.algorithms)}
            </p>
            <p className="relative text-sm text-gray-600 dark:text-gray-300">
              {card.value}
            </p>
            {card.algorithms.length > 1 && (
              <p className="relative text-xs text-gray-500 dark:text-gray-400 mt-1">
                (Tie within tolerance)
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Runs</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summary.totalRuns}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg Accuracy</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {summary.avgAccuracy}%
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Avg Execution Time
          </p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {summary.avgExecutionTime}s
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Top Performer</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {summary.bestAlgorithms.length === 1
              ? summary.bestAlgorithms[0].algorithm
              : summary.bestAlgorithms.length === data.length
              ? "All"
              : "Multiple"}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow mb-8">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
          Key Insights
        </h4>
        <div className="space-y-3">
          <AnimatePresence>
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className={`flex items-center gap-3 p-3 rounded-lg border-l-4 shadow-sm transition-all duration-300 hover:scale-105 ${typeStyles[insight.type]}`}
              >
                <div className="flex-shrink-0">{typeIcons[insight.type]}</div>
                <p className="text-sm">{insight.text}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <h5 className="font-semibold text-gray-900 dark:text-white p-4 border-b dark:border-gray-700">
          Algorithm Average Comparison Table
        </h5>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Algorithm
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Accuracy
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Time (s)
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Memory (KB)
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Runs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((algo, index) => {
                const isBestAccuracy = summary.bestAlgorithms.includes(algo);
                const isFastest = summary.fastestAlgorithms.includes(algo);
                const isMostEfficient = summary.mostEfficientAlgorithms.includes(algo);
                const isHighlighted = isBestAccuracy || isFastest || isMostEfficient;

                return (
                  <tr
                    key={index}
                    className={
                      isHighlighted
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10"
                        : ""
                    }
                  >
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {algo.algorithm}
                        <div className="flex gap-1">
                          {isBestAccuracy && (
                            <span className="text-green-500" title="Highest Accuracy"></span>
                          )}
                          {isFastest && (
                            <span className="text-purple-500" title="Fastest"></span>
                          )}
                          {isMostEfficient && (
                            <span className="text-pink-500" title="Most Efficient"></span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      {(algo.avgAccuracy * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      {algo.avgExecutionTime.toFixed(3)}s
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      {Math.round(algo.avgMemoryUsage)} KB
                    </td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      {algo.count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};