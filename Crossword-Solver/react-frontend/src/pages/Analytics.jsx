import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { AnalysisReport } from "../components/AnalysisReport";
import Visualizer from "../components/Visualizer";
import {
  initDB,
  storeAnalyticsData,
  getAllAnalyticsData,
  clearAnalyticsData,
  removeDuplicates,
} from "../utils/DataStorage";
import {
  FiArrowLeft,
  FiTrash2,
  FiDownload,
  FiCpu,
  FiFilter,
  FiX,
} from "react-icons/fi";

const Analytics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("all");
  const [selectedSize, setSelectedSize] = useState("all");
  const [algorithmComparisonData, setAlgorithmComparisonData] = useState([]);
  const [sizeComparisonData, setSizeComparisonData] = useState([]);
  const [algorithmBySizeData, setAlgorithmBySizeData] = useState([]);
  const [algorithmDetails, setAlgorithmDetails] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const processedRef = useRef({
    hasProcessed: false,
    timestamp: null,
  });

  useEffect(() => {
    if (location.state?.analysisData && !processedRef.current.timestamp) {
      processedRef.current.timestamp = new Date().toISOString();
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const hasDataToStore =
        location.state?.analysisData &&
        location.state?.solvedResult &&
        location.state?.originalPuzzle &&
        !processedRef.current.hasProcessed;

      if (hasDataToStore) {
        await storeAnalyticsData(
          location.state,
          processedRef.current.timestamp
        );
        processedRef.current.hasProcessed = true;
      }

      const data = await getAllAnalyticsData();
      const uniqueData = removeDuplicates(data);

      setAnalyticsData(uniqueData);
      processData(uniqueData);
      setIsLoading(false);
    };

    loadData().catch((error) => {
      console.error("Error loading data:", error);
      setIsLoading(false);
    });
  }, [location.state]);

  const processData = (data) => {
    const algorithms = ["DFS", "A*", "HYBRID"];
    const algoComparison = [];
    const algoDetails = {};

    algorithms.forEach((algo) => {
      const algoData = data.filter((item) => item.algorithm === algo);
      if (algoData.length > 0) {
        const algoStats = {
          avgExecutionTime:
            algoData.reduce((sum, item) => sum + item.executionTime, 0) /
            algoData.length,
          avgMemoryUsage:
            algoData.reduce((sum, item) => sum + item.memoryUsage, 0) /
            algoData.length,
          avgAccuracy:
            algoData.reduce((sum, item) => sum + item.cellAccuracy, 0) /
            algoData.length,
          avgWordAccuracy:
            algoData.reduce((sum, item) => sum + item.wordAccuracy, 0) /
            algoData.length,
          count: algoData.length,
          sizes: [...new Set(algoData.map((item) => item.size))],
          data: algoData,
        };

        algoComparison.push({ algorithm: algo, ...algoStats });
        algoDetails[algo] = algoStats;
      }
    });

    setAlgorithmComparisonData(algoComparison);
    setAlgorithmDetails(algoDetails);

    const sizes = [...new Set(data.map((item) => item.size))].sort(
      (a, b) => a - b
    );
    const sizeComparison = sizes.map((size) => {
      const sizeData = data.filter((item) => item.size === size);
      return {
        size,
        avgExecutionTime:
          sizeData.reduce((sum, item) => sum + item.executionTime, 0) /
          sizeData.length,
        avgMemoryUsage:
          sizeData.reduce((sum, item) => sum + item.memoryUsage, 0) /
          sizeData.length,
        avgAccuracy:
          sizeData.reduce((sum, item) => sum + item.cellAccuracy, 0) /
          sizeData.length,
        count: sizeData.length,
      };
    });

    setSizeComparisonData(sizeComparison);

    const algoBySize = [];
    algorithms.forEach((algorithm) => {
      sizes.forEach((size) => {
        const algoSizeData = data.filter(
          (item) => item.algorithm === algorithm && item.size === size
        );
        if (algoSizeData.length > 0) {
          algoBySize.push({
            algorithm,
            size,
            avgExecutionTime:
              algoSizeData.reduce((sum, item) => sum + item.executionTime, 0) /
              algoSizeData.length,
            avgMemoryUsage:
              algoSizeData.reduce((sum, item) => sum + item.memoryUsage, 0) /
              algoSizeData.length,
            avgAccuracy:
              algoSizeData.reduce((sum, item) => sum + item.cellAccuracy, 0) /
              algoSizeData.length,
            count: algoSizeData.length,
          });
        }
      });
    });

    setAlgorithmBySizeData(algoBySize);
  };

  const handleClearData = async () => {
    if (window.confirm("Are you sure you want to clear all analytics data?")) {
      const success = await clearAnalyticsData();
      if (success) {
        setAnalyticsData([]);
        setAlgorithmComparisonData([]);
        setSizeComparisonData([]);
        setAlgorithmBySizeData([]);
        setAlgorithmDetails({});
        processedRef.current.hasProcessed = false;
        processedRef.current.timestamp = null;
      }
    }
  };

  const handleExportAllData = () => {
    const jsonString = JSON.stringify(analyticsData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `crossword-analytics-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBack = () => navigate(-1);

  const filteredData = analyticsData.filter((item) => {
    const algorithmFilter =
      selectedAlgorithm === "all" || item.algorithm === selectedAlgorithm;
    const sizeFilter =
      selectedSize === "all" || item.size === parseInt(selectedSize);
    return algorithmFilter && sizeFilter;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-300">
            Loading analytics data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* Mobile-Optimized Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 sm:gap-0">
          <Button
            onClick={handleBack}
            variant="secondary"
            icon={<FiArrowLeft size={16} className="sm:w-5 sm:h-5" />}
            className="text-sm sm:text-base"
          >
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white text-center sm:text-left">
            Performance Analytics
          </h1>
          <div className="flex gap-2 flex-wrap justify-center">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="secondary"
              icon={<FiFilter size={16} className="sm:w-5 sm:h-5" />}
              className="text-sm sm:text-base"
            >
              Filters
            </Button>
            <Button
              onClick={handleExportAllData}
              variant="secondary"
              icon={<FiDownload size={16} className="sm:w-5 sm:h-5" />}
              disabled={analyticsData.length === 0}
              className="text-sm sm:text-base"
            >
              Export
            </Button>
            <Button
              onClick={handleClearData}
              variant="secondary"
              icon={<FiTrash2 size={16} className="sm:w-5 sm:h-5" />}
              disabled={analyticsData.length === 0}
              className="text-sm sm:text-base"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Mobile-Optimized Filter Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Filter Data
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <FiX size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Algorithm
                </label>
                <select
                  value={selectedAlgorithm}
                  onChange={(e) => setSelectedAlgorithm(e.target.value)}
                  className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                >
                  <option value="all">All Algorithms</option>
                  <option value="DFS">DFS</option>
                  <option value="A*">A*</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  Puzzle Size
                </label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full p-2 sm:p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
                >
                  <option value="all">All Sizes</option>
                  {[...new Set(analyticsData.map((item) => item.size))]
                    .sort((a, b) => a - b)
                    .map((size) => (
                      <option key={size} value={size}>
                        {size}x{size}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Mobile-Optimized Empty State */}
        {analyticsData.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <FiCpu className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
              No Analytics Data Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">
              Solve some crossword puzzles to see performance analytics here.
            </p>
            <Button onClick={() => navigate("/generate")} className="text-sm sm:text-base">
              Generate a Puzzle
            </Button>
          </div>
        ) : (
          <>
            <AnalysisReport
              data={algorithmComparisonData}
              filteredData={filteredData}
            />

            {/* Mobile-Optimized Tab Navigation */}
            <div className="mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto">
                {["overview", "algorithms", "sizes", "history"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-2 sm:px-4 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${
                      activeTab === tab
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Mobile-Optimized Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-6 sm:space-y-8 mb-6 sm:mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Algorithm Distribution
                    </h3>
                    <div className="h-64 sm:h-80">
                      <Visualizer.AlgorithmDistributionChart
                        data={algorithmComparisonData}
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                      Performance by Puzzle Size
                    </h3>
                    <div className="h-64 sm:h-80">
                      <Visualizer.PerformanceBySizeChart
                        data={sizeComparisonData}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Algorithm Performance Comparison
                  </h3>
                  <div className="h-72 sm:h-96">
                    <Visualizer.AlgorithmComparisonChart
                      data={algorithmComparisonData}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "algorithms" && (
              <div className="space-y-6 sm:space-y-8 mb-6 sm:mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Algorithm Performance Scatter Plots
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                    <div>
                      <h4 className="text-sm sm:text-md font-medium text-gray-900 dark:text-white mb-2 text-center">
                        Accuracy vs Memory
                      </h4>
                      <div className="h-80 sm:h-100">
                        <Visualizer.MemoryAccuracyScatter data={filteredData} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-md font-medium text-gray-900 dark:text-white mb-2 text-center">
                        Memory vs Time
                      </h4>
                      <div className="h-80 sm:h-100">
                        <Visualizer.MemoryTimeScatter data={filteredData} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-md font-medium text-gray-900 dark:text-white mb-2 text-center">
                        Time vs Accuracy
                      </h4>
                      <div className="h-80 sm:h-100">
                        <Visualizer.TimeAccuracyScatter data={filteredData} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {algorithmComparisonData.map((algo) => (
                    <div
                      key={algo.algorithm}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6"
                    >
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                        {algo.algorithm} Algorithm
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Runs</p>
                          <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                            {algo.count}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Execution Time</p>
                          <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                            {algo.avgExecutionTime.toFixed(3)}s
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Memory Usage</p>
                          <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                            {Visualizer.formatMemory(algo.avgMemoryUsage)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Accuracy</p>
                          <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">
                            {(algo.avgAccuracy * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Word Accuracy</p>
                          <p className="text-lg sm:text-xl font-bold text-cyan-600 dark:text-cyan-400">
                            {(algo.avgWordAccuracy * 100).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Puzzle Sizes</p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {[...algo.sizes].sort((a, b) => a - b).join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "sizes" && (
              <div className="space-y-6 sm:space-y-8 mb-6 sm:mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Performance by Puzzle Size
                  </h3>
                  <div className="h-72 sm:h-96">
                    <Visualizer.PerformanceBySizeChart
                      data={sizeComparisonData}
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Algorithm Performance by Size
                  </h3>
                  <div className="h-72 sm:h-96">
                    <Visualizer.AlgorithmBySizeChart
                      data={algorithmBySizeData}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {sizeComparisonData.map((sizeData) => (
                    <div
                      key={sizeData.size}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6"
                    >
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                        {sizeData.size}x{sizeData.size} Puzzles
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Runs</p>
                          <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                            {sizeData.count}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Execution Time</p>
                          <p className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                            {sizeData.avgExecutionTime.toFixed(3)}s
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Memory Usage</p>
                          <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                            {Visualizer.formatMemory(sizeData.avgMemoryUsage)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Accuracy</p>
                          <p className="text-lg sm:text-xl font-bold text-orange-600 dark:text-orange-400">
                            {(sizeData.avgAccuracy * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "history" && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-5 lg:p-6 mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    Solution History
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredData.length} records
                  </p>
                </div>
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Algorithm
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Memory
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Accuracy
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            {item.algorithm}
                          </td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                            {item.size}x{item.size}
                          </td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                            {item.executionTime.toFixed(3)}s
                          </td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                            {Visualizer.formatMemory(item.memoryUsage)}
                          </td>
                          <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-300">
                            {(item.cellAccuracy * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;