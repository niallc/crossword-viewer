import Crossword, { TEST_MODE } from './crossword.js';
import { findFirstLetterCell } from './grid-utils.js';

const puzzles = [
  { name: 'Social Deduction', file: 'social_deduction_ok.xml' },
  { name: 'OkeyDoke Crossword 1', file: 'okeydoke_puzzle1.xml' }
];

function getPuzzleFileFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('puzzle') || puzzles[0].file;
}

export function buildPuzzleLinks() {
  const listEl = document.querySelector('#puzzle-links');
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
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmMessage = document.getElementById('confirm-message');
const confirmYes = document.getElementById('confirm-yes');
const confirmNo = document.getElementById('confirm-no');
let confirmCallback = null;

function showConfirm(message, cb) {
  confirmMessage.textContent = message;
  confirmCallback = cb;
  if (confirmOverlay) {
    confirmOverlay.style.display = 'flex';
  }
}

function hideConfirm() {
  if (confirmOverlay) {
    confirmOverlay.style.display = 'none';
  }
  confirmCallback = null;
}

if (confirmYes) {
  confirmYes.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    hideConfirm();
  });
}

if (confirmNo) {
  confirmNo.addEventListener('click', hideConfirm);
}

function initCrossword(xmlData) {
  crossword = new Crossword(xmlData);


  const checkLetterBtn = document.getElementById('check-letter');
  if (checkLetterBtn) {
    checkLetterBtn.addEventListener('click', () => crossword.checkLetter());
  }

  const checkWordBtn = document.getElementById('check-word');
  if (checkWordBtn) {
    checkWordBtn.addEventListener('click', () => crossword.checkWord());
  }

  document.addEventListener('keydown', (e) => crossword.handleKeyDown(e));

  crossword.buildGrid();
  crossword.buildClues(crossword.puzzleData.cluesAcross, crossword.puzzleData.cluesDown);

  const authorEl = document.getElementById('puzzle-author');
  if (authorEl) {
    if (crossword.puzzleData.author) {
      authorEl.textContent = 'Crossword by ' + crossword.puzzleData.author;
      authorEl.style.display = 'block';
    } else {
      authorEl.style.display = 'none';
    }
  }

  const loadedFromURL = crossword.loadStateFromURL();
  if (!loadedFromURL) {
    crossword.loadStateFromLocalStorage();
  }

  const firstCell = findFirstLetterCell(crossword.puzzleData, crossword.cellEls);
  if (firstCell) {
    crossword.selectCell(firstCell);
    crossword.updateCurrentClue();
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

  const revealClueBtn = document.getElementById('reveal-clue');
  if (revealClueBtn) {
    revealClueBtn.addEventListener('click', () => {
      showConfirm('Reveal the answer for this clue?', () => crossword.revealCurrentClue());
    });
  }

  const revealGridBtn = document.getElementById('reveal-grid');
  if (revealGridBtn) {
    revealGridBtn.addEventListener('click', () => {
      showConfirm('Reveal the entire grid?', () => crossword.revealGrid());
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

const showPuzzlesBtn = document.getElementById('show-puzzles');
const puzzleList = document.getElementById('puzzle-list');
if (showPuzzlesBtn && puzzleList) {
  showPuzzlesBtn.addEventListener('click', () => {
    const visible = puzzleList.style.display === 'block';
    puzzleList.style.display = visible ? 'none' : 'block';
    showPuzzlesBtn.textContent = visible ?
      'Show all available crosswords' : 'Hide crosswords';
  });
}

const puzzleFile = getPuzzleFileFromURL();
fetch(puzzleFile)
  .then(res => res.text())
  .then(initCrossword)
  .catch(err => console.error('Failed to load', puzzleFile, err));

export { crossword as default };
