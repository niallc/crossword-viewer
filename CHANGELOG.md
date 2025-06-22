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
- "Show all available crosswords" button toggles the puzzle list and now sits
  below the grid and clues on desktop.
- Fixed layout so the button actually displays below the crossword on wider
  screens.
- Keyboard input handled at the document level with `contenteditable`
  grid cells. Old `mobile-input` removed.
- `selectCell` supports optional focus behavior.
- Completed clues gain `complete` class and strike-through styling.
- Clue enumeration strings displayed.
- Responsive grid sizing via CSS variable `--cell-size`.
- Added "Reveal Word" and "Reveal Grid" buttons with confirmation overlay.
- Input handling improved for mobile: a `beforeinput` listener now
  prevents stray nodes and ensures `autoAdvance()` works with
  on-screen keyboards.

- Cells allow text selection to avoid overwrite issues.
- Debug log element created only when `TEST_MODE` is true.
- Cells now default to a white background so 1px black grid lines show correctly
- Active clue text now displays above and below the grid
- Cell selection now happens on pointerup with a small-movement check so scrolling works on touch devices. README updated accordingly.
- Clue tapping restored; selecting a clue scrolls the grid into view
