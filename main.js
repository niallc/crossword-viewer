// Crossword Viewer implementation

console.log('Crossword Viewer: Starting');

if (typeof CrosswordPuzzleData === 'undefined') {
  console.error('ERROR: CrosswordPuzzleData not found.');
}

let selectedCell = null;

function parsePuzzleData(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

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

  const clueSections = doc.querySelectorAll('clues[ordering="normal"]');
  const cluesAcross = [];
  const cluesDown = [];
  if (clueSections[0]) {
    clueSections[0].querySelectorAll('clue').forEach(cl => {
      cluesAcross.push({
        number: cl.getAttribute('number'),
        text: cl.textContent
      });
    });
  }
  if (clueSections[1]) {
    clueSections[1].querySelectorAll('clue').forEach(cl => {
      cluesDown.push({
        number: cl.getAttribute('number'),
        text: cl.textContent
      });
    });
  }

  return { width, height, grid, cluesAcross, cluesDown };
}

function createCellElement(cellData, x, y) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.dataset.x = x;
  cell.dataset.y = y;

  if (cellData.type === 'block') {
    cell.classList.add('block');
  }

  if (!cell.classList.contains('block')) {
    cell.addEventListener('click', () => selectCell(cell));
  }

  return cell;
}

function buildGrid(data) {
  console.log('Building grid...');
  const gridEl = document.getElementById('grid');
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${data.width}, 30px)`;
  gridEl.style.gridTemplateRows = `repeat(${data.height}, 30px)`;

  data.grid.forEach((row, y) => {
    row.forEach((cellData, x) => {
      const cellEl = createCellElement(cellData, x, y);
      gridEl.appendChild(cellEl);
    });
  });
}

function buildClues(across, down) {
  console.log('Building clues...');
  const acrossEl = document.querySelector('#clues-across ul');
  const downEl = document.querySelector('#clues-down ul');
  acrossEl.innerHTML = '';
  downEl.innerHTML = '';

  across.forEach(cl => {
    const li = document.createElement('li');
    li.textContent = `${cl.number}. ${cl.text}`;
    acrossEl.appendChild(li);
  });

  down.forEach(cl => {
    const li = document.createElement('li');
    li.textContent = `${cl.number}. ${cl.text}`;
    downEl.appendChild(li);
  });
}

function selectCell(cell) {
  if (cell.classList.contains('block')) {
    return;
  }
  if (selectedCell) {
    selectedCell.classList.remove('selected');
  }
  selectedCell = cell;
  selectedCell.classList.add('selected');
}

function testGridIsBuilt() {
  return document.querySelectorAll('#grid .cell').length > 0;
}

function testCluesPresent() {
  return (
    document.querySelectorAll('#clues-across li').length > 0 &&
    document.querySelectorAll('#clues-down li').length > 0
  );
}

const puzzleData = parsePuzzleData(CrosswordPuzzleData);

buildGrid(puzzleData);
buildClues(puzzleData.cluesAcross, puzzleData.cluesDown);

console.log('Crossword Viewer: Ready');
