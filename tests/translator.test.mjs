import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { translateStata, EXAMPLES, COVERAGE_ROADMAP } from '../translator.js';
import { highlightCode, highlightCodeLines, lineAtOffset, lineStartOffset, mapLine, mapVisualPosition } from '../editor-utils.js';

const workflow = translateStata(EXAMPLES.workflow, { dataName: 'dt' });
assert.match(workflow.code, /haven::read_dta/);
assert.match(workflow.code, /mean\(sales, na\.rm = TRUE\)/);
assert.match(workflow.code, /fixest::feols/);
assert.match(workflow.code, /fwrite/);
assert.ok(workflow.coverage >= 90, `workflow coverage ${workflow.coverage}`);

const basic = translateStata(`gen z = ln(x) if x < .\nkeep if z > 0\ncollapse (mean) z, by(g)`);
assert.match(basic.code, /log\(x\)/);
assert.match(basic.code, /stata_missing_compare\(x,\s*"<",\s*""\)/);
assert.match(basic.code, /mean\(z, na\.rm = TRUE\)/);

const expressionSemantics = translateStata(`gen a = round(x, .1)\ngen b = mod(x, 3)\ngen c = cond(flag, 1, 0, 9)\ngen d = max(x, y)\ngen e = min(x, y)\ngen u = runiform(2, 5)\ngen z = rnormal(10, 2)\ngen lead = F.x\ngen ri = runiformint(1, 4)`);
assert.equal(expressionSemantics.counts.review, 0);
assert.match(expressionSemantics.code, /stata_round\(x,\s*\.1\)/);
assert.match(expressionSemantics.code, /stata_mod\(x,\s*3\)/);
assert.match(expressionSemantics.code, /stata_cond\(flag,\s*1,\s*0,\s*9\)/);
assert.match(expressionSemantics.code, /stata_pmax\(x,\s*y\)/);
assert.match(expressionSemantics.code, /stata_pmin\(x,\s*y\)/);
assert.match(expressionSemantics.code, /stats::runif\(\.N,\s*min = 2,\s*max = 5\)/);
assert.match(expressionSemantics.code, /stats::rnorm\(\.N,\s*mean = 10,\s*sd = 2\)/);
assert.match(expressionSemantics.code, /collapse::flag\(x,\s*n = -1L/);
assert.match(expressionSemantics.code, /sample\.int\(\(4\) - \(1\) \+ 1L,\s*\.N,\s*replace = TRUE\)/);
assert.doesNotMatch(expressionSemantics.code, /type ==|replace ==|mean ==|min ==|max ==/);
assert.match(expressionSemantics.code, /floor\(x \/ u \+ 0\.5\)/);
assert.match(expressionSemantics.code, /x - y \* floor\(x \/ y\)/);

const abbreviations = translateStata(`g x = 1
ge y = 2
gen z = 3
loc a 1
gl B 2
descr`, { addHeader: false });
assert.equal(abbreviations.counts.review, 0);
assert.match(abbreviations.code, /x := 1/);
assert.match(abbreviations.code, /y := 2/);
assert.match(abbreviations.code, /z := 3/);
assert.match(abbreviations.code, /stata_local_set\(\.do2r_local, "a"/);
assert.match(abbreviations.code, /stata_global_set\("B", "2"\)/);
assert.match(abbreviations.code, /str\(dt\)/);
const nonAbbrevReplace = translateStata(`rep x = 2`, { addHeader: false });
assert.equal(nonAbbrevReplace.counts.review, 1);

const macroNamespaces = translateStata(EXAMPLES.macros);
assert.equal(macroNamespaces.counts.review, 0);
assert.match(macroNamespaces.code, /assign\(as\.character\(name\), value, envir = \.GlobalEnv\)/);
assert.match(macroNamespaces.code, /stata_local_get\(local_env, name\)/);
assert.match(macroNamespaces.code, /stata_global_set\("ROOT", "project-data"\)/);
assert.match(macroNamespaces.code, /stata_macro_expand\("`v`i''"/);
assert.match(macroNamespaces.code, /stata_macro_expand\("\$\{x`i'\}"/);
assert.ok(macroNamespaces.code.includes('regexec("^([res])\\\\(([^)]+)\\\\)$"'));

const syntaxContract = translateStata(EXAMPLES.syntax);
assert.equal(syntaxContract.counts.review, 0);
assert.match(syntaxContract.code, /stopifnot\(!is\.null\(varlist\)\)/);
assert.match(syntaxContract.code, /length\(varlist\) >= 1L/);
assert.match(syntaxContract.code, /length\(varlist\) <= 3L/);
assert.match(syntaxContract.code, /all\(vapply\(dt\[, \.SD, \.SDcols = varlist\], is\.numeric/);
assert.match(syntaxContract.code, /level <- stata_option_get\([^\n]+default = stata_c\("level", dt\)/);
assert.match(syntaxContract.code, /generate <- stata_option_get\([^\n]+"gen"/);
assert.match(syntaxContract.code, /replace <- stata_option_get\([^\n]+"rep"/);

const resultClasses = translateStata(EXAMPLES.results);
assert.equal(resultClasses.counts.review, 0);
assert.match(resultClasses.code, /\.do2r_r\[\["p50"\]\]/);
assert.match(resultClasses.code, /\.do2r_e\[\["N"\]\]/);
assert.match(resultClasses.code, /\.do2r_e\[\["b"\]\]/);
assert.match(resultClasses.code, /stata_c\("N",\s*dt\)/);
assert.match(resultClasses.code, /stata_c\("pwd",\s*dt\)/);

const pythonFfi = translateStata(EXAMPLES.python);
assert.equal(pythonFfi.counts.review, 0);
assert.match(pythonFfi.code, /reticulate::py_run_string/);
assert.match(pythonFfi.code, /reticulate::py_run_file/);
assert.match(pythonFfi.code, /Packages used: data.table, reticulate/);
const pythonSfi = translateStata(`python:\nfrom sfi import Data\nprint(Data.get(\"price\"))\nend`);
assert.equal(pythonSfi.counts.review, 1);
assert.ok(pythonSfi.diagnostics.some(d => /sfi/i.test(d.message)));

const plots = translateStata(EXAMPLES.plotting);
assert.equal(plots.counts.review, 0);
assert.match(plots.code, /ggplot2::geom_point/);
assert.match(plots.code, /ggplot2::geom_histogram/);
assert.match(plots.code, /ggplot2::geom_density/);
assert.match(plots.code, /ggplot2::geom_boxplot/);
assert.match(plots.code, /ggplot2::geom_col/);
assert.ok(Object.keys(EXAMPLES).length >= 12);

const missingOrder = translateStata(`gen a = x < .\ngen b = x >= .a\ngen c = .z\ngen d = . > 3`);
assert.equal(missingOrder.counts.review, 0);
assert.match(missingOrder.code, /stata_missing_compare\(x,\s*"<",\s*""\)/);
assert.match(missingOrder.code, /stata_missing_compare\(x,\s*">=",\s*"a"\)/);
assert.match(missingOrder.code, /haven::tagged_na\("z"\)/);
assert.match(missingOrder.code, /d := TRUE/);

const ttestDefaults = translateStata(`ttest y, by(g)\nttest y, by(g) unequal\nttest y = 0`, { addHeader: false });
assert.match(ttestDefaults.code, /var\.equal = TRUE, conf\.level = 0\.95/);
assert.match(ttestDefaults.code, /var\.equal = FALSE, conf\.level = 0\.95/);
assert.match(ttestDefaults.code, /mu = 0, conf\.level = 0\.95/);

const comments = translateStata(`glo ln_sales = ln(sales) // my comment
/* my block comment */
gen x = 1`, { addHeader: false });
assert.equal(comments.counts.review, 0);
assert.match(comments.code, /stata_global_set\("ln_sales", log\(sales\)\) # my comment/);
assert.match(comments.code, /# my block comment/);
assert.doesNotMatch(comments.code, /log\(sales\) # my comment\)/);

const blockCommentContinuation = translateStata(`corrgram /*
*/ inflation, lags(12)`, { addHeader: false });
assert.equal(blockCommentContinuation.counts.review, 0);
assert.match(blockCommentContinuation.code, /acf\(dt\[\["inflation"\]\]/);
assert.deepEqual(blockCommentContinuation.sourceMap.map(x => [x.sourceStart, x.sourceEnd]), [[1, 2]]);
const blockCommentContinuationIndented = translateStata(`corrgram /*
    */ inflation, lags(12)`, { addHeader: false });
assert.equal(blockCommentContinuationIndented.counts.review, 0);
assert.match(blockCommentContinuationIndented.code, /pacf\(dt\[\["inflation"\]\]/);

const dynamicMacroName = translateStata("local eeo foo\nlocal `eeo' 123\ndisplay `foo'", { addHeader: false });
assert.equal(dynamicMacroName.counts.review, 0);
assert.match(dynamicMacroName.code, /stata_local_set\(\.do2r_local, as\.character\(stata_macro_expand\("`eeo'"/);

const macroTokens = translateStata(EXAMPLES.macro_tokens);
assert.equal(macroTokens.counts.review, 0);
assert.match(macroTokens.code, /stata_tokenize/);
assert.match(macroTokens.code, /stata_set_positional/);
assert.match(macroTokens.code, /stata_macro_shift/);
assert.match(macroTokens.code, /stata_gettoken/);
assert.match(macroTokens.code, /assign\("\*", paste\(tokens, collapse = " "\), envir = env\)/);
assert.match(macroTokens.code, /grepl\("\\\\s", c, perl = TRUE\)/);
assert.doesNotMatch(dynamicMacroName.code, /TODO/);

const extendedMacros = translateStata(`local s "a or b or c"
local n : strlen local s
local cp : copy local s
local out : subinstr local s "or" "and", all count(local k) word`);
assert.equal(extendedMacros.counts.review, 0);
assert.match(extendedMacros.code, /nchar\(as\.character\(stata_local_get/);
assert.match(extendedMacros.code, /stata_macro_subinstr/);
assert.match(extendedMacros.code, /all = TRUE[\s\S]*word = TRUE/);
assert.match(extendedMacros.code, /k <- \.__do2r_subinstr\$count/);

const literalMissingComparison = translateStata(`display . > 3\ngen high = x > 3`, { addHeader: true });
assert.match(literalMissingComparison.code, /cat\(TRUE/);
assert.match(literalMissingComparison.code, /stata_compare\(x,\s*">",\s*3\)/);

const frameLinks = translateStata(`frame create lookup
frame change lookup
input id str8 label
1 "one"
2 "two"
end
frame change default
input id x
1 10
2 20
end
frlink m:1 id, frame(lookup)
frget label, from(lookup)`);
assert.equal(frameLinks.counts.review, 0);
assert.match(frameLinks.code, /stata_frlink/);
assert.match(frameLinks.code, /stata_frget/);
assert.match(frameLinks.code, /link_name/);

const excel = translateStata(EXAMPLES.excel);
assert.equal(excel.counts.review, 0);
assert.match(excel.code, /readxl::read_excel/);
assert.match(excel.code, /openxlsx::writeData/);
assert.match(excel.code, /stata_putexcel_set/);
assert.match(excel.code, /stata_putexcel_formula/);

const panelModels = translateStata(EXAMPLES.panel);
assert.equal(panelModels.counts.review, 0);
assert.match(panelModels.code, /lme4::glmer/);
assert.match(panelModels.code, /survival::clogit/);
assert.match(panelModels.code, /fixest::fepois/);
assert.match(panelModels.code, /geepack::geeglm/);

const mata = translateStata(EXAMPLES.mata);
assert.match(mata.code, /rbind\(c\(1, 2\), c\(3, 4\)\)/);
assert.match(mata.code, /crossprod\(X, X\)/);
assert.match(mata.code, /solve/);
assert.ok(mata.diagnostics.some(d => /live view/i.test(d.message)));
assert.match(mata.code, /solve\(XtX\) %\*% crossprod\(X, y\)/);

const mataJoins = translateStata(String.raw`mata
A=(1,2\3,4)
B=(5,6\7,8)
C=A,B
D=A\B
z=mean(A)
t=A'
S=A[|2,1 \ 2,2|]
end`);
assert.match(mataJoins.code, /C <- cbind\(A, B\)/);
assert.match(mataJoins.code, /D <- rbind\(A, B\)/);
assert.match(mataJoins.code, /z <- mata_mean\(A\)/);
assert.match(mataJoins.code, /t <- t\(A\)/);
assert.match(mataJoins.code, /S <- A\[seq\.int\(2, 2\), seq\.int\(1, 2\)\]/);

const inputBlock = translateStata(`clear
input byte id str5 code double x
1 "a" 1.5
2 "bb" 2.25
end`);
assert.equal(inputBlock.counts.review, 0);
assert.match(inputBlock.code, /\.__do2r_input_rows/);
assert.match(inputBlock.code, /list\(id = 1L, code = "a", x = 1\.5\)/);
assert.match(inputBlock.code, /data\.table::rbindlist/);

const dataUtilities = translateStata(`fillin id t
split code, parse(,) generate(part) limit(2)
separate y, by(g) generate(y_)
stack a b c d, into(x y)
xpose, clear varname
range z 0 _pi 10
insobs 2, after(3)
ipolate y x, gen(yi) epolate
mvencode x y, mv(-99)
mvdecode x y, mv(-99 -98)
assertnested county state
ds, has(type numeric)
lookfor revenue profit
compare x y
recast double x
compress`);
assert.equal(dataUtilities.counts.review, 0);
assert.match(dataUtilities.code, /stata_fillin/);
assert.match(dataUtilities.code, /stata_split/);
assert.match(dataUtilities.code, /stata_separate/);
assert.match(dataUtilities.code, /stata_stack/);
assert.match(dataUtilities.code, /stata_xpose/);
assert.match(dataUtilities.code, /seq\(0, pi, length\.out = 10\)/);
assert.match(dataUtilities.code, /stata_insobs/);
assert.match(dataUtilities.code, /stata_ipolate/);
assert.match(dataUtilities.code, /lapply\(\.SD, function\(\.x\)/);
assert.match(dataUtilities.code, /stata_assertnested/);
assert.match(dataUtilities.code, /grepl/);
assert.match(dataUtilities.code, /first_missing = sum/);
assert.match(dataUtilities.code, /:= lapply\(\.SD, as\.numeric\)/);

const joins = translateStata(`cross using "u.dta"
joinby id using "u.dta", unmatched(both) update replace _merge(src)`);
assert.equal(joins.counts.review, 0);
assert.match(joins.code, /allow\.cartesian = TRUE/);
assert.match(joins.code, /invisible\(lapply\(\.__overlap/);
assert.match(joins.code, /src := data\.table::fcase/);
assert.doesNotMatch(joins.code, /rm\([^\n]*\.__v/);

const percentiles = translateStata(`pctile q=x, nquantiles(4) genp(p)
xtile q4=x, nq(4)
_pctile x, percentiles(10 90)`);
assert.equal(percentiles.counts.review, 0);
assert.match(percentiles.code, /type = if \(altdef\) 6L else 2L/);
assert.match(percentiles.code, /findInterval\(x, cutpoints, left\.open = TRUE\) \+ 1L/);
assert.match(percentiles.code, /\.do2r_r <- as\.list\(\.__pct\)/);

const weightedPercentile = translateStata(`pctile q=x [aw=w], nq(4)`);
assert.equal(weightedPercentile.counts.review, 1);
assert.match(weightedPercentile.code, /TODO/);

const programming = translateStata(`levelsof g, local(gs) missing
unab xs: x*
numlist "1/3 5(2)9"
confirm variable id numeric
continue
continue, break`);
assert.equal(programming.counts.review, 0);
assert.match(programming.code, /gs <- paste\(\.__levels/);
assert.match(programming.code, /xs <- stata_vars\(dt, "x\*"\)/);
assert.match(programming.code, /stata_numlist\("1\/3 5\(2\)9"\)/);
assert.match(programming.code, /stopifnot\("id" %in% names\(dt\), is\.numeric/);
assert.match(programming.code, /next/);
assert.match(programming.code, /break/);

const statsby = translateStata(`statsby mean=r(mean) p50=r(p50), by(g): summarize x, detail`);
assert.equal(statsby.counts.review, 0);
assert.match(statsby.code, /stata_summarize\(x, detail = TRUE\)/);
assert.match(statsby.code, /by = c\("g"\)/);
assert.match(statsby.code, /mean = \.do2r_r\[\["mean"\]\]/);

const statsbyModel = translateStata(`statsby _b _se, by(g): regress y x`);
assert.equal(statsbyModel.counts.review, 0);
assert.match(statsbyModel.code, /fixest::feols\(y ~ x, data = \.do2r_sample\)/);
assert.match(statsbyModel.code, /paste0\("_b_", \.__(?:n|do2r_n)\)/);
assert.match(statsbyModel.code, /paste0\("_se_", \.__(?:n|do2r_n)\)/);
assert.match(statsbyModel.code, /by = c\("g"\)/);

const statsbyDefaultModel = translateStata(`statsby, by(g): regress y x`);
assert.equal(statsbyDefaultModel.counts.review, 0);
assert.match(statsbyDefaultModel.code, /paste0\("_b_",/);

const statsbyNamedModel = translateStata(`statsby bx=_b[x] sx=_se[x] r2=e(r2), by(g, missing): regress y x`);
assert.equal(statsbyNamedModel.counts.review, 0);
assert.match(statsbyNamedModel.code, /bx = as\.numeric\(\.do2r_e\[\["b"\]\]\[1L, "x"\]\)/);
assert.match(statsbyNamedModel.code, /sx = as\.numeric\(sqrt\(diag\(\.do2r_e\[\["V"\]\]\)\)\[\["x"\]\]\)/);
assert.match(statsbyNamedModel.code, /r2 = as\.numeric\(\.do2r_e\[\["r2"\]\]\)/);
assert.match(statsbyNamedModel.code, /\.__do2r_statsby_source <- dt/);

const setObs = translateStata(`clear
set obs 5
gen id = _n
set seed 1234`);
assert.equal(setObs.counts.review, 0);
assert.match(setObs.code, /stata_set_obs\(dt, 5\)/);
assert.match(setObs.code, /id := \.I/);
assert.match(setObs.code, /set\.seed\(1234\)/);

const extendedMvRules = translateStata(`mvencode x, mv(.a=99 \\ .b=98 \\ else=97)`);
assert.equal(extendedMvRules.counts.review, 0);
assert.match(extendedMvRules.code, /haven::na_tag/);
assert.match(extendedMvRules.code, /target value already occurs in the data/);
assert.match(extendedMvRules.code, /\.__tag == "a"/);

const extendedMvDecode = translateStata(`mvdecode x, mv(99=.a \\ 100\/102=.b)`);
assert.equal(extendedMvDecode.counts.review, 0);
assert.match(extendedMvDecode.code, /stata_numlist\("100\/102"\)/);
assert.match(extendedMvDecode.code, /haven::tagged_na\("a"\)/);
assert.match(extendedMvDecode.code, /haven::tagged_na\("b"\)/);

const dsProperties = translateStata(`ds, has(format %t*)
ds, has(varlabel *weight*) insensitive
ds x*, not
ds, not(type string)
ds, has(vallabel)`);
assert.equal(dsProperties.counts.review, 0);
assert.match(dsProperties.code, /stata_ds_property\(dt, names\(dt\), "format %t\*"/);
assert.match(dsProperties.code, /"varlabel \*weight\*", negate = FALSE, insensitive = TRUE/);
assert.match(dsProperties.code, /setdiff\(names\(dt\), stata_vars\(dt, "x\*"\)\)/);
assert.match(dsProperties.code, /"type string", negate = TRUE/);
assert.match(dsProperties.code, /"vallabel", negate = FALSE/);

const unsupported = translateStata(`foobar x y, mysterious`);
assert.equal(unsupported.counts.review, 1);
assert.match(unsupported.code, /TODO \[Stata line 1\]/);

const dateTime = translateStata(`gen d = mdy(month, day, year)
gen dtm = clock(stamp, "YMDhms")
gen q = qofd(d)
gen yy = year(d)`);
assert.equal(dateTime.counts.review, 0);
assert.match(dateTime.code, /stata_mdy\(month, day, year\)/);
assert.match(dateTime.code, /stata_clock\(stamp, "YMDhms"\)/);
assert.match(dateTime.code, /stata_qofd\(d\)/);
assert.match(dateTime.code, /stata_year\(d\)/);
assert.match(dateTime.code, /1960-01-01/);

const timeSeries = translateStata(`tsset t
gen ld = LD.x
gen d2 = D2.x
gen l1explicit = L1.x
regress y L(0/2).(x z)
tsfill
tsappend, add(2)
tssmooth ma sm = x, window(2 1 2)`);
assert.equal(timeSeries.counts.review, 0);
assert.match(timeSeries.code, /collapse::flag\(collapse::fdiff\(x, n = 1L, diff = 1L[^\n]*fill = NA\), n = 1L[^\n]*fill = NA\)/);
assert.match(timeSeries.code, /collapse::fdiff\(x, n = 1L, diff = 2L[^\n]*fill = NA\)/);
assert.match(timeSeries.code, /l1explicit := collapse::flag\(x, n = 1L[^\n]*fill = NA\)/);
assert.match(timeSeries.code, /stata_tsfill\(dt, panel = NULL, time = "t"/);
assert.match(timeSeries.code, /stata_tsappend\(dt, panel = NULL, time = "t"/);
assert.match(timeSeries.code, /stata_tssmooth_ma\([\s\S]*x,[\s\S]*offsets = c\(-2L, -1L, 0L, 1L, 2L\),[\s\S]*weights = c\(1, 1, 1, 1, 1\)/);
assert.match(timeSeries.code, /x\s*\+\s*collapse::flag\(x,\s*n = 1L/);

const weightedSmooth = translateStata(`tsset t
tssmooth ma sm = x, weights(1/2 <3> 2/1)`);
assert.equal(weightedSmooth.counts.review, 0);
assert.match(weightedSmooth.code, /weights = c\(1, 2, 3, 2, 1\)/);

const endpointTsappend = translateStata(`tsset t
tsappend, last(2020m12) tsfmt(tm)`);
assert.equal(endpointTsappend.counts.review, 0);
assert.match(endpointTsappend.code, /stata_tsappend\(dt, panel = NULL, time = "t", delta = 1, last = "2020m12", tsfmt = "tm"\)/);
assert.match(endpointTsappend.code, /stata_ts_parse_last/);

const exponentialSmooth = translateStata(`tsset t
tssmooth exponential sm = x, parms(.4) samp0(3) forecast(2)`);
assert.equal(exponentialSmooth.counts.review, 0);
assert.match(exponentialSmooth.code, /stata_tssmooth_exponential\(dt\[, x\], alpha = \.4, s0 = NULL, samp0 = 3, forecast = 2\)/);
assert.match(exponentialSmooth.code, /stats::optimize/);

const reporting = translateStata(`table region, statistic(mean income) statistic(sd income)
dtable age income i.sex, by(group)
regress y x
etable, stars
collect export "out.xlsx", replace`);
assert.equal(reporting.counts.review, 0);
assert.match(reporting.code, /stata_table\(/);
assert.match(reporting.code, /statistics = c\("mean income", "sd income"\)/);
assert.match(reporting.code, /stata_dtable\(/);
assert.match(reporting.code, /modelsummary::modelsummary/);
assert.match(reporting.code, /stata_collect_export\(\.do2r_etable_3, "out\.xlsx", replace = TRUE\)/);

const marginalPost = translateStata(`regress y x i.g
margins, dydx(x) at(x=(0 1)) over(g)
marginsplot
lincom 2*_b[x]
nlcom exp(_b[x])`);
assert.equal(marginalPost.counts.review, 0);
assert.match(marginalPost.code, /marginaleffects::avg_slopes/);
assert.match(marginalPost.code, /grid_type = "counterfactual"/);
assert.match(marginalPost.code, /stata_numlist\("0 1"\)/);
assert.match(marginalPost.code, /stata_marginsplot/);
assert.match(marginalPost.code, /car::deltaMethod\(model_1, "2\*`x`"/);
assert.match(marginalPost.code, /car::deltaMethod\(model_1, "exp\(`x`\)"/);
assert.doesNotMatch(marginalPost.code, /stata_macro_expand\("exp\(`/);

const survivalModels = translateStata(`stset time, failure(dead==1)
stcox x i.g, strata(site)
stcurve, survival
streg x, distribution(weibull)
stcurve, hazard
sts graph, by(g) failure
stsum`);
assert.equal(survivalModels.counts.review, 0);
assert.match(survivalModels.code, /survival::Surv\(\(\(time\) \/ \(1\)\), dead %in% c\(1\)\)/);
assert.match(survivalModels.code, /survival::coxph/);
assert.match(survivalModels.code, /survival::strata\(site\)/);
assert.match(survivalModels.code, /flexsurv::flexsurvreg/);
assert.match(survivalModels.code, /dist = "weibullPH"/);
assert.match(survivalModels.code, /stata_stcurve\(streg_model_2, type = "hazard"\)/);

const staleSurvivalState = translateStata(`stset time, failure(dead)
streg x
regress y x
stcurve`, { addHeader: false });
assert.equal(staleSurvivalState.counts.review, 1);
assert.match(staleSurvivalState.code, /TODO \[Stata line 4\]/);

const survey = translateStata(`svyset psu [pweight=w], strata(stratum) fpc(fpc)
svy, subpop(if adult==1): mean income
svy: regress y x i.g`);
assert.equal(survey.counts.review, 0);
assert.match(survey.code, /survey::svydesign\([\s\S]*ids = ~ psu,[\s\S]*strata = ~ stratum,[\s\S]*weights = ~ w,[\s\S]*fpc = ~ fpc/);
assert.match(survey.code, /survey::svymean\(~ income, subset\(\.do2r_svy, stata_compare\(adult, "==", 1\)\)/);
assert.match(survey.code, /survey::svyglm\(y ~ x \+ factor\(g\), design = \.do2r_svy\)/);

const advancedSurvey = translateStata(`svyset psu [pweight=w], brrweight(rw1-rw80)`);
assert.equal(advancedSurvey.counts.review, 1);
assert.match(advancedSurvey.code, /TODO/);

const mixedModels = translateStata(`mixed y x || school: || classroom: x
melogit y x || school:
mecloglog y x || school:
meologit grade x || school:
meprobit y x || school:
meglm y x || school:, family(binomial) link(probit)
meglm cases x || clinic:, family(binomial trials) link(logit)
meglm score x || school:, family(gaussian) link(identity)`);
assert.equal(mixedModels.counts.review, 0);
assert.match(mixedModels.code, /lme4::lmer\(y ~ x \+ \(1 \| school\) \+ \(1 \+ x \| classroom\)/);
assert.match(mixedModels.code, /lme4::glmer\(y ~ x \+ \(1 \| school\).*binomial/);
assert.match(mixedModels.code, /binomial\(link = "cloglog"\)/);
assert.match(mixedModels.code, /ordinal::clmm\(ordered\(grade\).*link = "logit"/);
assert.match(mixedModels.code, /binomial\(link = "probit"\)/);
assert.match(mixedModels.code, /cbind\(cases, \(trials\) - cases\)/);
assert.match(mixedModels.code, /lme4::lmer\(score ~ x \+ \(1 \| school\).*REML = FALSE/);
assert.match(mixedModels.code, /Packages used: data.table, lme4, ordinal/);

const unsupportedMeGlm = translateStata(`meglm y x || id:, family(gamma) link(probit)`);
assert.equal(unsupportedMeGlm.counts.review, 1);
assert.match(unsupportedMeGlm.code, /TODO/);

const tsModels = translateStata(`arima y x, arima(1 1 1)
dfuller y, lags(2) trend
corrgram y, lags(12)`);
assert.equal(tsModels.counts.review, 0);
assert.match(tsModels.code, /stats::arima/);
assert.match(tsModels.code, /urca::ur.df/);
assert.match(tsModels.code, /stats::acf/);

const varModels = translateStata(`tsset t
var inflation unemployment, lags(1/2)
vargranger`);
assert.equal(varModels.counts.review, 0);
assert.match(varModels.code, /vars::VAR\(/);
assert.match(varModels.code, /p = 2L/);
assert.match(varModels.code, /stata_vargranger\(var_model_/);
assert.match(varModels.code, /paste0\("\^", v, "\\\\\.l\[0-9\]\+\$"\)/);
const varDefaults = translateStata(`tsset t
var y1 y2`, { addHeader: false });
assert.equal(varDefaults.counts.review, 0);
assert.match(varDefaults.code, /p = 2L/);
assert.match(varDefaults.code, /type = "const"/);
const orderedPanel = translateStata(`xtset id t
xtologit grade x i.g
xtoprobit grade x, intmethod(ghermite) intpoints(8)`);
assert.equal(orderedPanel.counts.review, 0);
assert.match(orderedPanel.code, /ordinal::clmm/);
assert.match(orderedPanel.code, /nAGQ = -8L/);

const sparseVarLags = translateStata(`tsset t
var y1 y2, lags(2 3)`, { addHeader: false });
assert.equal(sparseVarLags.counts.review, 1);
assert.match(sparseVarLags.code, /TODO/);

const varDiagnostics = translateStata(`tsset t
varsoc y1 y2, maxlag(6)
var y1 y2, lags(1/2)
varlmar, mlag(4)
varnorm
varstable, graph`);
assert.equal(varDiagnostics.counts.review, 0);
assert.match(varDiagnostics.code, /vars::VARselect/);
assert.match(varDiagnostics.code, /stata_varlmar\(var_model_1, mlag = 4\)/);
assert.match(varDiagnostics.code, /vars::normality\.test\(var_model_1/);
assert.match(varDiagnostics.code, /stata_varstable\(var_model_1, graph = TRUE\)/);

const hpFilter = translateStata(`tsset t
tsfilter hp cycle = y, smooth(1600) trend(trend)`);
assert.equal(hpFilter.counts.review, 0);
assert.match(hpFilter.code, /mFilter::hpfilter/);
assert.match(hpFilter.code, /stata_tsfilter_hp\(dt\[\["y"\]\], lambda = 1600, panel = NULL\)/);
assert.match(hpFilter.code, /dt\[, cycle := \.__do2r_hp\$cycle\]/);
assert.match(hpFilter.code, /dt\[, trend := \.__do2r_hp\$trend\]/);

const vecIrf = translateStata(`tsset t
vecrank y1 y2, lags(2) max
vec y1 y2, lags(3) rank(1)
irf create baseline, step(12) bs reps(250)
irf graph oirf, impulse(y1) response(y2)
irf table irf`);
assert.equal(vecIrf.counts.review, 0);
assert.match(vecIrf.code, /urca::ca\.jo/);
assert.match(vecIrf.code, /type = "eigen"/);
assert.match(vecIrf.code, /vars::vec2var/);
assert.match(vecIrf.code, /stata_irf_create\(\s*vec_model_1/);
assert.match(vecIrf.code, /n\.ahead = 12/);
assert.match(vecIrf.code, /boot = TRUE/);
assert.match(vecIrf.code, /runs = 250/);
assert.match(vecIrf.code, /plot\(\.do2r_irf_baseline\$oirf, impulse = c\("y1"\), response = c\("y2"\)\)/);
assert.match(vecIrf.code, /stata_irf_table\(\.do2r_irf_baseline, statistic = "irf"\)/);

const staleIrfState = translateStata(`tsset t
var y1 y2
regress z x
irf create old`, { addHeader: false });
assert.equal(staleIrfState.counts.review, 1);
assert.match(staleIrfState.code, /TODO \[Stata line 4\]/);

const multipleImputation = translateStata(`mi set mlong
mi register imputed bmi smoke
mi register regular age sex
mi impute chained (pmm, knn(5)) bmi (logit) smoke = age sex, add(20) rseed(123)
mi estimate: regress y bmi smoke age
mi describe`);
assert.equal(multipleImputation.counts.review, 0);
assert.match(multipleImputation.code, /mice::make\.method/);
assert.match(multipleImputation.code, /\.__mi_method\["bmi"\] <- "pmm"/);
assert.match(multipleImputation.code, /\.__mi_method\["smoke"\] <- "logreg"/);
assert.match(multipleImputation.code, /m = 20L/);
assert.match(multipleImputation.code, /visitSequence = "monotone"/);
assert.match(multipleImputation.code, /\.__mi_blots\[\["bmi"\]\] <- alist\(donors = 5L\)/);
assert.match(multipleImputation.code, /intersect\(c\("age", "sex", "smoke"\)/);
assert.match(multipleImputation.code, /seed = 123/);
assert.match(multipleImputation.code, /mice::with\(\.do2r_mi, stats::lm\(y ~ bmi \+ smoke \+ age\)\)/);
assert.match(multipleImputation.code, /mice::pool\(\.do2r_mi_fit_1\)/);
assert.match(multipleImputation.code, /get0\("\.do2r_mi_registered_imputed"/);
assert.match(multipleImputation.code, /Packages used: data\.table, mice/);

const miSingleAndExtract = translateStata(`mi set wide
mi register imputed income
mi impute pmm income age educ, add(5) knn(3) rseed(7)
mi extract 2`);
assert.equal(miSingleAndExtract.counts.review, 0);
assert.match(miSingleAndExtract.code, /\.__mi_method\["income"\] <- "pmm"/);
assert.match(miSingleAndExtract.code, /\.__mi_blots\[\["income"\]\] <- alist\(donors = 3L\)/);
assert.match(miSingleAndExtract.code, /mice::complete\(\.do2r_mi, action = 2L\)/);

const miPmmNeedsKnn = translateStata(`mi set mlong
mi impute pmm income age educ, add(5)`, { addHeader: false });
assert.equal(miPmmNeedsKnn.counts.review, 1);
assert.match(miPmmNeedsKnn.diagnostics.map(x => x.message).join(' '), /requires knn\(#\)/);

const miOrderAsIs = translateStata(`mi set mlong
mi impute chained (regress) x1 (logit) x2 = z, add(5) orderasis`, { addHeader: false });
assert.equal(miOrderAsIs.counts.review, 0);
assert.match(miOrderAsIs.code, /visitSequence = c\("x1", "x2"\)/);
assert.match(miOrderAsIs.code, /\.__mi_pred\["x1", intersect\(c\("z", "x2"\)/);

const miRestrictedSample = translateStata(`mi set mlong
mi impute regress income age educ if female == 1 [pw = survey_w], add(5) conditional(age > 18) bootstrap`, { addHeader: false });
assert.equal(miRestrictedSample.counts.review, 1);
assert.match(miRestrictedSample.code, /intersect\(c\("age", "educ"\)/);
assert.doesNotMatch(miRestrictedSample.code, /"if"|"female"|"survey_w"/);
assert.match(miRestrictedSample.diagnostics.map(x => x.message).join(' '), /if\/in qualifiers/);
assert.match(miRestrictedSample.diagnostics.map(x => x.message).join(' '), /pweight weights/);
assert.match(miRestrictedSample.diagnostics.map(x => x.message).join(' '), /conditional\(\)/);
assert.match(miRestrictedSample.diagnostics.map(x => x.message).join(' '), /bootstrap/);

const dynamicPanel = translateStata(`xtset id year
xtabond y x1 x2, lags(2) maxldep(5) twostep vce(robust)
estat abond, artests(3)
estat sargan
xtdpdsys y x1 x2, lags(1)`);
assert.equal(dynamicPanel.counts.review, 0);
assert.match(dynamicPanel.code, /plm::pgmm/);
assert.match(dynamicPanel.code, /y ~ plm::lag\(y, 1:2\) \+ x1 \+ x2 \| plm::lag\(y, 2:5\)/);
assert.match(dynamicPanel.code, /effect = "individual"/);
assert.doesNotMatch(dynamicPanel.code, /effect = "twoways"/);
assert.match(dynamicPanel.code, /model = "twosteps"/);
assert.match(dynamicPanel.code, /transformation = "d"/);
assert.match(dynamicPanel.code, /plm::mtest\(abond_model_1, order = \.order\)/);
assert.match(dynamicPanel.code, /plm::sargan\(abond_model_1\)/);
assert.match(dynamicPanel.code, /transformation = "ld"/);

const dynamicPanelAdvancedMoments = translateStata(`xtset id year
xtabond y x, pre(z)`, { addHeader: false });
assert.equal(dynamicPanelAdvancedMoments.counts.review, 1);
assert.match(dynamicPanelAdvancedMoments.diagnostics.map(x => x.message).join(' '), /pre\(\)\/endogenous\(\)\/inst\(\)/);

const advancedModels = translateStata(`heckman wage educ exper, select(work = age kids educ, noconstant) twostep
intreg ylo yhi x1 x2
fracreg logit share x1 i.g
zip count x1, inflate(z1 z2, offset(zi_off)) exposure(pop)
zinb count x1 x2, inflate(_cons) probit`);
assert.equal(advancedModels.counts.review, 0);
assert.match(advancedModels.code, /sampleSelection::selection/);
assert.match(advancedModels.code, /work ~ 0 \+ age \+ kids \+ educ/);
assert.match(advancedModels.code, /survival::Surv\(ylo, yhi, type = "interval2"\)/);
assert.match(advancedModels.code, /stats::quasibinomial\(link = "logit"\)/);
assert.match(advancedModels.code, /pscl::zeroinfl/);
assert.match(advancedModels.code, /z1 \+ z2 \+ offset\(zi_off\)/);
assert.match(advancedModels.code, /dist = "negbin", link = "probit"/);
assert.match(advancedModels.code, /Packages used: data\.table, survival, pscl, sampleSelection/);

const hdfeModels = translateStata(`reghdfe y x1 x2, absorb(firm year) vce(cluster firm)
ivreghdfe y x1 (price = cost shock), absorb(firm year) vce(cluster firm)
ppmlhdfe trade x1 x2, absorb(exporter importer year) exposure(pop)`);
assert.equal(hdfeModels.counts.review, 0);
assert.match(hdfeModels.code, /fixest::feols\(y ~ x1 \+ x2 \| firm \+ year, data = dt, cluster = ~ firm\)/);
assert.match(hdfeModels.code, /fixest::feols\(y ~ x1 \| firm \+ year \| price ~ cost \+ shock, data = dt, cluster = ~ firm\)/);
assert.match(hdfeModels.code, /fixest::fepois/);
assert.match(hdfeModels.code, /trade ~ x1 \+ x2 \+ offset\(log\(pop\)\) \| exporter \+ importer \+ year/);

const hdfeSlopes = translateStata(`reghdfe y x, absorb(firm#year state#c.time id##c.trend)`, { addHeader: false });
assert.equal(hdfeSlopes.counts.review, 0);
assert.match(hdfeSlopes.code, /\| firm\^year \+ state\[\[time\]\] \+ id\[trend\]/);

const factorGrammar = translateStata(`fvset base last g
reg y i.g##(i.h c.x) c.x#c.x ib(freq).region
fvrevar i.g##i.h, stub(fv_)
fvrevar i.g L.x, list`);
assert.equal(factorGrammar.counts.review, 0);
assert.match(factorGrammar.code, /stata_factor\(g, base = "last"\)/);
assert.match(factorGrammar.code, /I\(x\^2\)/);
assert.match(factorGrammar.code, /stata_factor\(region, base = "frequent"\)/);
assert.match(factorGrammar.code, /stats::model.matrix/);
assert.match(factorGrammar.code, /\.do2r_r <- list\(varlist = "g x"\)/);

const repeatedEstimation = translateStata(`bootstrap bx=_b[x], reps(20) seed(1): regress y x
jackknife m=r(mean): summarize x
permute y b=_b[x], reps(10): regress y x
simulate mean=r(mean), reps(10) seed(2): summarize x
tsset t
rolling b=_b[x], window(5): regress y x`);
assert.equal(repeatedEstimation.counts.review, 0);
assert.match(repeatedEstimation.code, /stata_bootstrap\(/);
assert.match(repeatedEstimation.code, /reps = 20/);
assert.match(repeatedEstimation.code, /stata_jackknife\(/);
assert.match(repeatedEstimation.code, /stata_permute\(/);
assert.match(repeatedEstimation.code, /stata_simulate\(/);
assert.match(repeatedEstimation.code, /stata_rolling\(/);
assert.match(repeatedEstimation.code, /strsplit\(trimws\(cluster\), "\\\\s\+"\)/);
assert.doesNotMatch(repeatedEstimation.code, /strsplit\([^\n]+, "\\s\+"\)/);

const egenDepth = translateStata(`egen rmed = rowmedian(x1 x2 x3)
egen rsd = rowsd(x1 x2 x3)
egen rp = rowpctile(x1 x2 x3), p(75)
egen first = rowfirst(x1 x2)
egen last = rowlast(x1 x2)
egen s = seq(), from(2) to(4) block(2)
egen hits = anycount(x1 x2 x3), values(1 3/5)
egen any = anymatch(x1 x2), values(0 2)
egen val = anyvalue(x1), values(1/4)
egen cat = concat(a b), punct("-")`, { addHeader: false });
assert.equal(egenDepth.counts.review, 0);
assert.match(egenDepth.code, /stats::median\(\.z, na\.rm = TRUE\)/);
assert.match(egenDepth.code, /stats::sd\(\.z, na\.rm = TRUE\)/);
assert.match(egenDepth.code, /stats::quantile\(\.z, probs = \(75\) \/ 100/);
assert.match(egenDepth.code, /which\(!is\.na\(\.z\)\)/);
assert.match(egenDepth.code, /seq_len\(\.N\).*%\/% \(2\)/s);
assert.match(egenDepth.code, /stata_numlist\("1 3\/5"\)/);
assert.match(egenDepth.code, /rowSums\(vapply\(\.SD/);
assert.match(egenDepth.code, /fifelse\(x1 %in%/);
assert.match(egenDepth.code, /sep = "-"/);

const contractDepth = translateStata(`contract foreign rep78 [fw=w] if use==1, freq(n) cfreq(cn) percent(p) cpercent(cp) zero nomiss`, { addHeader: false });
assert.equal(contractDepth.counts.review, 0);
assert.match(contractDepth.code, /complete\.cases/);
assert.match(contractDepth.code, /n = sum\(w, na\.rm = TRUE\)/);
assert.match(contractDepth.code, /data\.table::CJ/);
assert.match(contractDepth.code, /cn := cumsum\(n\)/);
assert.match(contractDepth.code, /p := 100 \* n \/ sum\(n\)/);
assert.match(contractDepth.code, /cp := 100 \* cumsum\(n\) \/ sum\(n\)/);

const modelDepth = translateStata(`logistic y x1 i.g
cloglog y x1, noconstant offset(off)
binreg y x, rr
binreg cases x, n(trials) hr
rreg y x1 x2, tune(8) genwt(rw)
tsset t
newey y x1 x2, lag(4)`);
assert.equal(modelDepth.counts.review, 0);
assert.match(modelDepth.code, /stats::binomial\(link = "logit"\)/);
assert.match(modelDepth.code, /stats::binomial\(link = "cloglog"\)/);
assert.match(modelDepth.code, /stats::binomial\(link = "log"\)/);
assert.match(modelDepth.code, /cbind\(cases, \(trials\) - cases\)/);
assert.match(modelDepth.code, /stata_log_complement_link\(\)/);
assert.match(modelDepth.code, /MASS::rlm\(/);
assert.match(modelDepth.code, /c = 4\.685 \* \(8\) \/ 7/);
assert.match(modelDepth.code, /rw := as\.numeric\(model_5\$w\)/);
assert.match(modelDepth.code, /sandwich::NeweyWest\(model_6, lag = 4, order\.by = ~ t, data = dt, prewhite = FALSE, adjust = TRUE\)/);
assert.match(modelDepth.code, /Packages used: data\.table,[^\n]*MASS,[^\n]*sandwich/);

const regressionDiagnostics = translateStata(`regress y x1 x2
estat vif
estat vif, uncentered
estat hettest
estat hettest, rhs iid
estat ovtest
estat ovtest, rhs
estat ic
estat vce
estat summarize
linktest
estimates store base
logit z x
estimates restore base
estat vif
predict yhat
estimates drop base`);
assert.equal(regressionDiagnostics.counts.review, 0);
assert.match(regressionDiagnostics.code, /stata_vif\(model_1, uncentered = FALSE\)/);
assert.match(regressionDiagnostics.code, /stata_vif\(model_1, uncentered = TRUE\)/);
assert.match(regressionDiagnostics.code, /stata_hettest\(model_1, z = NULL, rhs = FALSE, type = "normal"\)/);
assert.match(regressionDiagnostics.code, /stata_hettest\(model_1, z = NULL, rhs = TRUE, type = "iid"\)/);
assert.match(regressionDiagnostics.code, /stata_ovtest\(model_1, rhs = FALSE, powers = 2:4\)/);
assert.match(regressionDiagnostics.code, /stata_ovtest\(model_1, rhs = TRUE, powers = 2:4\)/);
assert.match(regressionDiagnostics.code, /AIC = stats::AIC\(model_1\)/);
assert.match(regressionDiagnostics.code, /stata_model_vcov\(model_1\)/);
assert.match(regressionDiagnostics.code, /summary\(as\.data\.frame\(stata_regression_parts\(model_1\)\$X\)\)/);
assert.match(regressionDiagnostics.code, /stata_linktest\(model_1\)/);
assert.match(regressionDiagnostics.code, /base <- model_1/);
assert.match(regressionDiagnostics.code, /subsequent translated postestimation uses base/);
assert.match(regressionDiagnostics.code, /stata_vif\(base, uncentered = FALSE\)/);
assert.match(regressionDiagnostics.code, /stats::predict\(base,/);
assert.match(regressionDiagnostics.code, /rm\(list = intersect\(c\("base"\), ls\(\)\)\)/);

const mapped = translateStata(`gen x = 1 ///
 + 2
summarize x`, { addHeader: false });
assert.deepEqual(mapped.sourceMap.map(x => [x.sourceStart, x.sourceEnd, x.rStart, x.rEnd]), [[1, 2, 1, 1], [3, 3, 2, 5]]);
assert.equal(mapLine(mapped.sourceMap, 'source', 2)?.line, 1);
assert.equal(mapLine(mapped.sourceMap, 'r', 4)?.line, 3);
assert.equal(mapLine(mapped.sourceMap, 'r', 99, true)?.line, 3);
const visualForward = mapVisualPosition([{ sourceStart: 1, sourceEnd: 1, rStart: 10, rEnd: 14 }], 'source', 1.5);
assert.equal(visualForward?.position, 12.5);
const visualBack = mapVisualPosition([{ sourceStart: 1, sourceEnd: 1, rStart: 10, rEnd: 14 }], 'r', 12.5);
assert.equal(visualBack?.position, 1.5);
assert.equal(lineAtOffset('a\nb\nc', 3), 2);
assert.equal(lineStartOffset('a\nb\nc', 3), 4);

const stataHtml = highlightCode('quietly gen x = "abc" // note\nlocal v = `x\'','stata');
assert.match(stataHtml, /tok-keyword/);
assert.match(stataHtml, /tok-string/);
assert.match(stataHtml, /tok-comment/);
assert.match(stataHtml, /tok-macro/);
const rHtml = highlightCode('dt[, x := data.table::shift(y, 1L)] # note', 'r');
assert.match(rHtml, /tok-namespace/);
assert.match(rHtml, /tok-function/);
assert.match(rHtml, /tok-number/);
assert.match(rHtml, /tok-comment/);

const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const stylesCss = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.doesNotMatch(appJs, /function editorMetrics\(editor\)/);
assert.match(appJs, /function visualPositionFromScroll\(layer, scrollTop\)/);
assert.match(appJs, /row\.offsetTop/);
assert.match(appJs, /getBoundingClientRect\(\)\.height/);
assert.match(appJs, /addEventListener\('dblclick'/);
assert.match(appJs, /e\.detail >= 2/);
assert.match(stylesCss, /height: clamp\(540px, 70vh, 760px\)/);
assert.match(indexHtml, /id="rOutput"[^>]*wrap="off"/);
assert.doesNotMatch(stylesCss, /\.output-editor[^}]*white-space:\s*pre-wrap/);
assert.match(stylesCss, /\.output-editor[^}]*white-space:\s*pre/);
assert.match(indexHtml, /Turn your Stata code into R code/);
assert.match(indexHtml, /<h2 id="coverage-title">Broad coverage<\/h2>/);
assert.match(indexHtml, /What just landed, and what may come next\./);
assert.match(indexHtml, /Contributions and corrections are welcome\./);
assert.match(appJs, /jump: true/);
assert.match(appJs, /setRangeText\('\\t'/);
assert.match(appJs, /document\.fonts\.ready/);
assert.match(stylesCss, /\.syntax-line/);
assert.match(appJs, /is-active-row/);
assert.match(stylesCss, /\.syntax-line\.is-active-row/);
assert.match(stylesCss, /\.active-code-line \{ display: none; \}/);
assert.match(stylesCss, /--runtime-line-height/);
assert.match(indexHtml, /id="optionsPanel"(?![^>]*hidden)/);
assert.match(indexHtml, /Double-click either editor/);
assert.match(indexHtml, /v0\.12\.0/);
assert.match(appJs, /editor-utils\.js\?v=0\.12\.0/);
const highlightedRows = highlightCodeLines('gen x=1\n/* block\ncomment */\ngen y=2', 'stata');
assert.equal(highlightedRows.length, 4);
assert.match(highlightedRows[1], /tok-comment/);
assert.match(highlightedRows[2], /tok-comment/);

assert.ok(Object.keys(EXAMPLES).length >= 21);
for (const [exampleName, exampleCode] of Object.entries(EXAMPLES)) {
  const exampleResult = translateStata(exampleCode);
  assert.equal(
    exampleResult.counts.review,
    0,
    `Built-in example ${exampleName} should not contain TODO/review translations`
  );
}
const multilinePlot = translateStata(EXAMPLES.plotting);
assert.match(multilinePlot.code, /\+\n\s+ggplot2::/);
const multilineTs = translateStata(EXAMPLES.timeseries);
assert.match(multilineTs.code, /stats::arima\(\n/);
const sectioned = translateStata(EXAMPLES.macros);
assert.match(sectioned.code, /# Compatibility helpers \(generated support code; not direct Stata translation\)/);
assert.match(sectioned.code, /# Translated Stata code/);
assert.ok(COVERAGE_ROADMAP.added.some(x => /svyset/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /tsfill/.test(x.commands) && /vargranger/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /meglm/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /python/i.test(x.family)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /macro/i.test(x.family)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /tokenize/.test(x.commands) && /gettoken/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.next.some(x => /Macro\/parser/.test(x.family) && !/gettoken\/tokenize\/macro shift/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.next.some(x => /sfi/i.test(x.family + ' ' + x.commands)));
assert.ok(COVERAGE_ROADMAP.next.some(x => x.family === 'Remaining multilevel outcomes'));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Excel/.test(x.family)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Frame links/.test(x.family)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /nonlinear panel/.test(x.family)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Factor-variable grammar/.test(x.family)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Repeated estimation/.test(x.family)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Repeated estimation/.test(x.family) && /statsby/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Missing-code recoding/.test(x.family) && /mvencode/.test(x.commands) && /ds has/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Egen row/.test(x.family) && /rowmedian/.test(x.commands) && /anycount/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Frequency-data/.test(x.family) && /contract/.test(x.commands) && /cpercent/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Binomial, robust/.test(x.family) && /binreg/.test(x.commands) && /newey/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Regression diagnostics/.test(x.family) && /hettest/.test(x.commands) && /linktest/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Reporting/.test(x.family) && /dtable/.test(x.commands) && /etable/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Marginal analysis/.test(x.family) && /nlcom/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Survival/.test(x.family) && /streg/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Time-series data/.test(x.family) && /tsfilter hp/.test(x.commands) && /vec/.test(x.commands) && /irf/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Multiple imputation/.test(x.family) && /mi estimate/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Dynamic panel GMM/.test(x.family) && /xtabond/.test(x.commands) && /xtdpdsys/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /High-dimensional/.test(x.family) && /reghdfe/.test(x.commands) && /ppmlhdfe/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.added.some(x => /Selection/.test(x.family) && /heckman/.test(x.commands) && /zinb/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.next.some(x => /Panel estimator depth/.test(x.family) && !/xtabond\/xtdpd\/xtdpdsys/.test(x.commands)));
assert.ok(COVERAGE_ROADMAP.next.some(x => /Advanced resampling semantics/.test(x.family)));
assert.ok(COVERAGE_ROADMAP.next.some(x => /Factor-variable edge/.test(x.family)));
assert.ok(COVERAGE_ROADMAP.next.some(x => x.family === 'Advanced survey designs' && x.priority === 'P1'));
assert.ok(COVERAGE_ROADMAP.next.some(x => /Advanced date\/time/.test(x.family)));

console.log('translator tests passed');
