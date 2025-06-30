// state-utils.js v1.3
// This module contains utility functions for managing the state of the crossword grid.
// It handles serializing the grid's letter data into a compact string for saving,
// applying that string back to the grid, and compressing/decompressing the state
// for sharing via URL.

/**
 * Converts the current state of the grid into a single string.
 * Each letter cell is represented by its character, or a space if empty.
 * Block cells are ignored. The string is built by reading cells left-to-right, top-to-bottom.
 * @param {object} puzzleData The parsed puzzle data object.
 * @param {HTMLDivElement[][]} cellEls A 2D array of the grid cell DOM elements.
 * @returns {string} A string representing the letters in the grid.
 */
export function serializeGridState(puzzleData, cellEls) {
  const letters = [];
  for (let y = 0; y < puzzleData.height; y++) {
    for (let x = 0; x < puzzleData.width; x++) {
      const data = puzzleData.grid[y][x];
      if (data.type === 'letter') {
        const cell = cellEls[y][x];
        const letterEl = cell.querySelector('.letter');
        // Use a space for empty cells to maintain the structure.
        letters.push(letterEl && letterEl.textContent ? letterEl.textContent : ' ');
      }
    }
  }
  return letters.join('');
}

/**
 * Populates the grid cells based on a serialized state string.
 * @param {object} puzzleData The parsed puzzle data object.
 * @param {HTMLDivElement[][]} cellEls A 2D array of the grid cell DOM elements.
 * @param {string} serialized The state string created by serializeGridState.
 */
export function applyGridState(puzzleData, cellEls, serialized) {
  const letters = serialized.split('');
  let idx = 0;
  for (let y = 0; y < puzzleData.height; y++) {
    for (let x = 0; x < puzzleData.width; x++) {
      const data = puzzleData.grid[y][x];
      if (data.type === 'letter') {
        const ch = letters[idx++] || ' ';
        const cell = cellEls[y][x];
        const letterEl = cell.querySelector('.letter');
        if (letterEl) {
          letterEl.textContent = ch === ' ' ? '' : ch;
        }
        // Reset any feedback colors when loading state.
        cell.style.color = '';
      }
    }
  }
}

/**
 * Compresses a string using a simple Run-Length Encoding (RLE) algorithm.
 * This is useful for making the shareable URL shorter, especially for mostly empty grids.
 * Example: "AAAB C" becomes "3A1B1 1C"
 * @param {string} str The string to encode.
 * @returns {string} The RLE-compressed string.
 */
export function rleEncode(str) {
  if (!str) return '';
  let result = '';
  let count = 1;
  for (let i = 1; i <= str.length; i++) {
    if (i < str.length && str[i] === str[i - 1]) {
      count++;
    } else {
      result += (count > 1 ? count : '') + str[i - 1];
      count = 1;
    }
  }
  return result;
}


/**
 * Decompresses a string that was compressed with the rleEncode function.
 * @param {string} str The RLE-compressed string.
 * @returns {string} The original, decompressed string.
 */
export function rleDecode(str) {
  let result = '';
  let countStr = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    // Check if the character is a digit to build the count.
    if (ch >= '0' && ch <= '9') {
      countStr += ch;
    } else {
      // When a non-digit is found, parse the count and repeat the character.
      const count = parseInt(countStr || '1', 10);
      result += ch.repeat(count);
      countStr = ''; // Reset for the next sequence.
    }
  }
  return result;
}
