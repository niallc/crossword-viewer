// Crossword class module (v1.7)
import { parsePuzzle } from './puzzle-parser.js';
import { getWordCells } from './grid-utils.js';
import {
  serializeGridState,
  applyGridState,
  rleEncode,
  rleDecode
} from './state-utils.js';

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
  constructor(xmlData, puzzleId) {
    console.log('Crossword Viewer: Starting');
    if (typeof xmlData === 'undefined') {
      console.error('ERROR: CrosswordPuzzleData not found.');
      return;
    }
    this.selectedCell = null;
    this.highlightedCells = [];
    this.currentDirection = 'across';
    this.feedbackCells = [];
    this.copyLinkButton = null;
    this.cellEls = [];
    this.pointerInfo = null;
    this.puzzleId = puzzleId; // ID for localStorage
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
      this.debugLog('Crossword Initialized (v1.7). Logging is active.');
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

  getStorageKey() {
    // Create a safe key from the puzzle filename.
    const safeId = this.puzzleId.replace(/[^a-zA-Z0-9]/g, '_');
    return `crosswordState_${safeId}`;
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
        cell.appendChild(num);
      }
      const letter = document.createElement('div');
      letter.classList.add('letter');
      cell.appendChild(letter);
      
      // contenteditable is needed for mobile keyboards to appear.
      cell.setAttribute('contenteditable', 'true');
      cell.setAttribute('inputmode', 'text');

      // The 'input' event handles mobile virtual keyboards.
      cell.addEventListener('input', (e) => this.handleInput(e));

      cell.addEventListener('pointerdown', (e) => {
        this.pointerInfo = {
          cell,
          pointerId: e.pointerId,
          x: e.clientX,
          y: e.clientY
        };
      });
      cell.addEventListener('pointerup', (e) => {
        if (!this.pointerInfo || this.pointerInfo.pointerId !== e.pointerId) {
          this.pointerInfo = null;
          return;
        }
        const dx = e.clientX - this.pointerInfo.x;
        const dy = e.clientY - this.pointerInfo.y;
        const dist = Math.hypot(dx, dy);
        const sameCell = this.pointerInfo.cell === cell;
        this.pointerInfo = null;
        if (sameCell && dist < 10) {
          this.selectCell(cell);
          e.preventDefault();
        }
      });
      cell.addEventListener('pointercancel', () => {
        this.pointerInfo = null;
      });
    }

    return cell;
  }

  handleKeyDown(e) {
    if (!this.selectedCell) return;
    const key = e.key;

    // Handle navigation and deletion directly.
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

    // Handle character input directly for physical keyboards.
    // This provides a reliable experience on desktop (especially Firefox).
    // We prevent the default action, which stops the browser from inserting
    // the character itself and prevents the 'input' event from firing.
    if (key.length === 1 && key.match(/^[a-zA-Z]$/)) {
        e.preventDefault();
        this.clearFeedback();
        this.setCellLetter(this.selectedCell, key);
        this.autoAdvance();
        this.saveStateToLocalStorage();
        return;
    }
  }

  handleInput(e) {
    const cell = e.target.closest('.cell');
    if (!cell || cell.classList.contains('block')) return;

    // This handler is now primarily for mobile virtual keyboards.
    // The browser modifies the DOM first, and we clean it up.
    let letter = cell.textContent.trim();
    
    // Clean up stray text nodes the browser might have added.
    removeTextNodes(cell); 

    if (letter) {
      // Take the last character typed. This handles mobile autocorrect
      // and ensures only one character ends up in the cell.
      letter = letter.slice(-1).toUpperCase(); 
      if (/^[A-Z]$/.test(letter)) {
        this.clearFeedback();
        this.setCellLetter(cell, letter);
        this.autoAdvance();
        this.saveStateToLocalStorage();
      } else {
        // If the final character isn't a letter (e.g., a symbol or number), clear the cell.
        this.setCellLetter(cell, ''); 
      }
    } else {
        // This handles backspace/delete from a virtual keyboard.
        this.setCellLetter(cell, '');
        this.saveStateToLocalStorage();
    }
  }

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
    console.log(`Building clues... (Across: ${across.length}, Down: ${down.length})`);
    if (across.length === 0 && down.length === 0) {
        console.error("CRITICAL: No clues were provided to buildClues. The clue lists will be empty.");
    }
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
      li.addEventListener('pointerdown', (e) => {
        this.pointerInfo = {
          element: li,
          pointerId: e.pointerId,
          x: e.clientX,
          y: e.clientY
        };
      });
      li.addEventListener('pointerup', (e) => {
        if (!this.pointerInfo || this.pointerInfo.pointerId !== e.pointerId) {
          this.pointerInfo = null;
          return;
        }
        const dx = e.clientX - this.pointerInfo.x;
        const dy = e.clientY - this.pointerInfo.y;
        const dist = Math.hypot(dx, dy);
        const sameEl = this.pointerInfo.element === li;
        this.pointerInfo = null;
        if (sameEl && dist < 10) {
          this.selectClue(cl.number, 'across');
          document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          e.preventDefault();
        }
      });
      li.addEventListener('pointercancel', () => {
        this.pointerInfo = null;
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
      const enumStr = cl.enumeration || cl.length;
      li.appendChild(document.createTextNode(cl.text + ' (' + enumStr + ')'));
      li.addEventListener('pointerdown', (e) => {
        this.pointerInfo = {
          element: li,
          pointerId: e.pointerId,
          x: e.clientX,
          y: e.clientY
        };
      });
      li.addEventListener('pointerup', (e) => {
        if (!this.pointerInfo || this.pointerInfo.pointerId !== e.pointerId) {
          this.pointerInfo = null;
          return;
        }
        const dx = e.clientX - this.pointerInfo.x;
        const dy = e.clientY - this.pointerInfo.y;
        const dist = Math.hypot(dx, dy);
        const sameEl = this.pointerInfo.element === li;
        this.pointerInfo = null;
        if (sameEl && dist < 10) {
          this.selectClue(cl.number, 'down');
          document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          e.preventDefault();
        }
      });
      li.addEventListener('pointercancel', () => {
        this.pointerInfo = null;
      });
      downEl.appendChild(li);
    });
    this.updateClueCompletion();
  }


  selectCell(cell, shouldFocus = true) {
    if (cell.classList.contains('block')) {
      return;
    }

    if (this.selectedCell === cell) {
      this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
      this.highlightWord(cell);
      return;
    }

    if (this.selectedCell) {
      this.selectedCell.classList.remove('selected');
    }
    this.selectedCell = cell;
    this.selectedCell.classList.add('selected');
    let cells = getWordCells(this.puzzleData, this.cellEls, this.selectedCell, this.currentDirection);
    if (cells.length <= 1) {
      const other = this.currentDirection === 'across' ? 'down' : 'across';
      const otherCells = getWordCells(this.puzzleData, this.cellEls, this.selectedCell, other);
      if (otherCells.length > cells.length) {
        this.currentDirection = other;
        cells = otherCells;
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

  moveSelection(direction) {
    if (!this.selectedCell) return false;
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
    return false;
  }

  setCellLetter(cell, letter) {
    if (!cell) {
      return;
    }
    const letterEl = cell.querySelector('.letter');
    if (letterEl) {
      letterEl.textContent = letter.toUpperCase();
    }
  }

  autoAdvance() {
    let moved = false;
    moved = this.moveSelection(getArrowForDirection(this.currentDirection, true));
    if (!moved) {
      this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
      this.moveSelection(getArrowForDirection(this.currentDirection, true));
    }
  }

  saveStateToLocalStorage() {
    try {
      const serialized = serializeGridState(this.puzzleData, this.cellEls);
      localStorage.setItem(this.getStorageKey(), serialized);
      this.updateClueCompletion();
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  loadStateFromLocalStorage() {
    try {
      let serialized = localStorage.getItem(this.getStorageKey());

      if (!serialized && this.puzzleId === 'social_deduction_ok.xml') {
        console.log("Checking for legacy 'crosswordState' to migrate...");
        const oldState = localStorage.getItem('crosswordState');
        if (oldState) {
          console.log("Found legacy state. Migrating...");
          serialized = oldState;
          applyGridState(this.puzzleData, this.cellEls, serialized);
          this.saveStateToLocalStorage(); 
          localStorage.removeItem('crosswordState');
          console.log("Migration complete.");
          return true;
        }
      }

      if (serialized) {
        applyGridState(this.puzzleData, this.cellEls, serialized);
        return true;
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
    return false;
  }


  getShareableURL() {
    const serialized = serializeGridState(this.puzzleData, this.cellEls);
    const compressed = rleEncode(serialized);
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
      const serialized = rleDecode(compressed);
      applyGridState(this.puzzleData, this.cellEls, serialized);
      return true;
    } catch (e) {
      console.error('Failed to load state from URL', e);
    }
    return false;
  }

  handleBackspace() {
    if (!this.selectedCell) return;
    const letterEl = this.selectedCell.querySelector('.letter');
    if (letterEl && letterEl.textContent) {
      letterEl.textContent = '';
      this.saveStateToLocalStorage();
      return;
    }
    const moved = this.moveSelection(getMoveBackDir(this.currentDirection));
    if (moved) {
      const letterEl2 = this.selectedCell.querySelector('.letter');
      if (letterEl2) {
        letterEl2.textContent = '';
      }
      this.saveStateToLocalStorage();
    }
  }


  highlightWord(cell) {
    this.highlightedCells.forEach(c => c.classList.remove('highlight'));
    this.highlightedCells = [];
    const cells = getWordCells(this.puzzleData, this.cellEls, cell, this.currentDirection);
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

    this.updateCurrentClue();
  }

  updateCurrentClue() {
    const topEl = document.getElementById('active-clue-top');
    const bottomEl = document.getElementById('active-clue-bottom');
    if (!topEl && !bottomEl) return;

    if (!this.selectedCell) {
      if (topEl) topEl.textContent = '';
      if (bottomEl) bottomEl.textContent = '';
      return;
    }

    const cells = getWordCells(this.puzzleData, this.cellEls, this.selectedCell, this.currentDirection);
    if (cells.length === 0) {
      if (topEl) topEl.textContent = '';
      if (bottomEl) bottomEl.textContent = '';
      return;
    }

    const clueNumber = cells[0].data.number;
    const clues = this.currentDirection === 'across'
      ? this.puzzleData.cluesAcross
      : this.puzzleData.cluesDown;
    const clue = clues.find(cl => cl.number === clueNumber);
    if (!clue) {
      if (topEl) topEl.textContent = '';
      if (bottomEl) bottomEl.textContent = '';
      return;
    }
    const enumStr = clue.enumeration || clue.length;
    const text = `${clue.number}. ${clue.text} (${enumStr})`;
    if (topEl) topEl.textContent = text;
    if (bottomEl) bottomEl.textContent = text;
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
    const cells = getWordCells(this.puzzleData, this.cellEls, this.selectedCell, this.currentDirection);
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
    const cells = getWordCells(this.puzzleData, this.cellEls, this.selectedCell, this.currentDirection);
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
      const cells = getWordCells(this.puzzleData, this.cellEls, cell, direction);
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
      this.selectCell(cell, false);
    }
  }

}
