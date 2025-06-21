# Agent Guide

This project displays an interactive crossword in modern JavaScript and HTML.
Puzzle data is loaded from an XML file specified via the `puzzle` URL parameter
(default `social_deduction_ok.xml`) and rendered by `crossword.js` (imported by
the small `index.js` entry module).

Open `index.html` in a browser to run the viewer.

Major modules: `crossword.js` implements the `Crossword` class while
`grid-utils.js` provides grid and clue helpers and `state-utils.js`
contains serialization utilities. `puzzle-parser.js` still handles XML
parsing.
## Agent Tasks
- Maintain user input handling and diagnostic helpers.
- Keep the code modular and readable. `crossword.js` defines the `Crossword`
  class with helper methods such as `testGridIsBuilt()` and `testCluesPresent()`.
  A single instance is created in `index.js` and exported for debugging.
- Update this file when AGENT guidance changes and log notable updates in
  `CHANGELOG.md`.

## Coding Guidelines
- Use modern ES6+ JavaScript and plain HTML/CSS.
- No server-side code or external dependencies.
- Add helpful console output for debugging. Enable verbose diagnostics by setting
  `TEST_MODE` to `true` near the top of `crossword.js`.
  When enabled, `crossword.js` creates a `<pre id="debug-log">` element and
  appends it to the page to record debug messages.

## Repository Practices
- Keep `AGENTS.md` concise. Only record guidance that future agents must know.
  Use `CHANGELOG.md` for notable updates instead of documenting minor tweaks.
- Remove any obsolete sections once the related code is gone.
- Run the simple browser-based tests when relevant:
  - `testGridIsBuilt()`
  - `testCluesPresent()`
  - `logGridState()`

