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
- Puzzle links now appear after the clues.
- "Show all available crosswords" button toggles the puzzle list and now sits
  below the grid and clues on desktop.
- Fixed layout so the button actually displays below the crossword on wider
  screens.
- Documented obsolete instruction about always loading
  `social_deduction_ok.xml`.
- Keyboard input handled at the document level with `contenteditable`
  grid cells. Old `mobile-input` removed.
- `selectCell` supports optional focus behavior.
- Completed clues gain `complete` class and strike-through styling.
- Clue enumeration strings displayed.
- Responsive grid sizing via CSS variable `--cell-size`.
- Added "Check Letter" and "Check Word" buttons.
- Removed "Clear Progress" button.
- Added "Reveal Clue" and "Reveal Grid" buttons with confirmation overlay.
- Credits now show "Page by Niall C" and hide the crossword author line
  when no author is provided.
- Input handling improved for mobile: a `beforeinput` listener now
  prevents stray nodes and ensures `autoAdvance()` works with
  on-screen keyboards.

