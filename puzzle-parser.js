// Puzzle parsing utilities

function parseGrid(doc) {
  const gridNode = doc.querySelector('grid');
  const width = parseInt(gridNode.getAttribute('width'), 10);
  const height = parseInt(gridNode.getAttribute('height'), 10);
  const grid = Array.from({ length: height }, () => Array(width).fill(null));

  doc.querySelectorAll('cell').forEach(cell => {
    const x = parseInt(cell.getAttribute('x'), 10) - 1;
    const y = parseInt(cell.getAttribute('y'), 10) - 1;
    const type = cell.getAttribute('type');
    if (type === 'block') {
      grid[y][x] = { type: 'block' };
    } else {
      grid[y][x] = {
        type: 'letter',
        solution: cell.getAttribute('solution') || '',
        number: cell.getAttribute('number') || ''
      };
    }
  });

  return { width, height, grid };
}

function parseClues(doc) {
  const clueSections = doc.querySelectorAll('clues[ordering="normal"]');
  const cluesAcross = [];
  const cluesDown = [];
  if (clueSections[0]) {
    clueSections[0].querySelectorAll('clue').forEach(cl => {
      cluesAcross.push({
        number: cl.getAttribute('number'),
        text: cl.textContent,
        enumeration: cl.getAttribute('format') || ''
      });
    });
  }
  if (clueSections[1]) {
    clueSections[1].querySelectorAll('clue').forEach(cl => {
      cluesDown.push({
        number: cl.getAttribute('number'),
        text: cl.textContent,
        enumeration: cl.getAttribute('format') || ''
      });
    });
  }
  return { cluesAcross, cluesDown };
}

function computeWordMetadata(grid) {
  const height = grid.length;
  const width = grid[0].length;
  const acrossLengths = {};
  const downLengths = {};
  const acrossStarts = {};
  const downStarts = {};

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      if (!cell || cell.type === 'block' || !cell.number) continue;
      if (x === 0 || grid[y][x - 1].type === 'block') {
        let len = 0;
        let cx = x;
        while (cx < width && grid[y][cx].type !== 'block') {
          len++;
          cx++;
        }
        acrossLengths[cell.number] = len;
        acrossStarts[cell.number] = { x, y };
      }
      if (y === 0 || grid[y - 1][x].type === 'block') {
        let len = 0;
        let cy = y;
        while (cy < height && grid[cy][x].type !== 'block') {
          len++;
          cy++;
        }
        downLengths[cell.number] = len;
        downStarts[cell.number] = { x, y };
      }
    }
  }

  return { acrossStarts, downStarts, acrossLengths, downLengths };
}

export function parsePuzzle(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  const meta = doc.querySelector('metadata');
  let author = '';
  if (meta) {
    const authorNode = meta.querySelector('author');
    const creatorNode = meta.querySelector('creator');
    author = (authorNode && authorNode.textContent) ||
             (creatorNode && creatorNode.textContent) || '';
  }

  const { width, height, grid } = parseGrid(doc);
  const { cluesAcross, cluesDown } = parseClues(doc);
  const {
    acrossStarts,
    downStarts,
    acrossLengths,
    downLengths
  } = computeWordMetadata(grid);

  cluesAcross.forEach(cl => {
    cl.length = acrossLengths[cl.number] || 0;
  });
  cluesDown.forEach(cl => {
    cl.length = downLengths[cl.number] || 0;
  });

  return { width, height, grid, cluesAcross, cluesDown, acrossStarts, downStarts, author };
}

export { parseGrid, parseClues, computeWordMetadata };
