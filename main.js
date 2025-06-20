// Crossword Viewer implementation using a class

const TEST_MODE = false;

export let crossword;

class Crossword {
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
    this.checkButton = null;
    this.mobileInput = null;
    this.copyLinkButton = null;
    this.clearProgressButton = null;
    this.puzzleData = this.parsePuzzleData(xmlData);
  }

  parsePuzzleData(xmlString) {
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
      cell.addEventListener('pointerdown', (e) => {
        this.selectCell(cell);
        e.preventDefault();
      });
    }

    return cell;
  }

  buildGrid() {
    console.log('Building grid...');
    const data = this.puzzleData;
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${data.width}, 30px)`;
    gridEl.style.gridTemplateRows = `repeat(${data.height}, 30px)`;

    data.grid.forEach((row, y) => {
      row.forEach((cellData, x) => {
        const cellEl = this.createCellElement(cellData, x, y);
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
      li.appendChild(document.createTextNode(cl.text + ' (' + cl.length + ')'));
      li.addEventListener('pointerdown', (e) => {
        this.selectClue(cl.number, 'across');
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
        this.selectClue(cl.number, 'down');
        e.preventDefault();
      });
      downEl.appendChild(li);
    });
  }

  selectCell(cell) {
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
    if (this.mobileInput) {
      this.mobileInput.value = '';
      if (this.mobileInput.focus) {
        try {
          this.mobileInput.focus({ preventScroll: true });
        } catch (e) {
          this.mobileInput.focus();
        }
      }
    }
  }

  testGridIsBuilt() {
    return document.querySelectorAll('#grid .cell').length > 0;
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
    const next = document.querySelector(`.cell[data-x="${nx}"][data-y="${ny}"]`);
    if (next && !next.classList.contains('block')) {
      this.selectCell(next);
      return true;
    }
    return false;
  }

  autoAdvance() {
    let moved = false;
    if (this.currentDirection === 'across') {
      moved = this.moveSelection('ArrowRight');
    } else if (this.currentDirection === 'down') {
      moved = this.moveSelection('ArrowDown');
    }
    if (!moved) {
      this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
      this.updateDirectionButton();
      if (this.currentDirection === 'across') {
        this.moveSelection('ArrowRight');
      } else {
        this.moveSelection('ArrowDown');
      }
    }
  }

  logGridState() {
    const gridEl = document.getElementById('grid');
    const cells = gridEl.querySelectorAll('.cell');
    const letters = Array.from(cells).map(c => {
      const letterEl = c.querySelector('.letter');
      return letterEl ? (letterEl.textContent || ' ') : ' ';
    }).join('');
    console.log('Grid letters:', letters);
  }

  saveStateToLocalStorage() {
    try {
      const serialized = this.serializeGridState();
      localStorage.setItem('crosswordState', serialized);
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
    document.querySelectorAll('#grid .cell').forEach(cell => {
      const x = parseInt(cell.dataset.x, 10);
      const y = parseInt(cell.dataset.y, 10);
      const data = this.puzzleData.grid[y][x];
      if (data.type === 'letter') {
        const letterEl = cell.querySelector('.letter');
        letters.push(letterEl && letterEl.textContent ? letterEl.textContent : ' ');
      }
    });
    return letters.join('');
  }

  applyGridState(serialized) {
    const letters = serialized.split('');
    let idx = 0;
    document.querySelectorAll('#grid .cell').forEach(cell => {
      const x = parseInt(cell.dataset.x, 10);
      const y = parseInt(cell.dataset.y, 10);
      const data = this.puzzleData.grid[y][x];
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
        const count = countStr ? parseInt(countStr, 10) : 1;
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
    const urlEncoded = encodeURIComponent(encoded);
    return location.origin + location.pathname + '#state=' + urlEncoded;
  }

  loadStateFromURL() {
    let encoded = null;
    if (location.hash.startsWith('#state=')) {
      encoded = location.hash.slice(7);
    } else {
      const params = new URLSearchParams(location.search);
      encoded = params.get('state');
    }
    if (encoded) {
      try {
        const decoded = decodeURIComponent(encoded);
        const compressed = atob(decoded);
        const serialized = this.rleDecode(compressed);
        this.applyGridState(serialized);
        return true;
      } catch (e) {
        console.error('Failed to load state from URL', e);
      }
    }
    return false;
  }

  handleBackspace() {
    if (!this.selectedCell) return;
    const letterEl = this.selectedCell.querySelector('.letter');
    if (letterEl && letterEl.textContent) {
      letterEl.textContent = '';
      this.selectedCell.style.color = '';
      const dir = this.currentDirection === 'across' ? 'ArrowLeft' : 'ArrowUp';
      this.moveSelection(dir);
    } else {
      const dir = this.currentDirection === 'across' ? 'ArrowLeft' : 'ArrowUp';
      if (this.moveSelection(dir)) {
        const letterEl2 = this.selectedCell.querySelector('.letter');
        if (letterEl2) letterEl2.textContent = '';
        this.selectedCell.style.color = '';
      }
    }
    this.saveStateToLocalStorage();
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
        const el = document.querySelector(`.cell[data-x="${cx}"][data-y="${y}"]`);
        cells.push({ el, data: this.puzzleData.grid[y][cx] });
      }
    } else if (direction === 'down') {
      let sy = y;
      while (sy > 0 && this.puzzleData.grid[sy - 1][x] && this.puzzleData.grid[sy - 1][x].type !== 'block') {
        sy--;
      }
      for (let cy = sy; cy < this.puzzleData.height && this.puzzleData.grid[cy][x] && this.puzzleData.grid[cy][x].type !== 'block'; cy++) {
        const el = document.querySelector(`.cell[data-x="${x}"][data-y="${cy}"]`);
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

  selectClue(number, direction) {
    const map = direction === 'across' ? this.puzzleData.acrossStarts : this.puzzleData.downStarts;
    const pos = map[number];
    if (!pos) return;
    const cell = document.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
    if (cell) {
      this.currentDirection = direction;
      this.updateDirectionButton();
      this.selectCell(cell);
    }
  }

  checkCurrentAnswer(direction) {
    if (!this.selectedCell) return;
    const cells = this.getWordCells(this.selectedCell, direction);
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

  checkAnswers() {
    let wrong = 0;
    document.querySelectorAll('#grid .cell').forEach(cell => {
      const x = parseInt(cell.dataset.x, 10);
      const y = parseInt(cell.dataset.y, 10);
      const data = this.puzzleData.grid[y][x];
      if (data.type === 'letter') {
        const expected = (data.solution || '').toUpperCase();
        const letterEl = cell.querySelector('.letter');
        const actual = (letterEl && letterEl.textContent || '').trim().toUpperCase();
        if (actual !== expected) wrong += 1;
      }
    });
    if (!this.checkButton) {
      this.checkButton = document.getElementById('check-answer');
    }
    if (this.checkButton) {
      this.checkButton.textContent = `Num Wrong: ${wrong}`;
      if (wrong === 0) {
        this.checkButton.style.backgroundColor = 'green';
        this.checkButton.style.color = 'white';
      } else if (wrong > 2) {
        this.checkButton.style.backgroundColor = 'red';
        this.checkButton.style.color = 'white';
      } else {
        this.checkButton.style.backgroundColor = 'yellow';
        this.checkButton.style.color = 'black';
      }
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

function initCrossword(xmlData) {
  crossword = new Crossword(xmlData);

  crossword.directionButton = document.getElementById('toggle-direction');
  if (crossword.directionButton) {
    crossword.directionButton.addEventListener('click', () => crossword.toggleDirection());
    crossword.updateDirectionButton();
  }

  crossword.checkButton = document.getElementById('check-answer');
  if (crossword.checkButton) {
    crossword.checkButton.addEventListener('click', () => crossword.checkAnswers());
  }

  const checkAcrossBtn = document.getElementById('check-current-across');
  if (checkAcrossBtn) {
    checkAcrossBtn.addEventListener('click', () => crossword.checkCurrentAnswer('across'));
  }

  const checkDownBtn = document.getElementById('check-current-down');
  if (checkDownBtn) {
    checkDownBtn.addEventListener('click', () => crossword.checkCurrentAnswer('down'));
  }

  crossword.mobileInput = document.getElementById('mobile-input');
  if (crossword.mobileInput) {
    crossword.mobileInput.addEventListener('input', (e) => {
      const letter = e.data || crossword.mobileInput.value.slice(-1);
      crossword.mobileInput.value = '';
      if (!letter) return;
      if (/^[a-zA-Z]$/.test(letter) && crossword.selectedCell) {
        crossword.selectedCell.style.color = '';
        const letterEl = crossword.selectedCell.querySelector('.letter');
        if (letterEl) letterEl.textContent = letter.toUpperCase();
        crossword.autoAdvance();
        crossword.saveStateToLocalStorage();
      }
    });
    crossword.mobileInput.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        crossword.handleBackspace();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        crossword.moveSelection(e.key);
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!crossword.selectedCell) return;
    if (crossword.mobileInput && document.activeElement === crossword.mobileInput) {
      return;
    }
    const key = e.key;
    if (/^[a-zA-Z]$/.test(key)) {
      crossword.selectedCell.style.color = '';
      const letterEl = crossword.selectedCell.querySelector('.letter');
      if (letterEl) letterEl.textContent = key.toUpperCase();
      crossword.autoAdvance();
      crossword.saveStateToLocalStorage();
    } else if (key === 'Backspace') {
      e.preventDefault();
      crossword.handleBackspace();
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
      crossword.moveSelection(key);
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        crossword.currentDirection = 'down';
      }
      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        crossword.currentDirection = 'across';
      }
      crossword.updateDirectionButton();
    }
  });

  crossword.buildGrid();

  crossword.buildClues(crossword.puzzleData.cluesAcross, crossword.puzzleData.cluesDown);

  const loadedFromURL = crossword.loadStateFromURL();
  if (!loadedFromURL) {
    crossword.loadStateFromLocalStorage();
  }

  const firstCell = document.querySelector('#grid .cell:not(.block)');
  if (firstCell) {
    crossword.selectCell(firstCell);
  }

  crossword.copyLinkButton = document.getElementById('copy-link');
  if (crossword.copyLinkButton) {
    crossword.copyLinkButton.addEventListener('click', () => {
      const url = crossword.getShareableURL();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          crossword.copyLinkButton.textContent = 'Link Copied!';
          setTimeout(() => crossword.copyLinkButton.textContent = 'Copy Share Link', 2000);
        }).catch(err => console.error('Clipboard error', err));
      } else {
        console.warn('Clipboard API not available');
      }
    });
  }

  crossword.clearProgressButton = document.getElementById('clear-progress');
  if (crossword.clearProgressButton) {
    crossword.clearProgressButton.addEventListener('click', () => {
      localStorage.removeItem('crosswordState');
      crossword.applyGridState('');
    });
  }

  if (TEST_MODE && crossword.mobileInput) {
    crossword.mobileInput.addEventListener('focus', () => console.log('mobile-input focus', Date.now()));
    crossword.mobileInput.addEventListener('blur', () => console.log('mobile-input blur', Date.now()));
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

  window.testGridIsBuilt = crossword.testGridIsBuilt.bind(crossword);
  window.testCluesPresent = crossword.testCluesPresent.bind(crossword);
  window.logGridState = crossword.logGridState.bind(crossword);
  window.getShareableURL = crossword.getShareableURL.bind(crossword);

  window.crossword = crossword;
}

fetch('puzzle.xml')
  .then(res => res.text())
  .then(initCrossword)
  .catch(err => console.error('Failed to load puzzle.xml', err));

export { crossword as default };
