# do2R v0.7.0

**do2R** is a static, browser-only Stata/Mata → R translator intended for migration work on `.do`, `.ado`, and Mata code. It has no server component and can be hosted directly on GitHub Pages:

https://alekrutkowski.github.io/do2R/

The translator favors readable and performant R, especially `data.table`, while using established R packages when they provide a closer semantic match than base R. Unsupported or ambiguous Stata constructs remain visible as review diagnostics or `TODO` comments rather than being silently guessed.

## Features

### Linked editors

- Syntax highlighting for both Stata and R.
- Bidirectional source maps between original Stata statements and generated R lines.
- **Double-click** a Stata line to move the R caret/view to the corresponding R line.
- **Double-click** an R line to move the Stata caret/view back to its source statement.
- Single-click changes only the linked-line indication, so ordinary editing is not hijacked.
- Scroll synchronization follows statement ranges, including `///` continuations and one-to-many translations.
- The active highlight is applied to the actual rendered syntax row, not a separately positioned overlay. This removes cumulative line-height drift.
- Pressing **Tab** in the Stata editor inserts a literal tab character.
- Light/dark theme toggle, with system preference on first visit and local preference thereafter.
- The options panel is expanded by default.


### R output layout

- Generated R is formatted as ordinary multiline R rather than forcing long calls onto a single physical line.
- Long calls break at safe top-level commas; nested calls are formatted recursively.
- `ggplot2` chains break naturally after `+`, and long bracket/data.table expressions can span lines.
- The R editor does **not** soft-wrap. Long expressions are either formatted into syntactically valid, logically indented R lines or remain long physical lines with horizontal scrolling.

### Factor variables and repeated estimation

- Core `i.` / `c.` terms, `#` / `##`, parenthesized interactions, common `ib*.` / `b*.` base specifications, `fvset base`, and common `fvrevar` workflows are translated.
- `bootstrap:`, `jackknife:` / `jknife:`, `permute:`, `simulate`, and `rolling:` now share a reusable repeated-command execution layer.
- Common `_b`, `_se`, `r()`, and `e()` statistics are collected across replications.
- Common replication counts, seeds, bootstrap strata/clusters/sample size, permutation variables, and rolling windows/step sizes are translated.
- Advanced interval/rejection/weighting and exact-enumeration semantics remain explicit roadmap items rather than guessed behavior.

### Stata macros and ado programming

Macros are treated as a Stata preprocessing subsystem rather than ordinary R variables.

- Local `` `name' `` and global `$name` / `${name}` references use separate namespaces.
- Stata globals are assigned in R with `assign(..., envir = .GlobalEnv)`.
- Program/do-file locals live in a dedicated `.do2r_local` environment.
- Recursive nested macro expansion is supported, including names containing other macros.
- Undefined macro reads expand to empty text.
- Backslash-delayed references are protected across an expansion pass.
- Dynamic macro names such as ``local `eeo' 123`` are translated by expanding the macro name first and then using `assign()` through the local-macro helper.
- `tokenize`, positional locals `1`, `2`, ..., `` `*' ``, and `macro shift [#]` are translated.
- Common `gettoken` workflows are translated, including `parse()`, quoted strings, and conservative support for `match()` / `bind`.
- `syntax` declarations emit R argument extraction plus `stopifnot()` contracts for common varlist and option types. Stata defaults are made explicit where R defaults differ.

### Stored results and settings

The generated compatibility layer keeps Stata result classes separate:

- `r()` → `.do2r_r`
- `e()` → `.do2r_e`
- `s()` → `.do2r_s`
- portable `c()` settings → `stata_c()`

Common model-derived fields such as `e(N)`, `e(b)`, `e(V)`, `e(df_r)`, `e(r2)`, `e(r2_a)`, `e(rmse)`, and `e(rss)` are populated when the corresponding R model exposes them.

### Missing values

Stata numeric missing values are not globally replaced by R `Inf`, because doing so would break arithmetic and missing-data behavior. Instead:

- storage/arithmetic uses R missing values;
- `.a`–`.z` use tagged missing values when needed;
- comparison helpers reproduce Stata's ordering in which every numeric missing is greater than every finite number;
- literal expressions such as `. > 3` therefore translate to `TRUE`.

### Time series

Stata time-series operators now preferentially target the **collapse** package:

- `L.` / `F.` → `collapse::flag()`
- `D.` / `S.` → `collapse::fdiff()`
- repeated/combined operators and common lag-range forms are supported;
- `tsset` / `xtset` metadata is supplied to grouped/panel operations when available.

Coverage also includes `tsfill`, `tsappend, add()`, `tssmooth ma`, `arima`, `dfuller`, `corrgram`, ordinary consecutive-lag `var`, and pairwise `vargranger` Wald tests.

### Frames

- `frlink 1:1` and `frlink m:1` → integer link metadata in the translated frame runtime.
- `frget` supports ordinary names, wildcards, `new=old`, `prefix()`, `suffix()`, and `exclude()` workflows.
- Simple `frval()` access is supported.
- Live alias semantics (`fralias`) and full link lifecycle commands remain on the roadmap.

### Excel

- `import excel` → `readxl::read_excel()` plus compatibility handling for common Stata options.
- `export excel` → `openxlsx`.
- `putexcel set`, scalar/string/cell assignment, `matrix()`, `formula()`, and `image()` have initial `openxlsx` mappings.
- Advanced cell formatting, `etable`, `collect`, and richer workbook state remain future work.

### More model coverage

The current translator includes common mappings for:

- OLS/GLM and many common single-equation estimators;
- common `xtlogit`, `xtprobit`, `xtpoisson`, and `xtgee` cases;
- `mixed`, `melogit`, `meprobit`, `mecloglog`, `meologit`, `meoprobit`, `mepoisson`, `menbreg`, and common `meglm` family/link combinations;
- basic survey declarations and common `svy:` estimation;
- many data-management, reshape, join, descriptive-statistics, testing, and graphics commands.

### Comments

- Stata `/* ... */` comments are preserved as R comments. A block comment that spans physical lines in the middle of a command also joins those physical lines into one logical Stata statement, independently of indentation.
- Trailing `// ...` is detached before command parsing and appended after the completed R expression. For example, a Stata global assignment no longer places the comment inside the generated function call.

### Abbreviations

Supported built-in Stata commands can be recognized from their documented minimum prefix through their full name. For example, the translator accepts the complete `g` → `generate` prefix family. Commands known to be non-abbreviable are kept full-name only. User-written ado command names are not automatically abbreviated.

## Example gallery

The built-in gallery contains 21 diverse Stata/Mata snippets:

1. data management + regression
2. plots and graphics
3. nested local/global macros
4. ado program
5. `syntax` + argument validation
6. `r()` / `e()` / `s()` / `c()` results
7. numeric missing-value semantics
8. survey estimation
9. time series
10. multilevel models
11. Python integration
12. frames + reshape
13. Excel import/export + `putexcel`
14. panel GLM/GEE models
15. strings + dates
16. joins + reshape
17. descriptives + classical tests
18. macro token parsing
19. Mata matrices
20. factor variables + `fvset` / `fvrevar`
21. bootstrap / jackknife / permute / simulate / rolling

## Current coverage priorities

The in-app coverage map is the canonical roadmap. The next high-impact groups are:

1. **Macro/parser edge cases** – extended macro functions, positional `0` / call-line fidelity, compound quotes, Unicode/bind corner cases, and delayed expansion across multiple preprocessing passes.
2. **Python/sfi depth** – map common `sfi.Data`, `Frame`, `Macro`, `Scalar`, `Matrix`, and `ValueLabel` interactions to R objects and `reticulate` exchange rather than merely executing Python source.
3. **Advanced survey designs** – multistage and replicate-weight designs.
4. **Deeper time-series models** – filters, exponential/Holt-Winters smoothing, ARCH, VEC, VAR diagnostics, IRFs, and forecasting. Ordinary consecutive-lag VARs and pairwise Granger tests are now covered.
5. **Advanced resampling semantics** – BC/BCa intervals, `reject()`, custom weights and `idcluster`, jackknife MSE/pseudovalues, exact permutation enumeration, and fuller `rolling` save/window semantics.
6. **Factor-variable edge/design semantics** – omitted/empty-cell fidelity, factor variables in every varlist-bearing option, coefficient-name fidelity, and `fvset design` effects in postestimation.
7. **Panel estimator depth** – additional `xt*` families and richer GEE semantics.
8. **Advanced calendars** – weekly dates, full `%t*` display behavior, and business calendars.
9. **Reporting/collections** – `table`, `dtable`, `etable`, `collect`, advanced `putexcel`, `putdocx`, and `putpdf`.
10. **MI, survival, deep Mata, SEM/GSEM and specialized estimator families**.

## Run locally

No build step is required. For local browser testing, serve the directory with any static HTTP server, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

Run the regression suite with Node.js:

```bash
npm test
```

## GitHub Pages

Commit the repository contents and configure GitHub Pages to publish from the repository root (or copy these files into the root of the selected Pages branch). `.nojekyll` is included.

## Generated-R dependencies

do2R itself has no runtime JavaScript dependencies. Depending on the Stata source, generated R may reference packages including:

- `data.table`
- `haven`
- `collapse`
- `fixest`
- `ggplot2`
- `marginaleffects`
- `survey`
- `lme4`
- `ordinal`
- `survival`
- `geepack`
- `plm`
- `quantreg`
- `MASS`
- `readxl`
- `openxlsx`
- `reticulate`
- `urca`
- `vars`
- `AER`
- `nnet`
- `glue`
- `arrow`

The generated code uses namespaced calls where practical and emits helper blocks only when their features are needed.

## Contributing

Contributions and corrections are welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the lightweight workflow and the expectations for command semantics, regression tests, and documentation updates.

## Attribution

Stata is a product of StataCorp LLC. do2R is an independent migration aid and is not affiliated with or endorsed by StataCorp.

R package names and APIs remain the property of their respective authors and maintainers. Optional generated-R integrations and project acknowledgments are listed in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## License

MIT License. Copyright © 2026 Alek Rutkowski.
