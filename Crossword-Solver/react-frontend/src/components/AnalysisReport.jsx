import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Zap, Cpu, Trophy } from "lucide-react";

export const AnalysisReport = ({ data, filteredData }) => {
  const getPerformanceSummary = () => {
    if (filteredData.length === 0 || data.length === 0) return null;

    const accuracyTolerance = 0.02;
    const timeTolerance = 0.1;
    const memoryTolerance = 10;

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
      const bestEfficiency =
        efficient[0].avgMemoryUsage / efficient[0].avgAccuracy;
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
      avgAccuracy: (
        (filteredData.reduce((sum, item) => sum + item.cellAccuracy, 0) /
          filteredData.length) *
        100
      ).toFixed(2),
      avgExecutionTime: (
        filteredData.reduce((sum, item) => sum + item.executionTime, 0) /
        filteredData.length
      ).toFixed(3),
      accuracyTolerance,
      timeTolerance,
      memoryTolerance,
    };
  };

  const formatAlgorithmList = (algorithms) => {
    if (algorithms.length === 1) {
      return algorithms[0].algorithm;
    }
    return algorithms.map((a) => a.algorithm).join(", ");
  };

  const getPerformanceInsights = (summary) => {
    const insights = [];
    const { bestAlgorithms, fastestAlgorithms, mostEfficientAlgorithms } =
      summary;

    if (bestAlgorithms.length === 1) {
      insights.push({
        type: "accuracy",
        text: `${bestAlgorithms[0].algorithm} achieved the highest accuracy at ${(
          bestAlgorithms[0].avgAccuracy * 100
        ).toFixed(2)}%`,
      });
    } else if (bestAlgorithms.length === data.length) {
      insights.push({
        type: "accuracy",
        text: `All algorithms showed similar accuracy performance (within ${(summary.accuracyTolerance * 100).toFixed(
          1
        )}%)`,
      });
    } else {
      insights.push({
        type: "accuracy",
        text: `${formatAlgorithmList(
          bestAlgorithms
        )} showed the best accuracy at ~${(
          bestAlgorithms[0].avgAccuracy * 100
        ).toFixed(2)}%`,
      });
    }

    if (fastestAlgorithms.length === 1) {
      insights.push({
        type: "speed",
        text: `${fastestAlgorithms[0].algorithm} was the fastest with ${fastestAlgorithms[0].avgExecutionTime.toFixed(
          3
        )}s average execution time`,
      });
    } else if (fastestAlgorithms.length === data.length) {
      insights.push({
        type: "speed",
        text: `All algorithms showed similar execution times (within ${summary.timeTolerance}s)`,
      });
    } else {
      insights.push({
        type: "speed",
        text: `${formatAlgorithmList(
          fastestAlgorithms
        )} were the fastest with ~${fastestAlgorithms[0].avgExecutionTime.toFixed(
          3
        )}s average time`,
      });
    }

    if (mostEfficientAlgorithms.length === 1) {
      insights.push({
        type: "memory",
        text: `${mostEfficientAlgorithms[0].algorithm} showed the best memory efficiency`,
      });
    } else if (mostEfficientAlgorithms.length === data.length) {
      insights.push({
        type: "memory",
        text: `All algorithms showed similar memory efficiency`,
      });
    } else {
      insights.push({
        type: "memory",
        text: `${formatAlgorithmList(
          mostEfficientAlgorithms
        )} showed the best memory efficiency`,
      });
    }

    const bestOverall = data.reduce((best, current) => {
      const currentScore =
        current.avgAccuracy * 0.4 +
        1 / current.avgExecutionTime * 0.3 +
        (1 / current.avgMemoryUsage) * 3000;
      const bestScore =
        best.avgAccuracy * 0.4 +
        1 / best.avgExecutionTime * 0.3 +
        (1 / best.avgMemoryUsage) * 3000;
      return currentScore > bestScore ? current : best;
    }, data[0]);

    insights.push({
      type: "overall",
      text: `${bestOverall.algorithm} demonstrated the best overall balance of accuracy, speed, and efficiency`,
    });

    return insights;
  };

  const summary = getPerformanceSummary();
  if (!summary) return null;
  const insights = getPerformanceInsights(summary);

  const typeStyles = {
    accuracy: "border-green-500 text-green-700 dark:text-green-300",
    speed: "border-purple-500 text-purple-700 dark:text-purple-300",
    memory: "border-pink-500 text-pink-700 dark:text-pink-300",
    overall: "border-yellow-500 text-yellow-700 dark:text-yellow-300",
  };

  const typeIcons = {
    accuracy: <CheckCircle className="w-5 h-5" />,
    speed: <Zap className="w-5 h-5" />,
    memory: <Cpu className="w-5 h-5" />,
    overall: <Trophy className="w-5 h-5" />,
  };

  // Performance cards with explicit Tailwind classes
  const performanceCards = [
    {
      title: "Fastest Execution Time",
      algo: summary.fastestAlgorithms[0].algorithm,
      value: `${summary.fastestAlgorithms[0].avgExecutionTime.toFixed(3)}s`,
      bgClass: "bg-purple-100 dark:bg-purple-900/30",
      glowClass: "bg-purple-400/30",
      textClass: "text-purple-700 dark:text-purple-300",
    },
    {
      title: "Lowest Memory Usage",
      algo: summary.mostEfficientAlgorithms[0].algorithm,
      value: `${Math.round(summary.mostEfficientAlgorithms[0].avgMemoryUsage)} KB`,
      bgClass: "bg-pink-100 dark:bg-pink-900/30",
      glowClass: "bg-pink-400/30",
      textClass: "text-pink-700 dark:text-pink-300",
    },
    {
      title: "Highest Accuracy",
      algo: summary.bestAlgorithms[0].algorithm,
      value: `${(summary.bestAlgorithms[0].avgAccuracy * 100).toFixed(2)}%`,
      bgClass: "bg-yellow-100 dark:bg-yellow-900/30",
      glowClass: "bg-yellow-400/30",
      textClass: "text-yellow-700 dark:text-yellow-300",
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
            <p className="relative text-sm text-gray-700 dark:text-gray-300 mb-1">
              {card.title}
            </p>
            <p className={`relative text-2xl font-bold ${card.textClass}`}>
              {card.algo}
            </p>
            <p className="relative text-sm text-gray-600 dark:text-gray-300">
              {card.value}
            </p>
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
                className={`flex items-center gap-3 p-3 rounded-lg border-l-4 shadow-sm hover:shadow-md transition ${typeStyles[insight.type]}`}
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
                  Memory
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                  Runs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((algo, index) => {
                const isHighlighted =
                  summary.bestAlgorithms.includes(algo) ||
                  summary.fastestAlgorithms.includes(algo) ||
                  summary.mostEfficientAlgorithms.includes(algo);

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
                      {algo.algorithm}
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