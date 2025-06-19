## Project Description

This is a Javascript + HTML project to display an interactive crossword puzzle on the web.

The puzzle data is provided in `Social_Deduction.js` as an XML string assigned to `CrosswordPuzzleData`.

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
