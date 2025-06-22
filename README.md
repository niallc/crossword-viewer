# Crossword Viewer

This project builds an interactive crossword viewer in Javascript + HTML.
By default it loads `social_deduction_ok.xml`, but you can specify a different
puzzle via the `?puzzle=` URL parameter.

## Goal

Parse puzzle data from the XML file specified in the URL (default `social_deduction_ok.xml`) and render an interactive crossword grid and clues.

## Files

- `index.html` — main page
- `crossword.js` — Crossword class implementation and main logic (loaded as an ES module)
- `index.js` — minimal entry script that creates a `Crossword` instance
- `puzzle-parser.js` — puzzle parsing utilities
- `grid-utils.js` — helpers for computing word spans and locating cells
- `state-utils.js` — serialization helpers used for saving progress
- `social_deduction_ok.xml` — example puzzle data file loaded by default via fetch

## Creating Your Own Puzzle

See [SETTERS.md](SETTERS.md) for guidance on writing your own crossword file and replacing the provided puzzle.

## Features

- Interactive grid
- Shareable URLs for puzzle state
- Progress saved to `localStorage` and restored on reload
- "Show all available crosswords" button reveals a puzzle list below the clues
  and remains left-aligned rather than spanning the full width on larger screens
- No server required — runs as static HTML/JS
- Clue enumerations shown using values from the loaded puzzle file
- Responsive grid: cells scale with the viewport but never exceed 500&nbsp;px in total width; letter and clue number sizes scale with the cells
- Thin black lines separate each cell using a 1px grid gap
- "Check Letter" and "Check Word" buttons highlight incorrect entries until you type again
- "Reveal Word" and "Reveal Grid" buttons fill answers after a confirmation prompt
- The currently selected clue appears above and below the grid

See [CHANGELOG.md](CHANGELOG.md) for a summary of updates.

## Running

Open `index.html` in a modern browser.

`crossword.js` defines the `Crossword` class. The entry script `index.js` creates
an instance and attaches it to `window.crossword` for debugging from the console.

Use the "Copy Share Link" button to copy a URL representing your current grid state.

### Input handling

Each grid cell is `contenteditable` so the on-screen keyboard appears on mobile devices. Keyboard events are attached at the document level: `keydown` covers desktop input while each cell listens for the `input` event so mobile browsers work correctly. The handler calls `preventDefault()` on `keydown` so characters are not inserted twice.
Cells may be selected normally so you can highlight a letter before typing to replace it.

### Solved clues

When all letters for a clue are filled in the clue becomes faint and now shows a light strike-through. Clicking a solved clue no longer jumps to that answer.

## Testing

To enable verbose diagnostic output while developing, open `crossword.js` and set the
`TEST_MODE` constant near the top of the file to `true`:

```js
const TEST_MODE = true;
```

Reload `index.html` in your browser after making this change. Open the browser's
developer tools console (usually with <kbd>F12</kbd> or via "Inspect" → "Console" )
and run the helper functions provided by `crossword.js` (exposed via the
`crossword` instance):

- `testGridIsBuilt()` — returns `true` if the grid has been created.
- `testCluesPresent()` — returns `true` if clues are displayed.
- `logGridState()` — logs the current cell contents.
- `getShareableURL()` — returns a URL containing the current puzzle state.
- When `TEST_MODE` is enabled, the check buttons log detailed information about
  each cell they evaluate. Use the console logs to understand why a letter was
  flagged (or not) by the check.
- When `TEST_MODE` is enabled, a debug log appears at the bottom of the page
  showing internal events from `crossword.js`.

## Share Link Format

The puzzle state string is compressed with a simple run-length encoding before
being Base64 encoded. Runs of the same character are replaced with
`<count><char>` (the count is omitted when it is `1`). The compressed string is
then passed to `btoa()` for inclusion in the URL. `loadStateFromURL()` performs
the inverse operation by Base64 decoding and expanding the run-length data.
