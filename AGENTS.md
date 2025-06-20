## Project Description

This is a Javascript + HTML project to display an interactive crossword puzzle on the web.

The puzzle data is stored in `puzzle.xml` and loaded via `fetch` in `main.js`.

The project goal is to parse the puzzle data and render an interactive crossword viewer as a modern static web page.

## Goal

- Parse XML puzzle data
- Render the crossword grid using HTML + CSS
    - Blocked and letter cells
    - Grid coordinates known from data
- Display across and down clues
- Allow user interaction:
    - Select squares (click/tap)
    - Type letters into squares
    - Move between squares (arrow keys or mouse/tap)
- Optional: validate completed puzzle
- Mobile-friendly or desktop — either is fine
- No server required (pure static site)

## Tasks You May Perform

- Parse the puzzle XML data
- Build HTML crossword grid
- Build clues display
- Implement user input handling
- Implement useful diagnostic output
- Implement test functions
- Improve code structure and readability
- Improve visual appearance / UX
- Add optional validation and solution checking

## Suggestions (Not Requirements)

The following ideas may help the agent during development, and may be implemented as part of the project if useful:

- Add structured diagnostic console output to confirm each development step (grid built, clues present, input working).
- Implement test functions such as:
    - `testGridIsBuilt()` — return true if grid built
    - `testCluesPresent()` — return true if clues displayed
- Add a diagnostic function like `logGridState()` that outputs the current grid contents to console, so that agents can verify behavior.
- Log user interactions:
    - When a square is selected
    - When a letter is typed
- Add a "test mode" toggle that enables verbose output for development
- To enable verbose logging, set `TEST_MODE` to `true` in `main.js`.

These are only suggestions — the agent may choose useful additional approaches for providing feedback, validating correctness, and facilitating agentic development.

## Coding Conventions

- Use modern JS (ES6+)
- No frameworks unless needed (plain JS preferred)
- Clear function names
- Helpful console output to aid debugging and testing
- Simple, modular structure

## Restrictions

- No server-side code
- No external API dependencies
- Must run in modern browsers (Chrome, Firefox)

## Tests

The following simple test functions may be useful:

```js
testGridIsBuilt(); // should return true if grid is correctly built
testCluesPresent(); // should return true if clues are present
```

These functions rely on the browser DOM. They will not run inside the
container's Node environment. Use them from a browser console instead.

## Working with this Repository

### Marked for Deletion
- Puzzle data lives in `puzzle.xml` and is fetched at runtime.
- The obsolete `Social_Deduction.js` stub has been removed; puzzle data now loads exclusively from `puzzle.xml`.
- There is no build system or dependency installation. Open `index.html` in a
  browser to run the viewer. The helper functions
  `testGridIsBuilt()` and `testCluesPresent()` are available from the
  developer console, but they require a browser environment and will not run
  in Node.

## Notes on Module Structure

`main.js` is loaded as an ES module and exports a `crossword` instance. Methods
can be invoked via `window.crossword` for debugging.

## DOM Caching

The crossword grid stores its cell elements in `crossword.cellEls[y][x]` when
`buildGrid()` runs. Use this array instead of repeatedly querying the DOM for
cell elements. This improves performance and simplifies code.

## Input Handling (2024)

Keyboard input is processed at the document level. Grid cells are
`contenteditable` so the on‑screen keyboard appears on mobile devices.
`keydown` events handle desktop entry (calling `preventDefault()` so letters are
not inserted twice) while `input` events cover mobile browsers that do not
dispatch `keydown`. The old hidden `mobile-input` element has been removed.

Clue numbers and letter containers inside each cell have `contenteditable="false"`
and ignore pointer events so typing does not modify them directly.

## Optional Focus Parameter (2024)

`selectCell(cell, shouldFocus = true)` selects and highlights a grid cell. When
`shouldFocus` is `false` the cell is highlighted without moving keyboard focus.
`selectClue()` uses this to highlight an entry when a clue is clicked without
focusing the grid.

## Solved Clue Styling (2024)

`updateClueCompletion()` adds the `complete` class to clue `<li>` elements when
all of their answer cells contain letters. Completed clues are faded via CSS and
ignored when clicked.

## Strike-Through for Completed Clues (2024)

Completed clues also display a subtle line-through decoration so solvers can
easily distinguish which clues remain unsolved.
