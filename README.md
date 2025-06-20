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

The following helper functions can be run from the browser console:

- `testGridIsBuilt()` — returns true if the grid has been created
- `testCluesPresent()` — returns true if clues are displayed
- `logGridState()` — logs current cell contents
- `getShareableURL()` — returns a URL containing the current puzzle state
