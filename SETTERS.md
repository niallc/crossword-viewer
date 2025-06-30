# For Crossword Setters

This document explains how to format a crossword puzzle file so it can be used with this viewer.

The viewer is designed to parse XML files that follow the schema produced by tools like *Crossword Compiler*. However, our parser only requires a specific subset of the full format, making it possible to write a puzzle file by hand.

### Basic Structure

The entire puzzle should be wrapped in `<rectangular-puzzle>` and `<crossword>` tags.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rectangular-puzzle xmlns="[http://crossword.info/xml/rectangular-puzzle](http://crossword.info/xml/rectangular-puzzle)">
  <metadata>
    <!-- Optional: see below -->
  </metadata>
  <crossword>
    <!-- Grid and Clues go here -->
  </crossword>
</rectangular-puzzle>
```

### Metadata (Optional)

You can include a `<metadata>` block before the `<crossword>` element. Provide a `<creator>` or `<author>` tag with your preferred name, which will be displayed below the puzzle.

```xml
<metadata>
  <creator>AuthorName</creator>
</metadata>
```

### The Grid `<grid>`

The grid defines the puzzle's dimensions and contains all the cells. Any cells not defined within the grid will be automatically treated as black squares.

```xml
<grid width="15" height="15">
  <!-- Cell definitions go here -->
</grid>
```

### Cells `<cell>`

Each square in the grid is defined by a `<cell>` element with `x` and `y` coordinates (1-indexed). There are two types of cells:

**1. Blocked Cells**
These are the black squares in the grid. They are simply defined with `type="block"`.

*Example:*
```xml
<cell x="2" y="1" type="block"/>
```

**2. Letter Cells**
These are the white squares where answers are entered.
- `solution`: The correct letter for the square.

**Important Note on Numbering:** The parser **automatically calculates and assigns clue numbers** based on the grid structure. Any `number` attribute you add to a `<cell>` tag will be ignored.

*Example of a letter cell:*
```xml
<cell x="1" y="1" solution="C"/>
```

### The Clues `<clues>`

Clues must be provided in two separate `<clues>` blocks—the first for "Across" and the second for "Down". If a block is missing, those clues will not appear.

Each individual `<clue>` must have:
- `number`: The number that corresponds to the starting square of the clue in the grid. This is used to match the clue text to the correct word.
- `format`: (Optional) An enumeration string, like `7,5`, to indicate the answer length(s). If omitted, the parser will calculate the length.
- **Clue Text:** The text of the clue goes inside the tag.

*Example:*
```xml
<!-- Across Clues -->
<clues>
  <title><b>Across</b></title>
  <clue number="1" format="12">Swiftness drinking beer - a drunk's charm?</clue>
  <!-- ... more across clues -->
</clues>

<!-- Down Clues -->
<clues>
  <title><b>Down</b></title>
  <clue number="2" format="7">Space covered by large crumpled blanket</clue>
  <!-- ... more down clues -->
</clues>
```
> **Note:** The `word`, and `ordering` attributes in the `<clue>` and `<clues>` tags are ignored by the parser.

### A Minimal Complete Example

Here is a simple 3x3 puzzle to demonstrate a complete file.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rectangular-puzzle xmlns="[http://crossword.info/xml/rectangular-puzzle](http://crossword.info/xml/rectangular-puzzle)">
  <metadata>
    <creator>AuthorName</creator>
  </metadata>
  <crossword>
    <grid width="3" height="3">
      <cell x="1" y="1" solution="C"/>
      <cell x="1" y="2" solution="A"/>
      <cell x="1" y="3" solution="T"/>
      <cell x="2" y="1" solution="A"/>
      <cell x="2" y="2" type="block"/>
      <cell x="3" y="1" solution="R"/>
    </grid>

    <clues>
      <title><b>Across</b></title>
      <clue number="1" format="3">A domestic feline</clue>
    </clues>

    <clues>
      <title><b>Down</b></title>
      <clue number="1" format="3">A road vehicle</clue>
    </clues>
  </crossword>
</rectangular-puzzle>
```

### Using Your Puzzle

To add your puzzle to the viewer:
1.  Save your puzzle as an `.xml` file in the project's root directory.
2.  Open `index.js` and add an entry for your puzzle to the `puzzles` array at the top of the file.

*Example of adding a new puzzle:*
```javascript
// In index.js
const puzzles = [
  { name: 'Social Deduction', file: 'social_deduction_ok.xml' },
  { name: 'Oliver\'s Crossword', file: 'okeydoke_puzzle1.xml' },
  { name: 'My New Puzzle', file: 'my_new_puzzle.xml' } // Add your puzzle here
];
```
Your puzzle will then appear in the "Show all available crosswords" menu.
