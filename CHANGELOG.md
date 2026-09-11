# Changelog

## 0.7.0 – 2026-09-11

- Treat multiline `/* ... */` comments inside a Stata statement as lexical continuation, independently of indentation.
- Remove soft wrapping from the R editor. Generated R uses syntactically valid, logically indented physical line breaks where the formatter can do so safely; otherwise the editor keeps the long line and provides horizontal scrolling.
- Add ordinary consecutive-lag `var` translation through `vars::VAR()` and equation-by-equation `vargranger` Wald tests.
- Refresh homepage copy and publication metadata.
- Clean and synchronize the GitHub Pages package, tests, roadmap, license, contribution guide, and third-party notices.

## 0.6.0

- Added core factor-variable grammar and repeated-estimation prefixes.
- Reworked linked-editor navigation and multiline R formatting.

## 0.5.0

- Added frame links, Excel/`putexcel`, macro token parsing, `collapse`-based time-series operators, and line-row highlighting fixes.

## 0.4.0

- Added documented command abbreviations, richer macro namespaces, `syntax` validation, stored-result namespaces, missing-value ordering, and initial Python/`reticulate` support.
