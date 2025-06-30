// Crossword class module (v2.4 - Added architectural documentation)
import { parsePuzzle } from './puzzle-parser.js';
import { getWordCells } from './grid-utils.js';
import {
  serializeGridState,
  applyGridState,
  rleEncode,
  rleDecode
} from './state-utils.js';

//================================================================================
// ARCHITECTURAL NOTE: THE "HIDDEN INPUT" METHOD FOR KEYBOARD INPUT
//--------------------------------------------------------------------------------
// The primary challenge in this application is handling text input reliably
// across all major browsers (Desktop Chrome/Firefox, Mobile Safari/Chrome).
//
// Initial attempts using `contenteditable` on the grid cells proved to be highly
// unreliable and buggy:
// - Mobile keyboards would often fail to appear or would disappear unexpectedly.
// - Text could be inserted in the wrong place (e.g., next to the clue number).
// - Firefox had specific bugs blocking input on certain cells.
// - It was difficult to enforce a single-character limit per cell.
//
// To solve these issues, this application uses a standard, robust web development
// pattern that decouples the visual grid from the input mechanism.
//
// The architecture has three key parts:
//
// 1. A NON-EDITABLE VISUAL GRID:
//    The grid cells (`<div class="cell">`) are purely for display. They are not
//    `contenteditable`. This prevents the browser from directly manipulating the
//    grid's structure, which was a major source of bugs.
//
// 2. A SINGLE, HIDDEN <input> ELEMENT:
//    A standard `<input type="text">` element exists in the DOM but is moved
//    off-screen with CSS. This input acts as the single, reliable gateway for
//    all keyboard events, both physical and virtual (mobile).
//
// 3. JAVASCRIPT-CONTROLLED EVENT FLOW:
//    - When a user taps/clicks a visual grid cell, our JavaScript calls `.focus()`
//      on the hidden input. This is the W3C-recommended way to reliably trigger
//      the virtual keyboard on mobile devices.
//    - An `input` event listener on the hidden input captures the typed character.
//      It updates the correct visual cell's `.letter` div and immediately clears
//      the hidden input, making it ready for the next keystroke.
//    - A `keydown` listener on the same hidden input handles non-character keys
//      like Backspace and the arrow keys for navigation and deletion.
//
// This design is superior because it sidesteps the notoriously inconsistent
// `contenteditable` attribute and relies instead on the highly optimized and
// standardized behavior of the `<input>` element, ensuring a consistent user
// experience across all platforms.
//================================================================================

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
    console.log('Crossword Viewer: Starting v2.4');
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
    this.puzzleId = puzzleId;
    this.puzzleData = parsePuzzle(xmlData);

    // Get the hidden input element and bind event handlers
    this.hiddenInput = document.getElementById('hidden-input');
    if (!this.hiddenInput) {
        console.error("CRITICAL: #hidden-input element not found in the DOM.");
        return;
    }
    this.hiddenInput.addEventListener('input', (e) => this.handleCharacterInput(e));
    this.hiddenInput.addEventListener('keydown', (e) => this.handleNavigation(e));
  }

  getStorageKey() {
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
      
      // Event listeners to handle cell selection and focus the hidden input.
      cell.addEventListener('pointerdown', (e) => {
        this.pointerInfo = { cell, pointerId: e.pointerId, x: e.clientX, y: e.clientY };
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
        if (sameCell && dist < 10) { // Check for a tap/click vs. a drag
          this.selectCell(cell);
          e.preventDefault();
        }
      });
      cell.addEventListener('pointercancel', () => { this.pointerInfo = null; });
    }
    return cell;
  }

  // Handles character entry from both physical and virtual keyboards via the hidden input.
  handleCharacterInput(e) {
    if (!this.selectedCell) return;

    const value = this.hiddenInput.value;
    if (value) {
        const letter = value.slice(-1).toUpperCase();
        if (letter.match(/^[A-Z]$/)) {
            this.clearFeedback();
            this.setCellLetter(this.selectedCell, letter);
            this.autoAdvance();
            this.saveStateToLocalStorage();
        }
    }
    // Crucially, clear the hidden input immediately after processing.
    this.hiddenInput.value = '';
  }

  // Handles navigation (arrows) and deletion (Backspace) from the hidden input.
  handleNavigation(e) {
    if (!this.selectedCell) return;
    const key = e.key;

    if (key === 'Backspace' || key === 'Delete') {
      e.preventDefault();
      this.clearFeedback();
      this.handleBackspace();
    } else if (key.startsWith('Arrow')) {
      e.preventDefault();
      this.clearFeedback();
      this.moveSelection(key);
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
      li.addEventListener('click', () => this.selectClue(cl.number, 'across'));
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
      li.addEventListener('click', () => this.selectClue(cl.number, 'down'));
      downEl.appendChild(li);
    });
    this.updateClueCompletion();
  }

  selectCell(cell) {
    if (cell.classList.contains('block')) return;

    if (this.selectedCell === cell) {
      this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
    } else {
        if (this.selectedCell) {
          this.selectedCell.classList.remove('selected');
        }
        this.selectedCell = cell;
        this.selectedCell.classList.add('selected');

        // If the current direction doesn't form a valid word, switch directions.
        let cells = getWordCells(this.puzzleData, this.cellEls, this.selectedCell, this.currentDirection);
        if (cells.length <= 1) {
          const otherDir = this.currentDirection === 'across' ? 'down' : 'across';
          const otherCells = getWordCells(this.puzzleData, this.cellEls, this.selectedCell, otherDir);
          if (otherCells.length > cells.length) {
            this.currentDirection = otherDir;
          }
        }
    }
    this.highlightWord(this.selectedCell);
    
    //============================================================================
    // MOBILE KEYBOARD FIX:
    // On mobile browsers, calling .focus() directly within a 'click' or 'pointerup'
    // event handler can cause a "focus battle". The browser might immediately
    // move focus back to the body after the event, causing the virtual keyboard
    // to flash on screen and then instantly disappear.
    //
    // Wrapping the .focus() call in a `setTimeout(..., 0)` defers the execution
    // until the browser has finished its current event processing task. This
    // ensures our focus command is the last one, preventing the conflict and
    // keeping the keyboard visible.
    //============================================================================
    setTimeout(() => {
        if (this.hiddenInput) {
            this.hiddenInput.focus();
        }
    }, 0);
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
    if (ny >= 0 && ny < this.puzzleData.height && nx >= 0 && nx < this.puzzleData.width) {
      const next = this.cellEls[ny][nx];
      if (next && !next.classList.contains('block')) {
        this.selectCell(next);
        return true; // Indicate that a move was successful
      }
    }
    return false; // Indicate that a move failed
  }

  setCellLetter(cell, letter) {
    if (!cell) return;
    const letterEl = cell.querySelector('.letter');
    if (letterEl) {
      letterEl.textContent = letter.toUpperCase();
    }
  }

  autoAdvance() {
    let moved = false;
    // Try to move forward in the current direction.
    moved = this.moveSelection(getArrowForDirection(this.currentDirection, true));
    // If we hit a wall, try to switch directions and move forward from there.
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
      // Migration logic for old key
      if (!serialized && this.puzzleId === 'social_deduction_ok.xml') {
        const oldState = localStorage.getItem('crosswordState');
        if (oldState) {
          serialized = oldState;
          applyGridState(this.puzzleData, this.cellEls, serialized);
          this.saveStateToLocalStorage(); 
          localStorage.removeItem('crosswordState');
          return true;
        }
      }
      if (serialized) {
        applyGridState(this.puzzleData, this.cellEls, serialized);
        this.updateClueCompletion();
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
      this.updateClueCompletion();
      return true;
    } catch (e) {
      console.error('Failed to load state from URL', e);
    }
    return false;
  }

  handleBackspace() {
    if (!this.selectedCell) return;
    const letterEl = this.selectedCell.querySelector('.letter');
    // If the current cell has a letter, clear it.
    if (letterEl && letterEl.textContent) {
      letterEl.textContent = '';
      this.saveStateToLocalStorage();
      return;
    }
    // If the cell is already empty, move backward and clear the new cell.
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

    // Highlight the corresponding clue in the list.
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
    if (!topEl || !bottomEl) return;

    if (!this.selectedCell) {
      topEl.textContent = '';
      bottomEl.textContent = '';
      return;
    }

    const cells = getWordCells(this.puzzleData, this.cellEls, this.selectedCell, this.currentDirection);
    if (cells.length === 0) {
      topEl.textContent = '';
      bottomEl.textContent = '';
      return;
    }

    const clueNumber = cells[0].data.number;
    const clues = this.currentDirection === 'across'
      ? this.puzzleData.cluesAcross
      : this.puzzleData.cluesDown;
    const clue = clues.find(cl => cl.number === clueNumber);
    if (!clue) {
      topEl.textContent = '';
      bottomEl.textContent = '';
      return;
    }
    const enumStr = clue.enumeration || clue.length;
    const text = `${clue.number}. ${clue.text} (${enumStr})`;
    topEl.textContent = text;
    bottomEl.textContent = text;
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
      this.selectCell(cell);
    }
  }
}