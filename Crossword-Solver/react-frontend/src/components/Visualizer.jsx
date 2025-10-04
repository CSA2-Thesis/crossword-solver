import React from 'react';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, ScatterChart,
  Scatter, ZAxis, ComposedChart, Area
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const algorithmColors = {
  'DFS': '#0088FE',
  'A*': '#00C49F',
  'HYBRID': '#FF8042'
};

export const formatMemory = (kb) => {
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
};

export const ScatterTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">{`Algorithm: ${data.algorithm}`}</p>
        <p className="text-blue-600 dark:text-blue-400">{`Execution Time: ${data.executionTime.toFixed(3)}s`}</p>
        <p className="text-green-600 dark:text-green-400">{`Memory Usage: ${data.memoryUsage}`}</p>
        <p className="text-orange-600 dark:text-orange-400">{`Accuracy: ${(data.cellAccuracy * 100).toFixed(2)}%`}</p>
        <p className="text-gray-600 dark:text-gray-400">{`Size: ${data.size}x${data.size}`}</p>
        <p className="text-gray-600 dark:text-gray-400">{`Difficulty: ${data.difficulty}`}</p>
      </div>
    );
  }
  return null;
};

export const MemoryAccuracyScatter = ({ data }) => (
  <ResponsiveContainer width="100%" height={400}>
    <ScatterChart margin={{ top: 20, right: 20, bottom: 80, left: 60 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <YAxis 
        type="number"
        dataKey="memoryUsage" 
        name="Memory Usage"
        label={{ value: 'Memory Usage', position: 'insideBottom', offset: -10 }}
        tickFormatter={(value) => formatMemory(value)}
      />
      <XAxis 
        type="number"
        dataKey="cellAccuracy" 
        name="Accuracy"
        label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }}
        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
        domain={[0.95, 1.0]}
      />
      <Tooltip content={<ScatterTooltip />} />
      <Legend 
        verticalAlign="bottom" 
        height={36}
        wrapperStyle={{ paddingTop: '20px' }}
      />
      {data.filter(d => d.algorithm === 'DFS').length > 0 && (
        <Scatter 
          name="DFS" 
          data={data.filter(d => d.algorithm === 'DFS')} 
          fill="#0088FE" 
        />
      )}
      {data.filter(d => d.algorithm === 'A*').length > 0 && (
        <Scatter 
          name="A*" 
          data={data.filter(d => d.algorithm === 'A*')} 
          fill="#00C49F" 
        />
      )}
      {data.filter(d => d.algorithm === 'HYBRID').length > 0 && (
        <Scatter 
          name="Hybrid" 
          data={data.filter(d => d.algorithm === 'HYBRID')} 
          fill="#FF8042" 
        />
      )}
    </ScatterChart>
  </ResponsiveContainer>
);

export const MemoryTimeScatter = ({ data }) => (
  <ResponsiveContainer width="100%" height={400}>
    <ScatterChart margin={{ top: 20, right: 20, bottom: 80, left: 60 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis 
        type="number"
        dataKey="memoryUsage" 
        name="Memory Usage"
        label={{ value: 'Memory Usage', position: 'insideBottom', offset: -10 }}
        tickFormatter={(value) => formatMemory(value)}
      />
      <YAxis 
        type="number"
        dataKey="executionTime" 
        name="Execution Time"
        label={{ value: 'Execution Time (s)', angle: -90, position: 'insideLeft' }}
        tickFormatter={(value) => value.toFixed(2)}
      />
      <Tooltip content={<ScatterTooltip />} />
      <Legend 
        verticalAlign="bottom" 
        height={36}
        wrapperStyle={{ paddingTop: '20px' }}
      />
      {data.filter(d => d.algorithm === 'DFS').length > 0 && (
        <Scatter 
          name="DFS" 
          data={data.filter(d => d.algorithm === 'DFS')} 
          fill="#0088FE" 
        />
      )}
      {data.filter(d => d.algorithm === 'A*').length > 0 && (
        <Scatter 
          name="A*" 
          data={data.filter(d => d.algorithm === 'A*')} 
          fill="#00C49F" 
        />
      )}
      {data.filter(d => d.algorithm === 'HYBRID').length > 0 && (
        <Scatter 
          name="Hybrid" 
          data={data.filter(d => d.algorithm === 'HYBRID')} 
          fill="#FF8042" 
        />
      )}
    </ScatterChart>
  </ResponsiveContainer>
);

export const TimeAccuracyScatter = ({ data }) => (
  <ResponsiveContainer width="100%" height={400}>
    <ScatterChart margin={{ top: 20, right: 20, bottom: 80, left: 60 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <YAxis 
        type="number"
        dataKey="executionTime" 
        name="Execution Time"
        label={{ value: 'Execution Time (s)', position: 'insideBottom', offset: -10 }}
        tickFormatter={(value) => value.toFixed(2)}
      />
      <XAxis 
        type="number"
        dataKey="cellAccuracy" 
        name="Accuracy"
        label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }}
        tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
        domain={[0.95, 1.0]}
      />
      <Tooltip content={<ScatterTooltip />} />
      <Legend 
        verticalAlign="bottom" 
        height={36}
        wrapperStyle={{ paddingTop: '20px' }}
      />
      {data.filter(d => d.algorithm === 'DFS').length > 0 && (
        <Scatter 
          name="DFS" 
          data={data.filter(d => d.algorithm === 'DFS')} 
          fill="#0088FE" 
        />
      )}
      {data.filter(d => d.algorithm === 'A*').length > 0 && (
        <Scatter 
          name="A*" 
          data={data.filter(d => d.algorithm === 'A*')} 
          fill="#00C49F" 
        />
      )}
      {data.filter(d => d.algorithm === 'HYBRID').length > 0 && (
        <Scatter 
          name="Hybrid" 
          data={data.filter(d => d.algorithm === 'HYBRID')} 
          fill="#FF8042" 
        />
      )}
    </ScatterChart>
  </ResponsiveContainer>
);

export const AlgorithmDistributionChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        outerRadius={80}
        fill="#8884d8"
        dataKey="count"
        nameKey="algorithm"
        label={({ algorithm, count }) => `${algorithm}: ${count}`}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={algorithmColors[entry.algorithm] || COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value, name) => [`${value} runs`, name]} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

export const PerformanceBySizeChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="size" />
      <YAxis yAxisId="left" />
      <YAxis yAxisId="right" orientation="right" domain={[0.8, 1.0]} />
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
);

export const AlgorithmComparisonChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
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
      <Bar yAxisId="left" dataKey="avgMemoryUsage" fill="#82ca9d" name="Memory Usage" />
      <Bar yAxisId="right" dataKey="avgAccuracy" fill="#ffc658" name="Accuracy (%)" />
    </BarChart>
  </ResponsiveContainer>
);

export const ScatterPlotComparison = ({ data }) => (
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
      {data.filter(d => d.algorithm === 'DFS').length > 0 && (
        <Scatter 
          name="DFS" 
          data={data.filter(d => d.algorithm === 'DFS')} 
          fill="#0088FE" 
        />
      )}
      {data.filter(d => d.algorithm === 'A*').length > 0 && (
        <Scatter 
          name="A*" 
          data={data.filter(d => d.algorithm === 'A*')} 
          fill="#00C49F" 
        />
      )}
      {data.filter(d => d.algorithm === 'HYBRID').length > 0 && (
        <Scatter 
          name="Hybrid" 
          data={data.filter(d => d.algorithm === 'HYBRID')} 
          fill="#FF8042" 
        />
      )}
    </ScatterChart>
  </ResponsiveContainer>
);

export const AlgorithmBySizeChart = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
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
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={algorithmColors[entry.algorithm] || COLORS[index % COLORS.length]} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export default {
  AlgorithmDistributionChart,
  PerformanceBySizeChart,
  AlgorithmComparisonChart,
  MemoryAccuracyScatter,
  MemoryTimeScatter,
  TimeAccuracyScatter,
  AlgorithmBySizeChart,
  formatMemory
};