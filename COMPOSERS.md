# Composing Crossword Puzzles

The viewer expects puzzle files using the XML schema produced by
[Crossword Compiler](https://www.crossword-compiler.com/) and other
similar tools. A minimal file contains a `<rectangular-puzzle>` element
with a `<crossword>` section that defines the grid and clues.

1. **Grid and Cells**
   - `<grid width="15" height="15">` with individual `<cell>` elements.
   - Block squares use `type="block"`.
   - Letter squares include `solution` and optional `number` attributes.
2. **Clues**
   - Two `<clues ordering="normal">` sections hold the across and down
     lists.
   - Each `<clue>` references a word ID via the `word` attribute and may
     specify a `format` string such as `7,5` for enumerations.

Well‑formed XML is essential. Editors like *CrossFire* or *QXW* can
export this format. An LLM can also generate it if you supply the full
set of clue/answer pairs and the desired grid layout.

Save your puzzle file alongside the viewer and update the fetch path in
`main.js` if you use a different filename.
