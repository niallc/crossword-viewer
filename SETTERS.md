# For Crossword Setters

This document explains how to format a crossword puzzle file so it can be used with this viewer.

The viewer is designed to parse XML files that follow the schema produced by tools like *Crossword Compiler*. However, our parser only requires a specific subset of the full format, making it possible to write a puzzle file by hand.

### Basic Structure

The entire puzzle should be wrapped in `<rectangular-puzzle>` and `<crossword>` tags.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rectangular-puzzle xmlns="http://crossword.info/xml/rectangular-puzzle">
  <metadata>
    <creator>OkeyDoke</creator>
  </metadata>
  <crossword>
    </crossword>
</rectangular-puzzle>
```

### Metadata

Optionally include a `<metadata>` block before the `<crossword>` element.
Provide a `<creator>` or `<author>` tag with the setter's preferred name.
The viewer displays whichever value is found.

```xml
<rectangular-puzzle xmlns="http://crossword.info/xml/rectangular-puzzle">
  <metadata>
    <creator>OkeyDoke</creator>
    <author>OkeyDoke</author>
  </metadata>
  <crossword>
    ...
  </crossword>
</rectangular-puzzle>
```

### The Grid `<grid>`

The grid defines the puzzle's dimensions and contains all the cells.

```xml
<grid width="15" height="15">
  </grid>
```

### Cells `<cell>`

Each square in the grid is defined by a `<cell>` element with `x` and `y` coordinates (1-indexed). There are two types of cells:

**1. Blocked Cells**
These are the black squares in the grid. They are simply defined with `type="block"`.

*Example:*
```xml
<cell x="1" y="1" type="block"/>
```

**2. Letter Cells**
These are the white squares where answers are entered.
- `solution`: The correct letter for the square.
- `number`: (Optional) The clue number that starts in this square. This number links the grid position to a clue in the clue list.

*Example of a letter cell that starts clue #8:*
```xml
<cell x="1" y="2" solution="M" number="8"/>
```

*Example of a letter cell that is not a starting square:*
```xml
<cell x="1" y="4" solution="T"/>
```

### The Clues `<clues>`

Clues are provided in two separate `<clues>` blocks—one for "Across" and one for "Down".

Each individual `<clue>` must have:
- `number`: The number that corresponds to a numbered cell in the grid.
- `format`: (Optional) An enumeration string, like `7,5`, to indicate the answer length(s).
- **Clue Text:** The text of the clue goes inside the tag.

*Example:*
```xml
<clues ordering="normal">
  <title><b>Across</b></title>
  <clue word="1" number="1" format="12">Swiftness drinking beer - a drunk's charm?</clue>
</clues>

<clues ordering="normal">
  <title><b>Down</b></title>
  <clue word="15" number="2" format="7">Space covered by large crumpled blanket</clue>
</clues>
```
> **Note:** The `word` attribute in the `<clue>` tag is ignored by the viewer's parser, which calculates word boundaries automatically. Only the `number` attribute is used to link clues to the grid.

### A Minimal Complete Example

Here is a simple 3x3 puzzle to demonstrate a complete file.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rectangular-puzzle xmlns="http://crossword.info/xml/rectangular-puzzle">
  <metadata>
    <creator>OkeyDoke</creator>
  </metadata>
  <crossword>
    <grid width="3" height="3">
      <cell x="1" y="1" solution="C" number="1"/>
      <cell x="1" y="2" solution="A"/>
      <cell x="1" y="3" solution="T"/>

      <cell x="2" y="1" solution="A"/>
      <cell x="2" y="2" type="block"/>
      <cell x="2" y="3" type="block"/>

      <cell x="3" y="1" solution="R"/>
      <cell x="3" y="2" type="block"/>
      <cell x="3" y="3" type="block"/>
    </grid>

    <clues ordering="normal">
      <title><b>Across</b></title>
      <clue number="1" format="3">A domestic feline</clue>
    </clues>

    <clues ordering="normal">
      <title><b>Down</b></title>
      <clue number="1" format="3">A road vehicle</clue>
    </clues>
  </crossword>
</rectangular-puzzle>
```

### Using Your Puzzle

Once you have created your `.xml` file, save it in the project directory. The
viewer loads `social_deduction_ok.xml` by default, but you can specify your file
via the `?puzzle=` URL parameter or by editing the fetch call in `index.js`:

```javascript
// In index.js, find this line and change the filename if you prefer a fixed file
const puzzleFile = getPuzzleFileFromURL();
fetch(puzzleFile)
  .then(res => res.text())
  // ...
```
