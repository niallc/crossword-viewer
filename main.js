// Entry point for crossword viewer

console.log('Crossword Viewer: Starting');

if (typeof CrosswordPuzzleData !== 'undefined') {
    console.log('CrosswordPuzzleData loaded, length =', CrosswordPuzzleData.length);
} else {
    console.error('ERROR: CrosswordPuzzleData not found.');
}

let selectedCell = null;
let gridSize = {width: 0, height: 0};

function parsePuzzleData(xmlString) {
    console.log('Parsing puzzle data...');
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlString, 'text/xml');

    const gridEl = xml.querySelector('grid');
    gridSize.width = parseInt(gridEl.getAttribute('width'), 10);
    gridSize.height = parseInt(gridEl.getAttribute('height'), 10);

    const grid = Array.from({length: gridSize.height}, () =>
        Array.from({length: gridSize.width}, () => ({letter: '', number: null, isBlock: false}))
    );

    gridEl.querySelectorAll('cell').forEach(cell => {
        const x = parseInt(cell.getAttribute('x'), 10) - 1;
        const y = parseInt(cell.getAttribute('y'), 10) - 1;
        const isBlock = cell.getAttribute('type') === 'block';
        const letter = cell.getAttribute('solution') || '';
        const number = cell.getAttribute('number');
        grid[y][x] = {
            isBlock,
            letter,
            number: number ? parseInt(number, 10) : null
        };
    });

    const clueSections = xml.querySelectorAll('clues[ordering]');
    const cluesAcross = [];
    const cluesDown = [];
    clueSections.forEach((section, idx) => {
        const target = idx === 0 ? cluesAcross : cluesDown;
        section.querySelectorAll('clue').forEach(clueEl => {
            target.push({
                number: clueEl.getAttribute('number'),
                text: clueEl.textContent
            });
        });
    });

    console.log('Parsed', gridSize.width, 'x', gridSize.height, 'grid');
    console.log('Across clues:', cluesAcross.length, 'Down clues:', cluesDown.length);

    return {grid, cluesAcross, cluesDown};
}

function createCellElement(cellData, x, y) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.x = x;
    cell.dataset.y = y;
    if (cellData.isBlock) {
        cell.classList.add('block');
    } else if (cellData.number) {
        const num = document.createElement('span');
        num.classList.add('num');
        num.textContent = cellData.number;
        num.style.fontSize = '10px';
        num.style.position = 'absolute';
        num.style.left = '2px';
        num.style.top = '0';
        cell.appendChild(num);
    }
    cell.addEventListener('click', () => selectCell(cell));
    return cell;
}

function buildGrid(gridData) {
    console.log('Building grid...');
    const gridEl = document.getElementById('grid');
    gridEl.style.gridTemplateColumns = `repeat(${gridSize.width}, 30px)`;
    gridEl.style.gridTemplateRows = `repeat(${gridSize.height}, 30px)`;
    gridEl.innerHTML = '';
    gridData.forEach((row, y) => {
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
    across.forEach(clue => {
        const li = document.createElement('li');
        li.textContent = `${clue.number}. ${clue.text}`;
        acrossEl.appendChild(li);
    });
    down.forEach(clue => {
        const li = document.createElement('li');
        li.textContent = `${clue.number}. ${clue.text}`;
        downEl.appendChild(li);
    });
}

function selectCell(cell) {
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    selectedCell = cell;
    if (selectedCell) {
        selectedCell.classList.add('selected');
    }
}

document.addEventListener('keydown', (e) => {
    if (!selectedCell) return;
    const key = e.key;
    if (/^[a-zA-Z]$/.test(key)) {
        selectedCell.textContent = key.toUpperCase();
    } else if (key === 'Backspace') {
        selectedCell.textContent = '';
    } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        moveSelection(key);
    }
});

function moveSelection(direction) {
    if (!selectedCell) return;
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
    }
}

function logGridState() {
    const gridEl = document.getElementById('grid');
    const cells = gridEl.querySelectorAll('.cell');
    const letters = Array.from(cells).map(c => c.textContent || ' ').join('');
    console.log('Grid letters:', letters);
}

function testGridIsBuilt() {
    const gridEl = document.getElementById('grid');
    return gridEl.children.length === gridSize.width * gridSize.height;
}

function testCluesPresent() {
    const across = document.querySelectorAll('#clues-across li').length;
    const down = document.querySelectorAll('#clues-down li').length;
    return across > 0 && down > 0;
}

const puzzleData = parsePuzzleData(CrosswordPuzzleData);
buildGrid(puzzleData.grid);
buildClues(puzzleData.cluesAcross, puzzleData.cluesDown);

console.log('Crossword Viewer: Ready');
