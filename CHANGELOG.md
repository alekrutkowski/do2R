# Changelog

## 0.12.0 – 2026-09-24

- Expand `egen` with `rowmedian()`, `rowsd()`, `rowpctile()`, `rowfirst()`, `rowlast()`, corrected all-missing `rowmin()` / `rowmax()`, `seq()`, `anycount()`, `anymatch()`, `anyvalue()`, `concat(), punct()`, and optional storage-type parsing.
- Deepen `contract` with `freq()`, `cfreq()`, `percent()`, `cpercent()`, `zero`, `nomiss`, `if` / `in`, and fweight-aware frequency construction.
- Add `logistic`, `cloglog`, and `binreg` mappings, including odds-ratio, risk-ratio, risk-difference, and health-ratio links, grouped-binomial `n()`, offsets, exposures, and explicit convergence/VCE diagnostics.
- Add approximate `rreg` translation through `MASS::rlm()`, including `tune()`, iteration/tolerance controls, and `genwt()`, while warning about Stata's Cook's-D screening plus Huber/biweight algorithm.
- Add `newey` as OLS with `sandwich::NeweyWest(prewhite = FALSE, adjust = TRUE)`, `lag()`, `noconstant`, time ordering from `tsset`, and covariance propagation into translated `e(V)`.
- Add common regression diagnostics and model-state postestimation: `estat vif`, `estat hettest`, `estat ovtest`, `estat ic`, `estat vce`, `estat summarize`, `linktest`, and `estimates restore` / `drop`.
- Add reusable generated-R helpers for diagnostics, custom binomial log-complement links, and model covariance access; extend regression coverage tests and refresh roadmap, documentation, dependency notices, and release metadata.

## 0.11.0 – 2026-09-23

- Extend `statsby` beyond direct `summarize` handling: grouped model commands can now collect full `_b` / `_se` vectors, named coefficient and standard-error expressions, and scalar `r()` / `e()` / `s()` results through the reusable repeated-command layer.
- Add extended `mvencode` / `mvdecode` rules, including system missing and `.a`–`.z` tagged missing values, `else=#`, numlist-to-missing mappings, `if` / `in`, and `mvencode, override` collision semantics.
- Expand `ds` with `has()` / `not()` support for numeric/string type classes, Stata display-format patterns, variable-label patterns, value-label presence, `insensitive`, varlist complement via `not`, and `alpha` ordering.
- Add regression tests for the new grouped-statistics, missing-code, and variable-discovery paths; refresh the in-app coverage map and release metadata.

## 0.10.0 – 2026-09-22

- Add core multiple-imputation translation with `mi set`, `mi register`, `mi describe`, numbered `mi extract`, common univariate/chained imputations through `mice`, and `mi estimate:` pooling for common model families.
- Improve chained-imputation fidelity by including other imputed variables in each prediction equation, matching Stata's default low-to-high missingness visit order, and mapping predictive-mean-matching `knn()` to MICE donor pools.
- Add Arellano–Bond `xtabond` and system-GMM `xtdpdsys` mappings through `plm::pgmm()`, plus `estat abond` and `estat sargan`.
- Add widely used high-dimensional fixed-effect commands `reghdfe`, `ivreghdfe`, and `ppmlhdfe` through `fixest`, including categorical FE interactions, heterogeneous slopes, common IV syntax, clustered VCE, exposure, and offsets.
- Add `heckman`, `intreg`, `fracreg logit/probit`, `zip`, and `zinb` through `sampleSelection`, `survival`, base GLM, and `pscl`, with diagnostics for parameterization and covariance differences.
- Fix nested `select()` / `inflate()` option parsing, harden MI metadata inspection, flag unsupported MI sample/weight/conditional semantics instead of treating them as predictors, and prevent `plm::pgmm()` from silently introducing time dummies into ordinary `xtabond` translations.
- Add regression tests for the new MI, dynamic-panel, selection/fractional/zero-inflated, and high-dimensional fixed-effect paths; refresh roadmap, dependency notices, and release metadata.
- Polish the top-left `d → R` brand mark with a legible single-line monogram and improved light/dark-theme contrast.

## 0.9.0 – 2026-09-22

- Add modern reporting translations for common `table`, `dtable`, `etable`, and `collect` workflows, including tidy summaries, `modelsummary` estimation tables, and CSV/TSV/XLSX collection export.
- Expand `margins` with `dydx()`, `at()`, `atmeans`, `over()`, counterfactual grids, stored margins results, and generic `marginsplot` output through `marginaleffects` and `ggplot2`.
- Add common postestimation coefficient combinations with `lincom` and `nlcom` through `car::deltaMethod()`, including exponentiated-result options and confidence levels.
- Deepen survival support with richer `stset` failure declarations, `stcox` strata, `streg` parametric models through `flexsurv`, Kaplan–Meier `sts`/`stsum`, and `stcurve` survival/failure/hazard/cumulative-hazard output.
- Add Hodrick–Prescott `tsfilter hp`, Johansen `vecrank`/`vec`, and in-memory `irf create`/`graph`/`table` mappings through `mFilter`, `urca`, and `vars`.
- Harden estimator state so postestimation commands do not attach to stale models, and fix single-exponential smoothing to pass the translated data vector explicitly.
- Add regression coverage for all new reporting, margins, survival, filtering, VEC, and IRF paths.

## 0.8.0 – 2026-09-22

- Extend `tsappend` with endpoint `last()` and `tsfmt()` handling for common Stata time scales.
- Add `tssmooth exponential` translation, including fixed or optimized smoothing parameters, initial-value controls, panel-aware execution, and forecast extension.
- Add VAR lag selection and diagnostics through `varsoc`, `varlmar`, `varnorm`, and `varstable`, with explicit review notes where R and Stata diagnostics are not numerically identical.
- Add random-effects ordered panel mappings for `xtologit` and `xtoprobit` through `ordinal::clmm`, including `intpoints()` and adaptive/non-adaptive quadrature choices.
- Expand extended macro-function support with string-length variants, `copy`, and `subinstr` options including `all`, `word`, and `count()`.
- Add regression tests for the new translations and refresh the in-app roadmap and documentation.

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
