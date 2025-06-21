import Crossword, { TEST_MODE } from './crossword.js';

const puzzles = [
  { name: 'Social Deduction', file: 'social_deduction_ok.xml' }
];

function getPuzzleFileFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('puzzle') || 'social_deduction_ok.xml';
}

export function buildPuzzleLinks() {
  const listEl = document.querySelector('#puzzle-links ul');
  if (!listEl) return;
  listEl.innerHTML = '';
  puzzles.forEach(p => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `?puzzle=${encodeURIComponent(p.file)}`;
    a.textContent = p.name;
    li.appendChild(a);
    listEl.appendChild(li);
  });
}

export let crossword;

function initCrossword(xmlData) {
  crossword = new Crossword(xmlData);

  crossword.directionButton = document.getElementById('toggle-direction');
  if (crossword.directionButton) {
    crossword.directionButton.addEventListener('click', () => crossword.toggleDirection());
    crossword.updateDirectionButton();
  }

  const checkLetterBtn = document.getElementById('check-letter');
  if (checkLetterBtn) {
    checkLetterBtn.addEventListener('click', () => crossword.checkLetter());
  }

  const checkWordBtn = document.getElementById('check-word');
  if (checkWordBtn) {
    checkWordBtn.addEventListener('click', () => crossword.checkWord());
  }

  document.addEventListener('keydown', (e) => crossword.handleKeyDown(e));
  document.addEventListener('input', (e) => crossword.handleInput(e));

  crossword.buildGrid();
  crossword.buildClues(crossword.puzzleData.cluesAcross, crossword.puzzleData.cluesDown);

  const loadedFromURL = crossword.loadStateFromURL();
  if (!loadedFromURL) {
    crossword.loadStateFromLocalStorage();
  }

  const firstCell = crossword.findFirstLetterCell();
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

  if (TEST_MODE) {
    crossword.cellEls.flat().forEach(cell => {
      if (!cell) return;
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

buildPuzzleLinks();

const puzzleFile = getPuzzleFileFromURL();
fetch(puzzleFile)
  .then(res => res.text())
  .then(initCrossword)
  .catch(err => console.error('Failed to load', puzzleFile, err));

export { crossword as default };
