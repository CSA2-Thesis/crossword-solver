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
  // New props for algorithm simulation
  highlightTarget = null,
  conflictPositions = [],
  intersections = [],
  placedLetters = [],
  theme = {
    cellBackground: 'bg-white dark:bg-gray-800',
    cellBorder: 'border border-gray-300 dark:border-gray-600',
    activeCell: 'ring-2 ring-blue-500 dark:ring-blue-400',
    textColor: 'text-gray-900 dark:text-gray-100',
    blackCellBackground: 'bg-black/0 dark:bg-gray-900/0',
    blackCellTextColor: 'text-white dark:text-gray-300',
    numberColor: 'text-gray-500 dark:text-gray-400',
    errorHighlight: 'bg-red-200 dark:bg-red-800',
    correctHighlight: 'bg-green-200 dark:bg-green-800',
    targetHighlight: 'bg-yellow-200 dark:bg-yellow-800',
    conflictHighlight: 'bg-red-300 dark:bg-red-700',
    intersectionHighlight: 'bg-green-300 dark:bg-green-700',
    placedLetterHighlight: 'bg-blue-200 dark:bg-blue-800'
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

  // FIXED: Dynamic font sizes based on cell size
  const getFontSizes = (size) => {
    if (size <= 24) {
      return {
        numberSize: 'text-[8px] leading-[8px]',
        letterSize: 'text-sm leading-[1]',
        numberOffset: 'top-[1px] left-[1px]'
      };
    } else if (size <= 32) {
      return {
        numberSize: 'text-[10px] leading-[10px]',
        letterSize: 'text-base leading-[1]',
        numberOffset: 'top-[2px] left-[2px]'
      };
    } else {
      return {
        numberSize: 'text-xs leading-[1]',
        letterSize: 'text-xl leading-[1]',
        numberOffset: 'top-[3px] left-[3px]'
      };
    }
  };

  const fontSizes = getFontSizes(cellSize);

  const errorPositionSet = useMemo(() => {
    if (!highlightErrors || !Array.isArray(errorPositions)) return new Set();
    return new Set(errorPositions.map(pos => `${pos.x},${pos.y}`));
  }, [highlightErrors, errorPositions]);

  const correctPositionSet = useMemo(() => {
    if (!highlightCorrect || !Array.isArray(correctPositions)) return new Set();
    return new Set(correctPositions.map(pos => `${pos.x},${pos.y}`));
  }, [highlightCorrect, correctPositions]);

  const conflictPositionSet = useMemo(() => {
    if (!Array.isArray(conflictPositions)) return new Set();
    return new Set(conflictPositions.map(pos => `${pos.x},${pos.y}`));
  }, [conflictPositions]);

  const intersectionSet = useMemo(() => {
    if (!Array.isArray(intersections)) return new Set();
    return new Set(intersections.map(intersection => 
      `${intersection.position?.x},${intersection.position?.y}`
    ));
  }, [intersections]);

  const placedLetterSet = useMemo(() => {
    if (!Array.isArray(placedLetters)) return new Set();
    return new Set(placedLetters.map(letter => 
      `${letter.x},${letter.y}`
    ));
  }, [placedLetters]);

  // Check if cell is part of the current target word
  const isTargetCell = useMemo(() => {
    if (!highlightTarget) return () => false;
    
    const { x, y, direction, length } = highlightTarget;
    
    return (rowIndex, colIndex) => {
      if (direction === 'across') {
        return rowIndex === y && 
               colIndex >= x && 
               colIndex < x + length;
      } else if (direction === 'down') {
        return colIndex === x && 
               rowIndex >= y && 
               rowIndex < y + length;
      }
      return false;
    };
  }, [highlightTarget]);

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
            
            // Determine cell background based on priority
            let bgColorClass = theme.cellBackground;
            let animationClass = '';
            let ringClass = '';
            
            // Priority order: conflict > intersection > placed letter > target > correct > error
            if (conflictPositionSet.has(`${colIndex},${rowIndex}`)) {
              bgColorClass = theme.conflictHighlight;
              animationClass = 'animate-[shake_0.5s_ease-in-out]';
            } else if (intersectionSet.has(`${colIndex},${rowIndex}`)) {
              bgColorClass = theme.intersectionHighlight;
              ringClass = 'ring-2 ring-green-500 dark:ring-green-400';
            } else if (placedLetterSet.has(`${colIndex},${rowIndex}`)) {
              bgColorClass = theme.placedLetterHighlight;
              animationClass = 'animate-pulse';
            } else if (highlightTarget && isTargetCell(rowIndex, colIndex)) {
              bgColorClass = theme.targetHighlight;
              animationClass = 'animate-pulse';
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
                  ${ringClass}
                  ${animationClass}
                  ${isFocused ? theme.activeCell : ''}
                  flex items-center justify-center
                  cursor-default
                  select-none
                  w-[var(--cell-size)] h-[var(--cell-size)]
                  transition-all duration-300 ease-in-out
                  overflow-hidden
                `}
              >
                {cellNumber && (
                  <span className={`
                    absolute ${fontSizes.numberOffset}
                    ${fontSizes.numberSize} ${theme.numberColor}
                    font-bold
                    pointer-events-none
                    z-10
                  `}>
                    {cellNumber}
                  </span>
                )}
                <span className={`
                  ${theme.textColor} 
                  ${fontSizes.letterSize}
                  font-medium
                  transition-all duration-200
                  flex items-center justify-center
                  w-full h-full
                  ${cellSize <= 24 ? 'mt-1' : ''} // Small vertical adjustment for very small cells
                `}>
                  {showAnswers ? cell : (editable ? (focusedCell?.row === rowIndex && focusedCell?.col === colIndex ? '' : cell) : cell)}
                </span>
                
                {/* Visual indicator for newly placed letters */}
                {placedLetterSet.has(`${colIndex},${rowIndex}`) && (
                  <div className="absolute inset-0 border-2 border-blue-500 dark:border-blue-400 rounded pointer-events-none animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30"></div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default CrosswordGrid;