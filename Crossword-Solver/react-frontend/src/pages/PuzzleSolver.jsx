import { useState } from 'react';
import AlgorithmSelector from '../components/AlgorithmSelector';
import CrosswordGrid from '../components/CrosswordGrid';
import Button from '../components/Button';

export default function PuzzleSolver() {
  const [algorithm, setAlgorithm] = useState('a-star');
  const [puzzle, setPuzzle] = useState(null);
  const [solution, setSolution] = useState(null);
  const [isSolving, setIsSolving] = useState(false);

  const handleSolve = async () => {
    setIsSolving(true);
    setIsSolving(false);
  };

const handleDownloadFallback = (format) => {
    const data = JSON.stringify(generatedPuzzle);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crossword-${new Date().toISOString()}.${format === 'pdf' ? 'json' : format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    };
    
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Puzzle Solver</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Solver Configuration</h2>
          
          <AlgorithmSelector 
            selectedAlgorithm={algorithm}
            onSelect={setAlgorithm}
          />
          
          <div className="mt-6 space-y-4">
            <Button 
              onClick={handleSolve}
              loading={isSolving}
              disabled={!puzzle}
              className="w-full"
            >
              Solve Puzzle
            </Button>
            
            {solution && (
              <Button variant="outline" className="w-full">
                View Analytics
              </Button>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Input Puzzle</h2>
            <CrosswordGrid 
              editable={true}
              onGridChange={setPuzzle}
            />
          </div>
          
          {solution && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Solution</h2>
              <CrosswordGrid 
                grid={solution.grid}
                editable={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}