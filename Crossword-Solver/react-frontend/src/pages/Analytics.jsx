import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, 
  PieChart, Pie, Cell 
} from 'recharts';
import Button from '../components/Button';
import { FiArrowLeft, FiBarChart2 } from 'react-icons/fi';

const Analytics = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { analysisData, originalPuzzle, solvedResult } = location.state || {};
  
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!analysisData || !originalPuzzle || !solvedResult) {
      console.error("Missing data for analytics:", { analysisData, originalPuzzle, solvedResult });
      setHasError(true);
    }
  }, [analysisData, originalPuzzle, solvedResult]);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <FiBarChart2 className="w-16 h-16 text-red-500 mx-auto" />
          <h3 className="text-xl font-semibold text-red-600">Analytics Data Not Found</h3>
          <p className="text-gray-500">Please solve a puzzle first to view analytics.</p>
          <Button onClick={() => navigate(-1)} variant="secondary" className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const executionTimeData = [
    {
      name: solvedResult.method || 'Unknown',
      "Execution Time (ms)": parseFloat(solvedResult.metrics?.execution_time) || 0,
    }
  ];

  const accuracyData = [
    {
      name: "Accuracy",
      "Cell Accuracy": Math.round((analysisData.accuracy || 0) * 100),
      "Word Accuracy": Math.round((analysisData.wordAccuracy || 0) * 100),
    }
  ];

  const compositionData = [
    { name: 'Correct Cells', value: analysisData.correctCells || 0 },
    { name: 'Incorrect Cells', value: (analysisData.totalCells || 0) - (analysisData.correctCells || 0) },
  ];
  const COLORS = ['#10B981', '#EF4444'];

  const puzzleDetails = [
    { name: 'Grid Size', value: `${originalPuzzle.grid?.length || 0}x${originalPuzzle.grid?.[0]?.length || 0}` },
    { name: 'Total Words', value: analysisData.totalWords || 0 },
    { name: 'Total Cells', value: analysisData.totalCells || 0 },
    { name: 'Memory Usage', value: solvedResult.metrics?.memory_usage || 'N/A' }, 
  ];


  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Solver Analytics</h1>
            <p className="text-gray-600">Performance metrics for the {solvedResult.method} algorithm</p>
          </div>
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            icon={<FiArrowLeft size={18} />}
          >
            Back to Solution
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
            <h3 className="text-sm font-medium text-gray-500">Execution Time</h3>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {solvedResult.metrics?.execution_time || 'N/A'} ms
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
            <h3 className="text-sm font-medium text-gray-500">Cell Accuracy</h3>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {Math.round((analysisData.accuracy || 0) * 100)}%
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
            <h3 className="text-sm font-medium text-gray-500">Word Accuracy</h3>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {Math.round((analysisData.wordAccuracy || 0) * 100)}%
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
            <h3 className="text-sm font-medium text-gray-500">Algorithm</h3>
            <p className="text-xl font-semibold text-orange-600 mt-1">
              {solvedResult.method || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="space-y-12">

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Execution Time</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={executionTimeData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`${value} ms`, 'Execution Time']} />
                  <Legend />
                  <Bar dataKey="Execution Time (ms)" fill="#3B82F6" name="Execution Time (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Accuracy Metrics</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={accuracyData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Accuracy']} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Cell Accuracy" 
                    stroke="#10B981" 
                    activeDot={{ r: 8 }} 
                    name="Cell Accuracy (%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Word Accuracy" 
                    stroke="#8B5CF6" 
                    name="Word Accuracy (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Cell Composition</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={compositionData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {compositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Cells']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Puzzle Details</h2>
              <div className="space-y-4">
                {puzzleDetails.map((detail, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">{detail.name}</span>
                    <span className="font-medium text-gray-900">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Analytics;