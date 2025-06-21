# Agent Guide

This project displays an interactive crossword in modern JavaScript and HTML.
Puzzle data is loaded from `social_deduction_ok.xml` at runtime and rendered by
`index.js` (an ES module). Open `index.html` in a browser to run the viewer.

Major modules: `crossword.js` implements the `Crossword` class and `puzzle-parser.js` handles XML parsing.
## Agent Tasks
- Parse puzzle XML and build the grid and clues.
- Maintain user input handling and diagnostic helpers.
- Keep the code modular and readable. `index.js` exports a `crossword` instance
  that exposes helper methods such as `testGridIsBuilt()` and
  `testCluesPresent()`.
- Update this file when guidance changes and log notable updates in
  `CHANGELOG.md`.

## Coding Guidelines
- Use modern ES6+ JavaScript and plain HTML/CSS.
- No server-side code or external dependencies.
- Add helpful console output for debugging. Enable verbose diagnostics by setting
  `TEST_MODE` to `true` near the top of `index.js`.

## Design Notes
- **DOM caching**: `buildGrid()` stores cell elements in
  `crossword.cellEls[y][x]` for quick access.
- **Input handling**: keyboard events are attached at the document level while
  each grid cell is `contenteditable` so mobile keyboards work. `keydown` events
  call `preventDefault()` to avoid duplicate letters and `input` events handle
  mobile browsers.
- **Completed clues**: the viewer adds the `complete` class when a clue is fully
  answered. Completed clues are styled faint with a strike-through and are not
  clickable.
- **Responsive sizing**: grid dimensions are calculated using the CSS variable
  `--cell-size` based on the viewport so the puzzle fits on mobile and desktop.
- **Puzzle parsing**: `parsePuzzle()` delegates to `parseGrid`, `parseClues`
  and `computeWordMetadata` helpers for clarity.
- **State persistence**: progress is stored in `localStorage` under
  `crosswordState` and can be shared via URLs using `getShareableURL()`
  and `loadStateFromURL()`.

## Repository Practices
- Keep `AGENTS.md` concise; do not record a running change log here.
  Use `CHANGELOG.md` for notable updates.
- Remove any obsolete sections once the related code is gone.
- Run the simple browser-based tests when relevant:
  - `testGridIsBuilt()`
  - `testCluesPresent()`
  - `logGridState()`

