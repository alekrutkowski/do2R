# Contributing to do2R

Contributions and corrections are welcome.

do2R is intentionally conservative: a translation should be added only when the Stata semantics and the chosen R analogue are understood well enough to avoid silently changing the meaning of the program.

## Workflow

1. Create a focused branch or fork.
2. Make the translator change in `translator.js` and, when relevant, the editor/UI change in `app.js`, `editor-utils.js`, `styles.css`, or `index.html`.
3. Add a regression case to `tests/translator.test.mjs` for both the expected translation and important edge cases.
4. Update `COVERAGE_ROADMAP`, the example gallery, and `README.md` when coverage or user-visible behavior changes.
5. Run `npm test` or `npm run check` before submitting the change.

## Translation guidelines

- Prefer explicit R code over opaque compatibility magic when a direct mapping exists.
- Prefer `data.table` for data manipulation and namespaced calls for optional R packages.
- Preserve Stata defaults explicitly when the corresponding R function has different defaults.
- Treat Stata locals and globals as different macro namespaces.
- Respect documented Stata command-abbreviation minima rather than guessing prefixes.
- Preserve Stata missing-value comparison semantics where they differ from R.
- Leave an explicit review diagnostic or `TODO` when a construct cannot be translated safely.
- Add comments to generated R when an approximation has important statistical or runtime differences.

## Documentation sources

For Stata behavior, prefer the current official Stata help and reference manuals. For R mappings, prefer the current package reference manual or project documentation. Community examples are useful for discovery but should not be the sole basis for a semantic mapping.
