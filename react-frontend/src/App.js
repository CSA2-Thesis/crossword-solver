import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";

const createGrid = (size) => Array(size).fill().map(() => Array(size).fill('.'));

function App() {
  const [gridSize, setGridSize] = useState(7);
  const [grid, setGrid] = useState(createGrid(7));
  const [across, setAcross] = useState("animal");
  const [down, setDown] = useState("fruit");
  const [algorithm, setAlgorithm] = useState("DFS");
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSolve = async () => {
    setError(null);
    setSolution(null);
    setLoading(true);
    try {
      const res = await axios.post(`http://localhost:5000/solve`, {
        grid,
        clues: { across, down },
        algorithm
      });
      setSolution(res.data);
    } catch (err) {
      setError("Failed to solve puzzle.");
    }
    setLoading(false);
  };

  const handleDownloadPDF = () => {
    if (!solution) return;

    const doc = new jsPDF();
    let y = 10;

    doc.setFont("courier", "normal");

    doc.text("Crossword Puzzle Solution", 10, y);
    y += 10;
    doc.text(`Algorithm: ${solution.method || ""}`, 10, y);
    y += 10;
    doc.text(`Across Clue: ${across}`, 10, y);
    y += 10;
    doc.text(`Down Clue: ${down}`, 10, y);
    y += 10;

    if (solution.metrics) {
      doc.text(`Execution Time: ${solution.metrics.execution_time}`, 10, y);
      y += 10;
      doc.text(`Memory Usage: ${solution.metrics.memory_usage_kb} KB`, 10, y);
      y += 10;
    }

    y += 5;
    doc.text("Grid Solution:", 10, y);
    y += 10;

    if (Array.isArray(solution.solution)) {
      solution.solution.forEach((row) => {
        doc.text(row.join(" "), 10, y);
        y += 7;
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
      });
    } else {
      doc.text(String(solution.solution), 10, y);
    }

    doc.save("crossword_solution.pdf");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Crossword Solver</h1>

      <label>Across clue:</label><br/>
      <input value={across} onChange={e => setAcross(e.target.value)} /><br/><br/>

      <label>Down clue:</label><br/>
      <input value={down} onChange={e => setDown(e.target.value)} /><br/><br/>

      <label>Algorithm:</label><br/>
      <select value={algorithm} onChange={e => setAlgorithm(e.target.value)}>
        <option value="DFS">DFS</option>
        <option value="A*">A*</option>
        <option value="HYBRID">HYBRID</option>
      </select><br/><br/>

      <label>Grid Size:</label><br/>
      <select value={gridSize} onChange={(e) => {
        const size = parseInt(e.target.value);
        setGridSize(size);
        setGrid(createGrid(size));
      }}>
        <option value="7">Small (7x7)</option>
        <option value="15">Medium (15x15)</option>
        <option value="21">Large (21x21)</option>
      </select>
      <br/><br/>

      <button onClick={handleSolve} disabled={loading}>
        {loading ? "Solving..." : "Solve Puzzle"}
      </button>
      {" "}

      {error && (
        <div style={{color: "red", marginTop: 10}}><strong>{error}</strong></div>
      )}

      {solution && (
        <div>
          <h2>Solution:</h2>
          <pre>
            {Array.isArray(solution.solution) 
              ? solution.solution.map(row => row.join(' ')).join('\n')
              : String(solution.solution)}
          </pre>

          {solution?.method && (
            <div><strong>Algorithm Used:</strong> {solution.method}</div>
          )}

          {solution.metrics && (
            <div>
              <p><strong>Execution Time:</strong> {solution.metrics.execution_time}</p>
              <p><strong>Memory Used:</strong> {solution.metrics.memory_usage_kb} KB</p>
            </div>
          )}

          {solution?.success === false && (
            <div style={{color: "red"}}><strong>Failed to solve puzzle.</strong></div>
          )}
        </div>
      )}

      {solution && (
        <button onClick={handleDownloadPDF}>
          Download PDF
        </button>
      )}
      
    </div>
  );
}

export default App;