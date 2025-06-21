# Crossword Viewer (Modern)

This project builds an interactive crossword viewer in Javascript + HTML.
The puzzle data lives in `social_deduction_ok.xml` and is fetched at runtime.

See [CHANGELOG.md](CHANGELOG.md) for a summary of updates.

## Goal

Parse puzzle data from `social_deduction_ok.xml` and render an interactive crossword grid and clues.

## Files

- `index.html` — main page
- `index.js` — JS logic (loaded as an ES module)
- `crossword.js` — Crossword class implementation
- `puzzle-parser.js` — puzzle parsing utilities
- `social_deduction_ok.xml` — puzzle data in XML format loaded at runtime via fetch

## Creating Your Own Puzzle

See [COMPOSERS.md](COMPOSERS.md) for guidance on writing your own crossword file and replacing the provided puzzle.

## Features

- Interactive grid
- Clues display
- User can type answers
- Typing a new letter in a cell replaces any existing letter
- Shareable URLs for puzzle state
- Progress saved to `localStorage` and restored on reload
- Basic test functions
- Diagnostic output in console
- No server required — runs as static HTML/JS
- Cells cached in memory for faster lookups
- Puzzle data parsing split into helper functions (`parseGrid`, `parseClues`, `computeWordMetadata`) for readability
- Clue enumerations shown using values from `social_deduction_ok.xml`
- Responsive grid: cells scale with the viewport but never exceed 500&nbsp;px in total width; letter and clue number sizes scale with the cells
- "Check Letter" and "Check Word" buttons highlight incorrect entries until you type again

## Running

Open `index.html` in a modern browser.

`index.js` exports a `crossword` instance and also attaches it to `window.crossword` for debugging from the console.

Use the "Copy Share Link" button to copy a URL representing your current grid state.

### Input handling

Each grid cell is `contenteditable` so the on-screen keyboard appears on mobile devices. Keyboard events are handled at the document level: `keydown` covers desktop input while `input` events ensure mobile browsers work correctly. The handler calls `preventDefault()` on `keydown` so characters are not inserted twice.

### Clue clicking

Clues are no longer clickable to prevent accidental scrolling on mobile devices. The helper method `selectClue()` remains for debugging but is not bound to the interface.

### Solved clues

When all letters for a clue are filled in the clue becomes faint and now shows a light strike-through. Clicking a solved clue no longer jumps to that answer.

## Testing

To enable verbose diagnostic output while developing, open `index.js` and set the
`TEST_MODE` constant near the top of the file to `true`:

```js
const TEST_MODE = true;
```

Reload `index.html` in your browser after making this change. Open the browser's
developer tools console (usually with <kbd>F12</kbd> or via "Inspect" → "Console" )
and run the helper functions provided by `index.js`:

- `testGridIsBuilt()` — returns `true` if the grid has been created.
- `testCluesPresent()` — returns `true` if clues are displayed.
- `logGridState()` — logs the current cell contents.
- `getShareableURL()` — returns a URL containing the current puzzle state.
- When `TEST_MODE` is enabled, the check buttons log detailed information about
  each cell they evaluate. Use the console logs to understand why a letter was
  flagged (or not) by the check.

## Share Link Format

The puzzle state string is compressed with a simple run-length encoding before
being Base64 encoded. Runs of the same character are replaced with
`<count><char>` (the count is omitted when it is `1`). The compressed string is
then passed to `btoa()` for inclusion in the URL. `loadStateFromURL()` performs
the inverse operation by Base64 decoding and expanding the run-length data.
