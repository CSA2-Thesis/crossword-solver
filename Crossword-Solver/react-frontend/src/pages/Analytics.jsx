import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { FiArrowLeft, FiTrash2, FiDownload, FiCpu, FiFilter, FiX } from 'react-icons/fi';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, ScatterChart,
  Scatter, ZAxis, ComposedChart, Area
} from 'recharts';

// Initialize IndexedDB
const initDB = () => {
  console.log('🗄️ initDB called');
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CrosswordAnalyticsDB', 3);
    
    request.onerror = () => {
      console.error('❌ IndexedDB open error:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      console.log('✅ IndexedDB opened successfully');
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      console.log('🔄 IndexedDB upgrade needed');
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('analytics')) {
        console.log('📦 Creating analytics store');
        const store = db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('algorithm', 'algorithm', { unique: false });
        store.createIndex('size', 'size', { unique: false });
        store.createIndex('difficulty', 'difficulty', { unique: false });
        // Add a unique constraint to prevent exact duplicates
        store.createIndex('uniqueRun', ['algorithm', 'size', 'difficulty', 'executionTime', 'memoryUsage', 'cellAccuracy'], { unique: true });
      }
      
      if (!db.objectStoreNames.contains('DFS_analytics')) {
        console.log('📦 Creating DFS_analytics store');
        db.createObjectStore('DFS_analytics', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('ASTAR_analytics')) {
        console.log('📦 Creating ASTAR_analytics store');
        db.createObjectStore('ASTAR_analytics', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('HYBRID_analytics')) {
        console.log('📦 Creating HYBRID_analytics store');
        db.createObjectStore('HYBRID_analytics', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onblocked = () => {
      console.warn('⚠️ IndexedDB open request blocked');
    };
  });
};

// Store analytics data in IndexedDB with better duplicate prevention
const storeAnalyticsData = async (data, fixedTimestamp) => {
  try {
    console.log('🟡 storeAnalyticsData called with:', {
      method: data.solvedResult.method,
      size: data.originalPuzzle.stats.size,
      difficulty: data.originalPuzzle.stats.difficulty,
      executionTime: data.solvedResult.metrics.execution_time,
      memoryUsage: data.solvedResult.metrics.memory_usage_kb,
      fixedTimestamp
    });
    
    const db = await initDB();
    
    // Use the fixed timestamp to prevent duplicates
    const analyticsData = {
      timestamp: fixedTimestamp || new Date().toISOString(),
      algorithm: data.solvedResult.method,
      size: data.originalPuzzle.stats.size,
      difficulty: data.originalPuzzle.stats.difficulty,
      cellAccuracy: data.analysisData.accuracy,
      wordAccuracy: data.analysisData.wordAccuracy,
      executionTime: parseFloat(data.solvedResult.metrics.execution_time.replace('s', '')),
      memoryUsage: data.solvedResult.metrics.memory_usage_kb,
      wordsPlaced: data.solvedResult.metrics.words_placed,
      puzzleData: {
        grid: data.originalPuzzle.grid,
        emptyGrid: data.originalPuzzle.empty_grid,
        clues: data.originalPuzzle.clues
      }
    };
    
    console.log('🟢 Prepared analytics data:', {
      timestamp: analyticsData.timestamp,
      algorithm: analyticsData.algorithm,
      size: analyticsData.size,
      executionTime: analyticsData.executionTime,
      memoryUsage: analyticsData.memoryUsage
    });
    
    // Check for existing duplicate before storing
    const existingData = await getAllAnalyticsData();
    const isDuplicate = existingData.some(item => 
      item.algorithm === analyticsData.algorithm &&
      item.size === analyticsData.size &&
      item.difficulty === analyticsData.difficulty &&
      Math.abs(item.executionTime - analyticsData.executionTime) < 0.001 &&
      item.memoryUsage === analyticsData.memoryUsage &&
      Math.abs(item.cellAccuracy - analyticsData.cellAccuracy) < 0.001
    );
    
    if (isDuplicate) {
      console.log('🚫 Duplicate detected, skipping storage');
      return true; // Return true to indicate successful handling
    }
    
    // Store in main analytics store
    const transaction = db.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');
    
    console.log('🔵 Adding to main analytics store...');
    await store.add(analyticsData);
    console.log('✅ Added to main analytics store');
    
    // Store in algorithm-specific store
    let algoStoreName;
    switch(analyticsData.algorithm) {
      case 'A*':
        algoStoreName = 'ASTAR_analytics';
        break;
      case 'DFS':
        algoStoreName = 'DFS_analytics';
        break;
      case 'HYBRID':
        algoStoreName = 'HYBRID_analytics';
        break;
      default:
        algoStoreName = null;
    }
    
    if (algoStoreName && db.objectStoreNames.contains(algoStoreName)) {
      console.log(`🔵 Adding to ${algoStoreName} store...`);
      const algoTransaction = db.transaction([algoStoreName], 'readwrite');
      const algoStore = algoTransaction.objectStore(algoStoreName);
      await algoStore.add(analyticsData);
      console.log(`✅ Added to ${algoStoreName} store`);
    }
    
    console.log('🎉 storeAnalyticsData completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Error storing analytics data:', error);
    return false;
  }
};

// Retrieve all analytics data from IndexedDB
const getAllAnalyticsData = async () => {
  try {
    console.log('📂 getAllAnalyticsData called');
    const db = await initDB();
    const transaction = db.transaction(['analytics'], 'readonly');
    const store = transaction.objectStore('analytics');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        console.log('✅ getAllAnalyticsData retrieved', request.result.length, 'items');
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('❌ getAllAnalyticsData error:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ Error retrieving analytics data:', error);
    return [];
  }
};

// Retrieve algorithm-specific analytics data
const getAlgorithmAnalyticsData = async (algorithm) => {
  try {
    let algoStoreName;
    switch(algorithm) {
      case 'A*':
        algoStoreName = 'ASTAR_analytics';
        break;
      case 'DFS':
        algoStoreName = 'DFS_analytics';
        break;
      case 'HYBRID':
        algoStoreName = 'HYBRID_analytics';
        break;
      default:
        return [];
    }
    
    const db = await initDB();
    
    if (!db.objectStoreNames.contains(algoStoreName)) {
      return [];
    }
    
    const transaction = db.transaction([algoStoreName], 'readonly');
    const store = transaction.objectStore(algoStoreName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error(`Error retrieving ${algorithm} analytics data:`, error);
    return [];
  }
};

// Clear all analytics data from IndexedDB
const clearAnalyticsData = async () => {
  try {
    const db = await initDB();
    
    // Clear main analytics store
    const transaction = db.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');
    await store.clear();
    
    // Clear algorithm-specific stores
    const algorithms = ['DFS', 'A*', 'HYBRID'];
    for (const algorithm of algorithms) {
      let algoStoreName;
      switch(algorithm) {
        case 'A*':
          algoStoreName = 'ASTAR_analytics';
          break;
        case 'DFS':
          algoStoreName = 'DFS_analytics';
          break;
        case 'HYBRID':
          algoStoreName = 'HYBRID_analytics';
          break;
        default:
          continue;
      }
      
      if (db.objectStoreNames.contains(algoStoreName)) {
        const algoTransaction = db.transaction([algoStoreName], 'readwrite');
        const algoStore = algoTransaction.objectStore(algoStoreName);
        await algoStore.clear();
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing analytics data:', error);
    return false;
  }
};

// Export analytics data as JSON
const exportAnalyticsData = (data, filename) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `crossword-analytics-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Export algorithm-specific data
const exportAlgorithmData = async (algorithm) => {
  const data = await getAlgorithmAnalyticsData(algorithm);
  let filename;
  switch(algorithm) {
    case 'A*':
      filename = `crossword-astar-analytics.json`;
      break;
    case 'DFS':
      filename = `crossword-dfs-analytics.json`;
      break;
    case 'HYBRID':
      filename = `crossword-hybrid-analytics.json`;
      break;
    default:
      filename = `crossword-${algorithm}-analytics.json`;
  }
  exportAnalyticsData(data, filename);
};

const Analytics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('all');
  const [selectedSize, setSelectedSize] = useState('all');
  const [algorithmComparisonData, setAlgorithmComparisonData] = useState([]);
  const [sizeComparisonData, setSizeComparisonData] = useState([]);
  const [algorithmBySizeData, setAlgorithmBySizeData] = useState([]);
  const [algorithmDetails, setAlgorithmDetails] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Use ref to prevent duplicate storage and generate consistent timestamp
  const processedRef = useRef({
    hasProcessed: false,
    timestamp: null
  });

  useEffect(() => {
    console.log('📍 Analytics component mounted');
    
    // Initialize timestamp once when component mounts with data
    if (location.state?.analysisData && !processedRef.current.timestamp) {
      processedRef.current.timestamp = new Date().toISOString();
      console.log('🕒 Generated fixed timestamp:', processedRef.current.timestamp);
    }
    
    // Cleanup function
    return () => {
      console.log('🧹 Analytics component unmounting');
    };
  }, []);

  useEffect(() => {
    console.log('🔄 useEffect triggered', {
      hasLocationState: !!location.state,
      hasProcessed: processedRef.current.hasProcessed,
      analysisData: !!location.state?.analysisData,
      solvedResult: !!location.state?.solvedResult,
      originalPuzzle: !!location.state?.originalPuzzle
    });

    const loadData = async () => {
      console.log('📥 loadData function started');
      setIsLoading(true);
      
      // Check if we have new data to store and haven't processed it yet
      const hasDataToStore = location.state?.analysisData && 
                            location.state?.solvedResult && 
                            location.state?.originalPuzzle &&
                            !processedRef.current.hasProcessed;
      
      console.log('📊 Storage check:', {
        hasDataToStore,
        hasProcessed: processedRef.current.hasProcessed,
        hasAnalysisData: !!location.state?.analysisData,
        hasSolvedResult: !!location.state?.solvedResult,
        hasOriginalPuzzle: !!location.state?.originalPuzzle
      });
      
      if (hasDataToStore) {
        console.log('💾 Storing new analytics data...');
        // Store the new data with fixed timestamp
        const storageResult = await storeAnalyticsData(location.state, processedRef.current.timestamp);
        console.log('💾 Storage result:', storageResult);
        
        // Mark as processed to prevent future duplicates
        processedRef.current.hasProcessed = true;
        console.log('✅ processedRef.hasProcessed set to true');
      } else {
        console.log('⏭️ Skipping data storage:', {
          reason: processedRef.current.hasProcessed ? 'data already processed' : 'no data to store',
          hasProcessed: processedRef.current.hasProcessed,
          hasLocationState: !!location.state
        });
      }
      
      // Load all data for display
      console.log('📂 Loading data from IndexedDB...');
      const data = await getAllAnalyticsData();
      console.log('📊 Raw data from IndexedDB:', data.length, 'items');
      
      if (data.length > 0) {
        console.log('📋 First few items:', data.slice(0, 3).map(item => ({
          timestamp: item.timestamp,
          algorithm: item.algorithm,
          size: item.size,
          executionTime: item.executionTime
        })));
      }
      
      // Enhanced duplicate removal with better matching
      const uniqueData = removeDuplicates(data);
      console.log('🔍 After duplicate removal:', uniqueData.length, 'unique items');
      
      if (data.length !== uniqueData.length) {
        console.log('⚠️ Removed', data.length - uniqueData.length, 'duplicates');
      }
      
      setAnalyticsData(uniqueData);
      processData(uniqueData);
      setIsLoading(false);
      console.log('✅ loadData completed');
    };
    
    loadData().catch(error => {
      console.error('❌ Error in loadData:', error);
      setIsLoading(false);
    });
  }, [location.state]);

  // Enhanced duplicate removal function
  const removeDuplicates = (data) => {
    console.log('🔍 Starting duplicate removal with', data.length, 'items');
    const seen = new Set();
    const result = data.filter(item => {
      // Create a more robust key that's less sensitive to timestamp differences
      const key = `${item.algorithm}-${item.size}-${item.difficulty}-${item.executionTime.toFixed(4)}-${item.memoryUsage}-${item.cellAccuracy.toFixed(4)}-${item.wordAccuracy.toFixed(4)}`;
      
      if (seen.has(key)) {
        console.log('🚫 Removing duplicate:', {
          key,
          timestamp: item.timestamp,
          algorithm: item.algorithm,
          size: item.size,
          executionTime: item.executionTime
        });
        return false;
      }
      seen.add(key);
      return true;
    });
    
    console.log('✅ Duplicate removal complete. Final count:', result.length, 'items');
    return result;
  };

  const processData = (data) => {
    const algorithms = ['DFS', 'A*', 'HYBRID'];
    const algoComparison = [];
    const algoDetails = {};
    
    algorithms.forEach(algo => {
      const algoData = data.filter(item => item.algorithm === algo);
      if (algoData.length > 0) {
        const algoStats = {
          avgExecutionTime: algoData.reduce((sum, item) => sum + item.executionTime, 0) / algoData.length,
          avgMemoryUsage: algoData.reduce((sum, item) => sum + item.memoryUsage, 0) / algoData.length,
          avgAccuracy: algoData.reduce((sum, item) => sum + item.cellAccuracy, 0) / algoData.length,
          avgWordAccuracy: algoData.reduce((sum, item) => sum + item.wordAccuracy, 0) / algoData.length,
          count: algoData.length,
          sizes: [...new Set(algoData.map(item => item.size))],
          data: algoData
        };
        
        algoComparison.push({
          algorithm: algo,
          ...algoStats
        });
        
        algoDetails[algo] = algoStats;
      }
    });
    
    setAlgorithmComparisonData(algoComparison);
    setAlgorithmDetails(algoDetails);
    
    const sizes = [...new Set(data.map(item => item.size))].sort((a, b) => a - b);
    const sizeComparison = [];
    
    sizes.forEach(size => {
      const sizeData = data.filter(item => item.size === size);
      if (sizeData.length > 0) {
        sizeComparison.push({
          size,
          avgExecutionTime: sizeData.reduce((sum, item) => sum + item.executionTime, 0) / sizeData.length,
          avgMemoryUsage: sizeData.reduce((sum, item) => sum + item.memoryUsage, 0) / sizeData.length,
          avgAccuracy: sizeData.reduce((sum, item) => sum + item.cellAccuracy, 0) / sizeData.length,
          count: sizeData.length
        });
      }
    });
    
    setSizeComparisonData(sizeComparison);
    
    const algoBySize = [];
    
    algorithms.forEach(algorithm => {
      sizes.forEach(size => {
        const algoSizeData = data.filter(item => 
          item.algorithm === algorithm && item.size === size
        );
        
        if (algoSizeData.length > 0) {
          algoBySize.push({
            algorithm,
            size,
            avgExecutionTime: algoSizeData.reduce((sum, item) => sum + item.executionTime, 0) / algoSizeData.length,
            avgMemoryUsage: algoSizeData.reduce((sum, item) => sum + item.memoryUsage, 0) / algoSizeData.length,
            avgAccuracy: algoSizeData.reduce((sum, item) => sum + item.cellAccuracy, 0) / algoSizeData.length,
            count: algoSizeData.length
          });
        }
      });
    });
    
    setAlgorithmBySizeData(algoBySize);
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all analytics data? This action cannot be undone.')) {
      const success = await clearAnalyticsData();
      if (success) {
        setAnalyticsData([]);
        setAlgorithmComparisonData([]);
        setSizeComparisonData([]);
        setAlgorithmBySizeData([]);
        setAlgorithmDetails({});
        // Reset the processed flag so new data can be stored
        processedRef.current.hasProcessed = false;
        processedRef.current.timestamp = null;
      }
    }
  };

  const handleExportAllData = () => {
    exportAnalyticsData(analyticsData);
  };

  const handleExportAlgorithmData = (algorithm) => {
    exportAlgorithmData(algorithm);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const filteredData = analyticsData.filter(item => {
    const algorithmFilter = selectedAlgorithm === 'all' || item.algorithm === selectedAlgorithm;
    const sizeFilter = selectedSize === 'all' || item.size === parseInt(selectedSize);
    return algorithmFilter && sizeFilter;
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const algorithmColors = {
    'DFS': '#0088FE',
    'A*': '#00C49F',
    'HYBRID': '#FF8042'
  };

  const formatMemory = (kb) => {
    return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
  };

  // Custom tooltip component for scatter plot
  const ScatterTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{`Algorithm: ${data.algorithm}`}</p>
          <p className="text-blue-600 dark:text-blue-400">{`Execution Time: ${data.avgExecutionTime.toFixed(3)}s`}</p>
          <p className="text-green-600 dark:text-green-400">{`Memory Usage: ${formatMemory(data.avgMemoryUsage)}`}</p>
          <p className="text-orange-600 dark:text-orange-400">{`Accuracy: ${(data.avgAccuracy * 100).toFixed(2)}%`}</p>
          <p className="text-gray-600 dark:text-gray-400">{`Runs: ${data.count}`}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Button
            onClick={handleBack}
            variant="secondary"
            icon={<FiArrowLeft size={18} />}
          >
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Analytics</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="secondary"
              icon={<FiFilter size={18} />}
            >
              Filters
            </Button>
            <Button
              onClick={handleExportAllData}
              variant="secondary"
              icon={<FiDownload size={18} />}
              disabled={analyticsData.length === 0}
            >
              Export All
            </Button>
            <Button
              onClick={handleClearData}
              variant="secondary"
              icon={<FiTrash2 size={18} />}
              disabled={analyticsData.length === 0}
            >
              Clear Data
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Data</h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                <FiX size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Algorithm</label>
                <select
                  value={selectedAlgorithm}
                  onChange={(e) => setSelectedAlgorithm(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Algorithms</option>
                  <option value="DFS">DFS</option>
                  <option value="A*">A*</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Puzzle Size</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Sizes</option>
                  {[...new Set(analyticsData.map(item => item.size))].sort((a, b) => a - b).map(size => (
                    <option key={size} value={size}>{size}x{size}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {analyticsData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <FiCpu className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No Analytics Data Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Solve some crossword puzzles to see performance analytics here.
            </p>
            <Button onClick={() => navigate('/generate')}>Generate a Puzzle</Button>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredData.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Filtered Runs</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {filteredData.length > 0 ? (filteredData.reduce((sum, item) => sum + item.cellAccuracy, 0) / filteredData.length * 100).toFixed(2) : 0}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Avg. Accuracy</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {filteredData.length > 0 ? (filteredData.reduce((sum, item) => sum + item.executionTime, 0) / filteredData.length).toFixed(3) : 0}s
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Avg. Execution Time</p>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {filteredData.length > 0 ? (filteredData.reduce((sum, item) => sum + item.memoryUsage, 0) / filteredData.length / 1024).toFixed(2) : 0} MB
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Avg. Memory Usage</p>
                </div>
              </div>
            </div>

            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8">
                {['overview', 'algorithms', 'sizes', 'history'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Algorithm Distribution</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={algorithmComparisonData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="algorithm"
                          label={({ algorithm, count }) => `${algorithm}: ${count}`}
                        >
                          {algorithmComparisonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={algorithmColors[entry.algorithm] || COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} runs`, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance by Puzzle Size</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={sizeComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="size" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value, name) => {
                          if (name === 'avgExecutionTime') return [value.toFixed(3) + 's', 'Execution Time'];
                          if (name === 'avgMemoryUsage') return [formatMemory(value), 'Memory Usage'];
                          if (name === 'avgAccuracy') return [(value * 100).toFixed(2) + '%', 'Accuracy'];
                          return [value, name];
                        }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="avgExecutionTime" fill="#8884d8" name="Execution Time (s)" />
                        <Area yAxisId="right" type="monotone" dataKey="avgAccuracy" fill="#ffc658" stroke="#ffc658" name="Accuracy (%)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Algorithm Performance Comparison</h3>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={algorithmComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="algorithm" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value, name) => {
                          if (name === 'avgExecutionTime') return [value.toFixed(3) + 's', 'Execution Time'];
                          if (name === 'avgMemoryUsage') return [formatMemory(value), 'Memory Usage'];
                          if (name === 'avgAccuracy') return [(value * 100).toFixed(2) + '%', 'Accuracy'];
                          return [value, name];
                        }} />
                        <Legend />
                        {/* <Bar yAxisId="left" dataKey="avgExecutionTime" fill="#8884d8" name="Execution Time (s)" /> */}
                        <Bar yAxisId="left" dataKey="avgMemoryUsage" fill="#82ca9d" name="Memory Usage" />
                        <Bar yAxisId="right" dataKey="avgAccuracy" fill="#ffc658" name="Accuracy (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'algorithms' && (
              <div className="space-y-8 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Algorithm Scatter Plot Comparison</h3>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number"
                          dataKey="avgExecutionTime" 
                          name="Execution Time"
                          unit="s"
                          label={{ value: 'Execution Time (s)', position: 'insideBottom', offset: -10 }}
                          tickFormatter={(value) => value.toFixed(3)}
                        />
                        <YAxis 
                          type="number"
                          dataKey="avgMemoryUsage" 
                          name="Memory Usage"
                          label={{ value: 'Memory Usage (KB)', angle: -90, position: 'insideLeft' }}
                          tickFormatter={(value) => formatMemory(value)}
                        />
                        <ZAxis 
                          type="number"
                          dataKey="avgAccuracy" 
                          range={[100, 400]}
                          name="Accuracy"
                        />
                        <Tooltip content={<ScatterTooltip />} />
                        <Legend className="pt-10"/>
                        {algorithmComparisonData.filter(d => d.algorithm === 'DFS').length > 0 && (
                          <Scatter 
                            name="DFS" 
                            data={algorithmComparisonData.filter(d => d.algorithm === 'DFS')} 
                            fill="#0088FE" 
                          />
                        )}
                        {algorithmComparisonData.filter(d => d.algorithm === 'A*').length > 0 && (
                          <Scatter 
                            name="A*" 
                            data={algorithmComparisonData.filter(d => d.algorithm === 'A*')} 
                            fill="#00C49F" 
                          />
                        )}
                        {algorithmComparisonData.filter(d => d.algorithm === 'HYBRID').length > 0 && (
                          <Scatter 
                            name="Hybrid" 
                            data={algorithmComparisonData.filter(d => d.algorithm === 'HYBRID')} 
                            fill="#FF8042" 
                          />
                        )}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Bubble size represents Accuracy. Larger bubbles indicate higher accuracy.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  {algorithmComparisonData.map((algo) => (
    <div key={algo.algorithm} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{algo.algorithm} Algorithm</h4>
        <Button
          onClick={() => handleExportAlgorithmData(algo.algorithm)}
          variant="secondary"
          size="sm"
          icon={<FiDownload size={14} />}
        >
          Export
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Runs</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{algo.count}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Execution Time</p>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{algo.avgExecutionTime.toFixed(3)}s</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Memory Usage</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatMemory(algo.avgMemoryUsage)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Accuracy</p>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{(algo.avgAccuracy * 100).toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Word Accuracy</p>
          <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{(algo.avgWordAccuracy * 100).toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Puzzle Sizes</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {/* FIXED: Create a new array before sorting */}
            {[...algo.sizes].sort((a, b) => a - b).join(', ')}
          </p>
        </div>
      </div>
    </div>
  ))}
</div>
              </div>
            )}

            {activeTab === 'sizes' && (
              <div className="space-y-8 mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance by Puzzle Size</h3>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={sizeComparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="size" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value, name) => {
                          if (name === 'avgExecutionTime') return [value.toFixed(3) + 's', 'Execution Time'];
                          if (name === 'avgMemoryUsage') return [formatMemory(value), 'Memory Usage'];
                          if (name === 'avgAccuracy') return [(value * 100).toFixed(2) + '%', 'Accuracy'];
                          return [value, name];
                        }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="avgExecutionTime" fill="#8884d8" name="Execution Time (s)" />
                        <Line yAxisId="left" type="monotone" dataKey="avgMemoryUsage" stroke="#82ca9d" name="Memory Usage" />
                        <Area yAxisId="right" type="monotone" dataKey="avgAccuracy" fill="#ffc658" stroke="#ffc658" name="Accuracy (%)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Algorithm Performance by Size</h3>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={algorithmBySizeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="size" />
                        <YAxis />
                        <Tooltip formatter={(value, name, props) => {
                          if (name === 'avgExecutionTime') return [value.toFixed(3) + 's', `${props.payload.algorithm} - Execution Time`];
                          if (name === 'avgMemoryUsage') return [formatMemory(value), `${props.payload.algorithm} - Memory Usage`];
                          if (name === 'avgAccuracy') return [(value * 100).toFixed(2) + '%', `${props.payload.algorithm} - Accuracy`];
                          return [value, name];
                        }} />
                        <Legend />
                        <Bar dataKey="avgExecutionTime" fill="#8884d8" name="Execution Time (s)">
                          {algorithmBySizeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={algorithmColors[entry.algorithm] || COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {sizeComparisonData.map((sizeData) => (
                    <div key={sizeData.size} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{sizeData.size}x{sizeData.size} Puzzles</h4>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Runs</p>
                          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{sizeData.count}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Execution Time</p>
                          <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{sizeData.avgExecutionTime.toFixed(3)}s</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Memory Usage</p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatMemory(sizeData.avgMemoryUsage)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Accuracy</p>
                          <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{(sizeData.avgAccuracy * 100).toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Solution History</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{filteredData.length} records</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Algorithm</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Difficulty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Execution Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Memory Usage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Accuracy</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Word Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredData.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {item.algorithm}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.size}x{item.size}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 capitalize">
                            {item.difficulty}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {item.executionTime.toFixed(3)}s
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {formatMemory(item.memoryUsage)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {(item.cellAccuracy * 100).toFixed(2)}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {(item.wordAccuracy * 100).toFixed(2)}%
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