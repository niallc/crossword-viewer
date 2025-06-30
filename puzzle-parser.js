// Puzzle parsing utilities (v1.3 - More robust selectors)

/**
 * Checks if the parsed XML document contains a parser error.
 * @param {Document} doc The parsed XML document.
 * @returns {boolean} True if a parser error is found.
 */
function hasParserError(doc) {
  // Most browsers insert a <parsererror> element on failure.
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) {
    console.error("[Parser] XML parsing error:", errorNode.textContent);
    return true;
  }
  return false;
}

function parseGrid(doc) {
  // Use a more specific selector to find the grid within the XML structure.
  const gridNode = doc.querySelector('rectangular-puzzle > crossword > grid');
  if (!gridNode) {
    console.error("[Parser] Could not find <grid> element in XML. Check selector and XML structure.");
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

    if (x < 0 || x >= width || y < 0 || y >= height) {
        console.warn(`[Parser] Cell at (${x+1}, ${y+1}) is outside the defined grid dimensions (${width}x${height}). Skipping.`);
        return;
    }

    const type = cell.getAttribute('type');
    if (type === 'block') {
      grid[y][x] = { type: 'block' };
    } else {
      // We ignore the 'number' attribute from the XML as it can be incorrect.
      // Numbers will be calculated based on grid position.
      grid[y][x] = {
        type: 'letter',
        solution: cell.getAttribute('solution') || '',
        number: '' // Initially blank
      };
    }
  });

  let undefinedCells = 0;
  for(let r=0; r < height; r++) {
      for(let c=0; c < width; c++) {
          if(grid[r][c] === null) {
              undefinedCells++;
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
  // Use a more specific selector for the clue sections.
  const clueSections = doc.querySelectorAll('rectangular-puzzle > crossword > clues');
  console.log(`[Parser] Found ${clueSections.length} <clues> sections.`);

  const cluesAcross = [];
  const cluesDown = [];

  if (clueSections.length === 0) {
      console.error("[Parser] No <clues> sections found. Check the XML structure and selector.");
      return { cluesAcross, cluesDown };
  }

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

function generateGridMetadataAndNumbers(grid) {
  if (grid.length === 0 || grid[0].length === 0) {
    return { acrossStarts: {}, downStarts: {}, acrossLengths: {}, downLengths: {} };
  }
  const height = grid.length;
  const width = grid[0].length;
  const acrossStarts = {};
  const downStarts = {};
  const acrossLengths = {};
  const downLengths = {};
  let clueNumber = 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x];
      if (!cell || cell.type === 'block') {
        continue;
      }

      const isAfterLeftEdgeOrBlock = (x === 0 || grid[y][x - 1].type === 'block');
      const isAfterTopEdgeOrBlock = (y === 0 || grid[y - 1][x].type === 'block');
      
      const startsAcrossWord = isAfterLeftEdgeOrBlock && x + 1 < width && grid[y][x + 1].type !== 'block';
      
      const startsDownWord = isAfterTopEdgeOrBlock && y + 1 < height && grid[y + 1][x].type !== 'block';

      if (startsAcrossWord || startsDownWord) {
        cell.number = String(clueNumber);

        if (startsAcrossWord) {
          let len = 0;
          let cx = x;
          while (cx < width && grid[y][cx].type !== 'block') {
            len++;
            cx++;
          }
          acrossLengths[clueNumber] = len;
          acrossStarts[clueNumber] = { x, y };
        }

        if (startsDownWord) {
          let len = 0;
          let cy = y;
          while (cy < height && grid[cy][x].type !== 'block') {
            len++;
            cy++;
          }
          downLengths[clueNumber] = len;
          downStarts[clueNumber] = { x, y };
        }
        
        clueNumber++;
      }
    }
  }
  return { acrossStarts, downStarts, acrossLengths, downLengths };
}

export function parsePuzzle(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // Check for a top-level parsing error first.
  if (hasParserError(doc)) {
    // Return a default empty structure to prevent crashes downstream.
    return { width: 0, height: 0, grid: [], cluesAcross: [], cluesDown: [], acrossStarts: {}, downStarts: {}, author: '' };
  }

  // Use a more specific selector for metadata.
  const meta = doc.querySelector('rectangular-puzzle > metadata');
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
  } = generateGridMetadataAndNumbers(grid);

  cluesAcross.forEach(cl => {
    cl.length = acrossLengths[cl.number] || 0;
  });
  cluesDown.forEach(cl => {
    cl.length = downLengths[cl.number] || 0;
  });

  return { width, height, grid, cluesAcross, cluesDown, acrossStarts, downStarts, author };
}
