# Changelog

All notable changes to this project will be documented in this file.

## 2025
- Clue clicking removed to prevent accidental scrolling.
- Refactored into modules: `crossword.js` for the class, `puzzle-parser.js` for XML parsing, and entry script renamed to `index.js`.
- Font sizes scale relative to each cell.
- Debug logging for check helpers when `TEST_MODE` is true.
- Letters overwrite existing input and stray text nodes are removed.
- Added helper methods: `findFirstLetterCell`, `getArrowForDirection`,
  `getMoveBackDir`, `checkClueGroup`, and puzzle parsing helpers
  (`parseGrid`, `parseClues`, `computeWordMetadata`).
- Puzzle file renamed to `social_deduction_ok.xml`.
- Puzzle file can now be selected via `?puzzle=` parameter and
  `buildPuzzleLinks()` populates a list of available puzzles.
- Puzzle links now appear after the clues and omit the current puzzle.
- Documented obsolete instruction about always loading
  `social_deduction_ok.xml`.

## 2024
- Keyboard input handled at the document level with `contenteditable`
  grid cells. Old `mobile-input` removed.
- `selectCell` supports optional focus behavior.
- Completed clues gain `complete` class and strike-through styling.
- Clue enumeration strings displayed.
- Responsive grid sizing via CSS variable `--cell-size`.
- Added "Check Letter" and "Check Word" buttons.

