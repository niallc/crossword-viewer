# Crossword Viewer (Modern)

This project builds an interactive crossword viewer in Javascript + HTML.

## Goal

Parse puzzle data from `Social_Deduction.js` and render an interactive crossword grid and clues.

## Files

- `index.html` — main page
- `main.js` — JS logic
- `Social_Deduction.js` — puzzle data as XML string

## Features

- Interactive grid
- Clues display
- User can type answers
- Shareable URLs for puzzle state
- Basic test functions
- Diagnostic output in console
- No server required — runs as static HTML/JS

## Running

Open `index.html` in a modern browser.

Use the "Copy Share Link" button to copy a URL representing your current grid state.

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
