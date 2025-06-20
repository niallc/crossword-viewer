# Crossword Viewer (Modern)

This project builds an interactive crossword viewer in Javascript + HTML.
The puzzle data lives in `puzzle.xml` and is fetched at runtime.

## Goal

Parse puzzle data from `puzzle.xml` and render an interactive crossword grid and clues.

## Files

- `index.html` — main page
- `main.js` — JS logic (loaded as an ES module)
- `puzzle.xml` — puzzle data in XML format loaded at runtime via fetch

## Features

- Interactive grid
- Clues display
- User can type answers
- Shareable URLs for puzzle state
- Basic test functions
- Diagnostic output in console
- No server required — runs as static HTML/JS
- Cells cached in memory for faster lookups

## Running

Open `index.html` in a modern browser.

`main.js` exports a `crossword` instance and also attaches it to `window.crossword` for debugging from the console.

Use the "Copy Share Link" button to copy a URL representing your current grid state.

### Input handling

Each grid cell is `contenteditable` so the on-screen keyboard appears on mobile devices. Keyboard events are handled at the document level: `keydown` covers desktop input while `input` events ensure mobile browsers work correctly. The handler calls `preventDefault()` on `keydown` so characters are not inserted twice.

## Testing

To enable verbose diagnostic output while developing, open `main.js` and set the
`TEST_MODE` constant near the top of the file to `true`:

```js
const TEST_MODE = true;
```

Reload `index.html` in your browser after making this change. Open the browser's
developer tools console (usually with <kbd>F12</kbd> or via "Inspect" → "Console" )
and run the helper functions provided by `main.js`:

- `testGridIsBuilt()` — returns `true` if the grid has been created.
- `testCluesPresent()` — returns `true` if clues are displayed.
- `logGridState()` — logs the current cell contents.
- `getShareableURL()` — returns a URL containing the current puzzle state.

## Share Link Format

The puzzle state string is compressed with a simple run-length encoding before
being Base64 encoded. Runs of the same character are replaced with
`<count><char>` (the count is omitted when it is `1`). The compressed string is
then passed to `btoa()` for inclusion in the URL. `loadStateFromURL()` performs
the inverse operation by Base64 decoding and expanding the run-length data.
