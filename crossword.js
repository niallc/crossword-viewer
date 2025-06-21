// Crossword class module
import { parsePuzzle } from './puzzle-parser.js';

export const TEST_MODE = true;

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
    this.clearProgressButton = null;
    this.cellEls = [];
    this.puzzleData = parsePuzzle(xmlData);
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
      // Key events are handled at the document level to avoid duplicates
    }

    return cell;
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
    if (!cell) return;
    removeTextNodes(cell);
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

  handleKeyDown(e) {
    if (!this.selectedCell) return;
    const key = e.key;
    if (key === 'Backspace') {
      this.clearFeedback();
      this.handleBackspace();
      e.preventDefault();
      return;
    }
    if (key === 'Delete') {
      this.clearFeedback();
      const letterEl = this.selectedCell.querySelector('.letter');
      if (letterEl) {
        letterEl.textContent = '';
      }
      this.saveStateToLocalStorage();
      e.preventDefault();
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      this.clearFeedback();
      const moved = this.moveSelection(key);
      if (moved) {
        e.preventDefault();
      }
      return;
    }
    if (/^[a-zA-Z]$/.test(key)) {
      this.clearFeedback();
      this.setCellLetter(this.selectedCell, key);
      this.autoAdvance();
      this.saveStateToLocalStorage();
      e.preventDefault();
      return;
    }
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

  handleInput(e) {
    const cell = e.target.closest('.cell');
    if (!cell || cell.classList.contains('block')) return;
    if (cell !== this.selectedCell) {
      this.selectCell(cell);
    }

    if (e.inputType && e.inputType.startsWith('delete')) {
      this.clearFeedback();
      this.handleBackspace();
      return;
    }

    let letter = e.data;
    if (!letter) {
      letter = cell.textContent.trim();
    }
    removeTextNodes(cell);
    if (!letter) return;
    letter = letter.slice(-1);
    if (/^[a-zA-Z]$/.test(letter)) {
      this.clearFeedback();
      cell.style.color = '';
      this.setCellLetter(cell, letter);
      this.autoAdvance();
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
