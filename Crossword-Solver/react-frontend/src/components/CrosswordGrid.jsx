import React, { useState, useMemo } from 'react';

const CrosswordGrid = ({ 
  grid = [],
  clues = { across: [], down: [] },
  editable = false,
  onCellChange = () => {},
  cellSize = 40,
  showAnswers = false,
  highlightErrors = false,
  errorPositions = [],
  highlightCorrect = false,
  correctPositions = [],
  highlightSpecific = false,
  specificPositions = [],
  specificHighlightColor = 'bg-yellow-200 dark:bg-yellow-800',
  theme = {
    cellBackground: 'bg-white dark:bg-gray-800',
    cellBorder: 'border border-gray-300 dark:border-gray-600',
    activeCell: 'ring-2 ring-blue-500 dark:ring-blue-400',
    textColor: 'text-gray-900 dark:text-gray-100',
    blackCellBackground: 'bg-black dark:bg-gray-900',
    blackCellTextColor: 'text-white dark:text-gray-300',
    numberColor: 'text-gray-500 dark:text-gray-400',
    errorHighlight: 'bg-red-200 dark:bg-red-800',
    correctHighlight: 'bg-green-200 dark:bg-green-800'
  }
}) => {
  if (!Array.isArray(grid) || grid.some(row => !Array.isArray(row))) {
    return (
      <div className="text-red-500 dark:text-red-400 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
        Invalid grid structure provided
      </div>
    );
  }

  const [focusedCell, setFocusedCell] = useState(null);

  const errorPositionSet = useMemo(() => {
    if (!highlightErrors || !Array.isArray(errorPositions)) return new Set();
    return new Set(errorPositions.map(pos => `${pos.x},${pos.y}`));
  }, [highlightErrors, errorPositions]);

  const correctPositionSet = useMemo(() => {
    if (!highlightCorrect || !Array.isArray(correctPositions)) return new Set();
    return new Set(correctPositions.map(pos => `${pos.x},${pos.y}`));
  }, [highlightCorrect, correctPositions]);

  const specificPositionSet = useMemo(() => {
    if (!highlightSpecific || !Array.isArray(specificPositions)) return new Set();
    return new Set(specificPositions.map(pos => `${pos.x},${pos.y}`));
  }, [highlightSpecific, specificPositions]);

  const numberMap = {};
  [...(clues.across || []), ...(clues.down || [])].forEach(clue => {
    const { x, y, number } = clue;
    if (!numberMap[`${y},${x}`]) {
       numberMap[`${y},${x}`] = number;
    }
  });

  const handleCellClick = (row, col) => {
    if (grid[row][col] === '.' || grid[row][col] === ' ') return
    setFocusedCell({ row, col });
  };

  const handleKeyDown = (e, row, col) => {
    if (!editable) return;
    
    if (e.key === 'Backspace' || e.key === 'Delete') {
      onCellChange(row, col, '');
    } else if (e.key.match(/^[A-Za-z]$/) && e.key.length === 1) {
      onCellChange(row, col, e.key.toUpperCase());
      const nextCol = (col + 1) < grid[0].length ? col + 1 : col;
      const nextRow = (col + 1) >= grid[0].length ? (row + 1) % grid.length : row;
      if (grid[nextRow][nextCol] !== '.' && grid[nextRow][nextCol] !== ' ') {
         setFocusedCell({ row: nextRow, col: nextCol });
      }
    }
  };

  const getCellNumber = (row, col) => {
    return numberMap[`${row},${col}`] || null;
  };

  return (
    <div 
      className=""
      style={{ '--cell-size': `${cellSize}px` }}
    >
      {grid.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex">
          {row.map((cell, colIndex) => {
            const isBlack = cell === '.' || cell === ' ';
            if (isBlack) {
              return (
                <div 
                  key={`black-${rowIndex}-${colIndex}`}
                  className={`
                    w-[var(--cell-size)] h-[var(--cell-size)]
                    ${theme.blackCellBackground}
                  `}
                />
              );
            }

            const cellNumber = getCellNumber(rowIndex, colIndex);
            const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex;
            
            let bgColorClass = theme.cellBackground;
            if (highlightSpecific && specificPositionSet.has(`${colIndex},${rowIndex}`)) {
                 bgColorClass = specificHighlightColor; 
            } else if (highlightCorrect && correctPositionSet.has(`${colIndex},${rowIndex}`)) {
                 bgColorClass = theme.correctHighlight; 
            } else if (highlightErrors && errorPositionSet.has(`${colIndex},${rowIndex}`)) {
                 bgColorClass = theme.errorHighlight; 
            }

            return (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                tabIndex={editable ? 0 : -1}
                className={`
                  relative
                  ${theme.cellBorder}
                  ${bgColorClass} 
                  ${isFocused ? theme.activeCell : ''}
                  flex items-center justify-center
                  cursor-default
                  select-none
                  w-[var(--cell-size)] h-[var(--cell-size)]
                `}
              >
                {cellNumber && (
                  <span className={`
                    absolute top-0 left-0.5
                    text-xs ${theme.numberColor}
                    font-bold
                    pl-0.5 
                  `}>
                    {cellNumber}
                  </span>
                )}
                <span className={`
                  ${theme.textColor} 
                  text-xl 
                  font-medium
                `}>
                  {showAnswers ? cell : (editable ? (focusedCell?.row === rowIndex && focusedCell?.col === colIndex ? '' : cell) : '')}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default CrosswordGrid;