# Agent Guide

This project displays an interactive crossword in modern JavaScript and HTML.
Puzzle data is loaded from an XML file specified via the `puzzle` URL parameter
(default `social_deduction_ok.xml`) and rendered by `index.js` (an ES module).

Open `index.html` in a browser to run the viewer.

Major modules: `crossword.js` implements the `Crossword` class and `puzzle-parser.js` handles XML parsing.
## Agent Tasks
- Maintain user input handling and diagnostic helpers.
- Keep the code modular and readable. `index.js` exports a `crossword` instance
  that exposes helper methods such as `testGridIsBuilt()` and
  `testCluesPresent()`.
- Update this file when AGENT guidance changes and log notable updates in
  `CHANGELOG.md`.

## Coding Guidelines
- Use modern ES6+ JavaScript and plain HTML/CSS.
- No server-side code or external dependencies.
- Add helpful console output for debugging. Enable verbose diagnostics by setting
  `TEST_MODE` to `true` near the top of `index.js`.
  When enabled, `crossword.js` creates a `<pre id="debug-log">` element and
  appends it to the page to record debug messages.

## Design Notes
- **DOM caching**: `buildGrid()` stores cell elements in
  `crossword.cellEls[y][x]` for quick access.
- **Input handling**: keyboard events are attached at the document level while
    each grid cell is `contenteditable` so mobile keyboards work. `keydown` events
    call `preventDefault()` to avoid duplicate letters. `beforeinput` and `input`
    events update letters on mobile without leaving stray DOM nodes.
 - **Cell selection**: `.cell` elements now allow text selection (`user-select:
   text`) which avoids overwriting issues while keeping the caret hidden via
   `caret-color: transparent`.
- **Completed clues**: the viewer adds the `complete` class when a clue is fully
  answered. Completed clues are styled faint with a strike-through and are not
  clickable.
- **Responsive sizing**: grid dimensions are calculated using the CSS variable
  `--cell-size` based on the viewport so the puzzle fits on mobile and desktop.
- **Grid lines**: `#grid` uses a 1px `gap` on a black background with borderless
  cells so the dividing lines appear as thin black separators between squares.
- **Puzzle parsing**: `parsePuzzle()` delegates to `parseGrid`, `parseClues`
  and `computeWordMetadata` helpers for clarity.
- **State persistence**: progress is stored in `localStorage` under
  `crosswordState` and can be shared via URLs using `getShareableURL()`
  and `loadStateFromURL()`.
- **Puzzle links**: `buildPuzzleLinks()` populates a list of all puzzles from a
  static array of `{name, file}` objects. Links update the `puzzle` query
  parameter. A "Show all available crosswords" button toggles the list after the
  clues on mobile, and sits below the grid and clues on wider screens.
- **Reveal features**: `revealCurrentClue()` and `revealGrid()` fill in answers
  after the user confirms via a custom overlay.
 - **Author metadata**: `parsePuzzle()` reads `<creator>` or `<author>` from the
   puzzle file's `<metadata>` section and returns it as `author`. `index.js`
   shows "Crossword by ..." in the `#puzzle-author` element when a name is
   provided and hides the element if none is found. The page always displays
   "Page by Niall C" using the `#page-credit` element.

## Repository Practices
- Keep `AGENTS.md` concise; do not record a running change log here.
  Use `CHANGELOG.md` for notable updates.
- Remove any obsolete sections once the related code is gone.
- Run the simple browser-based tests when relevant:
  - `testGridIsBuilt()`
  - `testCluesPresent()`
  - `logGridState()`

