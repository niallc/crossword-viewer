// Crossword class module (v1.2)
import { parsePuzzle } from './puzzle-parser.js';

export const TEST_MODE = false;

function removeTextNodes(elem) {
  if (!elem) return;
  Array.from(elem.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      elem.removeChild(node);
    }
  });
}

function getArrowForDirection(direction, forward = true) {
  if (direction === 'across') {
    return forward ? 'ArrowRight' : 'ArrowLeft';
  }
  if (direction === 'down') {
    return forward ? 'ArrowDown' : 'ArrowUp';
  }
  return '';
}

function getMoveBackDir(currentDirection) {
  return currentDirection === 'across' ? 'ArrowLeft' : 'ArrowUp';
}

export default class Crossword {
  constructor(xmlData) {
    console.log('Crossword Viewer: Starting');
    if (typeof xmlData === 'undefined') {
      console.error('ERROR: CrosswordPuzzleData not found.');
      return;
    }
    this.selectedCell = null;
    this.highlightedCells = [];
    this.currentDirection = 'across';
    this.directionButton = null;
    this.feedbackCells = [];
    this.copyLinkButton = null;
    this.cellEls = [];
    this.puzzleData = parsePuzzle(xmlData);
    if (TEST_MODE) {
      this.debugEl = document.createElement('pre');
      this.debugEl.id = 'debug-log';
      this.debugEl.style.width = '100%';
      this.debugEl.style.height = '200px';
      this.debugEl.style.overflowY = 'scroll';
      this.debugEl.style.border = '1px solid #ccc';
      this.debugEl.style.backgroundColor = '#f0f0f0';
      this.debugEl.style.padding = '5px';
      this.debugEl.style.fontSize = '10px';
      document.body.appendChild(this.debugEl);
      this.debugLog('Crossword Initialized (v1.2). Logging is active.');
    } else {
      this.debugEl = null;
    }
  }

  debugLog(message) {
    if (!TEST_MODE || !this.debugEl) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const newLog = `[${timestamp}] ${message}`;
    // Prepend new messages so they appear at the top
    this.debugEl.textContent = newLog + '\n' + this.debugEl.textContent;
    const lines = this.debugEl.textContent.split('\n');
    if (lines.length > 100) { // Keep the log to a reasonable size
      this.debugEl.textContent = lines.slice(0, 100).join('\n');
    }
  }

  createCellElement(cellData, x, y) {
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
        num.setAttribute('contenteditable', 'false');
        cell.appendChild(num);
      }
      const letter = document.createElement('div');
      letter.classList.add('letter');
      letter.setAttribute('contenteditable', 'false');
      cell.appendChild(letter);
      cell.setAttribute('contenteditable', 'true');
      cell.setAttribute('inputmode', 'text');
      cell.tabIndex = 0;
      cell.addEventListener('pointerdown', (e) => {
        this.selectCell(cell);
        e.preventDefault();
      });

      // Unified input handler for both mobile and desktop.
      cell.addEventListener('input', (e) => this.handleInput(e));
    }

    return cell;
  }

  handleKeyDown(e) {
    if (!this.selectedCell) return;
    const key = e.key;
    const cell = this.selectedCell;

    this.debugLog(`--- handleKeyDown --- Key: "${key}"`);

    // We only need to control navigation and deletion.
    if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault();
      this.clearFeedback();
      this.handleBackspace();
      return;
    }
    if (key.startsWith('Arrow')) {
      e.preventDefault();
      this.clearFeedback();
      this.moveSelection(key);
      return;
    }

    // For any character input (e.g., "a", "A", or "Unidentified" on mobile),
    // we clear the cell's letter to prepare for the 'input' event.
    // We do NOT preventDefault(), so the browser's default action triggers 'input'.
    if (key.length === 1 || key === 'Unidentified') {
        this.debugLog('handleKeyDown: Character key detected. Clearing cell to prepare for input event.');
        const letterEl = cell.querySelector('.letter');
        if (letterEl) {
            letterEl.textContent = '';
        }
    }
  }

  handleInput(e) {
    const cell = e.target.closest('.cell');
    if (!cell || cell.classList.contains('block')) return;

    this.debugLog(`--- handleInput ---`);
    this.debugLog(`Type: ${e.inputType}, Data: "${e.data}"`);
    this.debugLog(`Cell textContent after browser input: "${cell.textContent.trim()}"`);

    // The 'input' event fires after the browser has modified the DOM.
    // Our job is to clean up and formalize the state.
    let letter = cell.textContent.trim();
    
    // Put the letter where it belongs and remove stray text nodes.
    removeTextNodes(cell); 

    if (letter) {
      letter = letter.slice(-1).toUpperCase(); // Take the last character typed
      if (/^[A-Z]$/.test(letter)) {
        this.debugLog(`handleInput: Extracted letter "${letter}". Setting it correctly.`);
        this.clearFeedback();
        this.setCellLetter(cell, letter);
        this.autoAdvance();
        this.saveStateToLocalStorage();
      } else {
        this.debugLog(`handleInput: Extracted content is not a letter. Clearing cell.`);
        this.setCellLetter(cell, ''); // Clear if not a valid letter
      }
    } else {
        // This can happen if the input was a delete action that we didn't catch in keydown
        this.debugLog(`handleInput: Cell textContent is empty. Assuming a deletion.`);
        this.setCellLetter(cell, '');
        this.saveStateToLocalStorage();
    }
  }

  // The rest of the functions are unchanged.
  // ... [buildGrid, buildClues, selectCell, etc.]

  buildGrid() {
    console.log('Building grid...');
    const data = this.puzzleData;
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const maxSize = Math.min(vmin * 0.8, 500);
    const cellSize = maxSize / Math.max(data.width, data.height);
    gridEl.style.setProperty('--cell-size', cellSize + 'px');
    gridEl.style.gridTemplateColumns = `repeat(${data.width}, var(--cell-size))`;
    gridEl.style.gridTemplateRows = `repeat(${data.height}, var(--cell-size))`;

    this.cellEls = Array.from({ length: data.height }, () => Array(data.width).fill(null));

    data.grid.forEach((row, y) => {
      row.forEach((cellData, x) => {
        const cellEl = this.createCellElement(cellData, x, y);
        this.cellEls[y][x] = cellEl;
        gridEl.appendChild(cellEl);
      });
    });
  }

  buildClues(across, down) {
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
      const enumStr = cl.enumeration || cl.length;
      li.appendChild(document.createTextNode(cl.text + ' (' + enumStr + ')'));
      // clue clicks were removed to prevent unwanted scrolling on mobile
      acrossEl.appendChild(li);
    });

    down.forEach(cl => {
      const li = document.createElement('li');
      li.dataset.number = cl.number;
      const num = document.createElement('span');
      num.className = 'clue-num';
      num.textContent = cl.number;
      li.appendChild(num);
      const enumStr = cl.enumeration || cl.length;
      li.appendChild(document.createTextNode(cl.text + ' (' + enumStr + ')'));
      // clue clicks were removed to prevent unwanted scrolling on mobile
      downEl.appendChild(li);
    });
    this.updateClueCompletion();
  }

  findFirstLetterCell() {
    for (let y = 0; y < this.puzzleData.height; y++) {
      for (let x = 0; x < this.puzzleData.width; x++) {
        if (this.puzzleData.grid[y][x].type !== 'block') {
          return this.cellEls[y][x];
        }
      }
    }
    return null;
  }

  selectCell(cell, shouldFocus = true) {
    if (cell.classList.contains('block')) {
      return;
    }

    if (this.selectedCell === cell) {
      this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
      this.highlightWord(cell);
      this.updateDirectionButton();
      return;
    }

    if (this.selectedCell) {
      this.selectedCell.classList.remove('selected');
    }
    this.selectedCell = cell;
    this.selectedCell.classList.add('selected');
    let cells = this.getWordCells(this.selectedCell, this.currentDirection);
    if (cells.length <= 1) {
      const other = this.currentDirection === 'across' ? 'down' : 'across';
      const otherCells = this.getWordCells(this.selectedCell, other);
      if (otherCells.length > cells.length) {
        this.currentDirection = other;
        cells = otherCells;
        this.updateDirectionButton();
      }
    }
    this.highlightWord(this.selectedCell);
    if (shouldFocus && this.selectedCell.focus) {
      try {
        this.selectedCell.focus({ preventScroll: true });
      } catch (e) {
        this.selectedCell.focus();
      }
    }
  }

  testGridIsBuilt() {
    return this.cellEls.length > 0 && this.cellEls[0].length > 0;
  }

  testCluesPresent() {
    return (
      document.querySelectorAll('#clues-across li').length > 0 &&
      document.querySelectorAll('#clues-down li').length > 0
    );
  }

  moveSelection(direction) {
    if (!this.selectedCell) return false;
    this.debugLog(`moveSelection: Moving ${direction}`);
    const x = parseInt(this.selectedCell.dataset.x, 10);
    const y = parseInt(this.selectedCell.dataset.y, 10);
    let nx = x, ny = y;
    if (direction === 'ArrowUp') ny -= 1;
    if (direction === 'ArrowDown') ny += 1;
    if (direction === 'ArrowLeft') nx -= 1;
    if (direction === 'ArrowRight') nx += 1;
    let next = null;
    if (ny >= 0 && ny < this.puzzleData.height && nx >= 0 && nx < this.puzzleData.width) {
      next = this.cellEls[ny][nx];
    }
    if (next && !next.classList.contains('block')) {
      this.selectCell(next);
      return true;
    }
    this.debugLog(`moveSelection: Move failed (hit edge or block).`);
    return false;
  }

  setCellLetter(cell, letter) {
    if (!cell) {
      this.debugLog('setCellLetter: FAILED - cell is null.');
      return;
    }
    this.debugLog(`setCellLetter: Setting letter "${letter.toUpperCase()}" for cell (${cell.dataset.x}, ${cell.dataset.y})`);
    removeTextNodes(cell);
    const letterEl = cell.querySelector('.letter');
    if (letterEl) {
      letterEl.textContent = letter.toUpperCase();
    } else {
      this.debugLog(`setCellLetter: FAILED - .letter element not found in cell.`);
    }
  }

  autoAdvance() {
    this.debugLog('autoAdvance: Attempting to advance selection.');
    let moved = false;
    moved = this.moveSelection(getArrowForDirection(this.currentDirection, true));
    if (!moved) {
      this.debugLog('autoAdvance: Could not move in current direction. Toggling direction.');
      this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
      this.updateDirectionButton();
      this.moveSelection(getArrowForDirection(this.currentDirection, true));
    }
  }

  logGridState() {
    const letters = [];
    this.cellEls.forEach(row => {
      row.forEach(cell => {
        if (!cell) return;
        const letterEl = cell.querySelector('.letter');
        letters.push(letterEl ? (letterEl.textContent || ' ') : ' ');
      });
    });
    const str = letters.join('');
    console.log('Grid letters:', str);
  }

  saveStateToLocalStorage() {
    try {
      const serialized = this.serializeGridState();
      localStorage.setItem('crosswordState', serialized);
      this.updateClueCompletion();
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  loadStateFromLocalStorage() {
    try {
      const serialized = localStorage.getItem('crosswordState');
      if (serialized) {
        this.applyGridState(serialized);
        return true;
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
    return false;
  }

  serializeGridState() {
    const letters = [];
    for (let y = 0; y < this.puzzleData.height; y++) {
      for (let x = 0; x < this.puzzleData.width; x++) {
        const data = this.puzzleData.grid[y][x];
        if (data.type === 'letter') {
          const cell = this.cellEls[y][x];
          const letterEl = cell.querySelector('.letter');
          letters.push(letterEl && letterEl.textContent ? letterEl.textContent : ' ');
        }
      }
    }
    return letters.join('');
  }

  applyGridState(serialized) {
    const letters = serialized.split('');
    let idx = 0;
    for (let y = 0; y < this.puzzleData.height; y++) {
      for (let x = 0; x < this.puzzleData.width; x++) {
        const data = this.puzzleData.grid[y][x];
        if (data.type === 'letter') {
          const ch = letters[idx++] || ' ';
          const cell = this.cellEls[y][x];
          const letterEl = cell.querySelector('.letter');
          if (letterEl) {
            letterEl.textContent = ch === ' ' ? '' : ch;
          }
          cell.style.color = '';
        }
      }
    }
    this.updateClueCompletion();
  }

  rleEncode(str) {
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

  rleDecode(str) {
    let result = '';
    let countStr = '';
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch >= '0' && ch <= '9') {
        countStr += ch;
      } else {
        const count = parseInt(countStr || '1', 10);
        result += ch.repeat(count);
        countStr = '';
      }
    }
    return result;
  }

  getShareableURL() {
    const serialized = this.serializeGridState();
    const compressed = this.rleEncode(serialized);
    const encoded = btoa(compressed);
    const url = new URL(window.location.href);
    url.hash = encoded;
    return url.href;
  }

  loadStateFromURL() {
    const hash = window.location.hash.slice(1);
    if (!hash) return false;
    try {
      const compressed = atob(hash);
      const serialized = this.rleDecode(compressed);
      this.applyGridState(serialized);
      return true;
    } catch (e) {
      console.error('Failed to load state from URL', e);
    }
    return false;
  }

  handleBackspace() {
    if (!this.selectedCell) return;
    this.debugLog(`handleBackspace: Triggered.`);
    const letterEl = this.selectedCell.querySelector('.letter');
    if (letterEl && letterEl.textContent) {
      this.debugLog(`handleBackspace: Clearing current cell.`);
      letterEl.textContent = '';
      this.saveStateToLocalStorage();
      return;
    }
    this.debugLog(`handleBackspace: Current cell empty. Moving back.`);
    const moved = this.moveSelection(getMoveBackDir(this.currentDirection));
    if (moved) {
      const letterEl2 = this.selectedCell.querySelector('.letter');
      if (letterEl2) {
        this.debugLog(`handleBackspace: Clearing new selected cell.`);
        letterEl2.textContent = '';
      }
      this.saveStateToLocalStorage();
    }
  }

  getWordCells(cell, direction) {
    if (!cell) return [];
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    const cells = [];
    if (this.puzzleData.grid[y][x].type === 'block') return cells;
    if (direction === 'across') {
      let sx = x;
      while (sx > 0 && this.puzzleData.grid[y][sx - 1] && this.puzzleData.grid[y][sx - 1].type !== 'block') {
        sx--;
      }
      for (let cx = sx; cx < this.puzzleData.width && this.puzzleData.grid[y][cx] && this.puzzleData.grid[y][cx].type !== 'block'; cx++) {
        const el = this.cellEls[y][cx];
        cells.push({ el, data: this.puzzleData.grid[y][cx] });
      }
    } else if (direction === 'down') {
      let sy = y;
      while (sy > 0 && this.puzzleData.grid[sy - 1][x] && this.puzzleData.grid[sy - 1][x].type !== 'block') {
        sy--;
      }
      for (let cy = sy; cy < this.puzzleData.height && this.puzzleData.grid[cy][x] && this.puzzleData.grid[cy][x].type !== 'block'; cy++) {
        const el = this.cellEls[cy][x];
        cells.push({ el, data: this.puzzleData.grid[cy][x] });
      }
    }
    return cells;
  }

  highlightWord(cell) {
    this.highlightedCells.forEach(c => c.classList.remove('highlight'));
    this.highlightedCells = [];
    const cells = this.getWordCells(cell, this.currentDirection);
    cells.forEach(({ el }) => {
      el.classList.add('highlight');
      this.highlightedCells.push(el);
    });

    document.querySelectorAll('#clues li.highlight').forEach(li => li.classList.remove('highlight'));
    const clueNumber = cells.length > 0 ? cells[0].data.number : null;
    if (clueNumber) {
      const selector = this.currentDirection === 'across'
        ? `#clues-across li[data-number="${clueNumber}"]`
        : `#clues-down li[data-number="${clueNumber}"]`;
      const clueEl = document.querySelector(selector);
      if (clueEl) {
        clueEl.classList.add('highlight');
      }
    }
  }

  clearFeedback() {
    this.feedbackCells.forEach(c => {
      c.style.backgroundColor = '';
      const letterEl = c.querySelector('.letter');
      if (letterEl) {
        letterEl.style.color = '';
      }
    });
    this.feedbackCells = [];
  }

  checkLetter() {
    this.clearFeedback();
    if (!this.selectedCell) return;
    const x = parseInt(this.selectedCell.dataset.x, 10);
    const y = parseInt(this.selectedCell.dataset.y, 10);
    const data = this.puzzleData.grid[y][x];
    if (data.type !== 'letter') return;
    const expected = (data.solution || '').toUpperCase();
    const letterEl = this.selectedCell.querySelector('.letter');
    const actual = (letterEl && letterEl.textContent || '').trim().toUpperCase();
    if (TEST_MODE) {
      console.log('checkLetter', { x, y, expected, actual });
    }
    if (actual && letterEl) {
      if (actual === expected) {
        letterEl.style.color = 'green';
      } else {
        letterEl.style.color = 'red';
      }
      this.feedbackCells.push(this.selectedCell);
    }
  }

  checkWord() {
    this.clearFeedback();
    if (!this.selectedCell) return;
    const cells = this.getWordCells(this.selectedCell, this.currentDirection);
    cells.forEach(({ el, data }) => {
      const expected = (data.solution || '').toUpperCase();
      const letterEl = el.querySelector('.letter');
      const actual = (letterEl && letterEl.textContent || '').trim().toUpperCase();
      if (TEST_MODE) {
        const x = parseInt(el.dataset.x, 10);
        const y = parseInt(el.dataset.y, 10);
        console.log('checkWord', { x, y, expected, actual });
      }
      if (actual && letterEl) {
        if (actual === expected) {
          letterEl.style.color = 'green';
        } else {
          letterEl.style.color = 'red';
        }
        this.feedbackCells.push(el);
      }
    });
  }

  revealCurrentClue() {
    if (!this.selectedCell) return;
    const cells = this.getWordCells(this.selectedCell, this.currentDirection);
    cells.forEach(({ el, data }) => {
      const letterEl = el.querySelector('.letter');
      if (letterEl) {
        letterEl.textContent = (data.solution || '').toUpperCase();
      }
    });
    this.saveStateToLocalStorage();
    this.updateClueCompletion();
  }

  revealGrid() {
    for (let y = 0; y < this.puzzleData.height; y++) {
      for (let x = 0; x < this.puzzleData.width; x++) {
        const data = this.puzzleData.grid[y][x];
        if (data.type === 'letter') {
          const el = this.cellEls[y][x];
          const letterEl = el.querySelector('.letter');
          if (letterEl) {
            letterEl.textContent = (data.solution || '').toUpperCase();
          }
        }
      }
    }
    this.saveStateToLocalStorage();
    this.updateClueCompletion();
  }

  checkClueGroup(selector, direction, starts) {
    document.querySelectorAll(selector).forEach(li => {
      const num = li.dataset.number;
      const pos = starts[num];
      if (!pos) return;
      const cell = this.cellEls[pos.y][pos.x];
      const cells = this.getWordCells(cell, direction);
      const complete = cells.every(({ el }) => {
        const letterEl = el.querySelector('.letter');
        return letterEl && letterEl.textContent && letterEl.textContent.trim();
      });
      if (complete) {
        li.classList.add('complete');
      } else {
        li.classList.remove('complete');
      }
    });
  }

  updateClueCompletion() {
    this.checkClueGroup('#clues-across li', 'across', this.puzzleData.acrossStarts);
    this.checkClueGroup('#clues-down li', 'down', this.puzzleData.downStarts);
  }

  selectClue(number, direction) {
    const map = direction === 'across' ? this.puzzleData.acrossStarts : this.puzzleData.downStarts;
    const pos = map[number];
    if (!pos) return;
    const cell = this.cellEls[pos.y] && this.cellEls[pos.y][pos.x];
    if (cell) {
      this.currentDirection = direction;
      this.updateDirectionButton();
      this.selectCell(cell, false);
    }
  }

  updateDirectionButton() {
    if (this.directionButton) {
      this.directionButton.textContent = 'Mode: ' + (this.currentDirection === 'across' ? 'Across' : 'Down');
    }
  }

  toggleDirection() {
    this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
    this.updateDirectionButton();
    if (this.selectedCell) {
      this.highlightWord(this.selectedCell);
    }
  }
}
