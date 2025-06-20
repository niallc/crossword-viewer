// Crossword Viewer implementation
(function(){

console.log('Crossword Viewer: Starting');

if (typeof CrosswordPuzzleData === 'undefined') {
  console.error('ERROR: CrosswordPuzzleData not found.');
}

let selectedCell = null;
let highlightedCells = [];
let currentDirection = 'across';
let directionButton = null;
let checkButton = null;
let mobileInput = null;

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

  const acrossLengths = {};
  const downLengths = {};
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
      }
      if (y === 0 || grid[y - 1][x].type === 'block') {
        let len = 0;
        let cy = y;
        while (cy < height && grid[cy][x].type !== 'block') {
          len++;
          cy++;
        }
        downLengths[cell.number] = len;
      }
    }
  }

  cluesAcross.forEach(cl => {
    cl.length = acrossLengths[cl.number] || 0;
  });
  cluesDown.forEach(cl => {
    cl.length = downLengths[cl.number] || 0;
  });

  return { width, height, grid, cluesAcross, cluesDown };
}

function createCellElement(cellData, x, y) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.dataset.x = x;
  cell.dataset.y = y;

  if (cellData.type === 'block') {
    cell.classList.add('block');
  } else {
    if (cellData.number) {
      const num = document.createElement('div');
      num.classList.add('num');
      num.textContent = cellData.number;
      cell.appendChild(num);
    }
    // use pointer events to handle both mouse and touch in one handler
    cell.addEventListener('pointerdown', (e) => {
      selectCell(cell);
      // prevent generation of a subsequent click event on touch devices
      e.preventDefault();
    });
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
    li.dataset.number = cl.number;
    const num = document.createElement('span');
    num.className = 'clue-num';
    num.textContent = cl.number;
    li.appendChild(num);
    li.appendChild(document.createTextNode(cl.text + ' (' + cl.length + ')'));
    acrossEl.appendChild(li);
  });

  down.forEach(cl => {
    const li = document.createElement('li');
    li.dataset.number = cl.number;
    const num = document.createElement('span');
    num.className = 'clue-num';
    num.textContent = cl.number;
    li.appendChild(num);
    li.appendChild(document.createTextNode(cl.text + ' (' + cl.length + ')'));
    downEl.appendChild(li);
  });
}

function selectCell(cell) {
  if (cell.classList.contains('block')) {
    return;
  }

  // if clicking the currently selected cell, toggle direction
  if (selectedCell === cell) {
    currentDirection = currentDirection === 'across' ? 'down' : 'across';
    highlightWord(cell);
    updateDirectionButton();
    return;
  }

  if (selectedCell) {
    selectedCell.classList.remove('selected');
  }
  selectedCell = cell;
  selectedCell.classList.add('selected');
  // auto-adjust direction if the current one has no word
  let cells = getWordCells(selectedCell, currentDirection);
  if (cells.length <= 1) {
    const other = currentDirection === 'across' ? 'down' : 'across';
    const otherCells = getWordCells(selectedCell, other);
    if (otherCells.length > cells.length) {
      currentDirection = other;
      cells = otherCells;
      updateDirectionButton();
    }
  }
  highlightWord(selectedCell);
  if (mobileInput) {
    mobileInput.value = '';
    mobileInput.focus();
  }
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
function moveSelection(direction) {
    if (!selectedCell) return false;
    const x = parseInt(selectedCell.dataset.x, 10);
    const y = parseInt(selectedCell.dataset.y, 10);
    let nx = x, ny = y;
    if (direction === 'ArrowUp') ny -= 1;
    if (direction === 'ArrowDown') ny += 1;
    if (direction === 'ArrowLeft') nx -= 1;
    if (direction === 'ArrowRight') nx += 1;
    const next = document.querySelector(`.cell[data-x="${nx}"][data-y="${ny}"]`);
    if (next && !next.classList.contains('block')) {
        selectCell(next);
        return true;
    }
    return false;
}

function autoAdvance() {
    let moved = false;
    if (currentDirection === 'across') {
        moved = moveSelection('ArrowRight');
    } else if (currentDirection === 'down') {
        moved = moveSelection('ArrowDown');
    }
    if (!moved) {
        currentDirection = currentDirection === 'across' ? 'down' : 'across';
        updateDirectionButton();
        if (currentDirection === 'across') {
            moveSelection('ArrowRight');
        } else {
            moveSelection('ArrowDown');
        }
    }
}

function logGridState() {
    const gridEl = document.getElementById('grid');
    const cells = gridEl.querySelectorAll('.cell');
    const letters = Array.from(cells).map(c => c.textContent || ' ').join('');
    console.log('Grid letters:', letters);
}

function handleBackspace() {
    if (!selectedCell) return;
    if (selectedCell.textContent) {
        selectedCell.textContent = '';
        selectedCell.style.color = '';
        const dir = currentDirection === 'across' ? 'ArrowLeft' : 'ArrowUp';
        moveSelection(dir);
    } else {
        const dir = currentDirection === 'across' ? 'ArrowLeft' : 'ArrowUp';
        if (moveSelection(dir)) {
            selectedCell.textContent = '';
            selectedCell.style.color = '';
        }
    }
}

function getWordCells(cell, direction) {
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
            const el = document.querySelector(`.cell[data-x="${cx}"][data-y="${y}"]`);
            cells.push({ el, data: puzzleData.grid[y][cx] });
        }
    } else if (direction === 'down') {
        let sy = y;
        while (sy > 0 && puzzleData.grid[sy - 1][x] && puzzleData.grid[sy - 1][x].type !== 'block') {
            sy--;
        }
        for (let cy = sy; cy < puzzleData.height && puzzleData.grid[cy][x] && puzzleData.grid[cy][x].type !== 'block'; cy++) {
            const el = document.querySelector(`.cell[data-x="${x}"][data-y="${cy}"]`);
            cells.push({ el, data: puzzleData.grid[cy][x] });
        }
    }
    return cells;
}

function highlightWord(cell) {
    highlightedCells.forEach(c => c.classList.remove('highlight'));
    highlightedCells = [];
    const cells = getWordCells(cell, currentDirection);
    cells.forEach(({ el }) => {
        el.classList.add('highlight');
        highlightedCells.push(el);
    });

    // highlight matching clue
    document.querySelectorAll('#clues li.highlight').forEach(li => li.classList.remove('highlight'));
    const clueNumber = cells.length > 0 ? cells[0].data.number : null;
    if (clueNumber) {
        const selector = currentDirection === 'across'
            ? `#clues-across li[data-number="${clueNumber}"]`
            : `#clues-down li[data-number="${clueNumber}"]`;
        const clueEl = document.querySelector(selector);
        if (clueEl) {
            clueEl.classList.add('highlight');
        }
    }
}

function checkCurrentAnswer(direction) {
    if (!selectedCell) return;
    const cells = getWordCells(selectedCell, direction);
    if (cells.length === 0) return;
    cells.forEach(({ el, data }) => {
        const expected = (data.solution || '').toUpperCase();
        const actual = (el.textContent || '').trim().toUpperCase();
        if (expected === actual) {
            el.style.color = 'green';
        } else {
            el.style.color = 'red';
        }
    });
}

function checkAnswers() {
    let wrong = 0;
    document.querySelectorAll('#grid .cell').forEach(cell => {
        const x = parseInt(cell.dataset.x, 10);
        const y = parseInt(cell.dataset.y, 10);
        const data = puzzleData.grid[y][x];
        if (data.type === 'letter') {
            const expected = (data.solution || '').toUpperCase();
            const actual = (cell.textContent || '').trim().toUpperCase();
            if (actual !== expected) wrong += 1;
        }
    });
    if (!checkButton) {
        checkButton = document.getElementById('check-answer');
    }
    if (checkButton) {
        checkButton.textContent = `Num Wrong: ${wrong}`;
        if (wrong === 0) {
            checkButton.style.backgroundColor = 'green';
            checkButton.style.color = 'white';
        } else if (wrong > 2) {
            checkButton.style.backgroundColor = 'red';
            checkButton.style.color = 'white';
        } else {
            checkButton.style.backgroundColor = 'yellow';
            checkButton.style.color = 'black';
        }
    }
}

function updateDirectionButton() {
    if (directionButton) {
        directionButton.textContent = 'Mode: ' + (currentDirection === 'across' ? 'Across' : 'Down');
    }
}

function toggleDirection() {
    currentDirection = currentDirection === 'across' ? 'down' : 'across';
    updateDirectionButton();
    if (selectedCell) {
        highlightWord(selectedCell);
    }
}

const puzzleData = parsePuzzleData(CrosswordPuzzleData);

directionButton = document.getElementById('toggle-direction');
if (directionButton) {
    directionButton.addEventListener('click', toggleDirection);
    updateDirectionButton();
}

checkButton = document.getElementById('check-answer');
if (checkButton) {
    checkButton.addEventListener('click', checkAnswers);
}

const checkAcrossBtn = document.getElementById('check-current-across');
if (checkAcrossBtn) {
    checkAcrossBtn.addEventListener('click', () => checkCurrentAnswer('across'));
}

const checkDownBtn = document.getElementById('check-current-down');
if (checkDownBtn) {
    checkDownBtn.addEventListener('click', () => checkCurrentAnswer('down'));
}

mobileInput = document.getElementById('mobile-input');
if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
        const val = mobileInput.value;
        if (!val) return;
        const letter = val.slice(-1);
        mobileInput.value = '';
        if (/^[a-zA-Z]$/.test(letter) && selectedCell) {
            selectedCell.style.color = '';
            selectedCell.textContent = letter.toUpperCase();
            autoAdvance();
        }
    });
    mobileInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
            e.preventDefault();
            handleBackspace();
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            moveSelection(e.key);
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (!selectedCell) return;
    if (mobileInput && document.activeElement === mobileInput) {
        // Prevent double character entry when the hidden mobile input is focused
        return;
    }
    const key = e.key;
    if (/^[a-zA-Z]$/.test(key)) {
        selectedCell.style.color = '';
        selectedCell.textContent = key.toUpperCase();
        autoAdvance();
    } else if (key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        moveSelection(key);
        if (key === 'ArrowUp' || key === 'ArrowDown') {
            currentDirection = 'down';
        }
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
            currentDirection = 'across';
        }
        updateDirectionButton();
    }
});

buildGrid(puzzleData);

buildClues(puzzleData.cluesAcross, puzzleData.cluesDown);

// Debug output to trace focus and pointer events on mobile
if (mobileInput) {
    mobileInput.addEventListener('focus', () =>
        console.log('mobile-input focus', Date.now()));
    mobileInput.addEventListener('blur', () =>
        console.log('mobile-input blur', Date.now()));
}

document.querySelectorAll('#grid .cell').forEach(cell => {
    ['pointerdown', 'pointerup', 'click'].forEach(ev =>
        cell.addEventListener(ev, () =>
            console.log(ev, cell.dataset.x, cell.dataset.y,
                'active:', document.activeElement.id)));
});

console.log('Crossword Viewer: Ready');

// Expose test helpers for console usage
window.testGridIsBuilt = testGridIsBuilt;
window.testCluesPresent = testCluesPresent;
window.logGridState = logGridState;

})();
