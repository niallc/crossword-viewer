// grid-utils.js v1.1
export function findFirstLetterCell(puzzleData, cellEls) {
  for (let y = 0; y < puzzleData.height; y++) {
    for (let x = 0; x < puzzleData.width; x++) {
      if (puzzleData.grid[y][x].type !== 'block') {
        return cellEls[y][x];
      }
    }
  }
  return null;
}

export function getWordCells(puzzleData, cellEls, cell, direction) {
  if (!cell) return [];
  const x = parseInt(cell.dataset.x, 10);
  const y = parseInt(cell.dataset.y, 10);
  const cells = [];
  if (puzzleData.grid[y][x].type === 'block') return cells;
  if (direction === 'across') {
    let sx = x;
    while (sx > 0 && puzzleData.grid[y][sx - 1] && puzzleData.grid[y][sx - 1].type !== 'block') {
      sx--;
    }
    for (let cx = sx; cx < puzzleData.width && puzzleData.grid[y][cx] && puzzleData.grid[y][cx].type !== 'block'; cx++) {
      const el = cellEls[y][cx];
      cells.push({ el, data: puzzleData.grid[y][cx] });
    }
  } else if (direction === 'down') {
    let sy = y;
    while (sy > 0 && puzzleData.grid[sy - 1][x] && puzzleData.grid[sy - 1][x].type !== 'block') {
      sy--;
    }
    for (let cy = sy; cy < puzzleData.height && puzzleData.grid[cy][x] && puzzleData.grid[cy][x].type !== 'block'; cy++) {
      const el = cellEls[cy][x];
      cells.push({ el, data: puzzleData.grid[cy][x] });
    }
  }
  return cells;
}
