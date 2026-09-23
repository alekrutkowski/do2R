# Third-party notices and acknowledgments

do2R itself is a dependency-free static web application. The JavaScript shipped in this repository does not bundle third-party runtime libraries.

Generated R code may reference external R packages when they provide a closer analogue to Stata behavior. Those packages are optional from do2R's point of view and remain separately licensed, maintained, and copyrighted by their respective authors and contributors.

The current integration set includes:

- **data.table** – core data manipulation target: https://rdatatable.gitlab.io/data.table/
- **haven** – Stata file I/O and tagged missing values: https://haven.tidyverse.org/
- **collapse** – panel/time-series lead, lag, and difference operations: https://cran.r-project.org/package=collapse
- **fixest** – fixed-effects, OLS, Poisson, and IV model mappings: https://lrberge.github.io/fixest/
- **plm** – panel-model mappings: https://cran.r-project.org/package=plm
- **survey** – survey-design and survey-estimation mappings: https://cran.r-project.org/package=survey
- **lme4** – mixed-effects model mappings: https://cran.r-project.org/package=lme4
- **ordinal** – cumulative-link mixed models: https://cran.r-project.org/package=ordinal
- **geepack** – GEE mappings: https://cran.r-project.org/package=geepack
- **survival** – Cox and survival-model mappings: https://cran.r-project.org/package=survival
- **flexsurv** – parametric survival-model mappings: https://cran.r-project.org/package=flexsurv
- **quantreg** – quantile-regression mappings: https://cran.r-project.org/package=quantreg
- **MASS** – negative-binomial and related model mappings: https://cran.r-project.org/package=MASS
- **AER** – Tobit mappings: https://cran.r-project.org/package=AER
- **nnet** – multinomial-model mappings: https://cran.r-project.org/package=nnet
- **marginaleffects** – margins/postestimation mappings: https://marginaleffects.com/
- **car** – delta-method coefficient combinations for `lincom` / `nlcom`: https://cran.r-project.org/package=car
- **modelsummary** – estimation-table output for `etable`: https://modelsummary.com/
- **ggplot2** – graphics mappings: https://ggplot2.tidyverse.org/
- **readxl** – Excel import: https://readxl.tidyverse.org/
- **openxlsx** – Excel export and `putexcel`-style workbook output: https://cran.r-project.org/package=openxlsx
- **reticulate** – Python execution and interop: https://rstudio.github.io/reticulate/
- **urca** – unit-root and cointegration-related mappings: https://cran.r-project.org/package=urca
- **vars** – vector-autoregression, VEC postestimation, and IRF mappings: https://cran.r-project.org/package=vars
- **mFilter** – Hodrick–Prescott time-series filtering: https://cran.r-project.org/package=mFilter
- **mice** – multiple imputation, completed-data analysis, and pooled inference: https://amices.org/mice/
- **pscl** – zero-inflated count-model mappings: https://cran.r-project.org/package=pscl
- **sampleSelection** – Heckman sample-selection mappings: https://cran.r-project.org/package=sampleSelection
- **arrow** – Parquet/Arrow I/O mappings: https://arrow.apache.org/docs/r/
- **glue** – generated-code string interpolation where needed: https://glue.tidyverse.org/

Stata, Mata, and the Stata documentation are products of StataCorp LLC. do2R is an independent migration aid and is not affiliated with or endorsed by StataCorp.
