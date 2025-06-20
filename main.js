// Crossword Viewer implementation

(function(){

const TEST_MODE = false;

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
let copyLinkButton = null;
let clearProgressButton = null;

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

  cluesAcross.forEach(cl => {
    cl.length = acrossLengths[cl.number] || 0;
  });
  cluesDown.forEach(cl => {
    cl.length = downLengths[cl.number] || 0;
  });

  return { width, height, grid, cluesAcross, cluesDown, acrossStarts, downStarts };
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
    const letter = document.createElement('div');
    letter.classList.add('letter');
    cell.appendChild(letter);
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
    li.addEventListener('pointerdown', (e) => {
      selectClue(cl.number, 'across');
      e.preventDefault();
    });
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
    li.addEventListener('pointerdown', (e) => {
      selectClue(cl.number, 'down');
      e.preventDefault();
    });
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
    if (mobileInput.focus) {
      try {
        mobileInput.focus({ preventScroll: true });
      } catch (e) {
        mobileInput.focus();
      }
    }
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
    const letters = Array.from(cells).map(c => {
        const letterEl = c.querySelector('.letter');
        return letterEl ? (letterEl.textContent || ' ') : ' ';
    }).join('');
    console.log('Grid letters:', letters);
}

function saveStateToLocalStorage() {
    try {
        const serialized = serializeGridState();
        localStorage.setItem('crosswordState', serialized);
    } catch (e) {
        console.error('Failed to save state to localStorage', e);
    }
}

function loadStateFromLocalStorage() {
    try {
        const serialized = localStorage.getItem('crosswordState');
        if (serialized) {
            applyGridState(serialized);
            return true;
        }
    } catch (e) {
        console.error('Failed to load state from localStorage', e);
    }
    return false;
}

function serializeGridState() {
    const letters = [];
    document.querySelectorAll('#grid .cell').forEach(cell => {
        const x = parseInt(cell.dataset.x, 10);
        const y = parseInt(cell.dataset.y, 10);
        const data = puzzleData.grid[y][x];
        if (data.type === 'letter') {
            const letterEl = cell.querySelector('.letter');
            letters.push(letterEl && letterEl.textContent ? letterEl.textContent : ' ');
        }
    });
    return letters.join('');
}

function applyGridState(serialized) {
    const letters = serialized.split('');
    let idx = 0;
    document.querySelectorAll('#grid .cell').forEach(cell => {
        const x = parseInt(cell.dataset.x, 10);
        const y = parseInt(cell.dataset.y, 10);
        const data = puzzleData.grid[y][x];
        if (data.type === 'letter') {
            const ch = letters[idx++] || ' ';
            const letterEl = cell.querySelector('.letter');
            if (letterEl) {
                letterEl.textContent = ch === ' ' ? '' : ch;
            }
            cell.style.color = '';
        }
    });
}

function rleEncode(str) {
    if (!str) return '';
    let result = '';
    let count = 1;
    for (let i = 1; i <= str.length; i++) {
        if (str[i] === str[i - 1]) {
            count++;
        } else {
            result += (count > 1 ? count : '') + str[i - 1];
            count = 1;
        }
    }
    return result;
}

function rleDecode(str) {
    let result = '';
    let countStr = '';
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch >= '0' && ch <= '9') {
            countStr += ch;
        } else {
            const count = countStr ? parseInt(countStr, 10) : 1;
            result += ch.repeat(count);
            countStr = '';
        }
    }
    return result;
}

function getShareableURL() {
    const serialized = serializeGridState();
    const compressed = rleEncode(serialized);
    const encoded = btoa(compressed);
    return location.origin + location.pathname + '#state=' + encoded;
}

function loadStateFromURL() {
    let encoded = null;
    if (location.hash.startsWith('#state=')) {
        encoded = location.hash.slice(7);
    } else {
        const params = new URLSearchParams(location.search);
        encoded = params.get('state');
    }
    if (encoded) {
        try {
            const compressed = atob(encoded);
            const serialized = rleDecode(compressed);
            applyGridState(serialized);
            return true;
        } catch (e) {
            console.error('Failed to load state from URL', e);
        }
    }
    return false;
}

function handleBackspace() {
    if (!selectedCell) return;
    const letterEl = selectedCell.querySelector('.letter');
    if (letterEl && letterEl.textContent) {
        letterEl.textContent = '';
        selectedCell.style.color = '';
        const dir = currentDirection === 'across' ? 'ArrowLeft' : 'ArrowUp';
        moveSelection(dir);
    } else {
        const dir = currentDirection === 'across' ? 'ArrowLeft' : 'ArrowUp';
        if (moveSelection(dir)) {
            const letterEl2 = selectedCell.querySelector('.letter');
            if (letterEl2) letterEl2.textContent = '';
            selectedCell.style.color = '';
        }
    }
    saveStateToLocalStorage();
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

function selectClue(number, direction) {
    const map = direction === 'across' ? puzzleData.acrossStarts : puzzleData.downStarts;
    const pos = map[number];
    if (!pos) return;
    const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
    if (cell) {
        currentDirection = direction;
        updateDirectionButton();
        selectCell(cell);
    }
}

function checkCurrentAnswer(direction) {
    if (!selectedCell) return;
    const cells = getWordCells(selectedCell, direction);
    if (cells.length === 0) return;
    cells.forEach(({ el, data }) => {
        const expected = (data.solution || '').toUpperCase();
        const letterEl = el.querySelector('.letter');
        const actual = (letterEl && letterEl.textContent || '').trim().toUpperCase();
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
            const letterEl = cell.querySelector('.letter');
            const actual = (letterEl && letterEl.textContent || '').trim().toUpperCase();
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
        const letter = e.data || mobileInput.value.slice(-1);
        mobileInput.value = '';
        if (!letter) return;
        if (/^[a-zA-Z]$/.test(letter) && selectedCell) {
            selectedCell.style.color = '';
            const letterEl = selectedCell.querySelector('.letter');
            if (letterEl) letterEl.textContent = letter.toUpperCase();
            autoAdvance();
            saveStateToLocalStorage();
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
        const letterEl = selectedCell.querySelector('.letter');
        if (letterEl) letterEl.textContent = key.toUpperCase();
        autoAdvance();
        saveStateToLocalStorage();
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

const loadedFromURL = loadStateFromURL();
if (!loadedFromURL) {
    loadStateFromLocalStorage();
}

const firstCell = document.querySelector('#grid .cell:not(.block)');
if (firstCell) {
    selectCell(firstCell);
}

copyLinkButton = document.getElementById('copy-link');
if (copyLinkButton) {
    copyLinkButton.addEventListener('click', () => {
        const url = getShareableURL();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                copyLinkButton.textContent = 'Link Copied!';
                setTimeout(() => copyLinkButton.textContent = 'Copy Share Link', 2000);
            }).catch(err => console.error('Clipboard error', err));
        } else {
            console.warn('Clipboard API not available');
        }
    });
}

clearProgressButton = document.getElementById('clear-progress');
if (clearProgressButton) {
    clearProgressButton.addEventListener('click', () => {
        localStorage.removeItem('crosswordState');
        applyGridState('');
    });
}

// Debug output to trace focus and pointer events on mobile
if (TEST_MODE && mobileInput) {
    mobileInput.addEventListener('focus', () =>
        console.log('mobile-input focus', Date.now()));
    mobileInput.addEventListener('blur', () =>
        console.log('mobile-input blur', Date.now()));
}

if (TEST_MODE) {
    document.querySelectorAll('#grid .cell').forEach(cell => {
        ['pointerdown', 'pointerup', 'click'].forEach(ev =>
            cell.addEventListener(ev, () =>
                console.log(ev, cell.dataset.x, cell.dataset.y,
                    'active:', document.activeElement.id)));
    });
}

console.log('Crossword Viewer: Ready');

// Expose test helpers for console usage
window.testGridIsBuilt = testGridIsBuilt;
window.testCluesPresent = testCluesPresent;
window.logGridState = logGridState;
window.getShareableURL = getShareableURL;

})();
