# Bundled fonts

Microsoft's fonts (Times New Roman, Arial, Calibri, Cambria, Courier New) can't be redistributed.
These open fonts have the same character widths, so a document set in one of those fonts lays out
with the same line and page breaks. WordCraft's font matching (`crates/fonts/src/word.rs`) already
picks them when the document's font is missing; the web build just didn't ship them.

| In the document | Drawn with | License |
|---|---|---|
| Times New Roman | Liberation Serif 2.1.5 | SIL OFL 1.1 (`OFL-Liberation.txt`) |
| Arial | Liberation Sans 2.1.5 | SIL OFL 1.1 (`OFL-Liberation.txt`) |
| Courier New | Liberation Mono 2.1.5 | SIL OFL 1.1 (`OFL-Liberation.txt`) |
| Calibri (and other sans fonts not installed) | Carlito | SIL OFL 1.1 (`OFL-Carlito.txt`) |
| Cambria, Georgia, Garamond (and other serif fonts not installed) | Caladea | SIL OFL 1.1 (`OFL-Caladea.txt`) |

Each family has Regular, Bold, Italic and Bold Italic, converted unmodified to WOFF2 (2.5 MB in all).

Sources: Carlito from https://github.com/googlefonts/carlito, Caladea from
https://github.com/huertatipografica/Caladea, Liberation 2.1.5 from the `@formepdf/fonts-standard`
npm package (the 12 full Liberation 2.1.5 TTFs; name table and glyph counts checked).

## How they get into the app

`index.html` copies each file listed in `fonts.json` into the IndexedDB store the web build reads
user fonts from at start-up (database `wordcraft`, store `fonts`, key `<name>.ttf`, the same key the
app uses for a font added through its own Add font command). Each file is copied once per browser,
on the first start: later starts don't download anything. A font removed in the app stays removed.

To add another font, put the file (TTF, OTF, WOFF or WOFF2) in this folder and add its name to
`fonts.json`; it is copied in on the next start. A font is used only where the document names its
family, or where `word.rs` lists it as a substitute.
