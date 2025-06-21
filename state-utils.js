export function serializeGridState(puzzleData, cellEls) {
  const letters = [];
  for (let y = 0; y < puzzleData.height; y++) {
    for (let x = 0; x < puzzleData.width; x++) {
      const data = puzzleData.grid[y][x];
      if (data.type === 'letter') {
        const cell = cellEls[y][x];
        const letterEl = cell.querySelector('.letter');
        letters.push(letterEl && letterEl.textContent ? letterEl.textContent : ' ');
      }
    }
  }
  return letters.join('');
}

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
        cell.style.color = '';
      }
    }
  }
}

export function rleEncode(str) {
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

export function rleDecode(str) {
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
