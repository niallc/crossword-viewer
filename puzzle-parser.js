// Puzzle parsing utilities

function parseGrid(doc) {
  const gridNode = doc.querySelector('grid');
  if (!gridNode) {
    console.error("[Parser] Could not find <grid> element in XML.");
    return { width: 0, height: 0, grid: [] };
  }
  const width = parseInt(gridNode.getAttribute('width'), 10);
  const height = parseInt(gridNode.getAttribute('height'), 10);
  const grid = Array.from({ length: height }, () => Array(width).fill(null));

  const cellNodes = gridNode.querySelectorAll('cell');
  console.log(`[Parser] Found ${cellNodes.length} <cell> nodes in the grid.`);

  cellNodes.forEach(cell => {
    const x = parseInt(cell.getAttribute('x'), 10) - 1;
    const y = parseInt(cell.getAttribute('y'), 10) - 1;

    // Basic bounds check
    if (x < 0 || x >= width || y < 0 || y >= height) {
        console.warn(`[Parser] Cell at (${x+1}, ${y+1}) is outside the defined grid dimensions (${width}x${height}). Skipping.`);
        return;
    }

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

  // Check for any cells that were not defined in the XML
  let undefinedCells = 0;
  for(let r=0; r < height; r++) {
      for(let c=0; c < width; c++) {
          if(grid[r][c] === null) {
              undefinedCells++;
              // Default to a block cell to prevent errors down the line
              grid[r][c] = { type: 'block' };
          }
      }
  }
  if (undefinedCells > 0) {
      console.warn(`[Parser] ${undefinedCells} cells were not defined in the XML and have been defaulted to blocks.`);
  }

  return { width, height, grid };
}

function parseClues(doc) {
  // Be more lenient with the selector. Most formats have two <clues> blocks inside <crossword>.
  const clueSections = doc.querySelectorAll('crossword > clues');
  console.log(`[Parser] Found ${clueSections.length} <clues> sections.`);

  const cluesAcross = [];
  const cluesDown = [];

  if (clueSections.length === 0) {
      console.error("[Parser] No <clues> sections found. Check the XML structure.");
      return { cluesAcross, cluesDown };
  }

  // Heuristic: The first block is 'Across', the second is 'Down'.
  if (clueSections[0]) {
    const acrossNodes = clueSections[0].querySelectorAll('clue');
    console.log(`[Parser] Found ${acrossNodes.length} 'Across' clue nodes.`);
    acrossNodes.forEach(cl => {
      cluesAcross.push({
        number: cl.getAttribute('number'),
        text: cl.textContent.trim(),
        enumeration: cl.getAttribute('format') || ''
      });
    });
  }

  if (clueSections[1]) {
    const downNodes = clueSections[1].querySelectorAll('clue');
    console.log(`[Parser] Found ${downNodes.length} 'Down' clue nodes.`);
    downNodes.forEach(cl => {
      cluesDown.push({
        number: cl.getAttribute('number'),
        text: cl.textContent.trim(),
        enumeration: cl.getAttribute('format') || ''
      });
    });
  } else if (clueSections.length === 1) {
      console.warn("[Parser] Only one <clues> section found. 'Down' clues will be missing.");
  }

  if (cluesAcross.length === 0 && cluesDown.length === 0) {
      console.error("[Parser] Failed to parse any clues from the found sections.");
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
