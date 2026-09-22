/*
 * do2R - conservative Stata/Mata to R translation engine
 * No runtime dependencies. Generated R favors data.table and namespaced packages.
 */

export const EXAMPLES = {
  workflow: `* Panel workflow: data management + regression
clear all
use "firm_panel.dta", clear
xtset firm_id year

g ln_sales = ln(sales)
bysort industry year: egen mean_sales = mean(sales)
gen above_peer = sales > mean_sales if !missing(sales)

merge m:1 industry using "industry_lookup.dta", keep(master match) nogen

reg ln_sales c.price##i.foreign size leverage, vce(cluster firm_id)
predict fitted, xb

preserve
collapse (mean) sales profit_margin (sum) employees, by(industry year)
export delimited using "industry_year.csv", replace
restore`,

  plotting: `* Graphics: several Stata graph families
sysuse auto, clear
scatter price mpg
twoway (scatter price mpg) (lfit price mpg)
histogram price, normal density
kdensity mpg
graph box price, over(foreign)
graph bar (mean) price mpg, over(foreign)`,

  macros: `* Local and global macros occupy different namespaces
gl ROOT "project-data"
loc stem "sales"
local i 2
local v2 revenue
local picked "\`v\`i''"

display "$ROOT"
display "\`stem'"
display "\`picked'"

* A global really updates .GlobalEnv in generated R
global cutoff = 100
gen high = revenue > $cutoff

* Braced/nested global name
global x2 "profit"
display "\${x\`i'}"`,

  ado: `program define winsor2r, rclass
    version 18
    syntax varlist(min=1 numeric) [if] [in] [, Level(cilevel)]
    foreach v of varlist \`varlist' {
        quietly summarize \`v' \`if' \`in', detail
        local lo = r(p5)
        local hi = r(p95)
        replace \`v' = \`lo' if \`v' < \`lo' & !missing(\`v')
        replace \`v' = \`hi' if \`v' > \`hi' & !missing(\`v')
    }
    return scalar done = 1
end`,

  syntax: `program define summarize_checked, rclass
    syntax varlist(min=1 max=3 numeric) [if] [in] ///
        [, Level(cilevel) GENerate(name) REPlace]
    quietly summarize \`varlist' \`if' \`in'
    return scalar N = r(N)
    return scalar mean = r(mean)
end`,

  results: `sysuse auto, clear
summarize price, detail
local med = r(p50)
display "median = \`med'"

reg price mpg weight
display e(N)
display e(r2)
matrix b = e(b)

creturn list
display c(N)
display c(k)
display c(pwd)`,

  missing: `clear
set obs 5
gen x = _n
replace x = . in 3
gen observed = x < .
gen missing_any = missing(x)
gen missing_base_or_higher = x >= .
gen base_missing = x == .`,

  survey: `use "survey.dta", clear
svyset psu [pweight=weight], strata(stratum) fpc(fpc)
svy, subpop(if adult == 1): mean income
svy: proportion insured
svy: regress income age i.region`,

  timeseries: `use "macro_ts.dta", clear
tsset quarter
gen dy = D.gdp
gen lgdp = L.gdp
tssmooth ma gdp_ma = gdp, window(2 1 2)
arima inflation L(1/4).inflation unemployment, arima(1 0 1)
dfuller gdp, lags(4) trend
corrgram inflation, lags(12)
var inflation unemployment, lags(1/2)
vargranger`,

  mixed: `use "students.dta", clear
mixed score age female || school: || classroom:
melogit passed age female || school:
meologit grade age female || school:
meglm count exposure || clinic:, family(poisson) link(log)`,

  python: `* Stata -> Python FFI becomes reticulate
python:
import math
cutoff = math.sqrt(81)
print(cutoff)
end

python script "feature_engineering.py"`,

  frames: `frame create lookup
frame change lookup
use "lookup.dta", clear
frame change default
use "master.dta", clear
frlink m:1 industry, frame(lookup)
frget sector, from(lookup)
reshape long sales profit, i(firm_id) j(year)`,

  excel: `* Excel round-trip + a small model report
import excel using "sales.xlsx", sheet("Raw data") cellrange(A1:F500) firstrow clear
gen margin = profit / revenue

export excel id region revenue profit margin using "cleaned_sales.xlsx", ///
    sheet("Data", replace) firstrow(variables) replace

regress profit revenue i.region
matrix b = e(b)

putexcel set "model_report.xlsx", sheet("Results") replace
putexcel A1 = "Observations"
putexcel B1 = e(N)
putexcel A3 = matrix(b), names
putexcel D1 = formula("SUM(B1:B2)")`,

  panel: `* Common nonlinear panel estimators
use "panel.dta", clear
xtset firm_id year
xtlogit adopted size leverage, re
xtlogit adopted size leverage, fe
xtprobit adopted size leverage
xtpoisson patents rd size, fe
xtgee profit size leverage, family(gaussian) link(identity) corr(exchangeable)`,

  factorvars: `* Factor-variable grammar and base-level settings
sysuse auto, clear
fvset base last foreign
regress price i.foreign##(c.mpg c.weight) c.mpg#c.mpg ib(freq).rep78
fvrevar i.foreign##i.rep78, stub(fv_)
fvrevar i.foreign L.mpg, list`,

  resampling: `* Repeated-estimation prefixes
sysuse auto, clear
bootstrap b_mpg=_b[mpg], reps(50) seed(1234): regress price mpg weight
jackknife mean=r(mean): summarize price
permute foreign b_mpg=_b[mpg], reps(100) rseed(42): regress price mpg foreign
simulate mean=r(mean), reps(100) seed(9): summarize price
gen t = _n
tsset t
rolling b_mpg=_b[mpg], window(20) stepsize(2): regress price mpg weight`,

  strings_dates: `* Strings + dates
clear
input str12 rawdate str20 name
"2024-01-05" " Alpha "
"2024-06-30" "Beta"
end
gen d = date(rawdate, "YMD")
gen yr = year(d)
gen clean = strtrim(strlower(name))
gen has_a = strpos(clean, "a") > 0
format d %td`,

  joins_reshape: `* Joins + reshape
use "master.dta", clear
merge m:1 region using "regions.dta", keep(master match) nogen
joinby industry using "benchmarks.dta"
split code, parse("-") gen(part)
reshape long sales profit, i(firm_id) j(year)
reshape wide sales profit, i(firm_id) j(year)`,

  testing: `* Descriptives + classical tests
sysuse auto, clear
summarize price mpg, detail
tabstat price mpg, statistics(mean sd p50 min max) by(foreign)
ttest price, by(foreign)
ranksum price, by(foreign)
oneway price foreign, tabulate`,

  macro_tokens: `* Dynamic names + positional macros + token parsing
local eeo target
local \`eeo' 123
local words "alpha beta gamma"
tokenize \`words'
local first "\`1'"
macro shift
local remainder "\`*'"
local source "left:right"
gettoken head source : source, parse(":")`,

  mata: `mata
X = (1,2\\3,4)
y = (-1\\3)
XtX = X'X
b = invsym(XtX)*X'y
se = sqrt(diagonal(invsym(XtX)))

st_view(Z=., ., ("x1", "x2", "x3"))
zbar = mean(Z)
st_store(., "zsum", rowsum(Z))
end`
};

export const COVERAGE_ROADMAP = {
  added: [
    { family: 'Macro runtime & scopes', commands: 'local/global, nested expansion, ${...}, delayed expansion warnings, dynamic macro names, tokenize + positional 1...N/* macros, macro shift, common gettoken, global .GlobalEnv assignment' },
    { family: 'Ado argument contracts', commands: 'syntax varlist constraints, numeric/string/name/integer/real/cilevel options, defaults, stopifnot() validation' },
    { family: 'Stored-result namespaces', commands: 'r(), e(), s(), c(); return/ereturn/sreturn/creturn; common model e() fields' },
    { family: 'Command abbreviations', commands: 'documented minimum-prefix resolver for supported built-ins, including g...generate, loc...local, gl...global' },
    { family: 'Python integration', commands: 'python: ... end, python script, python query -> reticulate' },
    { family: 'Date/time core', commands: 'date()/daily(), clock(), mdy()/dmy()/ymd(), year/month/day/dow/doy, monthly/quarterly/half-year/year conversions' },
    { family: 'Time-series operators', commands: 'L./F./D./S., repeated and combined operators, L(0/2).x, L(0/2).(x y) -> collapse::flag()/fdiff(); tsset/xtset metadata' },
    { family: 'Time-series data & estimation', commands: 'tsfill, tsappend add(#)/last()+tsfmt(), tssmooth ma/exponential, tsfilter hp, arima, dfuller, corrgram, var, varsoc, vargranger, varlmar, varnorm, varstable, vecrank, vec, irf create/graph/table' },
    { family: 'Frame links', commands: 'frlink 1:1/m:1, frget, simple frval() via integer link metadata' },
    { family: 'Excel I/O & reporting basics', commands: 'import excel, export excel, putexcel set/cell/matrix/formula/image using readxl/openxlsx' },
    { family: 'Survey basics', commands: 'svyset; svy: mean/total/proportion/tabulate/regress/logit/probit/poisson; subpop()' },
    { family: 'Multilevel & mixed GLMs', commands: 'mixed, melogit, meprobit, mecloglog, meologit, meoprobit, mepoisson, menbreg, plus common meglm family()/link() combinations' },
    { family: 'Common nonlinear panel models', commands: 'xtlogit, xtprobit, xtpoisson (RE/FE/PA where meaningful), xtologit/xtoprobit random-effects ordered models, and xtgee common families/correlation structures' },
    { family: 'Factor-variable grammar', commands: 'i./c., #/##, parenthesized interactions, ib(first/last/frequent/#), bn./ibn., fvset base/design/clear/report, fvrevar/list/stub()' },
    { family: 'Repeated estimation', commands: 'bootstrap:, jackknife:/jknife:, permute:, simulate, rolling: with common r()/e()/_b/_se statistics, reps/seed/cluster/strata/window options' },
    { family: 'Reporting & collections', commands: 'table, dtable, etable, collect clear/preview/export with common statistic()/by() workflows and CSV/TSV/XLSX output' },
    { family: 'Marginal analysis & coefficient combinations', commands: 'margins dydx()/at()/atmeans/over(), marginsplot, lincom, nlcom with common exponentiation/level options' },
    { family: 'Survival analysis', commands: 'stset failure()/time0()/scale(), stcox + strata(), streg common parametric distributions, sts graph/list, stsum, stcurve survival/failure/hazard/cumhaz' }
  ],
  next: [
    { priority: 'P1', family: 'Macro/parser edge cases', commands: 'remaining extended macro functions, positional `0`/call-line fidelity, compound-quote edge cases, gettoken Unicode/bind corner cases, delayed expansion across multiple parser passes', note: 'Common parsing functions such as word/count, strlen/length, copy, and subinstr are mapped; finish the remaining parser-level textual substitution edge cases before broadening rare estimators.' },
    { priority: 'P1', family: 'Python/sfi bridge depth', commands: 'sfi.Data, Frame, Macro, Scalar, Matrix, ValueLabel and callbacks', note: 'Map common Stata Function Interface operations to data.table objects and reticulate data exchange rather than only preserving Python source.' },
    { priority: 'P1', family: 'Frame-link depth', commands: 'fralias, frlink dir/describe/rebuild, metadata/label fidelity and multi-step link invalidation checks', note: 'Current frlink/frget mappings cover ordinary 1:1 and m:1 lookup workflows; live alias semantics and link lifecycle management need a deeper runtime model.' },
    { priority: 'P1', family: 'Advanced survey designs', commands: 'multistage svyset, brrweight(), bsrweight(), jkrweight(), sdrweight(), poststrata, calibrate/rake', note: 'Map replicate-weight and multistage designs to survey::svrepdesign()/svydesign() without losing variance-method semantics.' },
    { priority: 'P1', family: 'Time-series data mechanics & remaining models', commands: 'tssmooth double-exponential/Holt-Winters, additional tsfilter methods, arch/GARCH, SVAR, richer VAR/VEC diagnostics, forecast', note: 'HP filtering, Johansen rank/VEC models, IRFs, tsappend endpoint dates, single-exponential smoothing, lag selection, and core VAR diagnostics are now covered; continue with volatility models, structural systems, richer diagnostics, and forecasting.' },
    { priority: 'P1', family: 'Advanced resampling semantics', commands: 'bootstrap BC/BCa/reject()/weights/idcluster, jackknife mse/pseudovalues/reject(), exact permute enumeration, rolling start()/end()/keep()/saving()', note: 'The reusable repeated-command layer now exists; finish Stata-specific replication, interval, rejection, and saved-result details.' },
    { priority: 'P1', family: 'Factor-variable edge/design semantics', commands: 'full o./b./bn. omission rules, empty cells, factor variables inside every varlist/option, coefficient-name fidelity, fvset design effects in margins/contrast', note: 'The core grammar and base-level machinery are implemented; the remaining work is Stata-specific omitted-column/design-matrix fidelity across commands.' },
    { priority: 'P1', family: 'Panel estimator depth', commands: 'xtnbreg, xtregar, xttobit, xtmlogit, xtabond/xtdpd/xtdpdsys and richer xtgee structures', note: 'Random-effects ordered logit/probit are now mapped; extend the remaining xt families while preserving estimator-specific likelihood, incidental-parameter, correlation, and VCE semantics.' },
    { priority: 'P1', family: 'Advanced date/time & calendars', commands: 'full datetime masks/top-year rules, weekly dates, %t display formats, bcal create/load, bofd()/dofb()', note: 'Finish Stata parsing/display semantics and business-calendar mappings beyond the common constructors now covered.' },
    { priority: 'P2', family: 'Advanced reporting & collections', commands: 'collect dimensions/layout/style/labels, advanced table/dtable/etable statistics/tests, putexcel formatting, putdocx, putpdf', note: 'Core tables, estimation tables, basic collection state, and CSV/TSV/XLSX export are mapped; finish Stata-specific presentation state and document outputs.' },
    { priority: 'P2', family: 'Multiple imputation & deeper survival', commands: 'mi, stcrreg, stsplit/stjoin, richer stcurve at()/CI/range(), recurrent/multiple-failure workflows', note: 'Core stset, Cox, parametric streg, Kaplan–Meier, and curve output are mapped; MI pooling, competing risks, survival-data transformation, and advanced risk-set semantics remain.' },
    { priority: 'P2', family: 'Remaining multilevel outcomes', commands: 'meintreg, metobit, mestreg, menl, multilevel postestimation and richer covariance()/integration structures', note: 'Extend the shared random-effects parser while preserving censoring, survival, nonlinear, covariance, and quadrature semantics.' },
    { priority: 'P2', family: 'Advanced estimators', commands: 'gmm, heckman, heckprobit, frontier, intreg, fracreg, zero-inflated and hurdle models', note: 'Requires explicit package selection and warnings for likelihood, parameterization, and default differences.' },
    { priority: 'P3', family: 'Deep Mata/runtime language', commands: 'structs/classes/pointers, optimize(), associative arrays, file I/O, callbacks', note: 'Needs a more complete parser and runtime-model emulation rather than command-by-command regexes.' },
    { priority: 'P3', family: 'Specialized model families', commands: 'sem/gsem, teffects/etregress, choice, bayes:, lasso/elasticnet, spatial, meta, irt, fmm', note: 'Large dedicated Stata subsystems should follow once the cross-cutting parser and repeated-estimation layers are stronger.' }
  ]
};

const COMMAND_MIN_ABBREVIATIONS = new Map(Object.entries({
  generate: 'g',
  summarize: 'su',
  tabulate: 'tab',
  regress: 'reg',
  describe: 'd',
  rename: 'ren',
  local: 'loc',
  global: 'gl',
  program: 'prog',
  display: 'di',
  quietly: 'qui',
  capture: 'cap',
  noisily: 'noi',
  forvalues: 'forv',
  foreach: 'fore',
  save: 'sav',
  correlate: 'corr',
  preserve: 'pres',
  restore: 'rest',
  predict: 'pred',
  estimates: 'est',
  histogram: 'hist',
  kdensity: 'kd',
  scatter: 'sc',
  collapse: 'coll',
  contract: 'contr',
  reshape: 'resh',
  append: 'app',
  merge: 'mer',
  encode: 'enc',
  decode: 'dec',
  levelsof: 'levelsof',
  confirm: 'conf'
}));

const NON_ABBREVIABLE_COMMANDS = new Set(['replace']);

function resolveCommandAbbreviation(raw) {
  const lower = String(raw || '').toLowerCase();
  if (NON_ABBREVIABLE_COMMANDS.has(lower)) return lower;
  const candidates = [];
  for (const [full, min] of COMMAND_MIN_ABBREVIATIONS) {
    if (lower.length >= min.length && full.startsWith(lower) && lower.startsWith(min)) candidates.push(full);
  }
  return candidates.length === 1 ? candidates[0] : lower;
}

const STATA_FUNCTION_REPLACEMENTS = [
  [/(?<![\w.])ln\s*\(/gi, 'log('],
  [/(?<![\w.])log10\s*\(/gi, 'log10('],
  [/(?<![\w.])ceil\s*\(/gi, 'ceiling('],
  [/(?<![\w.])int\s*\(/gi, 'trunc('],
  [/(?<![\w.])mod\s*\(/gi, 'stata_mod('],
  [/(?<![\w.])missing\s*\(/gi, 'stata_missing('],
  [/(?<![\w.])inlist\s*\(/gi, 'stata_inlist('],
  [/(?<![\w.])inrange\s*\(/gi, 'data.table::between('],
  [/(?<![\w.])cond\s*\(/gi, 'stata_cond('],
  [/(?<![\w.])round\s*\(/gi, 'stata_round('],
  [/(?<![\w.])strpos\s*\(/gi, 'stata_strpos('],
  [/(?<![\w.])substr\s*\(/gi, 'stata_substr('],
  [/(?<![\w.])subinstr\s*\(/gi, 'stata_subinstr('],
  [/(?<![\w.])strlen\s*\(/gi, 'nchar('],
  [/(?<![\w.])strlower\s*\(/gi, 'tolower('],
  [/(?<![\w.])lower\s*\(/gi, 'tolower('],
  [/(?<![\w.])strupper\s*\(/gi, 'toupper('],
  [/(?<![\w.])upper\s*\(/gi, 'toupper('],
  [/(?<![\w.])strtrim\s*\(/gi, 'trimws('],
  [/(?<![\w.])trim\s*\(/gi, 'trimws('],
  [/(?<![\w.])wordcount\s*\(/gi, 'stata_wordcount('],
  [/(?<![\w.])word\s*\(/gi, 'stata_word('],
  [/(?<![\w.])regexm\s*\(/gi, 'grepl('],
  [/(?<![\w.])real\s*\(/gi, 'as.numeric('],
  [/(?<![\w.])normalden\s*\(/gi, 'dnorm('],
  [/(?<![\w.])invnormal\s*\(/gi, 'qnorm('],
  [/(?<![\w.])normal\s*\(/gi, 'pnorm('],
  [/(?<![\w.])daily\s*\(/gi, 'stata_date('],
  [/(?<![\w.])date\s*\(/gi, 'stata_date('],
  [/(?<![\w.])clock\s*\(/gi, 'stata_clock('],
  [/(?<![\w.])mdy\s*\(/gi, 'stata_mdy('],
  [/(?<![\w.])dmy\s*\(/gi, 'stata_dmy('],
  [/(?<![\w.])ymd\s*\(/gi, 'stata_ymd('],
  [/(?<![\w.])dofm\s*\(/gi, 'stata_dofm('],
  [/(?<![\w.])mofd\s*\(/gi, 'stata_mofd('],
  [/(?<![\w.])dofq\s*\(/gi, 'stata_dofq('],
  [/(?<![\w.])qofd\s*\(/gi, 'stata_qofd('],
  [/(?<![\w.])dofh\s*\(/gi, 'stata_dofh('],
  [/(?<![\w.])hofd\s*\(/gi, 'stata_hofd('],
  [/(?<![\w.])dofy\s*\(/gi, 'stata_dofy('],
  [/(?<![\w.])yofd\s*\(/gi, 'stata_yofd('],
  [/(?<![\w.])dofc\s*\(/gi, 'stata_dofc('],
  [/(?<![\w.])cofd\s*\(/gi, 'stata_cofd('],
  [/(?<![\w.])year\s*\(/gi, 'stata_year('],
  [/(?<![\w.])month\s*\(/gi, 'stata_month('],
  [/(?<![\w.])day\s*\(/gi, 'stata_day('],
  [/(?<![\w.])dow\s*\(/gi, 'stata_dow('],
  [/(?<![\w.])doy\s*\(/gi, 'stata_doy('],
  [/(?<![\w.])quarter\s*\(/gi, 'stata_quarter('],
  [/(?<![\w.])halfyear\s*\(/gi, 'stata_halfyear(']
];

function cleanIdentifier(x, fallback = 'dt') {
  const s = String(x || '').trim().replace(/[^A-Za-z0-9_.]/g, '_');
  if (!s) return fallback;
  return /^[A-Za-z.]/.test(s) ? s : `x_${s}`;
}

function logicalLines(source) {
  const raw = String(source || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let inBlockComment = false;
  let blockBuffer = '';
  let buffer = '';
  let bufferedComments = [];
  let startLine = 1;

  const cleanPhysicalLine = line => {
    let code = '';
    const comments = [];
    let inString = false;
    let i = 0;

    while (i < line.length) {
      if (inBlockComment) {
        const close = line.indexOf('*/', i);
        if (close < 0) {
          blockBuffer += `${blockBuffer ? ' ' : ''}${line.slice(i).trim()}`;
          i = line.length;
          break;
        }
        blockBuffer += `${blockBuffer ? ' ' : ''}${line.slice(i, close).trim()}`;
        if (blockBuffer.trim()) comments.push(blockBuffer.trim());
        blockBuffer = '';
        inBlockComment = false;
        i = close + 2;
        continue;
      }

      const c = line[i];
      if (c === '"') {
        inString = !inString;
        code += c;
        i += 1;
        continue;
      }
      if (!inString && line.slice(i, i + 2) === '/*') {
        inBlockComment = true;
        blockBuffer = '';
        i += 2;
        continue;
      }
      if (!inString && line.slice(i, i + 2) === '//') {
        // /// at the end of a physical line is Stata's continuation marker, not a comment.
        if (line[i + 2] === '/' && /^\s*$/.test(line.slice(i + 3))) {
          code += '///';
          i += 3;
          continue;
        }
        const comment = line.slice(i + 2).trim();
        if (comment) comments.push(comment);
        break;
      }
      code += c;
      i += 1;
    }
    return { code, comments, blockOpenAtEnd: inBlockComment };
  };

  for (let i = 0; i < raw.length; i += 1) {
    const cleaned = cleanPhysicalLine(raw[i]);
    let line = cleaned.code;
    const comments = cleaned.comments;
    const slashContinuation = /\/\/\/\s*$/.test(line);
    // A /* ... */ comment may span physical lines in the middle of a Stata
    // statement.  While such a comment is open, the physical newline is
    // lexical whitespace rather than the end of the command.  This is
    // independent of indentation on either side of the comment delimiter.
    const blockContinuation = cleaned.blockOpenAtEnd && (Boolean(buffer) || Boolean(line.trim()));

    if (slashContinuation || blockContinuation) {
      if (!buffer) startLine = i + 1;
      const part = slashContinuation ? line.replace(/\/\/\/\s*$/, '') : line;
      if (part) buffer += `${part} `;
      bufferedComments.push(...comments);
      continue;
    }

    if (buffer) {
      out.push({
        line: startLine,
        endLine: i + 1,
        text: buffer + line,
        comments: [...bufferedComments, ...comments]
      });
      buffer = '';
      bufferedComments = [];
    } else {
      out.push({ line: i + 1, endLine: i + 1, text: line, comments });
    }
  }

  if (buffer) out.push({ line: startLine, endLine: raw.length, text: buffer, comments: bufferedComments });
  if (inBlockComment && blockBuffer.trim()) {
    const last = out[out.length - 1];
    if (last) last.comments = [...(last.comments || []), blockBuffer.trim()];
  }
  return out;
}

function splitTopLevel(text, delimiter = ',') {
  let depth = 0;
  let quote = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') quote = !quote;
    if (quote) continue;
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (c === delimiter && depth === 0) return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
  }
  return [text.trim(), ''];
}

function splitStataOptions(text) {
  const src = String(text || '').trim();
  if (/^syntax\b/i.test(src)) {
    const m = src.match(/^(syntax\b[\s\S]*?)\s*\[\s*,\s*([\s\S]*?)\]\s*$/i);
    if (m) return [m[1].trim(), m[2].trim()];
  }
  return splitTopLevel(src, ',');
}

function splitArgs(text) {
  const out = [];
  let depth = 0;
  let quote = false;
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') quote = !quote;
    if (quote) continue;
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (c === ',' && depth === 0) {
      out.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(text.slice(start).trim());
  return out;
}

function splitWords(text) {
  const out = [];
  let cur = '';
  let quote = false;
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') { quote = !quote; cur += c; continue; }
    if (!quote && (c === '(' || c === '[')) depth += 1;
    if (!quote && (c === ')' || c === ']')) depth -= 1;
    if (!quote && depth === 0 && /\s/.test(c)) {
      if (cur) out.push(cur), cur = '';
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

function splitAtTopLevelColon(text) {
  let depth = 0;
  let quote = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') quote = !quote;
    if (quote) continue;
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (c === ':' && depth === 0) return [text.slice(0, i).trim(), text.slice(i + 1).trim()];
  }
  return [text.trim(), ''];
}

function regexEscape(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseStataSeparators(raw) {
  if (!raw || raw === true) return [];
  return splitWords(String(raw)).map(unquoteStata).filter(x => x.length > 0);
}

function optionValue(options, name) {
  const re = new RegExp(`(?:^|\\s)${name}(?:\\(([^)]*)\\))?(?=\\s|$)`, 'i');
  const m = options.match(re);
  return m ? (m[1] === undefined ? true : m[1].trim()) : null;
}

function optionValues(options, name) {
  const src = String(options || '');
  const wanted = String(name || '').toLowerCase();
  const out = [];
  let i = 0;
  while (i < src.length) {
    if (src[i] === '"') {
      i += 1;
      while (i < src.length && src[i] !== '"') i += src[i] === '\\' ? 2 : 1;
      i += 1;
      continue;
    }
    const prevOk = i === 0 || /\s|,/.test(src[i - 1]);
    const hit = src.slice(i, i + wanted.length).toLowerCase() === wanted;
    const next = src[i + wanted.length] || '';
    if (!prevOk || !hit || (next && !/[\s(,]/.test(next))) { i += 1; continue; }
    let j = i + wanted.length;
    while (/\s/.test(src[j] || '')) j += 1;
    if (src[j] !== '(') {
      out.push(true);
      i = j;
      continue;
    }
    let depth = 1, quote = false, k = j + 1;
    for (; k < src.length; k += 1) {
      const c = src[k];
      if (c === '"') { quote = !quote; continue; }
      if (quote) continue;
      if (c === '(') depth += 1;
      else if (c === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) break;
    out.push(src.slice(j + 1, k).trim());
    i = k + 1;
  }
  return out;
}

function hasOption(options, name) {
  return optionValue(options, name) !== null;
}

function escapeRString(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function unquoteStata(s) {
  let x = String(s || '').trim();
  if ((x.startsWith('`"') && x.endsWith('"\'')) || (x.startsWith('"') && x.endsWith('"'))) {
    x = x.startsWith('`"') ? x.slice(2, -2) : x.slice(1, -1);
  }
  return x.replace(/""/g, '"');
}

function rString(raw, ctx) {
  const s = unquoteStata(raw);
  if (/(^|[^\\])(?:`|\$)/.test(s)) {
    ctx.features.add('macros');
    if (/[resc]\([A-Za-z_]\w*\)/i.test(s)) ctx.features.add('results');
    return `stata_macro_expand("${escapeRString(s)}", .do2r_local, data = ${ctx.currentData})`;
  }
  return `"${escapeRString(s)}"`;
}

function protectStrings(expr, ctx) {
  const store = [];
  let out = '';
  let i = 0;
  while (i < expr.length) {
    if (expr[i] !== '"' && !(expr[i] === '`' && expr[i + 1] === '"')) {
      out += expr[i++];
      continue;
    }
    const compound = expr[i] === '`';
    const start = i;
    i += compound ? 2 : 1;
    while (i < expr.length) {
      if (compound && expr[i] === '"' && expr[i + 1] === '\'') { i += 2; break; }
      if (!compound && expr[i] === '"') { i += 1; break; }
      i += 1;
    }
    const raw = expr.slice(start, i);
    const token = `__STR_${store.length}__`;
    store.push(rString(raw, ctx));
    out += token;
  }
  return { text: out, restore: x => x.replace(/__STR_(\d+)__/g, (_, n) => store[Number(n)]) };
}

function macroType(ctx, name) {
  return ctx.macros.get(name) || 'scalar';
}

function findLocalMacroEnd(text, start) {
  let depth = 1;
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i] === '\\') { i += 1; continue; }
    if (text[i] === '`' && text[i + 1] !== '"') depth += 1;
    else if (text[i] === "'") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function macroNameExpr(inner, ctx) {
  if (/^[A-Za-z_]\w*$/.test(inner)) return `"${escapeRString(inner)}"`;
  ctx.features.add('macros');
  return `stata_macro_expand("${escapeRString(inner)}", .do2r_local, data = ${ctx.currentData})`;
}

function translateMacroRefs(expr, ctx, variableContext = false) {
  let out = '';
  const text = String(expr);
  let i = 0;
  while (i < text.length) {
    if (text[i] === '\\' && (text[i + 1] === '`' || text[i + 1] === '$')) {
      out += text.slice(i, i + 2);
      i += 2;
      continue;
    }
    if (text[i] === '`' && text[i + 1] !== '"') {
      const end = findLocalMacroEnd(text, i);
      if (end >= 0) {
        const inner = text.slice(i + 1, end);
        const simple = /^[A-Za-z_]\w*$/.test(inner);
        const type = simple ? macroType(ctx, inner) : 'scalar';
        ctx.features.add('macros');
        const get = `stata_local_get(.do2r_local, ${macroNameExpr(inner, ctx)})`;
        out += (variableContext || type === 'varname') ? `get(as.character(${get}))` : get;
        i = end + 1;
        continue;
      }
    }
    if (text[i] === '$' && text[i + 1] === '{') {
      const end = text.indexOf('}', i + 2);
      if (end >= 0) {
        const inner = text.slice(i + 2, end);
        ctx.features.add('macros');
        out += `stata_global_get(${macroNameExpr(inner, ctx)})`;
        i = end + 1;
        continue;
      }
    }
    if (text[i] === '$') {
      const m = text.slice(i + 1).match(/^([A-Za-z_]\w*)/);
      if (m) {
        ctx.features.add('macros');
        out += `stata_global_get("${escapeRString(m[1])}")`;
        i += m[1].length + 1;
        continue;
      }
    }
    out += text[i++];
  }
  return out;
}

function markExpressionFeatures(x, ctx) {
  if (/stata_missing\(/.test(x)) ctx.features.add('missing');
  if (/stata_inlist\(/.test(x)) ctx.features.add('inlist');
  if (/stata_mod\(/.test(x)) ctx.features.add('mod');
  if (/stata_cond\(/.test(x)) ctx.features.add('cond');
  if (/stata_round\(/.test(x)) ctx.features.add('round');
  if (/stata_pmax\(|stata_pmin\(/.test(x)) ctx.features.add('minmax');
  if (/stata_strpos\(/.test(x)) ctx.features.add('strpos');
  if (/stata_substr\(/.test(x)) ctx.features.add('substr');
  if (/stata_subinstr\(/.test(x)) ctx.features.add('subinstr');
  if (/stata_wordcount\(/.test(x) || /stata_word\(/.test(x)) ctx.features.add('words');
  if (/stata_(?:date|clock|mdy|dmy|ymd|dofm|mofd|dofq|qofd|dofh|hofd|dofy|yofd|dofc|cofd|year|month|day|dow|doy|quarter|halfyear)\(/.test(x)) ctx.features.add('datetime');
  if (/collapse::(?:flag|fdiff)\(/.test(x)) ctx.features.add('collapse');
}

function collapseTsArgs(ctx) {
  const args = [];
  if (ctx.panel?.id) args.push(`g = ${ctx.panel.id}`);
  if (ctx.panel?.time) args.push(`t = ${ctx.panel.time}`);
  return args.length ? `, ${args.join(', ')}` : '';
}

function translateTimeSeriesOperators(expr, ctx) {
  const re = /\b((?:[LFDS]\d*\.?)+)\.([A-Za-z_]\w*)\b/gi;
  return String(expr).replace(re, (_, chain, variable) => {
    const compact = chain.replace(/\./g, '');
    const matches = [...compact.matchAll(/([LFDS])(\d*)/gi)];
    const ops = matches.map(m => ({ op: m[1].toUpperCase(), n: Number(m[2] || 1) }));
    if (!ops.length || matches.map(m => m[0]).join('').length !== compact.length) return _;
    ctx.features.add('collapse');
    let out = variable;
    for (const { op, n } of ops.reverse()) {
      const args = collapseTsArgs(ctx);
      if (op === 'L') out = `collapse::flag(${out}, n = ${n}L${args}, fill = NA)`;
      else if (op === 'F') out = `collapse::flag(${out}, n = -${n}L${args}, fill = NA)`;
      else if (op === 'D') out = `collapse::fdiff(${out}, n = 1L, diff = ${n}L${args}, fill = NA)`;
      else if (op === 'S') out = `collapse::fdiff(${out}, n = ${n}L, diff = 1L${args}, fill = NA)`;
    }
    return out;
  });
}

function rewriteStataComparisons(text, ctx) {
  const src = String(text);

  const matchingParen = (s, start) => {
    let depth = 0, quote = false;
    for (let i = start; i < s.length; i += 1) {
      if (s[i] === '"' && s[i - 1] !== '\\') { quote = !quote; continue; }
      if (quote) continue;
      if (s[i] === '(') depth += 1;
      else if (s[i] === ')') {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
    return -1;
  };

  // First rewrite comparisons inside parenthesized function arguments/subexpressions.
  let nested = '';
  for (let i = 0; i < src.length;) {
    if (src[i] === '"') {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '"' && src[j - 1] !== '\\') { j += 1; break; }
        j += 1;
      }
      nested += src.slice(i, j);
      i = j;
      continue;
    }
    if (src[i] === '(') {
      const end = matchingParen(src, i);
      if (end > i) {
        nested += `(${rewriteStataComparisons(src.slice(i + 1, end), ctx)})`;
        i = end + 1;
        continue;
      }
    }
    nested += src[i++];
  }

  const splitTop = (s, predicate) => {
    const parts = [], seps = [];
    let depth = 0, start = 0, quote = false;
    for (let i = 0; i < s.length; i += 1) {
      if (s[i] === '"' && s[i - 1] !== '\\') { quote = !quote; continue; }
      if (quote) continue;
      if (s[i] === '(' || s[i] === '[' || s[i] === '{') depth += 1;
      else if (s[i] === ')' || s[i] === ']' || s[i] === '}') depth = Math.max(0, depth - 1);
      else if (depth === 0 && predicate(s, i)) {
        parts.push(s.slice(start, i));
        seps.push(s[i]);
        start = i + 1;
      }
    }
    parts.push(s.slice(start));
    return { parts, seps };
  };

  const commas = splitTop(nested, (z, i) => z[i] === ',');
  if (commas.parts.length > 1) return commas.parts.map(x => rewriteStataComparisons(x.trim(), ctx)).join(', ');

  const logical = splitTop(nested, (z, i) => (z[i] === '&' || z[i] === '|') && z[i - 1] !== z[i] && z[i + 1] !== z[i]);
  if (logical.parts.length > 1) {
    let out = rewriteStataComparisons(logical.parts[0].trim(), ctx);
    for (let i = 0; i < logical.seps.length; i += 1) out += ` ${logical.seps[i]} ${rewriteStataComparisons(logical.parts[i + 1].trim(), ctx)}`;
    return out;
  }

  let depth = 0, quote = false;
  for (let i = 0; i < nested.length; i += 1) {
    const c = nested[i];
    if (c === '"' && nested[i - 1] !== '\\') { quote = !quote; continue; }
    if (quote) continue;
    if (c === '(' || c === '[' || c === '{') { depth += 1; continue; }
    if (c === ')' || c === ']' || c === '}') { depth = Math.max(0, depth - 1); continue; }
    if (depth !== 0) continue;
    const two = nested.slice(i, i + 2);
    const op = ['<=', '>=', '==', '!='].includes(two) ? two : ['<', '>'].includes(c) ? c : '';
    if (!op) continue;
    const lhs = nested.slice(0, i).trim();
    const rhs = nested.slice(i + op.length).trim();
    if (!lhs || !rhs) continue;
    ctx.features.add('compare');
    return `stata_compare(${lhs}, "${op}", ${rhs})`;
  }
  return nested;
}

function translateExpression(expr, ctx, opts = {}) {
  let x = String(expr || '').trim();
  const protectedStrings = protectStrings(x, ctx);
  x = protectedStrings.text;

  x = translateMacroRefs(x, ctx, opts.variableContext);
  x = x.replace(/\b_pi\b/gi, 'pi');
  x = x.replace(/\br\(([A-Za-z_]\w*)\)/gi, '.do2r_r[["$1"]]');
  x = x.replace(/\be\(([A-Za-z_]\w*)\)/gi, '.do2r_e[["$1"]]');
  x = x.replace(/\bs\(([A-Za-z_]\w*)\)/gi, '.do2r_s[["$1"]]');
  x = x.replace(/\bc\(([A-Za-z_]\w*)\)/gi, (_, name) => {
    ctx.features.add('results');
    return `stata_c("${escapeRString(name)}", ${ctx.currentData})`;
  });
  x = x.replace(/\bfrval\(\s*([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*\)/gi, (_, link, variable) => {
    ctx.features.add('framelinks');
    return `stata_frval(${ctx.currentData}, "${escapeRString(link)}", "${escapeRString(variable)}")`;
  });

  // Stata numeric missings are ordered above every finite number: . < .a < ... < .z.
  // Preserve storage as R missing values, but emulate the Stata ordering whenever a comparison
  // explicitly uses a Stata missing literal.
  const missingRank = tag => tag === '' ? 0 : (String(tag).toLowerCase().charCodeAt(0) - 96);
  const evalCmp = (a, op, b) => ({ '<': a < b, '<=': a <= b, '>': a > b, '>=': a >= b, '==': a === b, '!=': a !== b })[op];

  // Literal missing comparisons can be resolved at translation time. All numeric missings
  // are above every finite numeric value, with . < .a < ... < .z.
  x = x.replace(/(?<![\w.])\.([a-z])?\s*(<=|>=|==|!=|<|>)\s*\.([a-z])?(?![\w.])/gi,
    (_, a = '', op, b = '') => evalCmp(missingRank(a), op, missingRank(b)) ? 'TRUE' : 'FALSE');
  x = x.replace(/(?<![\w.])\.([a-z])?\s*(<=|>=|==|!=|<|>)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?![\w.])/gi,
    (_, _tag = '', op) => evalCmp(Infinity, op, 0) ? 'TRUE' : 'FALSE');
  x = x.replace(/(?<![\w.])([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(<=|>=|==|!=|<|>)\s*\.([a-z])?(?![\w.])/gi,
    (_, _num, op, _tag = '') => evalCmp(0, op, Infinity) ? 'TRUE' : 'FALSE');

  const missingCmpRight = /\b([A-Za-z_]\w*)\s*(<=|>=|==|!=|<|>)\s*\.([a-z])?(?![\w.])/gi;
  x = x.replace(missingCmpRight, (_, lhs, op, tag = '') => {
    ctx.features.add('missing_order');
    if (tag) ctx.features.add('haven');
    return `stata_missing_compare(${lhs}, "${op}", "${String(tag || '').toLowerCase()}")`;
  });
  const missingCmpLeft = /(?<![\w.])\.([a-z])?\s*(<=|>=|==|!=|<|>)\s*([A-Za-z_]\w*)\b/gi;
  x = x.replace(missingCmpLeft, (_, tag = '', op, rhs) => {
    ctx.features.add('missing_order');
    if (tag) ctx.features.add('haven');
    return `stata_missing_compare(${rhs}, "${({ '<': '>', '<=': '>=', '>': '<', '>=': '<=', '==': '==', '!=': '!=' })[op]}", "${String(tag || '').toLowerCase()}")`;
  });
  x = x.replace(/(?<![\w.])\.([a-z])(?![\w.])/gi, (_, tag) => {
    ctx.features.add('haven');
    return `haven::tagged_na("${String(tag).toLowerCase()}")`;
  });
  x = x.replace(/(?<![\w.])\.(?![\w.])/g, 'NA');

  // Normalize Stata comparison operators before inserting R code that itself uses named arguments.
  x = x.replace(/~=|<>/g, '!=');
  x = x.replace(/(?<![<>=!])=(?!=)/g, '==');

  // Time-series operators, including repeated/combined L./F./D./S. chains.
  x = translateTimeSeriesOperators(x, ctx);

  for (const [re, repl] of STATA_FUNCTION_REPLACEMENTS) x = x.replace(re, repl);

  if (opts.context === 'generate') {
    // In generate/replace expressions Stata's sum() is a running sum.
    x = x.replace(/(?<![\w.])sum\s*\(([^()]+)\)/gi, 'cumsum(data.table::fcoalesce($1, 0))');
    x = x.replace(/(?<![\w.])max\s*\(/gi, 'stata_pmax(').replace(/(?<![\w.])min\s*\(/gi, 'stata_pmin(');
    x = x.replace(/(?<![\w.])runiform\s*\(\s*\)/gi, 'stats::runif(.N)');
    x = x.replace(/(?<![\w.])runiform\s*\(([^,()]+),\s*([^()]+)\)/gi, 'stats::runif(.N, min = $1, max = $2)');
    x = x.replace(/(?<![\w.])rnormal\s*\(\s*\)/gi, 'stats::rnorm(.N)');
    x = x.replace(/(?<![\w.])rnormal\s*\(([^,()]+),\s*([^()]+)\)/gi, 'stats::rnorm(.N, mean = $1, sd = $2)');
    x = x.replace(/(?<![\w.])rnormal\s*\(([^,()]+)\)/gi, 'stats::rnorm(.N, mean = $1)');
    x = x.replace(/(?<![\w.])runiformint\s*\(([^,]+),\s*([^\)]+)\)/gi, 'sample.int(($2) - ($1) + 1L, .N, replace = TRUE) + ($1) - 1L');
  }

  const rowN = opts.rowScope === 'i' && !opts.grouped ? `seq_len(nrow(${ctx.currentData}))` : (opts.grouped ? 'seq_len(.N)' : '.I');
  const totalN = opts.rowScope === 'i' && !opts.grouped ? `nrow(${ctx.currentData})` : '.N';
  x = x.replace(/\b_n\b/g, rowN);
  x = x.replace(/\b_N\b/g, totalN);
  x = rewriteStataComparisons(x, ctx);
  x = protectedStrings.restore(x);
  markExpressionFeatures(x, ctx);
  return x;
}

function rTargetName(raw, ctx) {
  const token = raw.trim();
  const m = token.match(/^`([A-Za-z_]\w*)'$/);
  if (m) return `(${m[1]})`;
  if (/`[A-Za-z_]\w*'|\$\{?[A-Za-z_]\w*\}?/.test(token)) {
    ctx.features.add('glue');
    const template = token.replace(/`([A-Za-z_]\w*)'/g, '{$1}').replace(/\$\{?([A-Za-z_]\w*)\}?/g, '{$1}');
    return `(glue::glue("${escapeRString(template)}"))`;
  }
  return cleanIdentifier(token, token);
}

function rColumnRef(raw, ctx) {
  const token = raw.trim();
  const m = token.match(/^`([A-Za-z_]\w*)'$/);
  if (m && macroType(ctx, m[1]) === 'varname') return `get(${m[1]})`;
  return cleanIdentifier(token, token);
}

function varListExpr(spec, ctx) {
  const s = String(spec || '').trim();
  if (!s) return 'character()';
  const macro = s.match(/^`([A-Za-z_]\w*)'$/);
  if (macro && ['varlist', 'varname'].includes(macroType(ctx, macro[1]))) return macro[1];
  if (/[\-*?]|\b_all\b/.test(s)) {
    ctx.features.add('varlist');
    return `stata_vars(${ctx.currentData}, ${rString(s, ctx)})`;
  }
  const words = splitWords(s).filter(Boolean).map(v => v.replace(/^[+-]/, '')).filter(Boolean);
  if (words.some(v => /`|\$/.test(v))) {
    ctx.features.add('varlist');
    return `stata_vars(${ctx.currentData}, ${rString(s, ctx)})`;
  }
  return `c(${words.map(v => `"${escapeRString(v)}"`).join(', ')})`;
}

function byClause(by, ctx) {
  if (!by) return '';
  const names = splitWords(by).filter(v => !/^\(.+\)$/.test(v));
  if (!names.length) return '';
  const dynamic = names.some(v => /`|\$|\*|-/.test(v));
  if (dynamic) {
    ctx.features.add('varlist');
    return `by = stata_vars(${ctx.currentData}, ${rString(by, ctx)})`;
  }
  return `by = .(${names.map(v => cleanIdentifier(v, v)).join(', ')})`;
}

function extractQualifiers(text) {
  let depth = 0;
  let quote = false;
  const hits = [];
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') quote = !quote;
    if (quote) continue;
    if (c === '(' || c === '[') depth += 1;
    else if (c === ')' || c === ']') depth -= 1;
    if (depth !== 0) continue;
    if (text.slice(i).match(/^\s+if\s+/i)) hits.push({ type: 'if', at: i });
    if (text.slice(i).match(/^\s+in\s+/i)) hits.push({ type: 'in', at: i });
  }
  if (!hits.length) return { core: text.trim(), ifExpr: '', inExpr: '' };
  hits.sort((a, b) => a.at - b.at);
  const core = text.slice(0, hits[0].at).trim();
  let ifExpr = '', inExpr = '';
  for (let i = 0; i < hits.length; i += 1) {
    const h = hits[i];
    const next = hits[i + 1]?.at ?? text.length;
    const chunk = text.slice(h.at, next).trim().replace(new RegExp(`^${h.type}\\s+`, 'i'), '');
    if (h.type === 'if') ifExpr = chunk.trim(); else inExpr = chunk.trim();
  }
  return { core, ifExpr, inExpr };
}

function rowFilter(ifExpr, inExpr, ctx, grouped = false, scope = 'i') {
  const pieces = [];
  const rowIndex = scope === 'j' ? '.I' : (grouped ? 'seq_len(.N)' : `seq_len(nrow(${ctx.currentData}))`);
  const nRows = grouped && scope === 'j' ? `nrow(${ctx.currentData})` : (grouped ? '.N' : `nrow(${ctx.currentData})`);
  if (ifExpr) {
    if (ifExpr.trim() === '.DO2R_IF') pieces.push(scope === 'j' && grouped ? 'do2r_subset[.I]' : 'do2r_subset');
    else pieces.push(translateExpression(ifExpr, ctx, { grouped, context: 'generate', rowScope: scope }));
  }
  if (inExpr) {
    if (inExpr.trim() === '.DO2R_IN') pieces.push(`${rowIndex} %in% do2r_rows`);
    else { ctx.features.add('rows'); pieces.push(`${rowIndex} %in% stata_rows(${nRows}, ${rString(inExpr, ctx)})`); }
  }
  return pieces.join(' & ');
}

function normalizeCommand(cmd) {
  return resolveCommandAbbreviation(cmd);
}

function result(lines, confidence = 'exact', diagnostics = [], meta = {}) {
  return { lines: Array.isArray(lines) ? lines : [lines], confidence, diagnostics, ...meta };
}

function diag(line, level, message, source = '') {
  return { line, level, message, source };
}

function parseByPrefix(text) {
  const m = text.match(/^\s*(bysort|by)\s+(.+?):\s*(.+)$/i);
  if (!m) return null;
  let byspec = m[2].trim();
  let sortWithin = '';
  const paren = byspec.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (paren) { byspec = paren[1].trim(); sortWithin = paren[2].trim(); }
  return { by: byspec, sortWithin, body: m[3].trim(), sort: m[1].toLowerCase() === 'bysort' };
}

function translateGenerate(body, options, ctx, rec, by) {
  const m = body.match(/^(generate|replace)\s+(?:(byte|int|long|float|double|str\d+|strL)\s+)?([^\s=]+)\s*=\s*(.+)$/i);
  if (!m) return null;
  const cmd = m[1].toLowerCase();
  const storage = m[2] || '';
  const target = rTargetName(m[3], ctx);
  const q = extractQualifiers(m[4]);
  const grouped = Boolean(by);
  const expr = translateExpression(q.core, ctx, { grouped, context: 'generate' });
  const filter = rowFilter(q.ifExpr, q.inExpr, ctx, grouped, by ? 'j' : 'i');
  const byR = byClause(by, ctx);
  const dt = ctx.currentData;
  let line;
  let confidence = 'exact';
  const ds = [];
  if (/stata_(?:date|clock|mdy|dmy|ymd|dofm|mofd|dofq|qofd|dofh|hofd|dofy|yofd|dofc|cofd|year|month|day|dow|doy|quarter|halfyear)\(/.test(expr)) {
    confidence = 'heuristic';
    ds.push(diag(rec.line, 'warning', 'Stata date/time code was mapped to R Date/POSIXct plus compatibility helpers. Validate parsing masks, two-digit years, time zones, and raw numeric date representations.', rec.text));
  }
  if (/stata_ts_(?:shift|diff|seasonal_diff)\(/.test(expr)) {
    confidence = 'heuristic';
    ds.push(diag(rec.line, 'warning', 'Time-series operators use recorded tsset/xtset panel/time metadata. Validate delta/gap semantics, especially for datetime scales and irregular panels.', rec.text));
  }

  if (by && filter) {
    const old = cmd === 'replace' ? rColumnRef(m[3], ctx) : 'NA';
    line = `${dt}[, ${target} := ifelse(${filter}, ${expr}, ${old})${byR ? `, ${byR}` : ''}]`;
    confidence = 'heuristic';
    ds.push(diag(rec.line, 'warning', 'Combined by: and if/in qualifiers were translated with vectorized ifelse(); check type and missing-value behavior.', rec.text));
  } else if (by) {
    line = `${dt}[, ${target} := ${expr}${byR ? `, ${byR}` : ''}]`;
  } else if (filter) {
    line = `${dt}[${filter}, ${target} := ${expr}]`;
  } else {
    line = `${dt}[, ${target} := ${expr}]`;
  }

  if (storage) ds.push(diag(rec.line, 'info', `Stata storage type ${storage} is not forced; R will use its native vector type.`, rec.text));
  const lines = ctx.features.has('obs') ? [line, `if (".__do2r_obs__" %in% names(${dt})) ${dt}[, .__do2r_obs__ := NULL]`] : line;
  return result(lines, confidence, ds);
}

function translateEgen(body, options, ctx, rec, byPrefix) {
  const m = body.match(/^egen\s+([^\s=]+)\s*=\s*([A-Za-z_]\w*)\s*\((.*)\)\s*$/i);
  if (!m) return null;
  const target = rTargetName(m[1], ctx);
  const fun = m[2].toLowerCase();
  const arg = m[3].trim();
  const byOpt = optionValue(options, 'by');
  const by = byPrefix || (byOpt && byOpt !== true ? byOpt : '');
  const byR = byClause(by, ctx);
  const dt = ctx.currentData;
  const x = translateExpression(arg, ctx, { grouped: Boolean(by), context: 'generate' });
  let rhs = '';
  let extra = '';
  let confidence = 'exact';
  const ds = [];

  if (['mean', 'max', 'min', 'median', 'sd'].includes(fun)) rhs = `${fun}(${x}, na.rm = TRUE)`;
  else if (['total', 'sum'].includes(fun)) rhs = `sum(${x}, na.rm = TRUE)`;
  else if (fun === 'count') rhs = `sum(!is.na(${x}))`;
  else if (fun === 'first') rhs = `${x}[1L]`;
  else if (fun === 'last') rhs = `${x}[.N]`;
  else if (fun === 'group') {
    const groups = varListExpr(arg, ctx);
    return result(`${dt}[, ${target} := .GRP, by = ${groups}]`, 'exact');
  } else if (fun === 'tag') {
    const groups = varListExpr(arg, ctx);
    return result(`${dt}[, ${target} := as.integer(seq_len(.N) == 1L), by = ${groups}]`, 'exact');
  } else if (['rowtotal', 'rowsum', 'rowmean', 'rowmiss', 'rownonmiss', 'rowmax', 'rowmin'].includes(fun)) {
    const cols = varListExpr(arg, ctx);
    if (fun === 'rowtotal' || fun === 'rowsum') rhs = 'rowSums(.SD, na.rm = TRUE)';
    if (fun === 'rowmean') rhs = 'rowMeans(.SD, na.rm = TRUE)';
    if (fun === 'rowmiss') rhs = 'rowSums(is.na(.SD))';
    if (fun === 'rownonmiss') rhs = 'rowSums(!is.na(.SD))';
    if (fun === 'rowmax') rhs = 'do.call(pmax, c(.SD, na.rm = TRUE))';
    if (fun === 'rowmin') rhs = 'do.call(pmin, c(.SD, na.rm = TRUE))';
    extra = `, .SDcols = ${cols}`;
  } else if (fun === 'std' || fun === 'stdize') {
    rhs = `as.numeric(scale(${x}))`;
    confidence = 'heuristic';
  } else if (fun === 'rank') {
    rhs = `data.table::frank(${x}, ties.method = "average", na.last = "keep")`;
    confidence = 'heuristic';
  } else if (fun === 'cut') {
    rhs = `cut(${x}, breaks = "Sturges")`;
    confidence = 'heuristic';
    ds.push(diag(rec.line, 'warning', 'egen cut() options are not fully inferred; adjust R cut() breaks/labels.', rec.text));
  } else {
    return result(`# TODO [Stata line ${rec.line}]: egen ${fun}()\n# ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `egen ${fun}() is not covered safely yet.`, rec.text)]);
  }

  return result(`${dt}[, ${target} := ${rhs}${byR ? `, ${byR}` : ''}${extra}]`, confidence, ds);
}

function translateKeepDrop(cmd, rest, ctx, rec, by) {
  const dt = ctx.currentData;
  const trimmed = rest.trim();
  if (/^if\s+/i.test(trimmed)) {
    const cond = translateExpression(trimmed.replace(/^if\s+/i, ''), ctx, { grouped: Boolean(by), context: 'generate' });
    if (by) {
      const byR = byClause(by, ctx);
      const keepExpr = cmd === 'keep' ? cond : `!(${cond})`;
      return result(`${dt} <- ${dt}[, .SD[${keepExpr}]${byR ? `, ${byR}` : ''}]`, 'heuristic', [diag(rec.line, 'warning', 'by: keep/drop is group-sensitive; verify _n/_N and ordering semantics.', rec.text)]);
    }
    return result(`${dt} <- ${dt}[${cmd === 'keep' ? cond : `!(${cond})`}]`, 'exact');
  }
  if (/^in\s+/i.test(trimmed)) {
    ctx.features.add('rows');
    const rows = `stata_rows(nrow(${dt}), ${rString(trimmed.replace(/^in\s+/i, ''), ctx)})`;
    return result(cmd === 'keep' ? `${dt} <- ${dt}[${rows}]` : `${dt} <- ${dt}[-${rows}]`, 'exact');
  }
  const cols = varListExpr(trimmed, ctx);
  if (cmd === 'keep') return result(`${dt} <- ${dt}[, .SD, .SDcols = ${cols}]`, 'exact');
  return result(`${dt}[, (${cols}) := NULL]`, 'exact');
}

function parseRecodeGroups(spec, ctx) {
  const groups = [];
  const re = /\(([^()]*)\)/g;
  let m;
  while ((m = re.exec(spec))) {
    const chunk = m[1].trim();
    const eq = chunk.indexOf('=');
    if (eq < 0) continue;
    const left = chunk.slice(0, eq).trim();
    const right = translateExpression(chunk.slice(eq + 1), ctx, { context: 'generate' });
    let cond;
    if (/^else$/i.test(left)) cond = 'TRUE';
    else if (/^missing$/i.test(left)) cond = 'is.na(.x)';
    else if (/^-?\d+(?:\.\d+)?\s*\/\s*-?\d+(?:\.\d+)?$/.test(left)) {
      const [a, b] = left.split('/').map(x => x.trim());
      cond = `data.table::between(.x, ${a}, ${b})`;
    } else {
      const vals = left.split(/\s+/).filter(Boolean).map(v => translateExpression(v, ctx, { context: 'generate' }));
      cond = vals.length === 1 ? `.x == ${vals[0]}` : `.x %in% c(${vals.join(', ')})`;
    }
    groups.push({ cond, right });
  }
  return groups;
}

function translateRecode(rest, options, ctx, rec) {
  const firstGroup = rest.indexOf('(');
  if (firstGroup < 0) return null;
  const vars = rest.slice(0, firstGroup).trim();
  const spec = rest.slice(firstGroup);
  const groups = parseRecodeGroups(spec, ctx);
  if (!groups.length) return null;
  const gen = optionValue(options, 'generate') || optionValue(options, 'gen');
  const cols = varListExpr(vars, ctx);
  const targetNote = gen && gen !== true ? String(gen).trim() : null;
  ctx.features.add('recode');
  const call = `stata_recode(.x, ${groups.map(g => `${g.cond}, ${g.right}`).join(', ')})`;
  if (targetNote && splitWords(vars).length === 1) {
    return result(`${ctx.currentData}[, ${rTargetName(targetNote, ctx)} := ${call.replace(/\.x/g, rColumnRef(vars, ctx))}]`, 'heuristic', [diag(rec.line, 'warning', 'recode was mapped to first-match vectorized conditions; verify overlapping ranges and missing-value rules.', rec.text)]);
  }
  return result(`${ctx.currentData}[, (${cols}) := lapply(.SD, function(.x) ${call}), .SDcols = ${cols}]`, 'heuristic', [diag(rec.line, 'warning', 'recode was mapped to first-match vectorized conditions; verify overlapping ranges and labels.', rec.text)]);
}

function parseCollapseSpecs(spec, ctx) {
  const tokens = spec.match(/\([^)]*\)|[^\s]+/g) || [];
  let stat = 'mean';
  const entries = [];
  for (const tok of tokens) {
    const sm = tok.match(/^\(([^)]+)\)$/);
    if (sm) { stat = sm[1].toLowerCase(); continue; }
    if (!tok || /^if$|^in$/i.test(tok)) continue;
    const eq = tok.indexOf('=');
    const out = eq >= 0 ? tok.slice(0, eq) : tok;
    const src = eq >= 0 ? tok.slice(eq + 1) : tok;
    const s = cleanIdentifier(src, src);
    const o = cleanIdentifier(out, out);
    let expr;
    if (['mean', 'median', 'min', 'max', 'sd'].includes(stat)) expr = `${stat}(${s}, na.rm = TRUE)`;
    else if (['sum', 'total'].includes(stat)) expr = `sum(${s}, na.rm = TRUE)`;
    else if (stat === 'count') expr = `sum(!is.na(${s}))`;
    else if (stat === 'first' || stat === 'firstnm') expr = stat === 'first' ? `${s}[1L]` : `${s}[which(!is.na(${s}))[1L]]`;
    else if (stat === 'last' || stat === 'lastnm') expr = stat === 'last' ? `${s}[.N]` : `${s}[tail(which(!is.na(${s})), 1L)]`;
    else if (stat === 'p50') expr = `median(${s}, na.rm = TRUE)`;
    else if (/^p\d+$/.test(stat)) expr = `quantile(${s}, probs = ${Number(stat.slice(1)) / 100}, na.rm = TRUE, names = FALSE)`;
    else expr = `# TODO ${stat}(${s})`;
    entries.push(`${o} = ${expr}`);
  }
  return entries;
}

function translateCollapse(rest, options, ctx, rec) {
  const q = extractQualifiers(rest);
  const entries = parseCollapseSpecs(q.core, ctx);
  if (!entries.length) return null;
  const by = optionValue(options, 'by');
  const byR = by && by !== true ? byClause(by, ctx) : '';
  let source = ctx.currentData;
  if (q.ifExpr || q.inExpr) source += `[${rowFilter(q.ifExpr, q.inExpr, ctx)}]`;
  const ds = entries.some(x => x.includes('# TODO')) ? [diag(rec.line, 'review', 'At least one collapse statistic needs manual translation.', rec.text)] : [];
  return result(`${ctx.currentData} <- ${source}[, .(${entries.join(', ')})${byR ? `, ${byR}` : ''}]`, ds.length ? 'heuristic' : 'exact', ds);
}

function translateReshape(rest, options, ctx, rec) {
  const words = splitWords(rest);
  const direction = (words.shift() || '').toLowerCase();
  const stubs = words.join(' ');
  const i = optionValue(options, 'i');
  const j = optionValue(options, 'j');
  if (!['long', 'wide'].includes(direction) || !i || i === true || !j || j === true) return null;
  ctx.features.add('reshape');
  const stubVec = `c(${splitWords(stubs).map(x => `"${escapeRString(x)}"`).join(', ')})`;
  const iVec = varListExpr(i, ctx);
  if (direction === 'long') {
    return result(`${ctx.currentData} <- stata_reshape_long(${ctx.currentData}, stubs = ${stubVec}, i = ${iVec}, j = "${escapeRString(j)}")`, 'heuristic', [diag(rec.line, 'warning', 'reshape long uses suffix-pattern inference. Check string/numeric j(), @-style stubs, and unusual variable names.', rec.text)]);
  }
  return result(`${ctx.currentData} <- stata_reshape_wide(${ctx.currentData}, stubs = ${stubVec}, i = ${iVec}, j = "${escapeRString(j)}")`, 'heuristic', [diag(rec.line, 'warning', 'reshape wide assumes i() + j() identify rows uniquely and reconstructs Stata-like stub names.', rec.text)]);
}

function parseUsingPath(rest) {
  const m = rest.match(/\busing\s+(.+)$/i);
  return m ? m[1].trim() : rest.trim();
}

function translateMerge(rest, options, ctx, rec) {
  const m = rest.match(/^(1:1|1:m|m:1|m:m)\s+(.+?)\s+using\s+(.+)$/i);
  if (!m) return null;
  const type = m[1].toLowerCase();
  const keys = m[2].trim();
  const path = m[3].trim();
  const keep = optionValue(options, 'keep');
  const nogen = hasOption(options, 'nogen');
  const keepusing = optionValue(options, 'keepusing');
  const update = hasOption(options, 'update') || hasOption(options, 'replace');
  if (ctx.options.strictMode && (type === 'm:m' || update)) {
    const why = type === 'm:m' ? 'm:m merge has sequential-match semantics that are not equivalent to a standard R join' : 'merge update/replace needs value-by-value conflict rules';
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}\n# ${why}.`, 'review', [diag(rec.line, 'review', `Strict mode stopped translation because ${why}.`, rec.text)]);
  }
  const keyExpr = varListExpr(keys, ctx);
  ctx.features.add('haven');
  const lines = [];
  lines.push(`.__master <- data.table::copy(${ctx.currentData})[, .__from_master := TRUE]`);
  lines.push(`.__using <- data.table::as.data.table(haven::read_dta(${rString(path, ctx)}))[, .__from_using := TRUE]`);
  if (type === '1:1' || type === '1:m') lines.push(`stopifnot(data.table::uniqueN(.__master, by = ${keyExpr}) == nrow(.__master))`);
  if (type === '1:1' || type === 'm:1') lines.push(`stopifnot(data.table::uniqueN(.__using, by = ${keyExpr}) == nrow(.__using))`);
  lines.push(`.__overlap <- setdiff(intersect(names(.__master), names(.__using)), ${keyExpr})`);
  if (keepusing && keepusing !== true) {
    const ku = varListExpr(String(keepusing), { ...ctx, currentData: '.__using' });
    lines.push(`.__using <- .__using[, .SD, .SDcols = unique(c(${keyExpr}, ${ku}, ".__from_using"))]`);
  }
  const allX = type === '1:m' || type === 'm:m' ? 'TRUE' : 'TRUE';
  lines.push(`${ctx.currentData} <- merge(.__master, .__using, by = ${keyExpr}, all = TRUE, suffixes = c("", ".__using"), allow.cartesian = ${type === 'm:m' ? 'TRUE' : 'FALSE'})`);
  if (!update) lines.push(`if (length(.__overlap)) ${ctx.currentData}[, (paste0(.__overlap, ".__using")) := NULL]`);
  if (!nogen || keep) {
    lines.push(`${ctx.currentData}[, \`_merge\` := data.table::fcase(!is.na(.__from_master) & is.na(.__from_using), 1L, is.na(.__from_master) & !is.na(.__from_using), 2L, default = 3L)]`);
  }
  if (keep && keep !== true) {
    const codes = [];
    const k = String(keep).toLowerCase();
    if (/master|1/.test(k)) codes.push('1L');
    if (/using|2/.test(k)) codes.push('2L');
    if (/match|3/.test(k)) codes.push('3L');
    if (codes.length) lines.push(`${ctx.currentData} <- ${ctx.currentData}[\`_merge\` %in% c(${[...new Set(codes)].join(', ')})]`);
  }
  lines.push(`${ctx.currentData}[, c(".__from_master", ".__from_using") := NULL]`);
  if (nogen && (!keep || keep === true)) lines.push(`# nogen: no _merge column emitted`);
  else if (nogen) lines.push(`${ctx.currentData}[, \`_merge\` := NULL]`);
  lines.push('rm(.__master, .__using, .__overlap)');

  const ds = [diag(rec.line, 'warning', `merge ${type} was translated as a key merge; verify Stata uniqueness checks, sort behavior, and overlapping variable names.`, rec.text)];
  if (type === 'm:m') ds.push(diag(rec.line, 'review', 'Stata m:m merge has unusual sequential-match semantics; an R cartesian join is not generally equivalent.', rec.text));
  if (update) ds.push(diag(rec.line, 'review', 'merge update/replace semantics are not reproduced by this translation.', rec.text));
  return result(lines, type === 'm:m' || update ? 'review' : 'heuristic', ds);
}

function stataPathFromUsing(text) {
  return text.replace(/^using\s+/i, '').trim();
}

function parseExcelSheetOption(raw) {
  if (!raw || raw === true) return { name: '', mode: '' };
  const [name, mode] = splitTopLevel(String(raw), ',');
  return { name: name.trim(), mode: mode.trim().toLowerCase() };
}

function translateIO(cmd, rest, options, ctx, rec) {
  const dt = ctx.currentData;
  if (cmd === 'use') {
    const path = rest.replace(/,?\s*clear\s*$/i, '').trim();
    ctx.features.add('haven');
    return result(`${dt} <- data.table::as.data.table(haven::read_dta(${rString(path, ctx)}))`, 'exact');
  }
  if (cmd === 'save') {
    const path = stataPathFromUsing(rest);
    ctx.features.add('haven');
    return result(`haven::write_dta(as.data.frame(${dt}), ${rString(path, ctx)})`, 'heuristic', [diag(rec.line, 'warning', 'write_dta() preserves many attributes, but verify Stata value labels, formats, and unsupported metadata.', rec.text)]);
  }

  if (cmd === 'import') {
    const words = splitWords(rest);
    const kind = (words.shift() || '').toLowerCase();
    const body = words.join(' ');

    if (kind === 'delimited') {
      const p = body.replace(/^using\s+/i, '').trim();
      return result(`${dt} <- data.table::fread(${rString(p, ctx)})`, 'exact');
    }

    if (kind === 'excel') {
      const um = body.match(/^(.*?)\busing\s+(.+)$/i);
      if (!um) return null;
      const extvarlist = um[1].trim();
      const path = um[2].trim();
      const sheetRaw = optionValue(options, 'sheet');
      const sheet = parseExcelSheetOption(sheetRaw);
      const range = optionValue(options, 'cellrange');
      const firstrow = hasOption(options, 'firstrow');
      const allstring = hasOption(options, 'allstring');
      const caseOpt = optionValue(options, 'case');
      if (firstrow && extvarlist) {
        return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
          [diag(rec.line, 'review', 'Stata does not allow firstrow with an import excel extvarlist; resolve the source syntax before translation.', rec.text)]);
      }
      ctx.features.add('readxl'); ctx.features.add('excelio');
      const call = `stata_import_excel(${rString(path, ctx)}, sheet = ${sheet.name ? rString(sheet.name, ctx) : 'NULL'}, range = ${range && range !== true ? rString(range, ctx) : 'NULL'}, firstrow = ${firstrow ? 'TRUE' : 'FALSE'}, allstring = ${allstring ? 'TRUE' : 'FALSE'}, case = ${caseOpt && caseOpt !== true ? rString(caseOpt, ctx) : '"preserve"'}, extvarlist = ${extvarlist ? rString(extvarlist, ctx) : '""'})`;
      const ds = [diag(rec.line, 'warning', 'import excel is mapped to readxl with Stata-like firstrow/extvarlist/cellrange behavior. Verify mixed-type cells, date serials, variable labels, and exact Stata name sanitization.', rec.text)];
      if (allstring && optionValue(options, 'allstring') !== true) ds.push(diag(rec.line, 'info', 'The optional Stata display format inside allstring() is not reproduced; values are imported as text.', rec.text));
      return result(`${dt} <- ${call}`, 'heuristic', ds);
    }

    const p = body.replace(/^using\s+/i, '').trim();
    if (kind === 'parquet') {
      ctx.features.add('arrow');
      return result(`${dt} <- data.table::as.data.table(arrow::read_parquet(${rString(p, ctx)}))`, 'exact');
    }
    if (['sas', 'spss'].includes(kind)) {
      ctx.features.add('haven');
      const fun = kind === 'sas' ? 'read_sas' : 'read_sav';
      return result(`${dt} <- data.table::as.data.table(haven::${fun}(${rString(p, ctx)}))`, 'heuristic');
    }
  }

  if (cmd === 'export') {
    const words = splitWords(rest);
    const kind = (words.shift() || '').toLowerCase();
    const body = words.join(' ');

    if (kind === 'delimited') {
      const p = body.replace(/^using\s+/i, '').trim();
      return result(`data.table::fwrite(${dt}, ${rString(p, ctx)})`, 'exact');
    }

    if (kind === 'excel') {
      const um = body.match(/^(.*?)\busing\s+(.+)$/i);
      if (!um) return null;
      const vars = um[1].trim();
      const path = um[2].trim();
      const sheetRaw = optionValue(options, 'sheet');
      const sh = parseExcelSheetOption(sheetRaw);
      const sheetName = sh.name ? rString(sh.name, ctx) : '"Sheet1"';
      const mode = sh.mode || (hasOption(options, 'sheetreplace') ? 'replace' : hasOption(options, 'sheetmodify') ? 'modify' : '');
      const cell = optionValue(options, 'cell');
      const firstrow = optionValue(options, 'firstrow');
      const header = firstrow === true ? 'variables' : String(firstrow || '').toLowerCase();
      const missing = optionValue(options, 'missing');
      const nolabel = hasOption(options, 'nolabel');
      ctx.features.add('openxlsx'); ctx.features.add('excelio');
      if (!nolabel) ctx.features.add('haven');
      const cols = vars ? varListExpr(vars, ctx) : 'names(' + dt + ')';
      const call = `stata_export_excel(${dt}, file = ${rString(path, ctx)}, vars = ${cols}, sheet = ${sheetName}, sheet_mode = "${escapeRString(mode)}", cell = ${cell && cell !== true ? rString(cell, ctx) : '"A1"'}, firstrow = "${escapeRString(header)}", missing = ${missing && missing !== true ? rString(missing, ctx) : '""'}, replace = ${hasOption(options, 'replace') ? 'TRUE' : 'FALSE'}, nolabel = ${nolabel ? 'TRUE' : 'FALSE'})`;
      const ds = [diag(rec.line, 'warning', 'export excel is mapped to openxlsx. Verify Stata display/value-label formatting, datestring()/locale(), and workbook styles if exact presentation matters.', rec.text)];
      if (hasOption(options, 'keepcellfmt')) ds.push(diag(rec.line, 'review', 'keepcellfmt is only partially represented by writing into the existing sheet; cell-format preservation should be checked in the workbook.', rec.text));
      return result(call, 'heuristic', ds);
    }

    const p = body.replace(/^using\s+/i, '').trim();
    if (kind === 'parquet') {
      ctx.features.add('arrow');
      return result(`arrow::write_parquet(${dt}, ${rString(p, ctx)})`, 'exact');
    }
  }

  if (cmd === 'insheet') return result(`${dt} <- data.table::fread(${rString(stataPathFromUsing(rest), ctx)})`, 'heuristic');
  if (cmd === 'outsheet') return result(`data.table::fwrite(${dt}, ${rString(stataPathFromUsing(rest), ctx)})`, 'heuristic');
  return null;
}

function translatePutExcel(rest, options, ctx, rec) {
  ctx.features.add('openxlsx'); ctx.features.add('excelio');
  const trimmed = rest.trim();

  if (/^set\b/i.test(trimmed)) {
    const file = trimmed.replace(/^set\s+/i, '').trim();
    const sh = parseExcelSheetOption(optionValue(options, 'sheet'));
    const sheetName = sh.name ? rString(sh.name, ctx) : '"Sheet1"';
    const mode = sh.mode || (hasOption(options, 'sheetreplace') ? 'replace' : hasOption(options, 'sheetmodify') ? 'modify' : '');
    return result(`.do2r_putexcel <- stata_putexcel_set(${rString(file, ctx)}, sheet = ${sheetName}, replace = ${hasOption(options, 'replace') ? 'TRUE' : 'FALSE'}, sheet_mode = "${escapeRString(mode)}")`, 'heuristic',
      [diag(rec.line, 'info', 'putexcel set is represented by a small openxlsx workbook state object. Later putexcel cell writes update the file immediately.', rec.text)]);
  }

  if (/^(clear|describe)$/i.test(trimmed)) {
    if (/^clear$/i.test(trimmed)) return result('.do2r_putexcel <- NULL', 'heuristic');
    return result('.do2r_putexcel', 'heuristic');
  }

  const m = trimmed.match(/^([A-Za-z]+[0-9]+)(?::([A-Za-z]+[0-9]+))?\s*=\s*([\s\S]+)$/);
  if (!m) {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
      [diag(rec.line, 'review', 'This putexcel form is not yet mapped. Basic set, scalar/cell, matrix(), formula(), and image() writes are supported.', rec.text)]);
  }
  const cell = m[1] + (m[2] ? `:${m[2]}` : '');
  const rhsRaw = m[3].trim();

  const matrix = rhsRaw.match(/^matrix\(([^)]+)\)$/i);
  if (matrix) {
    return result(`stata_putexcel_write(.do2r_putexcel, "${cell}", ${translateExpression(matrix[1], ctx)}, names = ${hasOption(options, 'names') ? 'TRUE' : 'FALSE'})`, 'heuristic',
      [diag(rec.line, 'warning', 'putexcel matrix() is mapped to openxlsx. Verify row/column-name orientation and Stata-specific formatting options.', rec.text)]);
  }

  const formula = rhsRaw.match(/^formula\(([\s\S]+)\)$/i);
  if (formula) {
    return result(`stata_putexcel_formula(.do2r_putexcel, "${cell}", ${rString(formula[1], ctx)})`, 'heuristic');
  }

  const image = rhsRaw.match(/^image\(([\s\S]+)\)$/i);
  if (image) {
    return result(`stata_putexcel_image(.do2r_putexcel, "${cell}", ${rString(image[1], ctx)})`, 'heuristic',
      [diag(rec.line, 'warning', 'putexcel image() is mapped to openxlsx::insertImage(); size/format options need manual tuning.', rec.text)]);
  }

  if (/^(etable|collect|returnset)$/i.test(rhsRaw)) {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
      [diag(rec.line, 'review', `putexcel ${rhsRaw} depends on Stata collection/result presentation state and remains in the reporting backlog.`, rec.text)]);
  }

  const rhs = /^".*"$/.test(rhsRaw) || /^`".*"'$/.test(rhsRaw) ? rString(rhsRaw, ctx) : translateExpression(rhsRaw, ctx);
  return result(`stata_putexcel_write(.do2r_putexcel, "${cell}", ${rhs})`, 'heuristic',
    [diag(rec.line, 'info', 'Basic putexcel cell assignment is mapped to openxlsx. Number formats, borders, fills, fonts, alignment, and advanced workbook formatting are not inferred automatically.', rec.text)]);
}

function expandSimpleNumlist(spec) {
  const out = [];
  for (const bit of String(spec || '').trim().split(/\s+/).filter(Boolean)) {
    let m = bit.match(/^(-?\d+)\/(-?\d+)$/);
    if (m) {
      const a = Number(m[1]), b = Number(m[2]), step = a <= b ? 1 : -1;
      for (let x = a; step > 0 ? x <= b : x >= b; x += step) out.push(x);
      continue;
    }
    m = bit.match(/^(-?\d+)$/);
    if (m) out.push(Number(m[1]));
    else return null;
  }
  return out;
}

function expandTsVarlist(spec) {
  let x = String(spec || '');
  const expand = (op, numsRaw, varsRaw) => {
    const nums = expandSimpleNumlist(numsRaw);
    if (!nums) return null;
    const vars = splitWords(varsRaw).filter(Boolean);
    return vars.flatMap(v => nums.map(n => n === 0 ? v : `${op.toUpperCase()}${n === 1 ? '' : n}.${v}`)).join(' ');
  };
  x = x.replace(/\b([LFDS])\(([^)]+)\)\.\(([^)]+)\)/gi, (all, op, nums, vars) => expand(op, nums, vars) || all);
  x = x.replace(/\b([LFDS])\(([^)]+)\)\.([A-Za-z_]\w*)/gi, (all, op, nums, v) => expand(op, nums, v) || all);
  return x;
}

function factorSettingExpr(variable, setting, ctx) {
  const v = cleanIdentifier(variable, variable);
  if (!setting || setting === 'default' || setting === 'first') return `factor(${v})`;
  ctx.features.add('factorvars');
  if (setting === 'last') return `stata_factor(${v}, base = "last")`;
  if (setting === 'frequent' || setting === 'freq') return `stata_factor(${v}, base = "frequent")`;
  if (setting === 'none') return `stata_factor(${v}, base = "none")`;
  if (/^#\d+$/.test(setting)) return `stata_factor(${v}, position = ${Number(setting.slice(1))}L)`;
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(setting)) return `stats::relevel(factor(${v}), ref = "${escapeRString(setting)}")`;
  return `factor(${v})`;
}

function factorAtom(token, ctx, categoricalDefault = false) {
  let t = String(token || '').trim();
  if (!t || t === '_cons') return '';
  if (t.startsWith('(') && t.endsWith(')')) {
    const inner = t.slice(1, -1).trim();
    const terms = splitWords(inner).map(x => formulaTerm(x, ctx, categoricalDefault)).filter(Boolean);
    return terms.length ? `(${terms.join(' + ')})` : '';
  }
  if (/^o(?:[-+]?\d+(?:\.\d+)?)?\./i.test(t)) return '';

  let m = t.match(/^i?b\((first|last|freq|frequent|none|#\d+)\)\.([A-Za-z_]\w*)$/i);
  if (m) return factorSettingExpr(m[2], m[1].toLowerCase(), ctx);
  m = t.match(/^i?b([+-]?\d+(?:\.\d+)?)\.([A-Za-z_]\w*)$/i);
  if (m) return factorSettingExpr(m[2], m[1], ctx);
  m = t.match(/^i?bn\.([A-Za-z_]\w*)$/i);
  if (m) return factorSettingExpr(m[1], 'none', ctx);
  m = t.match(/^bn\.([A-Za-z_]\w*)$/i);
  if (m) return factorSettingExpr(m[1], 'none', ctx);
  m = t.match(/^i\.([A-Za-z_]\w*)$/i);
  if (m) {
    const configured = ctx.factorBases?.get(m[1]) || 'first';
    return factorSettingExpr(m[1], configured, ctx);
  }
  m = t.match(/^c\.([A-Za-z_]\w*)$/i);
  if (m) return cleanIdentifier(m[1], m[1]);

  // Time-series operators bind more tightly than factor-variable interactions.
  if (/^(?:[LFDS]\d*\.)+/i.test(t)) return translateTimeSeriesOperators(t, ctx);
  const v = cleanIdentifier(t, t);
  if (categoricalDefault && /^[A-Za-z_]\w*$/.test(t)) {
    const configured = ctx.factorBases?.get(t) || 'first';
    return factorSettingExpr(t, configured, ctx);
  }
  return v;
}

function splitFactorInteraction(token) {
  const parts = [];
  const ops = [];
  let start = 0;
  let depth = 0;
  let quote = false;
  for (let i = 0; i < token.length; i += 1) {
    const c = token[i];
    if (c === '"') { quote = !quote; continue; }
    if (quote) continue;
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth = Math.max(0, depth - 1);
    else if (c === '#' && depth === 0) {
      parts.push(token.slice(start, i).trim());
      if (token[i + 1] === '#') { ops.push('##'); i += 1; }
      else ops.push('#');
      start = i + 1;
    }
  }
  parts.push(token.slice(start).trim());
  return { parts, ops };
}

function formulaTerm(token, ctx, categoricalDefault = false) {
  const t = String(token || '').trim();
  if (!t || t === '_cons') return '';
  const parsed = splitFactorInteraction(t);
  if (!parsed.ops.length) return factorAtom(t, ctx, categoricalDefault);

  // c.x#c.x (and higher powers) needs I(x^k); R's x:x collapses to x.
  if (parsed.ops.every(op => op === '#')) {
    const continuous = parsed.parts.map(x => x.match(/^c\.([A-Za-z_]\w*)$/i)?.[1] || null);
    if (continuous.every(Boolean) && new Set(continuous).size === 1) return `I(${continuous[0]}^${continuous.length})`;
  }

  const operands = parsed.parts.map(x => factorAtom(x, ctx, true));
  if (operands.some(x => !x)) return operands.filter(Boolean).join(' + ');
  let expr = operands[0];
  for (let i = 0; i < parsed.ops.length; i += 1) {
    const rhs = operands[i + 1];
    expr = parsed.ops[i] === '##' ? `(${expr}) * (${rhs})` : `(${expr}) : (${rhs})`;
  }
  return expr;
}

function formulaTerms(spec, ctx) {
  return splitWords(expandTsVarlist(spec)).map(x => formulaTerm(x, ctx)).filter(Boolean).join(' + ') || '1';
}

function factorUnderlyingVariables(spec) {
  const reserved = new Set(['first','last','freq','frequent','none']);
  const out = [];
  const src = String(spec || '');
  const re = /(?:^|[^A-Za-z0-9_])(?:[LFDS]\d*\.)*(?:(?:i?b(?:\([^)]*\)|[+-]?\d+(?:\.\d+)?)|i|c|bn|ibn|o(?:[+-]?\d+(?:\.\d+)?)?)\.)?([A-Za-z_]\w*)/gi;
  let m;
  while ((m = re.exec(src))) {
    const v = m[1];
    if (!reserved.has(v.toLowerCase()) && !out.includes(v)) out.push(v);
  }
  return out;
}

function translateFactorProgramming(cmd, rest, options, ctx, rec) {
  const dt = ctx.currentData;
  if (cmd === 'fvset') {
    const w = splitWords(rest);
    const sub = (w.shift() || 'report').toLowerCase();
    ctx.features.add('factorvars');
    if (sub === 'base') {
      const settingRaw = (w.shift() || 'default').toLowerCase();
      const setting = settingRaw === 'freq' ? 'frequent' : settingRaw;
      const vars = w.map(v => cleanIdentifier(v, v)).filter(Boolean);
      for (const v of vars) ctx.factorBases.set(v, setting === 'default' ? 'first' : setting);
      if (!vars.length) return null;
      return result(`.do2r_fvset[c(${vars.map(v => `"${escapeRString(v)}"`).join(', ')})] <- "${escapeRString(setting)}"`, 'heuristic',
        [diag(rec.line, 'info', 'fvset base is carried into later translated factor-variable formulas. R contrast coding is equivalent for fitted values but coefficient labels/omitted columns can differ.', rec.text)]);
    }
    if (sub === 'clear') {
      const vars = w.map(v => cleanIdentifier(v, v)).filter(Boolean);
      if (vars.includes('_all') || !vars.length) {
        ctx.factorBases.clear();
        return result('.do2r_fvset <- character()', 'exact');
      }
      for (const v of vars) ctx.factorBases.delete(v);
      return result(`.do2r_fvset <- .do2r_fvset[setdiff(names(.do2r_fvset), c(${vars.map(v => `"${escapeRString(v)}"`).join(', ')}))]`, 'heuristic');
    }
    if (sub === 'design') {
      const design = (w.shift() || 'default').toLowerCase();
      const vars = w.map(v => cleanIdentifier(v, v)).filter(Boolean);
      return result(`.do2r_fvdesign[c(${vars.map(v => `"${escapeRString(v)}"`).join(', ')})] <- "${escapeRString(design)}"`, 'heuristic',
        [diag(rec.line, 'warning', 'fvset design affects how Stata margins accumulates over factor levels. The setting is recorded, but downstream margins equivalence still needs verification.', rec.text)]);
    }
    if (sub === 'report' || !rest.trim()) return result('list(base = .do2r_fvset, design = .do2r_fvdesign)', 'heuristic');
    return null;
  }

  if (cmd === 'fvrevar') {
    ctx.features.add('factorvars');
    ctx.features.add('results');
    const vars = factorUnderlyingVariables(rest);
    if (hasOption(options, 'list')) {
      const value = vars.join(' ');
      return result([`.do2r_r <- list(varlist = "${escapeRString(value)}")`, '.do2r_r[["varlist"]]'], 'heuristic',
        [diag(rec.line, 'info', 'fvrevar, list was translated to the unoperated underlying variable names. Verify unusual varlist ranges/macros.', rec.text)]);
    }
    const stubRaw = optionValue(options, 'stub');
    const stub = stubRaw && stubRaw !== true ? unquoteStata(stubRaw) : '.__fv';
    const formula = formulaTerms(rest, ctx);
    return result([
      `.__fv_mm <- stats::model.matrix(~ 0 + ${formula}, data = ${dt})`,
      `.__fv_names <- paste0("${escapeRString(stub)}", seq_len(ncol(.__fv_mm)))`,
      `${dt}[, (.__fv_names) := data.table::as.data.table(.__fv_mm)]`,
      '.do2r_r <- list(varlist = paste(.__fv_names, collapse = " "))',
      'rm(.__fv_mm, .__fv_names)'
    ], 'heuristic', [diag(rec.line, 'warning', 'fvrevar was mapped through model.matrix(). The expanded columns are numerically useful, but Stata temporary-variable names, omitted/base indicators, labels, and empty-cell handling can differ.', rec.text)]);
  }
  return null;
}

function parseWeights(text, ctx) {
  const m = text.match(/\[\s*([afpi])(?:w|weight)\s*=\s*([^\]]+)\]/i);
  if (!m) return { text, weight: '', type: '' };
  return { text: text.replace(m[0], ' ').trim(), weight: translateExpression(m[2], ctx), type: `${m[1].toLowerCase()}weight` };
}

function nextModel(ctx, prefix = 'model') {
  ctx.modelCounter += 1;
  ctx.lastModel = `${prefix}_${ctx.modelCounter}`;
  ctx.lastModelKind = '';
  return ctx.lastModel;
}

function nextTable(ctx, prefix = 'table') {
  ctx.tableCounter += 1;
  ctx.lastTable = `.do2r_${prefix}_${ctx.tableCounter}`;
  return ctx.lastTable;
}

function plainStataVariable(token) {
  let x = String(token || '').trim().replace(/^\(+|\)+$/g, '');
  x = x.replace(/^(?:[LFDS]\d*\.)+/i, '');
  x = x.replace(/^(?:(?:i?b(?:\([^)]*\)|[+-]?\d+(?:\.\d+)?)|i|c|bn|ibn|o(?:[+-]?\d+(?:\.\d+)?)?)\.)/i, '');
  return /^[A-Za-z_]\w*$/.test(x) ? x : '';
}

function parseAtAssignments(raw, ctx) {
  const src = String(raw || '').trim();
  const out = [];
  let i = 0;
  while (i < src.length) {
    while (i < src.length && /[\s,]/.test(src[i])) i += 1;
    const m = src.slice(i).match(/^([A-Za-z_]\w*)\s*=/);
    if (!m) break;
    const name = m[1];
    i += m[0].length;
    while (/\s/.test(src[i] || '')) i += 1;
    let rawValue = '';
    if (src[i] === '(') {
      let depth = 1, quote = false, j = i + 1;
      for (; j < src.length; j += 1) {
        const c = src[j];
        if (c === '"') { quote = !quote; continue; }
        if (quote) continue;
        if (c === '(') depth += 1;
        else if (c === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      rawValue = src.slice(i + 1, j).trim();
      i = j + 1;
    } else {
      let j = i;
      while (j < src.length && !/[\s,]/.test(src[j])) j += 1;
      rawValue = src.slice(i, j).trim();
      i = j;
    }
    if (!rawValue) continue;
    let value;
    if (/^[+-]?[0-9.]+(?:\s+[+-]?[0-9.]+|\s+[+-]?[0-9.]+\/[+-]?[0-9.]+|\s+[+-]?[0-9.]+\([+-]?[0-9.]+\)[+-]?[0-9.]+)*$/.test(rawValue) || /^[+-]?[0-9.]+(?:\/[+-]?[0-9.]+|\([+-]?[0-9.]+\)[+-]?[0-9.]+)$/.test(rawValue)) {
      ctx.features.add('numlist');
      value = `stata_numlist("${escapeRString(rawValue)}")`;
    } else if (/^(?:"[^"]*"\s*)+$/.test(rawValue)) {
      value = `c(${splitWords(rawValue).map(x => rString(x, ctx)).join(', ')})`;
    } else value = translateExpression(rawValue, ctx);
    out.push({ name, value });
  }
  return out;
}

function coefficientExpression(raw) {
  let x = String(raw || '').trim();
  const labelled = x.match(/^\(([^:()]+):\s*([\s\S]+)\)$/);
  if (labelled) x = labelled[2].trim();
  x = x.replace(/_b\[([^\]]+)\]/g, (_, term) => `\`${term === '_cons' ? '(Intercept)' : term}\``);
  return x;
}

function survivalResponse(ctx) {
  const s = ctx.survival || {};
  const scale = s.scale || '1';
  const stop = s.time ? `((${s.time}) / (${scale}))` : 'time';
  const event = s.event || `rep(TRUE, nrow(${ctx.currentData}))`;
  if (s.start) return `survival::Surv(((${s.start}) / (${scale})), ${stop}, ${event})`;
  return `survival::Surv(${stop}, ${event})`;
}

function parseModelCore(rest, ctx) {
  const weighted = parseWeights(rest, ctx);
  const q = extractQualifiers(weighted.text);
  const words = splitWords(q.core);
  const dep = words.shift() || '';
  const rhs = words.join(' ');
  const subset = q.ifExpr || q.inExpr ? rowFilter(q.ifExpr, q.inExpr, ctx) : '';
  return { dep: cleanIdentifier(dep, dep), rhs, subset, weight: weighted.weight, weightType: weighted.type };
}

function vcovArgs(options, ctx) {
  const v = optionValue(options, 'vce');
  if (!v || v === true) return '';
  const s = String(v).trim();
  if (/^robust$/i.test(s)) return ', vcov = "hetero"';
  const cm = s.match(/^cluster\s+(.+)$/i);
  if (cm) return `, cluster = ~ ${formulaTerms(cm[1], ctx)}`;
  return '';
}

function modelDataExpr(ctx, subset) {
  return subset ? `${ctx.currentData}[${subset}]` : ctx.currentData;
}

function parseInputSchema(spec) {
  const words = splitWords(spec);
  const cols = [];
  let pendingType = '';
  for (const token of words) {
    if (/^(byte|int|long|float|double|str\d+|strL)$/i.test(token)) { pendingType = token.toLowerCase(); continue; }
    if (/^_skip\(/i.test(token)) return null;
    cols.push({ name: cleanIdentifier(token, token), type: pendingType || 'double' });
    pendingType = '';
  }
  return cols.length ? cols : null;
}

function inputValueToR(token, type, ctx) {
  const raw = String(token || '').trim();
  if (/^str/i.test(type)) {
    if (/^(?:"|`").*/.test(raw)) return rString(raw, ctx);
    return raw === '' ? '""' : `"${escapeRString(unquoteStata(raw))}"`;
  }
  if (/^\.[a-z]?$/i.test(raw)) return 'NA_real_';
  const expr = translateExpression(raw, ctx);
  return /^(byte|int|long)$/i.test(type) && /^[+-]?\d+$/.test(raw) ? `${raw}L` : expr;
}

function translateInputLine(text, ctx, rec) {
  const t = text.trim();
  if (/^end\s*$/i.test(t)) {
    ctx.inputMode = null;
    return result([
      `${ctx.currentData} <- if (length(.__do2r_input_rows)) data.table::rbindlist(.__do2r_input_rows, use.names = TRUE, fill = TRUE) else data.table::data.table()`,
      'rm(.__do2r_input_rows)'
    ], 'heuristic', [diag(rec.line, 'info', 'Inline input data were assembled with rbindlist(); Stata storage widths and value-label metadata are not reproduced.', rec.text)]);
  }
  if (!t || /^\*/.test(t) || /^\/\//.test(t)) return result(t ? `# ${t.replace(/^\*+|^\/\/+/, '').trim()}` : '', 'exact', [], { statement: false });
  const vals = splitWords(t);
  const cols = ctx.inputMode.cols;
  if (vals.length !== cols.length) {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `input row has ${vals.length} fields but ${cols.length} variables were declared. Complex quoted/multiline input needs manual review.`, rec.text)]);
  }
  const pairs = cols.map((col, i) => `${col.name} = ${inputValueToR(vals[i], col.type, ctx)}`);
  return result(`.__do2r_input_rows[[length(.__do2r_input_rows) + 1L]] <- list(${pairs.join(', ')})`, 'heuristic');
}



function stataCoefficientName(raw) {
  const name = String(raw || '').trim();
  return name === '_cons' ? '(Intercept)' : name;
}

function translateResampleStatExpr(raw, ctx) {
  let x = String(raw || '').trim().replace(/^\((.*)\)$/s, '$1').trim();
  if (/^_b$/i.test(x)) return 'unlist(.do2r_e[["b"]][1L, , drop = TRUE])';
  if (/^_se$/i.test(x)) return 'sqrt(diag(.do2r_e[["V"]]))';
  x = x.replace(/_b\[([^\]]+)\]/gi, (_, name) => `.do2r_e[["b"]][1L, "${escapeRString(stataCoefficientName(name))}"]`);
  x = x.replace(/_se\[([^\]]+)\]/gi, (_, name) => `sqrt(diag(.do2r_e[["V"]]))[["${escapeRString(stataCoefficientName(name))}"]]`);
  return translateExpression(x, ctx);
}

function translateResampleStats(spec, ctx) {
  const raw = String(spec || '').trim();
  if (!raw) return 'stata_collect_stored(.do2r_e, .do2r_r)';
  const tokens = splitWords(raw);
  const pieces = [];
  let auto = 0;
  for (const token of tokens) {
    if (/^_b$/i.test(token)) { pieces.push('unlist(.do2r_e[["b"]][1L, , drop = TRUE])'); continue; }
    if (/^_se$/i.test(token)) { pieces.push('setNames(sqrt(diag(.do2r_e[["V"]])), paste0("se_", names(sqrt(diag(.do2r_e[["V"]])))))'); continue; }
    const eq = (() => {
      let depth = 0;
      for (let i = 0; i < token.length; i += 1) {
        const c = token[i];
        if (c === '(' || c === '[') depth += 1;
        else if (c === ')' || c === ']') depth -= 1;
        else if (c === '=' && depth === 0) return i;
      }
      return -1;
    })();
    if (eq > 0) {
      const name = cleanIdentifier(token.slice(0, eq), `stat${auto + 1}`);
      const expr = translateResampleStatExpr(token.slice(eq + 1), ctx);
      pieces.push(`c(${name} = as.numeric(${expr}))`);
    } else {
      auto += 1;
      const expr = translateResampleStatExpr(token, ctx);
      const bm = token.match(/^_b\[([^\]]+)\]$/i);
      const sm = token.match(/^_se\[([^\]]+)\]$/i);
      const name = bm ? cleanIdentifier(bm[1], `stat${auto}`) : sm ? `se_${cleanIdentifier(sm[1], `stat${auto}`)}` : `stat${auto}`;
      pieces.push(`c(${name} = as.numeric(${expr}))`);
    }
  }
  return pieces.length === 1 ? pieces[0] : `c(${pieces.join(', ')})`;
}

function translateEmbeddedCommand(command, ctx, rec, dataName = '.do2r_sample') {
  const previousData = ctx.currentData;
  const previousIndent = ctx.indent;
  const previousStackLength = ctx.stack.length;
  ctx.currentData = dataName;
  ctx.indent = 0;
  const inner = translateStataLine(command, ctx, { ...rec, text: command });
  ctx.currentData = previousData;
  ctx.indent = previousIndent;
  if (ctx.stack.length !== previousStackLength) {
    ctx.stack.splice(previousStackLength);
    return result(`# TODO [Stata line ${rec.line}]: ${command}`, 'review', [diag(rec.line, 'review', 'Repeated-estimation prefixes currently require a single self-contained command, not a block-opening control/program statement.', command)]);
  }
  return inner;
}

function translateResamplingPrefix(text, ctx, rec) {
  const [lhsRaw, command] = splitAtTopLevelColon(text);
  if (!command) return null;
  const [lhs, options] = splitStataOptions(lhsRaw);
  const w = splitWords(lhs);
  const rawPrefix = (w.shift() || '').toLowerCase();
  const prefix = rawPrefix === 'jknife' ? 'jackknife' : rawPrefix;
  if (!['bootstrap','jackknife','permute','simulate','rolling'].includes(prefix)) return null;

  ctx.features.add('resampling');
  ctx.features.add('results');
  const inner = translateEmbeddedCommand(command, ctx, rec);
  if (!inner || inner.confidence === 'review') {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [
      ...(inner?.diagnostics || []),
      diag(rec.line, 'review', `${prefix} could not be translated because its repeated command is not yet safely translatable.`, rec.text)
    ]);
  }

  let statSpec = w.join(' ');
  let permuteVar = '';
  if (prefix === 'permute') {
    const pw = splitWords(statSpec);
    permuteVar = cleanIdentifier(pw.shift() || '', '');
    statSpec = pw.join(' ');
    if (!permuteVar) return null;
  }
  const stats = translateResampleStats(statSpec, ctx);
  const body = [
    '.do2r_r <- list()',
    '.do2r_e <- list()',
    '.do2r_s <- list()',
    ...inner.lines,
    `as.numeric(${stats}) |> setNames(names(${stats}))`
  ];
  // Avoid evaluating the statistic expression twice when it contains model access.
  body[body.length - 1] = `local({
    .do2r_stat <- ${stats}
    if (is.null(names(.do2r_stat))) names(.do2r_stat) <- paste0("stat", seq_along(.do2r_stat))
    as.numeric(.do2r_stat) |> setNames(names(.do2r_stat))
  })`;
  const fn = `function(.do2r_sample) {\n${body.map(x => `  ${x}`).join('\n')}\n}`;

  const repsRaw = optionValue(options, 'reps');
  const seedRaw = optionValue(options, 'seed') || optionValue(options, 'rseed');
  const repsDefault = prefix === 'bootstrap' || prefix === 'jackknife' ? '50L' : prefix === 'permute' ? '100L' : 'NULL';
  const reps = repsRaw && repsRaw !== true ? translateExpression(String(repsRaw), ctx) : repsDefault;
  const seed = seedRaw && seedRaw !== true ? translateExpression(String(seedRaw), ctx) : 'NULL';
  const clusterRaw = optionValue(options, 'cluster');
  const strataRaw = optionValue(options, 'strata');
  const cluster = clusterRaw && clusterRaw !== true ? rString(String(clusterRaw), ctx) : 'NULL';
  const strata = strataRaw && strataRaw !== true ? rString(String(strataRaw), ctx) : 'NULL';
  const ds = [...inner.diagnostics];

  if (prefix === 'bootstrap') {
    const sizeRaw = optionValue(options, 'size');
    const size = sizeRaw && sizeRaw !== true ? translateExpression(String(sizeRaw), ctx) : 'NULL';
    if (hasOption(options, 'fweights') || hasOption(options, 'iweights') || hasOption(options, 'bca')) {
      ds.push(diag(rec.line, 'warning', 'Custom bootstrap replicate weights and BCa interval construction are not reproduced by the current helper; replication draws/statistics are translated, but advanced interval semantics need validation.', rec.text));
    }
    return result([
      `.do2r_bootstrap <- stata_bootstrap(${ctx.currentData}, statistic = ${fn}, reps = ${reps}, seed = ${seed}, strata = ${strata}, cluster = ${cluster}, size = ${size})`,
      '.do2r_e <- stata_resample_e(.do2r_bootstrap$theta, .do2r_bootstrap$replicates, cmd = "bootstrap", jackknife = FALSE)',
      '.do2r_bootstrap$replicates'
    ], 'heuristic', [diag(rec.line, 'warning', 'bootstrap was mapped to explicit resampling in R. Validate Stata-specific rejection rules, weights, cluster IDs, BC/BCa intervals, and VCE reporting when used.', rec.text), ...ds]);
  }

  if (prefix === 'jackknife') {
    return result([
      `.do2r_jackknife <- stata_jackknife(${ctx.currentData}, statistic = ${fn}, cluster = ${cluster})`,
      '.do2r_e <- stata_resample_e(.do2r_jackknife$theta, .do2r_jackknife$replicates, cmd = "jackknife", jackknife = TRUE)',
      '.do2r_jackknife$replicates'
    ], 'heuristic', [diag(rec.line, 'warning', 'jackknife was mapped to leave-one-observation or leave-one-cluster-out replication. Verify mse, reject(), pseudovalue, and saved-result details.', rec.text), ...ds]);
  }

  if (prefix === 'permute') {
    if (hasOption(options, 'enumerate')) ds.push(diag(rec.line, 'warning', 'permute, enumerate is approximated by Monte Carlo permutations in this translation unless you replace the helper with exhaustive enumeration.', rec.text));
    return result([
      `.do2r_permute <- stata_permute(${ctx.currentData}, variable = "${escapeRString(permuteVar)}", statistic = ${fn}, reps = ${reps}, seed = ${seed}, strata = ${strata})`,
      '.do2r_r <- list(reps = nrow(.do2r_permute$replicates), observed = .do2r_permute$theta)',
      '.do2r_permute$replicates'
    ], 'heuristic', [diag(rec.line, 'warning', 'permute was mapped to repeated value permutation, optionally within strata. Verify Stata tail definitions, exact enumeration, reject(), and p-value reporting.', rec.text), ...ds]);
  }

  if (prefix === 'simulate') {
    if (reps === 'NULL') {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'simulate requires reps(#); no implicit replication count is invented.', rec.text)]);
    }
    return result([
      `.do2r_simulate <- stata_simulate(${ctx.currentData}, statistic = ${fn}, reps = ${reps}, seed = ${seed})`,
      '.do2r_r <- list(reps = nrow(.do2r_simulate))',
      '.do2r_simulate'
    ], 'heuristic', [diag(rec.line, 'info', 'simulate was mapped to repeated execution of the translated command with independent copied data state. RNG streams differ from Stata even with the same seed.', rec.text), ...ds]);
  }

  if (prefix === 'rolling') {
    const winRaw = optionValue(options, 'window');
    if (!winRaw || winRaw === true) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'rolling requires window(#), matching Stata syntax.', rec.text)]);
    const stepRaw = optionValue(options, 'stepsize');
    const windowExpr = translateExpression(String(winRaw), ctx);
    const stepExpr = stepRaw && stepRaw !== true ? translateExpression(String(stepRaw), ctx) : '1L';
    const mode = hasOption(options, 'recursive') ? 'recursive' : hasOption(options, 'rrecursive') ? 'rrecursive' : 'rolling';
    return result([
      `.do2r_rolling <- stata_rolling(${ctx.currentData}, statistic = ${fn}, window = ${windowExpr}, step = ${stepExpr}, mode = "${mode}")`,
      hasOption(options, 'clear') ? `${ctx.currentData} <- data.table::copy(.do2r_rolling)` : '.do2r_rolling'
    ], 'heuristic', [diag(rec.line, 'warning', 'rolling was mapped to row-ordered windows. Confirm the data are sorted exactly as the Stata tsset time order and review start()/end()/keep()/reject() options when present.', rec.text), ...ds]);
  }
  return null;
}

function translateStatsbyPrefix(text, ctx, rec) {
  if (!/^statsby\b/i.test(text)) return null;
  const raw = text.replace(/^statsby\b/i, '').trim();
  const [lhs, command] = splitAtTopLevelColon(raw);
  if (!command) return null;
  const [statsSpec, options] = splitTopLevel(lhs, ',');
  const byOpt = optionValue(options, 'by');
  const saving = optionValue(options, 'saving');
  const total = hasOption(options, 'total');
  const subsets = hasOption(options, 'subsets');
  if (saving || total || subsets) {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'statsby saving()/total/subsets require a broader repeated-estimation execution layer.', rec.text)]);
  }

  const [bodyMain, bodyOptions] = splitTopLevel(command, ',');
  const ws = bodyMain.search(/\s/);
  const bodyCmd = normalizeCommand(ws < 0 ? bodyMain : bodyMain.slice(0, ws));
  const bodyRest = ws < 0 ? '' : bodyMain.slice(ws + 1).trim();
  if (bodyCmd !== 'summarize') {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'statsby is currently translated directly for summarize; model-based _b/_se and arbitrary r()/e() commands are next in the prefix execution layer.', rec.text)]);
  }

  const q = extractQualifiers(bodyRest);
  const vars = splitWords(q.core);
  if (vars.length !== 1 || q.ifExpr || q.inExpr) {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'statsby + summarize currently requires one summarized variable without inner if/in qualifiers.', rec.text)]);
  }

  ctx.features.add('summarize');
  const detail = hasOption(bodyOptions, 'detail') ? 'TRUE' : 'FALSE';
  let specs = splitWords(statsSpec).filter(Boolean);
  if (!specs.length) specs = ['N=r(N)', 'mean=r(mean)', 'sd=r(sd)', 'min=r(min)', 'max=r(max)'];
  const values = [];
  for (const spec of specs) {
    const m = spec.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (!m) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'statsby expression lists currently require explicit newname=expression entries.', rec.text)]);
    const rhs = translateExpression(m[2].replace(/^\((.*)\)$/, '$1'), ctx);
    if (!/\.do2r_r\[\[/.test(rhs)) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'statsby currently supports expressions built from summarize r() scalars.', rec.text)]);
    values.push(`${cleanIdentifier(m[1])} = ${rhs}`);
  }
  const byVec = byOpt && byOpt !== true ? varListExpr(String(byOpt).replace(/,\s*missing\b/i, '').trim(), ctx) : 'character()';
  const missingGroups = byOpt && byOpt !== true && /,\s*missing\b/i.test(String(byOpt));
  const byCode = byOpt && byOpt !== true ? `, by = ${byVec}` : '';
  const filterMissing = byOpt && byOpt !== true && !missingGroups ? `[stats::complete.cases(${ctx.currentData}[, .SD, .SDcols = ${byVec}])]` : '';
  const source = `${ctx.currentData}${filterMissing}`;
  const lines = [
    `${ctx.currentData} <- ${source}[, {`,
    `  .do2r_r <- stata_summarize(${cleanIdentifier(vars[0], vars[0])}, detail = ${detail})`,
    `  .(${values.join(', ')})`,
    `}${byCode}]`
  ];
  return result(lines, 'heuristic', [diag(rec.line, 'warning', 'statsby + summarize was translated to grouped data.table evaluation. Verify Stata quantile definitions and any omitted prefix options.', rec.text)]);
}

function translateExtraData(cmd, rest, options, ctx, rec, by) {
  const dt = ctx.currentData;
  if (cmd === 'cross') {
    const path = stataPathFromUsing(rest);
    ctx.features.add('haven');
    const lines = [
      `.__master <- data.table::copy(${dt})[, .__do2r_cross__ := 1L]`,
      `.__using <- data.table::as.data.table(haven::read_dta(${rString(path, ctx)}))[, .__do2r_cross__ := 1L]`,
      `.__overlap <- setdiff(intersect(names(.__master), names(.__using)), ".__do2r_cross__")`,
      `if (length(.__overlap)) .__using[, (.__overlap) := NULL]`,
      `${dt} <- merge(.__master, .__using, by = ".__do2r_cross__", allow.cartesian = TRUE, sort = FALSE)`,
      `${dt}[, .__do2r_cross__ := NULL]`,
      `rm(.__master, .__using, .__overlap)`
    ];
    return result(lines, 'heuristic', [diag(rec.line, 'warning', 'cross was mapped to a cartesian data.table merge; master values are retained for overlapping variable names, but row order and metadata should be checked.', rec.text)]);
  }

  if (cmd === 'joinby') {
    const m = rest.match(/^(.*?)\s*\busing\b\s+(.+)$/i);
    if (!m) return null;
    const keySpec = m[1].trim();
    const path = m[2].trim();
    const unmatched = String(optionValue(options, 'unmatched') || 'none').toLowerCase();
    const update = hasOption(options, 'update');
    const replace = hasOption(options, 'replace');
    if (replace && !update) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'joinby replace is valid only together with update; the source should be reviewed.', rec.text)]);
    ctx.features.add('haven');
    const markerRaw = optionValue(options, '_merge') || optionValue(options, 'merge');
    const marker = markerRaw && markerRaw !== true ? cleanIdentifier(markerRaw) : '_merge';
    const emitMarker = unmatched !== 'none' || markerRaw;
    const allX = ['both', 'master'].includes(unmatched) ? 'TRUE' : 'FALSE';
    const allY = ['both', 'using'].includes(unmatched) ? 'TRUE' : 'FALSE';
    const lines = [
      `.__master <- data.table::copy(${dt})[, .__from_master := TRUE]`,
      `.__using <- data.table::as.data.table(haven::read_dta(${rString(path, ctx)}))[, .__from_using := TRUE]`,
      keySpec ? `.__keys <- ${varListExpr(keySpec, ctx)}` : `.__keys <- setdiff(intersect(names(.__master), names(.__using)), c(".__from_master", ".__from_using"))`,
      `.__overlap <- setdiff(intersect(names(.__master), names(.__using)), c(.__keys, ".__from_master", ".__from_using"))`,
      `if (length(.__keys)) {`,
      `  ${dt} <- merge(.__master, .__using, by = .__keys, all.x = ${allX}, all.y = ${allY}, suffixes = c("", ".__using"), allow.cartesian = TRUE, sort = FALSE)`,
      `} else {`,
      `  .__master[, .__do2r_join__ := 1L]; .__using[, .__do2r_join__ := 1L]`,
      `  ${dt} <- merge(.__master, .__using, by = ".__do2r_join__", all.x = ${allX}, all.y = ${allY}, suffixes = c("", ".__using"), allow.cartesian = TRUE, sort = FALSE)`,
      `  ${dt}[, .__do2r_join__ := NULL]`,
      `}`
    ];
    if (update) {
      lines.push(`invisible(lapply(.__overlap, function(.__v) {`, `  .__u <- paste0(.__v, ".__using")`);
      if (replace) lines.push(`  data.table::set(${dt}, j = .__v, value = data.table::fifelse(!is.na(${dt}[[.__u]]), ${dt}[[.__u]], ${dt}[[.__v]]))`);
      else lines.push(`  data.table::set(${dt}, j = .__v, value = data.table::fifelse(is.na(${dt}[[.__v]]), ${dt}[[.__u]], ${dt}[[.__v]]))`);
      lines.push(`  ${dt}[, (.__u) := NULL]`, `  NULL`, `}))`);
    } else lines.push(`if (length(.__overlap)) ${dt}[, (paste0(.__overlap, ".__using")) := NULL]`);
    if (emitMarker) lines.push(`${dt}[, ${marker} := data.table::fcase(!is.na(.__from_master) & is.na(.__from_using), 1L, is.na(.__from_master) & !is.na(.__from_using), 2L, default = 3L)]`);
    lines.push(`${dt}[, c(".__from_master", ".__from_using") := NULL]`, `rm(.__master, .__using, .__keys, .__overlap)`);
    return result(lines, 'heuristic', [diag(rec.line, 'warning', 'joinby was mapped to an all-pairs key merge. update/replace and unmatched() are represented, but verify ordering, types, labels, and missing-key behavior.', rec.text)]);
  }

  if (cmd === 'fillin') {
    ctx.features.add('fillin');
    return result(`${dt} <- stata_fillin(${dt}, ${varListExpr(rest, ctx)})`, 'heuristic', [diag(rec.line, 'warning', 'fillin was mapped to a cartesian grid plus merge. Verify sort order and labelled missing values.', rec.text)]);
  }

  if (cmd === 'split') {
    const q = extractQualifiers(rest);
    const src = cleanIdentifier(q.core, q.core);
    const stub = optionValue(options, 'generate') || optionValue(options, 'gen') || src;
    const parse = optionValue(options, 'parse');
    const separators = parseStataSeparators(parse);
    const pattern = separators.length ? separators.map(regexEscape).join('|') : '\\\\s+';
    const limit = optionValue(options, 'limit');
    const subset = rowFilter(q.ifExpr, q.inExpr, ctx) || `rep(TRUE, nrow(${dt}))`;
    const ignore = optionValue(options, 'ignore');
    ctx.features.add('split');
    const line = `stata_split(${dt}, var = "${escapeRString(src)}", stub = "${escapeRString(String(stub))}", pattern = "${escapeRString(pattern)}", limit = ${limit && limit !== true ? translateExpression(limit, ctx) : 'Inf'}, subset = ${subset}, trim = ${hasOption(options, 'notrim') ? 'FALSE' : 'TRUE'}, destring = ${hasOption(options, 'destring') ? 'TRUE' : 'FALSE'}, ignore = ${ignore && ignore !== true ? rString(ignore, ctx) : 'NULL'}, force = ${hasOption(options, 'force') ? 'TRUE' : 'FALSE'}, percent = ${hasOption(options, 'percent') ? 'TRUE' : 'FALSE'})`;
    return result(line, 'heuristic', [diag(rec.line, 'warning', 'split supports generate(), parse(), limit(), notrim, destring, ignore(), force, and percent. Check multi-character separator edge cases and exact destring behavior.', rec.text)]);
  }

  if (cmd === 'separate') {
    const q = extractQualifiers(rest);
    const src = cleanIdentifier(q.core, q.core);
    const byOpt = optionValue(options, 'by');
    if (!byOpt || byOpt === true) return null;
    const byExpr = translateExpression(String(byOpt), ctx, { context: 'generate' });
    const stub = optionValue(options, 'generate') || optionValue(options, 'gen') || src;
    const subset = rowFilter(q.ifExpr, q.inExpr, ctx) || `rep(TRUE, nrow(${dt}))`;
    ctx.features.add('separate');
    return result(`.__separated <- stata_separate(${dt}, var = "${escapeRString(src)}", group = ${byExpr}, stub = "${escapeRString(String(stub))}", subset = ${subset}, sequential = ${hasOption(options, 'sequential') ? 'TRUE' : 'FALSE'}, include_missing = ${hasOption(options, 'missing') ? 'TRUE' : 'FALSE'}); .do2r_r <- list(varlist = .__separated)`, 'heuristic', [diag(rec.line, 'warning', 'separate reproduces category-based variables and common naming rules; variable-label text and rare naming collisions should be checked.', rec.text)]);
  }

  if (cmd === 'stack') {
    const into = optionValue(options, 'into');
    if (!into || into === true) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'stack currently requires into() so source groups can be mapped unambiguously.', rec.text)]);
    ctx.features.add('stack');
    return result(`${dt} <- stata_stack(${dt}, vars = ${varListExpr(rest, ctx)}, into = ${varListExpr(into, ctx)})`, 'heuristic', [diag(rec.line, 'warning', 'stack with into() was translated to rbindlist(); verify keep()/drop(), group(), wide, and metadata if used.', rec.text)]);
  }

  if (cmd === 'xpose') {
    if (!hasOption(options, 'clear')) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'xpose replaces data in memory and normally requires clear; review source state before translating.', rec.text)]);
    ctx.features.add('xpose');
    return result(`${dt} <- stata_xpose(${dt}, varname = ${hasOption(options, 'varname') ? 'TRUE' : 'FALSE'})`, 'heuristic', [diag(rec.line, 'warning', 'xpose translates numeric columns and attempts Stata-like variable naming. Verify string-variable handling, promoted names, and formats.', rec.text)]);
  }

  if (cmd === 'range') {
    const w = splitWords(rest);
    if (w.length < 3) return null;
    ctx.features.add('obs');
    const n = w.length >= 4 ? translateExpression(w[3], ctx) : `nrow(${dt})`;
    return result([`${dt} <- stata_set_obs(${dt}, ${n})`, `${dt}[, ${rTargetName(w[0], ctx)} := seq(${translateExpression(w[1], ctx)}, ${translateExpression(w[2], ctx)}, length.out = ${n})]`, `if (".__do2r_obs__" %in% names(${dt})) ${dt}[, .__do2r_obs__ := NULL]`], 'heuristic', [diag(rec.line, 'warning', 'range was translated with seq(..., length.out=). Verify floating-point endpoints and observation-extension behavior.', rec.text)]);
  }

  if (cmd === 'insobs') {
    const w = splitWords(rest);
    if (!w.length) return null;
    const before = optionValue(options, 'before');
    const after = optionValue(options, 'after');
    ctx.features.add('obs');
    return result(`${dt} <- stata_insobs(${dt}, ${translateExpression(w[0], ctx)}${before && before !== true ? `, before = ${translateExpression(before, ctx)}` : after && after !== true ? `, after = ${translateExpression(after, ctx)}` : ''})`, 'heuristic', [diag(rec.line, 'warning', 'insobs was translated by inserting typed-NA rows; row-order semantics are preserved for common before()/after() forms.', rec.text)]);
  }

  if (cmd === 'ipolate') {
    const q = extractQualifiers(rest);
    const m = q.core.match(/^([^\s]+)\s+([^\s]+)$/);
    const gen = optionValue(options, 'generate') || optionValue(options, 'gen');
    if (!m || !gen || gen === true) return null;
    const y = cleanIdentifier(m[1], m[1]), x = cleanIdentifier(m[2], m[2]);
    const filter = rowFilter(q.ifExpr, q.inExpr, ctx, Boolean(by), by ? 'j' : 'i');
    const byR = byClause(by, ctx);
    ctx.features.add('ipolate');
    const rhs = `stata_ipolate(${x}, ${y}, subset = ${filter || 'rep(TRUE, length(' + x + '))'}, epolate = ${hasOption(options, 'epolate') ? 'TRUE' : 'FALSE'})`;
    return result(`${dt}[, ${rTargetName(gen, ctx)} := ${rhs}${byR ? `, ${byR}` : ''}]`, 'heuristic', [diag(rec.line, 'warning', 'ipolate uses stats::approx() on observed x/y pairs. Check duplicate x values, extrapolation, and group ordering.', rec.text)]);
  }

  if (cmd === 'pctile' || cmd === '_pctile' || cmd === 'xtile') {
    const isXtile = cmd === 'xtile';
    const q = extractQualifiers(rest);
    const nq = optionValue(options, 'nquantiles') || optionValue(options, 'nq') || '2';
    const altdef = hasOption(options, 'altdef');
    if (/\[[^\]]+=/.test(q.core)) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `${cmd} weights require a weighted percentile implementation and are not translated yet.`, rec.text)]);
    ctx.features.add('pctile');

    if (cmd === '_pctile') {
      const variable = cleanIdentifier(q.core, q.core);
      const probsOpt = optionValue(options, 'percentiles') || optionValue(options, 'p');
      ctx.features.add('numlist');
      const probs = probsOpt && probsOpt !== true ? `stata_numlist(${rString(probsOpt, ctx)}) / 100` : `seq_len(as.integer(${translateExpression(nq, ctx)}) - 1L) / as.integer(${translateExpression(nq, ctx)})`;
      const filter = rowFilter(q.ifExpr, q.inExpr, ctx);
      const data = filter ? `${dt}[${filter}]` : dt;
      return result([
        `.__pct <- stata_quantile(${data}[["${escapeRString(variable)}"]], ${probs}, altdef = ${altdef ? 'TRUE' : 'FALSE'})`,
        `.do2r_r <- as.list(.__pct)`,
        `names(.do2r_r) <- paste0("r", seq_along(.__pct))`,
        '.__pct'
      ], 'heuristic', [diag(rec.line, 'warning', '_pctile uses Stata-style unweighted percentile definitions; weighted forms remain unsupported.', rec.text)]);
    }

    const m = q.core.match(/^(?:(byte|int|long|float|double)\s+)?([^\s=]+)\s*=\s*(.+)$/i);
    if (!m) return null;
    const target = rTargetName(m[2], ctx);
    const expr = translateExpression(m[3], ctx, { context: 'generate' });
    const filter = rowFilter(q.ifExpr, q.inExpr, ctx);
    const values = filter ? `${dt}[${filter}, ${expr}]` : `${dt}[, ${expr}]`;
    const cutpoints = optionValue(options, 'cutpoints');
    if (isXtile) {
      const cuts = cutpoints && cutpoints !== true
        ? `sort(unique(${dt}[["${escapeRString(String(cutpoints))}"]][!is.na(${dt}[["${escapeRString(String(cutpoints))}"]])]))`
        : `stata_quantile(${values}, seq_len(as.integer(${translateExpression(nq, ctx)}) - 1L) / as.integer(${translateExpression(nq, ctx)}), altdef = ${altdef ? 'TRUE' : 'FALSE'})`;
      const subset = filter || `rep(TRUE, nrow(${dt}))`;
      return result([
        `.__cuts <- ${cuts}`,
        `${dt}[, ${target} := NA_integer_]`,
        `${dt}[${subset}, ${target} := stata_xtile(${expr}, .__cuts)]`,
        'rm(.__cuts)'
      ], 'heuristic', [diag(rec.line, 'warning', 'xtile uses Stata-style unweighted cutpoints and right-closed categories. Weighted quantiles and labelled cutpoint edge cases need review.', rec.text)]);
    }

    const probs = `seq_len(as.integer(${translateExpression(nq, ctx)}) - 1L) / as.integer(${translateExpression(nq, ctx)})`;
    const genp = optionValue(options, 'genp');
    const lines = [
      `.__probs <- ${probs}`,
      `.__pct <- stata_quantile(${values}, .__probs, altdef = ${altdef ? 'TRUE' : 'FALSE'})`,
      `${dt}[, ${target} := NA_real_]`,
      `if (length(.__pct)) ${dt}[seq_len(min(.N, length(.__pct))), ${target} := .__pct[seq_len(min(.N, length(.__pct)))]]`
    ];
    if (genp && genp !== true) lines.push(`${dt}[, ${rTargetName(genp, ctx)} := NA_real_]`, `if (length(.__probs)) ${dt}[seq_len(min(.N, length(.__probs))), ${rTargetName(genp, ctx)} := 100 * .__probs[seq_len(min(.N, length(.__probs)))]]`);
    lines.push('rm(.__pct, .__probs)');
    return result(lines, 'heuristic', [diag(rec.line, 'info', 'pctile uses R quantile type 2 for Stata’s default inverse-ECDF definition and type 6 for altdef.', rec.text)]);
  }

  if (cmd === 'mvencode' || cmd === 'mvdecode') {
    const q = extractQualifiers(rest);
    const mv = optionValue(options, 'mv');
    if (!mv || mv === true) return null;
    if (/[=\\]/.test(String(mv))) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `${cmd} extended missing-code rule lists are not translated yet; simple mv(#) / mv(numlist) forms are supported.`, rec.text)]);
    const cols = varListExpr(q.core, ctx);
    const subset = rowFilter(q.ifExpr, q.inExpr, ctx) || `rep(TRUE, nrow(${dt}))`;
    const lines = [`.__mvcols <- Filter(function(.v) is.numeric(${dt}[[.v]]), ${cols})`];
    if (cmd === 'mvencode') {
      lines.push(`${dt}[${subset}, (.__mvcols) := lapply(.SD, function(.x) { .x[is.na(.x)] <- ${translateExpression(String(mv), ctx)}; .x }), .SDcols = .__mvcols]`);
    } else {
      ctx.features.add('numlist');
      lines.push(`.__mvvalues <- stata_numlist(${rString(String(mv), ctx)})`, `${dt}[${subset}, (.__mvcols) := lapply(.SD, function(.x) { .x[.x %in% .__mvvalues] <- NA_real_; .x }), .SDcols = .__mvcols]`, 'rm(.__mvvalues)');
    }
    lines.push('rm(.__mvcols)');
    return result(lines, 'heuristic', [diag(rec.line, 'warning', `${cmd} supports the common simple mv() form. Extended .a–.z mappings and override semantics are kept for the next missing-value pass.`, rec.text)]);
  }

  if (cmd === 'assertnested') {
    const within = optionValue(options, 'within');
    ctx.features.add('assertnested');
    return result(`stata_assertnested(${dt}, ${varListExpr(rest, ctx)}, within = ${within && within !== true ? varListExpr(within, ctx) : 'character()'}, missing = ${hasOption(options, 'missing') ? 'TRUE' : 'FALSE'})`, 'heuristic', [diag(rec.line, 'warning', 'assertnested was mapped to uniqueness checks from smaller to larger nesting units; verify missing-value treatment for your data.', rec.text)]);
  }

  if (cmd === 'ds') {
    ctx.features.add('varlist');
    let expr = rest.trim() ? `stata_vars(${dt}, ${rString(rest, ctx)})` : `names(${dt})`;
    const hasType = optionValue(options, 'has');
    if (hasType && hasType !== true && /^type\s+(numeric|string)$/i.test(String(hasType))) {
      const typ = String(hasType).match(/^type\s+(numeric|string)$/i)[1].toLowerCase();
      expr = `Filter(function(.v) ${typ === 'numeric' ? 'is.numeric' : 'is.character'}(${dt}[[.v]]), ${expr})`;
    } else if (options.trim()) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'ds property filters beyond has(type numeric|string) still need translation.', rec.text)]);
    }
    return result([`.__ds <- ${expr}`, `.do2r_r <- list(varlist = paste(.__ds, collapse = " "))`, `.__ds`], 'heuristic');
  }

  if (cmd === 'lookfor') {
    const needle = unquoteStata(rest);
    return result(`names(${dt})[vapply(names(${dt}), function(.v) { .__lab <- attr(${dt}[[.v]], "label"); grepl(${rString(needle, ctx)}, paste(.v, if (is.null(.__lab)) "" else .__lab), ignore.case = TRUE) }, logical(1L))]`, 'heuristic', [diag(rec.line, 'warning', 'lookfor was mapped to a case-insensitive search over variable names and label attributes.', rec.text)]);
  }

  if (cmd === 'compare') {
    const w = splitWords(rest);
    if (w.length !== 2) return null;
    const a = cleanIdentifier(w[0], w[0]), b = cleanIdentifier(w[1], w[1]);
    return result(`${dt}[, .(equal = sum((${a} == ${b}) | (is.na(${a}) & is.na(${b})), na.rm = TRUE), different = sum(!is.na(${a}) & !is.na(${b}) & ${a} != ${b}), first_missing = sum(is.na(${a}) & !is.na(${b})), second_missing = sum(!is.na(${a}) & is.na(${b})))]`, 'heuristic', [diag(rec.line, 'warning', 'compare was mapped to core equality/missingness counts, not every category in Stata’s printed compare table.', rec.text)]);
  }

  if (cmd === 'recast') {
    const w = splitWords(rest); const type = (w.shift() || '').toLowerCase(); if (!w.length) return null;
    const cols = varListExpr(w.join(' '), ctx);
    const fun = /^(byte|int|long)$/.test(type) ? 'as.integer' : /^(float|double)$/.test(type) ? 'as.numeric' : /^str\d*$|^strl$/.test(type) ? 'as.character' : null;
    if (!fun) return null;
    return result(`${dt}[, (${cols}) := lapply(.SD, ${fun}), .SDcols = ${cols}]`, 'heuristic', [diag(rec.line, 'warning', 'recast was mapped to R integer/numeric/character storage. R does not mirror Stata byte/int/long/float widths exactly.', rec.text)]);
  }

  if (cmd === 'compress') return result('# compress: no direct action needed; R/data.table manages vector storage types differently', 'heuristic', [diag(rec.line, 'info', 'Stata compress has no exact R analogue. Consider explicit integer/factor conversion only when memory profiling justifies it.', rec.text)]);
  if (cmd === 'copy') {
    const w = splitWords(rest); if (w.length < 2) return null;
    return result(`file.copy(${rString(w[0], ctx)}, ${rString(w[1], ctx)}, overwrite = ${hasOption(options, 'replace') ? 'TRUE' : 'FALSE'})`, 'exact');
  }
  if (cmd === 'rmdir') return result(`unlink(${rString(rest, ctx)}, recursive = FALSE)`, 'exact');
  if (cmd === 'type') return result(`cat(readLines(${rString(rest, ctx)}, warn = FALSE), sep = "\\n")`, 'exact');

  if (cmd === 'sysuse' || cmd === 'webuse') {
    ctx.features.add('haven');
    const raw = unquoteStata(rest.replace(/\s*,?\s*clear\s*$/i, '').trim());
    const url = /^https?:\/\//i.test(raw) ? raw : `https://www.stata-press.com/data/r19/${raw.replace(/\.dta$/i, '')}.dta`;
    return result(`${dt} <- data.table::as.data.table(haven::read_dta("${escapeRString(url)}"))`, 'heuristic', [diag(rec.line, 'warning', `${cmd} was mapped to a Stata Press Release 19 data URL for bare dataset names. Change the release/path if the source depends on another Stata version or webuse base URL.`, rec.text)]);
  }

  return null;
}


function surveyFormula(spec) {
  const vars = splitWords(spec).map(v => cleanIdentifier(v.replace(/^[+-]/, ''), v)).filter(Boolean);
  return vars.length ? `~ ${vars.join(' + ')}` : '~ 1';
}

function translateSvyset(rest, options, ctx, rec) {
  const advanced = ['brrweight', 'bsrweight', 'jkrweight', 'sdrweight', 'poststrata', 'postweight', 'rake', 'regress'];
  const hit = advanced.find(x => optionValue(options, x) !== null);
  if (/\|\|/.test(rest) || hit) {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'Multistage, replicate-weight, poststratified, or calibrated svyset designs need a dedicated survey::svrepdesign()/multistage translation and remain queued.', rec.text)]);
  }
  const weighted = parseWeights(rest, ctx);
  const words = splitWords(weighted.text).filter(Boolean);
  const psuRaw = words[0] || '';
  const psu = !psuRaw || psuRaw === '_n' ? '1' : cleanIdentifier(psuRaw, psuRaw);
  const strata = optionValue(options, 'strata');
  const fpc = optionValue(options, 'fpc');
  const nest = hasOption(options, 'nest');
  const args = [
    `ids = ~ ${psu}`,
    strata && strata !== true ? `strata = ~ ${cleanIdentifier(strata, strata)}` : '',
    weighted.weight ? `weights = ~ ${weighted.weight}` : '',
    fpc && fpc !== true ? `fpc = ~ ${cleanIdentifier(fpc, fpc)}` : '',
    `data = ${ctx.currentData}`,
    `nest = ${nest ? 'TRUE' : 'FALSE'}`
  ].filter(Boolean);
  ctx.features.add('survey');
  ctx.survey = { object: '.do2r_svy', psu, strata: strata && strata !== true ? String(strata) : '', weight: weighted.weight, fpc: fpc && fpc !== true ? String(fpc) : '' };
  const ds = [diag(rec.line, 'warning', 'Basic svyset was mapped to survey::svydesign(). Verify lonely-PSU handling, finite-population corrections, nesting, variance defaults, and any design features not shown explicitly.', rec.text)];
  const single = optionValue(options, 'singleunit');
  if (single && single !== true) ds.push(diag(rec.line, 'warning', `singleunit(${single}) is not set globally by this translation; configure survey.lonely.psu explicitly if needed.`, rec.text));
  return result(`.do2r_svy <- survey::svydesign(${args.join(', ')})`, 'heuristic', ds);
}

function surveySubsetExpr(raw, ctx) {
  if (!raw || raw === true) return '';
  const text = String(raw).trim();
  if (/^if\s+/i.test(text)) return translateExpression(text.replace(/^if\s+/i, ''), ctx, { context: 'generate' });
  const v = cleanIdentifier(text, text);
  return `!is.na(${v}) & ${v} != 0`;
}

function translateSurveyPrefix(text, ctx, rec) {
  const m = text.match(/^svy(?:\s*,\s*([^:]+))?\s*:\s*(.+)$/i);
  if (!m) return null;
  if (!ctx.survey?.object) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'svy: was encountered before a translatable svyset declaration. Define the survey design explicitly in R first.', rec.text)]);
  ctx.features.add('survey');
  const prefixOptions = m[1] || '';
  const [main, commandOptions] = splitTopLevel(m[2], ',');
  const firstSpace = main.search(/\s/);
  const cmd = normalizeCommand(firstSpace < 0 ? main : main.slice(0, firstSpace));
  const rest = firstSpace < 0 ? '' : main.slice(firstSpace + 1).trim();
  const q = extractQualifiers(rest);
  let design = ctx.survey.object;
  const subsets = [];
  const subpop = optionValue(prefixOptions, 'subpop');
  const subExpr = surveySubsetExpr(subpop, ctx);
  if (subExpr) subsets.push(subExpr);
  if (q.ifExpr) subsets.push(translateExpression(q.ifExpr, ctx, { context: 'generate' }));
  if (q.inExpr) {
    ctx.features.add('rows');
    subsets.push(`seq_len(nrow(${ctx.currentData})) %in% stata_rows(nrow(${ctx.currentData}), ${rString(q.inExpr, ctx)})`);
  }
  if (subsets.length) design = `subset(${design}, ${subsets.join(' & ')})`;

  const ds = [diag(rec.line, 'warning', 'svy: was mapped to the survey package. Compare variance estimators, degrees of freedom, domain/subpopulation treatment, and estimator-specific defaults against Stata.', rec.text)];
  if (commandOptions.trim()) ds.push(diag(rec.line, 'info', 'Some estimator options following the svy: command are not yet propagated to the R call.', rec.text));
  const vars = q.core;
  if (cmd === 'mean') return result(`survey::svymean(${surveyFormula(vars)}, ${design}, na.rm = TRUE)`, 'heuristic', ds);
  if (cmd === 'total') return result(`survey::svytotal(${surveyFormula(vars)}, ${design}, na.rm = TRUE)`, 'heuristic', ds);
  if (cmd === 'proportion') return result(`survey::svymean(~ factor(${cleanIdentifier(splitWords(vars)[0] || 'x')}), ${design}, na.rm = TRUE)`, 'heuristic', ds);
  if (cmd === 'tabulate') {
    const tw = splitWords(vars);
    if (tw.length === 1) return result(`survey::svytable(~ ${cleanIdentifier(tw[0], tw[0])}, ${design})`, 'heuristic', ds);
    if (tw.length >= 2) return result(`survey::svytable(~ ${cleanIdentifier(tw[0], tw[0])} + ${cleanIdentifier(tw[1], tw[1])}, ${design})`, 'heuristic', ds);
  }
  if (['regress', 'logit', 'probit', 'poisson'].includes(cmd)) {
    const core = parseModelCore(q.core, ctx);
    if (!core.dep) return null;
    const model = nextModel(ctx, 'svy_model');
    const family = cmd === 'logit' ? ', family = stats::quasibinomial(link = "logit")' : cmd === 'probit' ? ', family = stats::quasibinomial(link = "probit")' : cmd === 'poisson' ? ', family = stats::quasipoisson(link = "log")' : '';
    return result(`${model} <- survey::svyglm(${core.dep} ~ ${formulaTerms(core.rhs, ctx)}, design = ${design}${family})`, 'heuristic', ds);
  }
  return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `svy: ${cmd} is not mapped yet. Basic means, totals, proportions, tabulations, regress, logit, probit, and poisson are covered.`, rec.text)]);
}

function translateMixedModel(cmd, rest, options, ctx, rec) {
  const parts = rest.split(/\s*\|\|\s*/).map(x => x.trim());
  if (parts.length < 2) return null;
  const core = parseModelCore(parts.shift(), ctx);
  if (!core.dep) return null;
  const random = [];
  for (const part of parts) {
    if (!part) continue;
    const m = part.match(/^([A-Za-z_]\w*)\s*:\s*(.*)$/);
    if (!m) return null;
    const group = cleanIdentifier(m[1], m[1]);
    const slopes = splitWords(m[2]).filter(v => v && v !== '_cons' && !/^nocons$/i.test(v)).map(v => formulaTerm(v, ctx));
    random.push(`(${slopes.length ? `1 + ${slopes.join(' + ')}` : '1'} | ${group})`);
  }
  if (!random.length) return null;
  const model = nextModel(ctx, 'mixed_model');
  const data = modelDataExpr(ctx, core.subset);
  const fixed = formulaTerms(core.rhs, ctx);
  const rhs = [fixed, ...random].join(' + ');
  const weightArg = core.weight ? `, weights = ${core.weight}` : '';
  let call;
  const ds = [diag(rec.line, 'warning', `${cmd} was mapped to an R mixed-model implementation with common random-intercept/slope formula syntax. Verify covariance structures, crossed/nested levels, integration method, weights, offsets/exposure, and Stata-specific VCE/defaults.`, rec.text)];

  if (cmd === 'mixed') {
    ctx.features.add('lme4');
    call = `lme4::lmer(${core.dep} ~ ${rhs}, data = ${data}${weightArg}, REML = ${hasOption(options, 'mle') ? 'FALSE' : 'TRUE'})`;
  } else if (['meologit', 'meoprobit'].includes(cmd)) {
    ctx.features.add('ordinal');
    const link = cmd === 'meologit' ? 'logit' : 'probit';
    call = `ordinal::clmm(ordered(${core.dep}) ~ ${rhs}, data = ${data}${core.weight ? `, weights = ${core.weight}` : ''}, link = "${link}")`;
    ds.push(diag(rec.line, 'warning', 'Ordered mixed models were mapped to ordinal::clmm(). Validate threshold parameterization, quadrature, random-effects covariance, and outcome ordering.', rec.text));
  } else if (cmd === 'menbreg') {
    ctx.features.add('lme4');
    call = `lme4::glmer.nb(${core.dep} ~ ${rhs}, data = ${data}${weightArg})`;
    ds.push(diag(rec.line, 'warning', 'Stata menbreg dispersion parameterization/options are not identical to lme4::glmer.nb(); compare fitted likelihood and dispersion carefully.', rec.text));
  } else if (cmd === 'meglm') {
    const familyRaw = String(optionValue(options, 'family') || 'gaussian').trim();
    const familyBits = splitWords(familyRaw);
    const family = (familyBits.shift() || 'gaussian').toLowerCase();
    const familyArg = familyBits.join(' ').trim();
    const defaultLinks = { gaussian: 'identity', bernoulli: 'logit', binomial: 'logit', gamma: 'log', nbinomial: 'log', ordinal: 'logit', poisson: 'log' };
    const link = String(optionValue(options, 'link') || defaultLinks[family] || '').trim().toLowerCase();
    const supportedLinks = {
      gaussian: new Set(['identity', 'log']),
      bernoulli: new Set(['logit', 'probit', 'cloglog', 'log']),
      binomial: new Set(['logit', 'probit', 'cloglog', 'log']),
      gamma: new Set(['identity', 'log']),
      nbinomial: new Set(['identity', 'log']),
      ordinal: new Set(['logit', 'probit', 'cloglog']),
      poisson: new Set(['identity', 'log'])
    };
    if (!supportedLinks[family] || !supportedLinks[family].has(link)) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `meglm family(${familyRaw}) link(${link || '?'}) does not have a safe built-in mapping in the current R backend.`, rec.text)]);
    }
    if (family === 'ordinal') {
      ctx.features.add('ordinal');
      call = `ordinal::clmm(ordered(${core.dep}) ~ ${rhs}, data = ${data}${core.weight ? `, weights = ${core.weight}` : ''}, link = "${link}")`;
      ds.push(diag(rec.line, 'warning', 'meglm family(ordinal) was mapped to ordinal::clmm(); validate thresholds and integration semantics.', rec.text));
    } else if (family === 'nbinomial') {
      ctx.features.add('lme4');
      if (familyArg && !/^mean$/i.test(familyArg)) ds.push(diag(rec.line, 'warning', `meglm family(nbinomial ${familyArg}) dispersion semantics are not reproduced exactly by glmer.nb().`, rec.text));
      call = `lme4::glmer.nb(${core.dep} ~ ${rhs}, data = ${data}${weightArg}, link = "${link}")`;
    } else if (family === 'gaussian' && link === 'identity') {
      ctx.features.add('lme4');
      call = `lme4::lmer(${core.dep} ~ ${rhs}, data = ${data}${weightArg}, REML = FALSE)`;
    } else {
      ctx.features.add('lme4');
      let response = core.dep;
      if (family === 'binomial' && familyArg) {
        const trials = translateExpression(familyArg, ctx);
        response = `cbind(${core.dep}, (${trials}) - ${core.dep})`;
        ds.push(diag(rec.line, 'info', 'Grouped-binomial meglm data were mapped to an R two-column success/failure response.', rec.text));
      }
      const rFamily = family === 'bernoulli' || family === 'binomial' ? 'binomial' : family === 'gamma' ? 'Gamma' : family;
      call = `lme4::glmer(${response} ~ ${rhs}, data = ${data}, family = stats::${rFamily}(link = "${link}")${weightArg})`;
    }
  } else {
    ctx.features.add('lme4');
    const family = cmd === 'melogit' ? 'stats::binomial(link = "logit")' : cmd === 'meprobit' ? 'stats::binomial(link = "probit")' : cmd === 'mecloglog' ? 'stats::binomial(link = "cloglog")' : 'stats::poisson(link = "log")';
    call = `lme4::glmer(${core.dep} ~ ${rhs}, data = ${data}, family = ${family}${weightArg})`;
  }
  return result(`${model} <- ${call}`, 'heuristic', ds);
}

function translateTimeSeriesUtility(cmd, rest, options, ctx, rec) {
  const dt = ctx.currentData;
  if (!ctx.panel?.time) {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `${cmd} requires tsset/xtset metadata that do2R could not resolve before this statement.`, rec.text)]);
  }
  const panel = ctx.panel.id ? `"${escapeRString(ctx.panel.id)}"` : 'NULL';
  const time = `"${escapeRString(ctx.panel.time)}"`;
  const delta = ctx.panel.delta || '1';

  if (cmd === 'tsfill') {
    ctx.features.add('tsfill');
    return result(`${dt} <- stata_tsfill(${dt}, panel = ${panel}, time = ${time}, delta = ${delta}, full = ${hasOption(options, 'full') ? 'TRUE' : 'FALSE'})`, 'heuristic', [diag(rec.line, 'warning', 'tsfill was mapped to an explicit panel/time grid. Verify nonnumeric calendar deltas and any time-variable class/format conversions.', rec.text)]);
  }

  if (cmd === 'tsappend') {
    const add = optionValue(options, 'add');
    const last = optionValue(options, 'last');
    const tsfmt = optionValue(options, 'tsfmt');
    if ((!add || add === true) && (!last || last === true)) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tsappend needs either add(#) or last(date/clock).', rec.text)]);
    }
    if (last && last !== true && (!tsfmt || tsfmt === true) && !/^[+-]?\d+(?:\.\d+)?$/.test(String(last).trim())) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tsappend last() needs tsfmt() unless the endpoint is already numeric (for example a yearly time variable).', rec.text)]);
    }
    ctx.features.add('tsfill');
    ctx.features.add('tsappend');
    const panelValue = optionValue(options, 'panel');
    const panelArg = panelValue && panelValue !== true ? `, panel_value = ${translateExpression(String(panelValue), ctx)}` : '';
    if (last && last !== true) {
      const fmtArg = tsfmt && tsfmt !== true ? `, tsfmt = "${escapeRString(String(tsfmt))}"` : '';
      return result(`${dt} <- stata_tsappend(${dt}, panel = ${panel}, time = ${time}, delta = ${delta}, last = ${rString(String(last), ctx)}${fmtArg}${panelArg})`, 'heuristic', [diag(rec.line, 'warning', 'tsappend last()/tsfmt() was mapped to Stata-style integer time endpoints after filling internal gaps. Verify weekly/date-time literals, nonunit deltas, and panel-ID typing against Stata.', rec.text)]);
    }
    return result(`${dt} <- stata_tsappend(${dt}, panel = ${panel}, time = ${time}, delta = ${delta}, add = ${translateExpression(String(add), ctx)}${panelArg})`, 'heuristic', [diag(rec.line, 'warning', 'tsappend, add(#) was mapped to gap-filling followed by appended time points. Verify time scale/delta and panel-ID typing.', rec.text)]);
  }

  if (cmd === 'tsfilter') {
    const m = rest.match(/^hp\s+(?:(?:byte|int|long|float|double)\s+)?(.+?)\s*=\s*(.+)$/i);
    if (!m) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tsfilter currently maps the common Hodrick-Prescott form: tsfilter hp newvar = varname [, smooth(#) trend(newvar)].', rec.text)]);
    const cycleNames = splitWords(m[1]).filter(Boolean);
    const q = extractQualifiers(m[2]);
    const sourceNames = splitWords(q.core).filter(Boolean);
    if (q.ifExpr || q.inExpr) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tsfilter hp if/in restrictions need explicit sample-segment handling and are not translated yet.', rec.text)]);
    if (!sourceNames.length || sourceNames.some(v => !/^[A-Za-z_]\w*$/.test(v)) || cycleNames.some(v => !/^[A-Za-z_]\w*$/.test(v)) || cycleNames.length !== sourceNames.length) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tsfilter hp currently requires matching lists of plain source and generated cycle variable names; stub* and time-series operators remain for a later pass.', rec.text)]);
    }
    const trendRaw = optionValue(options, 'trend');
    const trendNames = trendRaw && trendRaw !== true ? splitWords(String(trendRaw)).filter(Boolean) : [];
    if (trendNames.length && (trendNames.length !== sourceNames.length || trendNames.some(v => !/^[A-Za-z_]\w*$/.test(v)))) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tsfilter hp trend() currently requires one plain output name per filtered variable.', rec.text)]);
    }
    if (optionValue(options, 'gain')) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tsfilter hp gain() is not yet mapped because mFilter does not expose Stata’s gain/angular-frequency table directly.', rec.text)]);
    const smoothRaw = optionValue(options, 'smooth');
    const lambda = smoothRaw && smoothRaw !== true ? translateExpression(String(smoothRaw), ctx) : '1600';
    const panelArg = ctx.panel.id ? `${dt}[["${escapeRString(ctx.panel.id)}"]]` : 'NULL';
    ctx.features.add('mFilter');
    ctx.features.add('tsfilter_hp');
    const lines = [];
    for (let i = 0; i < sourceNames.length; i++) {
      lines.push(`.__do2r_hp <- stata_tsfilter_hp(${dt}[["${escapeRString(sourceNames[i])}"]], lambda = ${lambda}, panel = ${panelArg})`);
      lines.push(`${dt}[, ${rTargetName(cycleNames[i], ctx)} := .__do2r_hp$cycle]`);
      if (trendNames.length) lines.push(`${dt}[, ${rTargetName(trendNames[i], ctx)} := .__do2r_hp$trend]`);
    }
    lines.push('rm(.__do2r_hp)');
    const ds = [diag(rec.line, 'warning', 'tsfilter hp was mapped to mFilter::hpfilter(). Verify endpoint treatment, missing/gapped series, and panel segmentation against Stata.', rec.text)];
    if (!(smoothRaw && smoothRaw !== true)) ds.push(diag(rec.line, 'warning', 'Stata can choose the default HP smoothing parameter from the declared time unit; do2R uses 1600 when smooth() is omitted because display-format periodicity is not yet tracked reliably.', rec.text));
    return result(lines, 'heuristic', ds);
  }

  if (cmd === 'tssmooth') {
    const expm = rest.match(/^exponential\s+(?:(?:byte|int|long|float|double)\s+)?([A-Za-z_]\w*)\s*=\s*(.+)$/i);
    if (expm) {
      const target = cleanIdentifier(expm[1], expm[1]);
      const q = extractQualifiers(expm[2]);
      let expr = translateExpression(q.core, ctx, { context: 'generate' });
      const filter = rowFilter(q.ifExpr, q.inExpr, ctx);
      if (filter) expr = `ifelse(${filter}, ${expr}, NA)`;
      const parms = optionValue(options, 'parms');
      const samp0 = optionValue(options, 'samp0');
      const s0 = optionValue(options, 's0');
      const forecast = optionValue(options, 'forecast');
      if (samp0 && samp0 !== true && s0 && s0 !== true) {
        return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tssmooth exponential does not allow samp0() and s0() together.', rec.text)]);
      }
      const alphaArg = parms && parms !== true ? `alpha = ${translateExpression(String(parms), ctx)}` : 'alpha = NULL';
      const s0Arg = s0 && s0 !== true ? `s0 = ${translateExpression(String(s0), ctx)}` : 's0 = NULL';
      const sampArg = samp0 && samp0 !== true ? `samp0 = ${translateExpression(String(samp0), ctx)}` : 'samp0 = NULL';
      const fcArg = forecast && forecast !== true ? `forecast = ${translateExpression(String(forecast), ctx)}` : 'forecast = 0L';
      const panelArg = ctx.panel.id ? `, panel = ${dt}[["${escapeRString(ctx.panel.id)}"]]` : '';
      ctx.features.add('tssmooth_exp');
      ctx.features.add('results');
      const lines = [
        `.__do2r_smooth <- stata_tssmooth_exponential(${dt}[, ${expr}], ${alphaArg}, ${s0Arg}, ${sampArg}, ${fcArg}${panelArg})`,
        `${dt}[, ${target} := .__do2r_smooth$value]`,
        '.do2r_r <- .__do2r_smooth$results',
        'rm(.__do2r_smooth)'
      ];
      return result(lines, 'heuristic', [diag(rec.line, 'warning', 'tssmooth exponential was mapped to the Stata one-step-ahead recursion, including panel-specific optimization when parms() is omitted and Stata-like treatment of leading/interior/trailing missing values. Numeric optimization and floating-point details can still differ.', rec.text)]);
    }

    const m = rest.match(/^ma\s+(?:(?:byte|int|long|float|double)\s+)?([A-Za-z_]\w*)\s*=\s*(.+)$/i);
    if (!m) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'This tssmooth method is not yet translated; double-exponential, Holt–Winters, nonlinear, and seasonal smoothers remain queued.', rec.text)]);
    const target = cleanIdentifier(m[1], m[1]);
    const q = extractQualifiers(m[2]);
    let expr = translateExpression(q.core, ctx, { context: 'generate' });
    const filter = rowFilter(q.ifExpr, q.inExpr, ctx);
    if (filter) expr = `ifelse(${filter}, ${expr}, NA)`;

    let offsets = [], weights = [];
    const window = optionValue(options, 'window');
    const weighted = optionValue(options, 'weights');
    if (window && window !== true) {
      const z = splitWords(String(window)).map(Number);
      if (!z.length || z.some(x => !Number.isInteger(x) || x < 0) || (z[1] != null && ![0, 1].includes(z[1]))) {
        return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tssmooth ma window() could not be parsed safely.', rec.text)]);
      }
      const l = z[0], c = z[1] ?? 0, f = z[2] ?? 0;
      offsets = Array.from({ length: l }, (_, i) => -(l - i)).concat([0], Array.from({ length: f }, (_, i) => i + 1));
      weights = offsets.map(o => o === 0 ? c : 1);
    } else if (weighted && weighted !== true) {
      const wm = String(weighted).match(/^\s*(.*?)\s*<\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*>\s*(.*?)\s*$/);
      if (!wm) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tssmooth ma weights() could not be parsed safely.', rec.text)]);
      const left = expandSimpleNumlist(wm[1]);
      const right = expandSimpleNumlist(wm[3]);
      if (left === null || right === null) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'Complex/decimal numlists inside tssmooth ma weights() remain for review.', rec.text)]);
      offsets = Array.from({ length: left.length }, (_, i) => -(left.length - i)).concat([0], Array.from({ length: right.length }, (_, i) => i + 1));
      weights = [...left, Number(wm[2]), ...right];
    } else {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'tssmooth ma requires a translatable window() or weights() option.', rec.text)]);
    }
    ctx.features.add('collapse');
    ctx.features.add('tssmooth');
    const offs = `c(${offsets.map(x => `${x}L`).join(', ')})`;
    const wts = `c(${weights.join(', ')})`;
    const args = [ctx.panel.id ? `panel = ${ctx.panel.id}` : '', ctx.panel.time ? `time = ${ctx.panel.time}` : '', `delta = ${delta}`].filter(Boolean).join(', ');
    return result(`${dt}[, ${target} := stata_tssmooth_ma(${expr}, offsets = ${offs}, weights = ${wts}${args ? `, ${args}` : ''})]`, 'heuristic', [diag(rec.line, 'warning', 'tssmooth ma was mapped with Stata-style truncated moving averages and zero weight for missing/gap terms. Validate unusual numlists, datetime deltas, and sample restrictions.', rec.text)]);
  }
  return null;
}

function translateTimeSeriesModel(cmd, rest, options, ctx, rec) {
  const dt = ctx.currentData;
  if (cmd === 'irf') {
    const words = splitWords(rest);
    const sub = (words.shift() || '').toLowerCase();
    if (sub === 'set') {
      return result(`# irf set ${words.join(' ')}  # do2R keeps IRF results in R objects rather than a persistent .irf file`, 'heuristic', [diag(rec.line, 'info', 'irf set file state is not persisted; subsequent translated irf create commands use in-memory R objects.', rec.text)]);
    }
    if (sub === 'create') {
      const irfName = cleanIdentifier(words.shift() || '', 'irf_result');
      if (!ctx.lastModel || !['var','vec'].includes(ctx.lastModelKind)) {
        return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'irf create is currently mapped after translated var or vec models. ARIMA/SVAR/local-projection IRFs need separate response-function machinery.', rec.text)]);
      }
      const order = optionValue(options, 'order');
      if (order && order !== true) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'irf create order() changes the Cholesky ordering; do2R will not silently reorder an already fitted vars model.', rec.text)]);
      const step = optionValue(options, 'step');
      const reps = optionValue(options, 'reps');
      const level = optionValue(options, 'level');
      const seed = optionValue(options, 'seed');
      const doBoot = hasOption(options, 'bs') || hasOption(options, 'bsp');
      const target = `.do2r_irf_${irfName}`;
      ctx.lastIrf = target;
      ctx.features.add('vars');
      ctx.features.add('irf');
      const lines = [`${target} <- stata_irf_create(${ctx.lastModel}, n.ahead = ${step && step !== true ? translateExpression(String(step), ctx) : '8L'}, boot = ${doBoot ? 'TRUE' : 'FALSE'}, runs = ${reps && reps !== true ? translateExpression(String(reps), ctx) : '200L'}, ci = ${(level && level !== true) ? `(${translateExpression(String(level), ctx)}) / 100` : '0.95'}, seed = ${seed && seed !== true ? translateExpression(String(seed), ctx) : 'NULL'})`];
      const ds = [diag(rec.line, 'warning', 'irf create was mapped to vars::irf()/fevd() objects for ordinary and orthogonalized, cumulative, and FEVD results. Stata IRF-file metadata and exact standard-error conventions are not reproduced.', rec.text)];
      if (!doBoot && ctx.lastModelKind === 'var') ds.push(diag(rec.line, 'warning', 'Stata uses asymptotic IRF standard errors by default after var; vars::irf() has bootstrap bands or point estimates, so this translation returns point estimates unless bs/bsp is requested.', rec.text));
      if (hasOption(options, 'bsp')) ds.push(diag(rec.line, 'warning', 'Stata bsp requests a parametric bootstrap; vars::irf() uses its own bootstrap procedure, so interval estimates are only an approximation.', rec.text));
      return result(lines, 'heuristic', ds);
    }
    if (sub === 'graph' || sub === 'table') {
      if (!ctx.lastIrf) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `irf ${sub} requires a preceding translated irf create in the same translation context.`, rec.text)]);
      const statistic = (words.shift() || 'oirf').toLowerCase();
      const allowed = new Set(['irf','oirf','cirf','coirf','fevd']);
      if (!allowed.has(statistic)) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `irf ${sub} statistic ${statistic} is not mapped yet.`, rec.text)]);
      const impulse = optionValue(options, 'impulse');
      const response = optionValue(options, 'response');
      if (sub === 'table') {
        ctx.features.add('irf');
        return result(`stata_irf_table(${ctx.lastIrf}, statistic = "${statistic}"${impulse && impulse !== true ? `, impulse = c(${splitWords(String(impulse)).map(x => `"${escapeRString(x)}"`).join(', ')})` : ''}${response && response !== true ? `, response = c(${splitWords(String(response)).map(x => `"${escapeRString(x)}"`).join(', ')})` : ''})`, 'heuristic', [diag(rec.line, 'warning', 'irf table was flattened to a tidy R data frame; Stata-specific table layout, significance annotations, and IRF-file selection are not reproduced.', rec.text)]);
      }
      if (statistic === 'fevd') return result(`plot(${ctx.lastIrf}$fevd)`, 'heuristic', [diag(rec.line, 'warning', 'irf graph fevd was mapped to vars::fevd plotting. Stata graph styling/options are not reproduced.', rec.text)]);
      const plotArgs = [impulse && impulse !== true ? `impulse = c(${splitWords(String(impulse)).map(x => `"${escapeRString(x)}"`).join(', ')})` : '', response && response !== true ? `response = c(${splitWords(String(response)).map(x => `"${escapeRString(x)}"`).join(', ')})` : ''].filter(Boolean).join(', ');
      return result(`plot(${ctx.lastIrf}$${statistic}${plotArgs ? `, ${plotArgs}` : ''})`, 'heuristic', [diag(rec.line, 'warning', `irf graph ${statistic} was mapped to vars plotting; Stata graph formatting and by()/individual combination semantics are not reproduced.`, rec.text)]);
    }
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'This irf subcommand is not yet mapped; create, set, graph, and table are supported in common forms.', rec.text)]);
  }
  if (cmd === 'vec' || cmd === 'vecrank') {
    const q = extractQualifiers(rest);
    const depvars = splitWords(q.core).filter(Boolean);
    if (depvars.length < 2 || depvars.some(v => !/^[A-Za-z_]\w*$/.test(v))) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `${cmd} currently requires at least two plain endogenous variable names.`, rec.text)]);
    const lagsRaw = optionValue(options, 'lags');
    const lags = lagsRaw && lagsRaw !== true ? translateExpression(String(lagsRaw), ctx) : '2L';
    const trend = String(optionValue(options, 'trend') || 'constant').trim().toLowerCase();
    const trendMap = { constant: 'none', rconstant: 'const', rtrend: 'trend' };
    if (!(trend in trendMap)) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `${cmd} trend(${trend}) has no sufficiently faithful one-call mapping in urca::ca.jo(); do2R currently maps trend(constant), trend(rconstant), and trend(rtrend).`, rec.text)]);
    if (optionValue(options, 'aconstraints') || optionValue(options, 'bconstraints')) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `${cmd} coefficient constraints are not silently dropped; urca needs an explicit constrained-cointegration translation.`, rec.text)]);
    const sindRaw = optionValue(options, 'sindicators');
    const sind = sindRaw && sindRaw !== true ? splitWords(String(sindRaw)).filter(Boolean) : [];
    if (sind.some(v => !/^[A-Za-z_]\w*$/.test(v))) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `${cmd} sindicators() currently supports plain variable names only.`, rec.text)]);
    const filter = rowFilter(q.ifExpr, q.inExpr, ctx);
    const source = filter ? `${dt}[${filter}]` : dt;
    const cols = [...depvars, ...sind].filter((v,i,a) => a.indexOf(v) === i);
    ctx.features.add('urca'); ctx.features.add('vars'); ctx.features.add('results');
    const dataLine = `.__do2r_vec_data <- as.data.frame(${source}[, .SD, .SDcols = c(${cols.map(v => `"${escapeRString(v)}"`).join(', ')})])`;
    const caCall = `urca::ca.jo(as.matrix(.__do2r_vec_data[, c(${depvars.map(v => `"${escapeRString(v)}"`).join(', ')}), drop = FALSE]), type = "trace", ecdet = "${trendMap[trend]}", K = ${lags}, spec = "transitory"${sind.length ? `, dumvar = as.matrix(.__do2r_vec_data[, c(${sind.map(v => `"${escapeRString(v)}"`).join(', ')}), drop = FALSE])` : ''})`;
    const ds = [diag(rec.line, 'warning', `${cmd} was mapped to Johansen machinery in urca. Verify deterministic-term normalization, critical values, collinearity reduction, sample gaps, and Stata-specific finite-sample details.`, rec.text)];
    if (trend !== 'constant') ds.push(diag(rec.line, 'warning', `Stata trend(${trend}) and urca ecdet="${trendMap[trend]}" are close Johansen specifications, but parameter naming/normalization and reported trend coefficients differ.`, rec.text));
    if (cmd === 'vecrank') {
      const lines = [dataLine, `.__do2r_vecrank <- ${caCall}`, '.do2r_r <- list(trace = .__do2r_vecrank@teststat, critical = .__do2r_vecrank@cval)', 'summary(.__do2r_vecrank)', 'rm(.__do2r_vec_data)'];
      if (hasOption(options, 'max')) lines.splice(2, 0, `.__do2r_vecrank_max <- urca::ca.jo(as.matrix(.__do2r_vec_data[, c(${depvars.map(v => `"${escapeRString(v)}"`).join(', ')}), drop = FALSE]), type = "eigen", ecdet = "${trendMap[trend]}", K = ${lags}, spec = "transitory"${sind.length ? `, dumvar = as.matrix(.__do2r_vec_data[, c(${sind.map(v => `"${escapeRString(v)}"`).join(', ')}), drop = FALSE])` : ''})`);
      if (hasOption(options, 'ic')) ds.push(diag(rec.line, 'warning', 'vecrank, ic information-criterion output is not reproduced by ca.jo(); the Johansen rank statistics are returned.', rec.text));
      return result(lines, 'heuristic', ds);
    }
    const rankRaw = optionValue(options, 'rank');
    const rank = rankRaw && rankRaw !== true ? translateExpression(String(rankRaw), ctx) : '1L';
    const model = nextModel(ctx, 'vec_model');
    ctx.lastModelKind = 'vec';
    const lines = [dataLine, `.__do2r_cajo <- ${caCall}`, `${model} <- vars::vec2var(.__do2r_cajo, r = ${rank})`, `.do2r_e <- list(N = ${model}$obs, k_eq = ${model}$K, rank = ${rank}, cmd = "vec")`, 'rm(.__do2r_vec_data, .__do2r_cajo)'];
    return result(lines, 'heuristic', ds);
  }
  if (cmd === 'var') {
    const q = extractQualifiers(rest);
    const depvars = splitWords(q.core).filter(Boolean);
    if (depvars.length < 2 || depvars.some(v => !/^[A-Za-z_]\w*$/.test(v))) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'var currently requires at least two plain endogenous variable names. Time-series operators in the endogenous varlist need an explicit design-matrix translation.', rec.text)]);
    }
    const lagSpec = optionValue(options, 'lags');
    const lagValues = expandSimpleNumlist(lagSpec && lagSpec !== true ? String(lagSpec) : '1 2');
    if (!lagValues || !lagValues.length || lagValues.some(x => !Number.isInteger(x) || x < 1)) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'var lags() could not be parsed as a positive integer numlist.', rec.text)]);
    }
    const lags = [...new Set(lagValues)].sort((a, b) => a - b);
    const p = lags[lags.length - 1];
    const consecutive = lags.length === p && lags.every((x, i) => x === i + 1);
    if (!consecutive) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `Stata var can omit intermediate lags (${lags.join(' ')}), whereas vars::VAR(p=) fits every lag from 1 through p. do2R will not silently add excluded lags.`, rec.text)]);
    }
    const exogRaw = optionValue(options, 'exog');
    const exog = exogRaw && exogRaw !== true ? splitWords(String(exogRaw)).filter(Boolean) : [];
    if (exog.some(v => !/^[A-Za-z_]\w*$/.test(v))) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'var exog() currently supports plain variable names; time-series/factor operators in exog() need an explicit matrix translation.', rec.text)]);
    }
    const filter = rowFilter(q.ifExpr, q.inExpr, ctx);
    const source = filter ? `${dt}[${filter}]` : dt;
    const model = nextModel(ctx, 'var_model');
    ctx.lastModelKind = 'var';
    ctx.features.add('vars');
    ctx.features.add('results');
    const cols = [...depvars, ...exog].filter((v, i, a) => a.indexOf(v) === i);
    const lines = [
      `.__do2r_var_data <- as.data.frame(${source}[, .SD, .SDcols = c(${cols.map(v => `"${escapeRString(v)}"`).join(', ')})])`,
      `${model} <- vars::VAR(.__do2r_var_data[, c(${depvars.map(v => `"${escapeRString(v)}"`).join(', ')}), drop = FALSE], p = ${p}L, type = "${hasOption(options, 'noconstant') ? 'none' : 'const'}"${exog.length ? `, exogen = as.matrix(.__do2r_var_data[, c(${exog.map(v => `"${escapeRString(v)}"`).join(', ')}), drop = FALSE])` : ''})`,
      `.do2r_e <- list(N = nrow(${model}$datamat), k_eq = length(${model}$varresult), cmd = "var")`,
      'rm(.__do2r_var_data)'
    ];
    const ds = [diag(rec.line, 'warning', 'var was mapped to vars::VAR(). Stata defaults to lags(1 2), which is reproduced; verify sample gaps, covariance normalization, dfk/small, robust VCE, constraints, and exogenous-variable treatment.', rec.text)];
    if (hasOption(options, 'dfk') || hasOption(options, 'small') || optionValue(options, 'vce') || optionValue(options, 'constraints')) ds.push(diag(rec.line, 'warning', 'One or more Stata var inference/constraint options do not have a direct vars::VAR() equivalent and require result-level validation.', rec.text));
    return result(lines, 'heuristic', ds);
  }
  if (cmd === 'vargranger') {
    if (!ctx.lastModel) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'vargranger requires a preceding translated var model in the same translation context.', rec.text)]);
    ctx.features.add('vargranger');
    ctx.features.add('results');
    const lines = [
      `.__do2r_gstats <- stata_vargranger(${ctx.lastModel})`,
      '.do2r_r <- list(gstats = .__do2r_gstats)',
      '.__do2r_gstats'
    ];
    return result(lines, 'heuristic', [diag(rec.line, 'warning', 'vargranger is reproduced as equation-by-equation Wald tests over lag coefficients in vars::VAR equation lm objects. Compare Stata dfk/small/robust-VCE conventions if those were used in estimation.', rec.text)]);
  }
  if (cmd === 'varsoc') {
    const q = extractQualifiers(rest);
    const depvars = splitWords(q.core).filter(Boolean);
    const maxlagRaw = optionValue(options, 'maxlag');
    const maxlag = maxlagRaw && maxlagRaw !== true ? translateExpression(String(maxlagRaw), ctx) : '4L';
    const exogRaw = optionValue(options, 'exog');
    const exog = exogRaw && exogRaw !== true ? splitWords(String(exogRaw)).filter(Boolean) : [];
    const type = hasOption(options, 'noconstant') ? 'none' : 'const';
    ctx.features.add('vars');
    ctx.features.add('results');
    if (!depvars.length) {
      if (!ctx.lastModel) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'Postestimation varsoc needs a preceding translated VAR model.', rec.text)]);
      const lines = [
        `.__do2r_varsoc <- vars::VARselect(${ctx.lastModel}$y, lag.max = ${maxlag}, type = "${type}")`,
        '.do2r_r <- list(selection = .__do2r_varsoc$selection, criteria = .__do2r_varsoc$criteria)',
        '.__do2r_varsoc'
      ];
      return result(lines, 'heuristic', [diag(rec.line, 'warning', 'Postestimation varsoc was mapped to vars::VARselect() using the endogenous data retained by the previous VAR. Stata also reports LR/FPE details and may use different finite-sample information-criterion formulas.', rec.text)]);
    }
    if (depvars.length < 2 || [...depvars, ...exog].some(v => !/^[A-Za-z_]\w*$/.test(v))) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'varsoc currently supports at least two plain endogenous variable names and plain variables in exog().', rec.text)]);
    }
    const filter = rowFilter(q.ifExpr, q.inExpr, ctx);
    const source = filter ? `${dt}[${filter}]` : dt;
    const cols = [...depvars, ...exog].filter((v, i, a) => a.indexOf(v) === i);
    const lines = [
      `.__do2r_varsoc_data <- as.data.frame(${source}[, .SD, .SDcols = c(${cols.map(v => `"${escapeRString(v)}"`).join(', ')})])`,
      `.__do2r_varsoc <- vars::VARselect(.__do2r_varsoc_data[, c(${depvars.map(v => `"${escapeRString(v)}"`).join(', ')}), drop = FALSE], lag.max = ${maxlag}, type = "${type}"${exog.length ? `, exogen = as.matrix(.__do2r_varsoc_data[, c(${exog.map(v => `"${escapeRString(v)}"`).join(', ')}), drop = FALSE])` : ''})`,
      '.do2r_r <- list(selection = .__do2r_varsoc$selection, criteria = .__do2r_varsoc$criteria)',
      '.__do2r_varsoc',
      'rm(.__do2r_varsoc_data)'
    ];
    const ds = [diag(rec.line, 'warning', 'varsoc was mapped to vars::VARselect(). Information-criterion and final-prediction-error formulas are close analogues, but Stata LR tests, lutstats, constraints, and finite-sample details are not reproduced.', rec.text)];
    if (hasOption(options, 'lutstats') || optionValue(options, 'constraints')) ds.push(diag(rec.line, 'warning', 'varsoc lutstats/constraints were not applied by vars::VARselect(); validate lag selection directly in Stata when those options matter.', rec.text));
    return result(lines, 'heuristic', ds);
  }
  if (cmd === 'varlmar') {
    if (!ctx.lastModel) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'varlmar requires a preceding translated var model in the same translation context.', rec.text)]);
    const mlagRaw = optionValue(options, 'mlag');
    const mlag = mlagRaw && mlagRaw !== true ? translateExpression(String(mlagRaw), ctx) : '2L';
    ctx.features.add('vars');
    ctx.features.add('vardiagnostics');
    ctx.features.add('results');
    const lines = [
      `.__do2r_varlmar <- stata_varlmar(${ctx.lastModel}, mlag = ${mlag})`,
      '.do2r_r <- list(lm = .__do2r_varlmar)',
      '.__do2r_varlmar'
    ];
    return result(lines, 'heuristic', [diag(rec.line, 'warning', 'varlmar was approximated with the vars package Breusch-Godfrey system test evaluated at lag orders 1 through mlag(). Stata uses its own Johansen LM implementation for each lag, so test statistics can differ.', rec.text)]);
  }
  if (cmd === 'varnorm') {
    if (!ctx.lastModel) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'varnorm requires a preceding translated var model in the same translation context.', rec.text)]);
    ctx.features.add('vars');
    ctx.features.add('results');
    const lines = [
      `.__do2r_varnorm <- vars::normality.test(${ctx.lastModel}, multivariate.only = FALSE)`,
      '.do2r_r <- list(normality = .__do2r_varnorm)',
      '.__do2r_varnorm'
    ];
    const ds = [diag(rec.line, 'warning', 'varnorm was mapped to vars::normality.test(), which provides univariate and multivariate Jarque-Bera/skewness/kurtosis diagnostics. Ordering and residual-standardization conventions should be checked against Stata.', rec.text)];
    if (options.trim()) ds.push(diag(rec.line, 'warning', 'varnorm reporting/standardization options are not selectively reproduced; the full vars::normality.test() result is returned for inspection.', rec.text));
    return result(lines, 'heuristic', ds);
  }
  if (cmd === 'varstable') {
    if (!ctx.lastModel) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'varstable requires a preceding translated var model in the same translation context.', rec.text)]);
    ctx.features.add('vars');
    ctx.features.add('vardiagnostics');
    ctx.features.add('results');
    const graph = hasOption(options, 'graph');
    const lines = [
      `.__do2r_varstable <- stata_varstable(${ctx.lastModel}, graph = ${graph ? 'TRUE' : 'FALSE'})`,
      '.do2r_r <- .__do2r_varstable',
      '.__do2r_varstable$roots'
    ];
    const ds = [diag(rec.line, 'warning', 'varstable was mapped to companion-matrix eigenvalues from vars::roots(); stability is reported as all moduli being below one.', rec.text)];
    if (optionValue(options, 'amat') || /\b(?:dlabel|modlabel|nogrid|pgrid|addplot)\b/i.test(options)) ds.push(diag(rec.line, 'warning', 'Some varstable matrix/graph-formatting options are not reproduced; the translated result retains the eigenvalues and stability flag.', rec.text));
    return result(lines, 'heuristic', ds);
  }
  if (cmd === 'dfuller') {
    const q = extractQualifiers(rest); const v = splitWords(q.core)[0]; if (!v) return null;
    ctx.features.add('urca');
    const lags = optionValue(options, 'lags');
    const type = hasOption(options, 'trend') ? 'trend' : hasOption(options, 'noconstant') ? 'none' : 'drift';
    return result(`urca::ur.df(${dt}[["${escapeRString(v)}"]], type = "${type}", lags = ${lags && lags !== true ? translateExpression(lags, ctx) : '0L'}, selectlags = "Fixed")`, 'heuristic', [diag(rec.line, 'warning', 'dfuller was mapped to urca::ur.df(). Verify deterministic terms, lag construction, sample trimming, critical values, and test-statistic conventions.', rec.text)]);
  }
  if (cmd === 'corrgram') {
    const q = extractQualifiers(rest); const v = splitWords(q.core)[0]; if (!v) return null;
    const lags = optionValue(options, 'lags'); const lagMax = lags && lags !== true ? translateExpression(lags, ctx) : 'NULL';
    return result(`list(acf = stats::acf(${dt}[["${escapeRString(v)}"]], lag.max = ${lagMax}, na.action = stats::na.pass), pacf = stats::pacf(${dt}[["${escapeRString(v)}"]], lag.max = ${lagMax}, na.action = stats::na.pass))`, 'heuristic', [diag(rec.line, 'warning', 'corrgram was mapped to base R acf()/pacf(); Q statistics, confidence conventions, and missing-data behavior need comparison.', rec.text)]);
  }
  if (cmd === 'arima') {
    const q = extractQualifiers(rest); const core = parseModelCore(q.core, ctx); if (!core.dep) return null;
    const ar = optionValue(options, 'arima'); if (!ar || ar === true) return null;
    const ord = splitWords(String(ar).replace(/,/g, ' ')).filter(Boolean);
    if (ord.length < 3) return null;
    const data = modelDataExpr(ctx, core.subset);
    const model = nextModel(ctx, 'arima_model');
    ctx.lastModelKind = 'arima';
    const rhs = formulaTerms(core.rhs, ctx);
    const xreg = core.rhs.trim() ? `, xreg = stats::model.matrix(~ ${rhs}, data = ${data})[, -1L, drop = FALSE]` : '';
    const sar = optionValue(options, 'sarima');
    let seasonal = '';
    if (sar && sar !== true) {
      const ss = splitWords(String(sar).replace(/,/g, ' ')).filter(Boolean);
      if (ss.length >= 4) seasonal = `, seasonal = list(order = c(${ss.slice(0,3).join(', ')}), period = ${ss[3]})`;
    }
    return result(`${model} <- stats::arima(${data}[["${escapeRString(core.dep)}"]], order = c(${ord.slice(0,3).join(', ')})${seasonal}${xreg}, include.mean = ${hasOption(options, 'noconstant') ? 'FALSE' : 'TRUE'}, method = "ML")`, 'heuristic', [diag(rec.line, 'warning', 'arima was mapped to stats::arima(). Compare conditional/exact likelihood choices, initialization, missing values, seasonal specification, exogenous-regressor handling, and Stata parameterization.', rec.text)]);
  }
  return null;
}

function translateModel(cmd, rest, options, ctx, rec) {
  const ds = [];
  const model = nextModel(ctx);
  const core = parseModelCore(rest, ctx);
  if (!core.dep) return null;
  const data = modelDataExpr(ctx, core.subset);
  const rhs = formulaTerms(core.rhs, ctx);
  const weightArg = core.weight ? `, weights = ~ ${core.weight}` : '';
  if (core.weight) ds.push(diag(rec.line, 'warning', `${core.weightType} semantics differ across Stata and R estimators; verify the intended weighting interpretation.`, rec.text));

  if (cmd === 'regress') {
    ctx.features.add('fixest');
    return result(`${model} <- fixest::feols(${core.dep} ~ ${rhs}, data = ${data}${weightArg}${vcovArgs(options, ctx)})`, 'heuristic', [diag(rec.line, 'warning', 'OLS formula translated to fixest::feols(); verify factor-variable base levels, omitted collinearity, small-sample corrections, and VCE defaults.', rec.text), ...ds]);
  }
  if (cmd === 'areg') {
    ctx.features.add('fixest');
    const absorb = optionValue(options, 'absorb');
    if (!absorb || absorb === true) return null;
    return result(`${model} <- fixest::feols(${core.dep} ~ ${rhs} | ${formulaTerms(absorb, ctx)}, data = ${data}${weightArg}${vcovArgs(options, ctx)})`, 'heuristic', [diag(rec.line, 'warning', 'areg was mapped to absorbed fixed effects in fixest; verify degrees-of-freedom and VCE choices.', rec.text), ...ds]);
  }
  if (cmd === 'xtreg') {
    const fe = hasOption(options, 'fe');
    const re = hasOption(options, 're');
    if (fe) {
      ctx.features.add('fixest');
      const id = ctx.panel?.id || 'panel_id';
      if (!ctx.panel?.id) ds.push(diag(rec.line, 'review', 'xtreg, fe needs the panel identifier from xtset/tsset; replace panel_id if necessary.', rec.text));
      return result(`${model} <- fixest::feols(${core.dep} ~ ${rhs} | ${id}, data = ${data}${weightArg}${vcovArgs(options, ctx)})`, 'heuristic', [diag(rec.line, 'warning', 'xtreg, fe was mapped to fixest fixed effects; verify Stata panel/VCE defaults and within-R² conventions.', rec.text), ...ds]);
    }
    if (re) {
      ctx.features.add('plm');
      const idx = ctx.panel?.time ? `c("${ctx.panel.id}", "${ctx.panel.time}")` : `"${ctx.panel?.id || 'panel_id'}"`;
      return result(`${model} <- plm::plm(${core.dep} ~ ${rhs}, data = ${data}, model = "random", index = ${idx}${core.weight ? `, weights = ${core.weight}` : ''})`, 'heuristic', [diag(rec.line, 'warning', 'xtreg, re was mapped to plm::plm(); random-effects transformations and finite-sample details can differ.', rec.text), ...ds]);
    }
  }
  if (cmd === 'logit' || cmd === 'probit') {
    const link = cmd === 'probit' ? 'probit' : 'logit';
    return result(`${model} <- stats::glm(${core.dep} ~ ${rhs}, data = ${data}, family = stats::binomial(link = "${link}")${core.weight ? `, weights = ${core.weight}` : ''})`, 'heuristic', [diag(rec.line, 'warning', `${cmd} was mapped to glm(); verify weights, robust/cluster VCE, separation handling, and factor bases.`, rec.text), ...ds]);
  }
  if (cmd === 'poisson') {
    ctx.features.add('fixest');
    return result(`${model} <- fixest::fepois(${core.dep} ~ ${rhs}, data = ${data}${weightArg}${vcovArgs(options, ctx)})`, 'heuristic', [diag(rec.line, 'warning', 'poisson was mapped to fixest::fepois(); check exposure/offset and VCE options.', rec.text), ...ds]);
  }
  if (cmd === 'nbreg') {
    ctx.features.add('MASS');
    return result(`${model} <- MASS::glm.nb(${core.dep} ~ ${rhs}, data = ${data}${core.weight ? `, weights = ${core.weight}` : ''})`, 'heuristic', [diag(rec.line, 'warning', 'nbreg was mapped to MASS::glm.nb(); Stata parameterization and ancillary-parameter reporting should be checked.', rec.text), ...ds]);
  }
  if (cmd === 'qreg') {
    ctx.features.add('quantreg');
    const q = optionValue(options, 'quantile');
    const tau = q && q !== true ? Number(q) / (Number(q) > 1 ? 100 : 1) : 0.5;
    return result(`${model} <- quantreg::rq(${core.dep} ~ ${rhs}, data = ${data}, tau = ${Number.isFinite(tau) ? tau : 0.5})`, 'heuristic', [diag(rec.line, 'warning', 'qreg was mapped to quantreg::rq(); standard-error methods and optimization defaults differ.', rec.text)]);
  }
  if (cmd === 'tobit') {
    ctx.features.add('AER');
    const ll = optionValue(options, 'll');
    const ul = optionValue(options, 'ul');
    return result(`${model} <- AER::tobit(${core.dep} ~ ${rhs}, data = ${data}${ll && ll !== true ? `, left = ${translateExpression(ll, ctx)}` : ''}${ul && ul !== true ? `, right = ${translateExpression(ul, ctx)}` : ''})`, 'heuristic', [diag(rec.line, 'warning', 'tobit was mapped to AER::tobit(); compare likelihood conventions, censoring limits, and VCE.', rec.text)]);
  }
  if (cmd === 'ologit' || cmd === 'oprobit') {
    ctx.features.add('MASS');
    return result(`${model} <- MASS::polr(factor(${core.dep}, ordered = TRUE) ~ ${rhs}, data = ${data}, method = "${cmd === 'ologit' ? 'logistic' : 'probit'}", Hess = TRUE)`, 'heuristic', [diag(rec.line, 'warning', `${cmd} was mapped to MASS::polr(); category ordering, cutpoints, and VCE need verification.`, rec.text)]);
  }
  if (cmd === 'mlogit') {
    ctx.features.add('nnet');
    return result(`${model} <- nnet::multinom(factor(${core.dep}) ~ ${rhs}, data = ${data}, trace = FALSE)`, 'heuristic', [diag(rec.line, 'warning', 'mlogit was mapped to nnet::multinom(); verify base outcome, weights, VCE, and coefficient normalization.', rec.text)]);
  }
  if (cmd === 'clogit') {
    ctx.features.add('survival');
    const group = optionValue(options, 'group') || optionValue(options, 'strata');
    if (!group || group === true) return null;
    return result(`${model} <- survival::clogit(${core.dep} ~ ${rhs} + strata(${cleanIdentifier(group, group)}), data = ${data})`, 'heuristic', [diag(rec.line, 'warning', 'clogit was mapped to survival::clogit(); verify ties, weights, and robust variance settings.', rec.text)]);
  }
  return null;
}


function translatePanelModel(cmd, rest, options, ctx, rec) {
  const core = parseModelCore(rest, ctx);
  if (!core.dep) return null;

  const panelOpt = optionValue(options, 'i');
  const panelId = cleanIdentifier((panelOpt && panelOpt !== true ? panelOpt : ctx.panel?.id) || '', '');
  if (!panelId) {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
      [diag(rec.line, 'review', `${cmd} needs a panel identifier from xtset or i().`, rec.text)]);
  }

  const data = modelDataExpr(ctx, core.subset);
  const rhs = formulaTerms(core.rhs, ctx);
  const model = nextModel(ctx, 'xt_model');
  const ds = [];
  if (core.weight) ds.push(diag(rec.line, 'warning', `${core.weightType} semantics need estimator-specific verification in the translated panel model.`, rec.text));

  const fe = hasOption(options, 'fe');
  const pa = hasOption(options, 'pa');
  const re = hasOption(options, 're') || (!fe && !pa);
  const weightArg = core.weight ? `, weights = ${core.weight}` : '';

  const geeCall = (family, link, corstr = 'exchangeable', rhsExpr = rhs) => {
    ctx.features.add('geepack');
    const waves = ctx.panel?.time ? `, waves = ${ctx.panel.time}` : '';
    return `${model} <- geepack::geeglm(${core.dep} ~ ${rhsExpr}, id = ${panelId}${waves}, data = ${data}, family = stats::${family}(link = "${link}"), corstr = "${corstr}"${weightArg})`;
  };

  if (cmd === 'xtlogit') {
    if (fe) {
      ctx.features.add('survival');
      return result(`${model} <- survival::clogit(${core.dep} ~ ${rhs} + survival::strata(${panelId}), data = ${data}${weightArg})`, 'heuristic',
        [diag(rec.line, 'warning', 'xtlogit, fe is mapped to conditional logistic regression via survival::clogit(). Verify ties, weights, dropped panels, and finite-sample conventions.', rec.text), ...ds]);
    }
    if (pa) return result(geeCall('binomial', 'logit'), 'heuristic',
      [diag(rec.line, 'warning', 'xtlogit, pa is mapped to binomial-logit GEE with exchangeable working correlation. Verify scale and VCE details.', rec.text), ...ds]);
    if (re) {
      ctx.features.add('lme4');
      return result(`${model} <- lme4::glmer(${core.dep} ~ ${rhs} + (1 | ${panelId}), data = ${data}, family = stats::binomial(link = "logit")${weightArg})`, 'heuristic',
        [diag(rec.line, 'warning', 'Default/RE xtlogit is mapped to a random-intercept GLMM. Compare quadrature, random-effect parameterization, weights, and VCE with Stata.', rec.text), ...ds]);
    }
  }

  if (cmd === 'xtprobit') {
    if (fe) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
      [diag(rec.line, 'review', 'xtprobit does not provide a fixed-effects analogue comparable to xtlogit, fe; do2R will not invent one.', rec.text)]);
    if (pa) return result(geeCall('binomial', 'probit'), 'heuristic',
      [diag(rec.line, 'warning', 'xtprobit, pa is mapped to binomial-probit GEE with exchangeable working correlation. Verify scale and VCE details.', rec.text), ...ds]);
    ctx.features.add('lme4');
    return result(`${model} <- lme4::glmer(${core.dep} ~ ${rhs} + (1 | ${panelId}), data = ${data}, family = stats::binomial(link = "probit")${weightArg})`, 'heuristic',
      [diag(rec.line, 'warning', 'Default/RE xtprobit is mapped to a probit random-intercept GLMM. Compare Stata quadrature and random-effect conventions.', rec.text), ...ds]);
  }

  if (cmd === 'xtologit' || cmd === 'xtoprobit') {
    ctx.features.add('ordinal');
    const link = cmd === 'xtologit' ? 'logit' : 'probit';
    const intpointsRaw = optionValue(options, 'intpoints');
    const intpointsNum = intpointsRaw && intpointsRaw !== true ? Number(intpointsRaw) : 12;
    const intpoints = Number.isInteger(intpointsNum) && intpointsNum > 0 ? intpointsNum : 12;
    const intmethod = String(optionValue(options, 'intmethod') || 'mvaghermite').toLowerCase();
    const nAGQ = intmethod === 'ghermite' ? `-${intpoints}L` : `${intpoints}L`;
    const offsetRaw = optionValue(options, 'offset');
    const offset = offsetRaw && offsetRaw !== true ? ` + offset(${cleanIdentifier(offsetRaw, offsetRaw)})` : '';
    const call = `${model} <- ordinal::clmm(ordered(${core.dep}) ~ ${rhs}${offset} + (1 | ${panelId}), data = ${data}, link = "${link}", nAGQ = ${nAGQ}${weightArg})`;
    const ods = [diag(rec.line, 'warning', `${cmd} was mapped to ordinal::clmm() with a panel random intercept and ${intmethod === 'ghermite' ? 'non-adaptive' : 'adaptive'} Gauss-Hermite quadrature. Verify threshold parameterization, likelihood normalization, quadrature behavior, weights, and VCE against Stata.`, rec.text), ...ds];
    if (intpointsRaw && intpointsRaw !== true && intpointsNum !== intpoints) ods.push(diag(rec.line, 'warning', `intpoints(${intpointsRaw}) could not be parsed as a positive integer, so the translated model uses 12 quadrature points.`, rec.text));
    if (optionValue(options, 'constraints') || optionValue(options, 'vce') || hasOption(options, 'or') || hasOption(options, 'lrmodel') || hasOption(options, 'noskip')) ods.push(diag(rec.line, 'warning', 'One or more xtologit/xtoprobit inference/reporting options have no direct clmm() equivalent and were not applied to estimation.', rec.text));
    return result(call, 'heuristic', ods);
  }

  if (cmd === 'xtpoisson') {
    const exposure = optionValue(options, 'exposure');
    const offset = optionValue(options, 'offset');
    const off = exposure && exposure !== true ? ` + offset(log(${cleanIdentifier(exposure, exposure)}))` :
      offset && offset !== true ? ` + offset(${cleanIdentifier(offset, offset)})` : '';
    const rhs2 = `${rhs}${off}`;
    if (fe) {
      ctx.features.add('fixest');
      return result(`${model} <- fixest::fepois(${core.dep} ~ ${rhs2} | ${panelId}, data = ${data}${core.weight ? `, weights = ~ ${core.weight}` : ''}${vcovArgs(options, ctx)})`, 'heuristic',
        [diag(rec.line, 'warning', 'xtpoisson, fe is mapped to Poisson fixed effects in fixest. Verify VCE, dropped panels, exposure/offset, and postestimation.', rec.text), ...ds]);
    }
    if (pa) return result(geeCall('poisson', 'log', 'exchangeable', rhs2), 'heuristic',
      [diag(rec.line, 'warning', 'xtpoisson, pa is mapped to Poisson GEE with exchangeable working correlation. Verify scale and VCE defaults.', rec.text), ...ds]);
    ctx.features.add('lme4');
    return result(`${model} <- lme4::glmer(${core.dep} ~ ${rhs2} + (1 | ${panelId}), data = ${data}, family = stats::poisson(link = "log")${weightArg})`, 'heuristic',
      [diag(rec.line, 'warning', 'Default/RE xtpoisson is mapped to a Poisson random-intercept GLMM. Verify Stata random-effects integration and exposure/offset behavior.', rec.text), ...ds]);
  }

  if (cmd === 'xtgee') {
    const familyRaw = String(optionValue(options, 'family') || 'gaussian').trim().toLowerCase();
    const familyName = familyRaw.split(/\s+/)[0];
    const defaultLink = { gaussian: 'identity', normal: 'identity', binomial: 'logit', poisson: 'log', gamma: 'inverse' }[familyName];
    const link = String(optionValue(options, 'link') || defaultLink || '').trim().toLowerCase();
    const familyMap = { gaussian: 'gaussian', normal: 'gaussian', binomial: 'binomial', poisson: 'poisson', gamma: 'Gamma' };
    if (!familyMap[familyName] || !link) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
        [diag(rec.line, 'review', `xtgee family(${familyRaw})/link(${link || '?'}) needs a family-specific mapping not yet implemented safely.`, rec.text)]);
    }
    const corrRaw = String(optionValue(options, 'corr') || optionValue(options, 'correlation') || 'exchangeable').trim().toLowerCase();
    let corstr = '';
    if (/^exch/.test(corrRaw)) corstr = 'exchangeable';
    else if (/^ind/.test(corrRaw)) corstr = 'independence';
    else if (/^unstr/.test(corrRaw)) corstr = 'unstructured';
    else if (/^ar\s*1$|^ar1$/.test(corrRaw)) corstr = 'ar1';
    else return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
      [diag(rec.line, 'review', `xtgee corr(${corrRaw}) is not directly represented by the current mapping. exchangeable, independent, unstructured, and AR(1) are supported.`, rec.text)]);

    const exposure = optionValue(options, 'exposure');
    const offset = optionValue(options, 'offset');
    const off = exposure && exposure !== true ? ` + offset(log(${cleanIdentifier(exposure, exposure)}))` :
      offset && offset !== true ? ` + offset(${cleanIdentifier(offset, offset)})` : '';
    ctx.features.add('geepack');
    const waves = ctx.panel?.time ? `, waves = ${ctx.panel.time}` : '';
    return result(`${model} <- geepack::geeglm(${core.dep} ~ ${rhs}${off}, id = ${panelId}${waves}, data = ${data}, family = stats::${familyMap[familyName]}(link = "${link}"), corstr = "${corstr}"${weightArg})`, 'heuristic',
      [diag(rec.line, 'warning', 'xtgee is mapped to geepack::geeglm(). Stata and geepack can differ in scale estimation, working-correlation estimation, robust variance normalization, and unbalanced-panel handling.', rec.text), ...ds]);
  }

  return null;
}

function translateIv(rest, options, ctx, rec) {
  const m = rest.match(/^2sls\s+([^\s]+)\s+(.*?)\s*\(([^=]+)=([^\)]+)\)\s*(.*)$/i);
  if (!m) return null;
  ctx.features.add('fixest');
  const model = nextModel(ctx, 'iv_model');
  const dep = cleanIdentifier(m[1], m[1]);
  const exog = formulaTerms(m[2], ctx);
  const endog = formulaTerms(m[3], ctx);
  const inst = formulaTerms(m[4], ctx);
  const q = extractQualifiers(m[5] || '');
  const data = modelDataExpr(ctx, q.ifExpr ? translateExpression(q.ifExpr, ctx) : '');
  return result(`${model} <- fixest::feols(${dep} ~ ${exog} | ${endog} ~ ${inst}, data = ${data}${vcovArgs(options, ctx)})`, 'heuristic', [diag(rec.line, 'warning', 'ivregress 2sls was mapped to fixest IV syntax; verify excluded/exogenous instruments, VCE, first-stage diagnostics, and finite-sample conventions.', rec.text)]);
}

function translateSurvival(cmd, rest, options, ctx, rec) {
  const dt = ctx.currentData;
  if (cmd === 'stset') {
    const words = splitWords(rest);
    const time = cleanIdentifier(words[0] || 'time', words[0] || 'time');
    const positionalFailure = words.length > 1 ? cleanIdentifier(words[1], words[1]) : '';
    const failureRaw = optionValues(options, 'failure').find(x => x !== true) || optionValues(options, 'fail').find(x => x !== true);
    let event;
    if (failureRaw) {
      const f = String(failureRaw).trim();
      const eq = f.match(/^([A-Za-z_]\w*)\s*==\s*(.+)$/);
      if (eq) {
        const vals = expandSimpleNumlist(eq[2]);
        if (vals && vals.length) event = `${cleanIdentifier(eq[1], eq[1])} %in% c(${vals.join(', ')})`;
        else event = translateExpression(f, ctx, { context: 'generate' });
      } else if (/^[A-Za-z_]\w*$/.test(f)) event = `!is.na(${f}) & ${f} != 0`;
      else event = translateExpression(f, ctx, { context: 'generate' });
    } else if (positionalFailure) event = `!is.na(${positionalFailure}) & ${positionalFailure} != 0`;
    else event = `rep(TRUE, nrow(${dt}))`;

    const time0Raw = optionValues(options, 'time0').find(x => x !== true);
    const enterRaw = optionValues(options, 'enter').find(x => x !== true);
    let start = '';
    if (time0Raw) start = translateExpression(String(time0Raw), ctx, { context: 'generate' });
    else if (enterRaw) {
      const e = String(enterRaw).trim().replace(/^time\s+/i, '');
      if (/^[A-Za-z_]\w*$/.test(e)) start = cleanIdentifier(e, e);
    }
    const scaleRaw = optionValues(options, 'scale').find(x => x !== true);
    const scale = scaleRaw ? translateExpression(String(scaleRaw), ctx) : '1';
    const idRaw = optionValues(options, 'id').find(x => x !== true);
    const id = idRaw ? cleanIdentifier(String(idRaw), String(idRaw)) : '';
    ctx.survival = { time, event, start, scale, id, dist: ctx.survival?.dist || '' };
    const ds = [diag(rec.line, 'info', 'stset metadata is carried into translated Cox, parametric, Kaplan-Meier, and curve commands.', rec.text)];
    if (optionValue(options, 'origin') || optionValue(options, 'exit') || optionValue(options, 'if') || optionValue(options, 'ever') || optionValue(options, 'never') || optionValue(options, 'after') || optionValue(options, 'before')) ds.push(diag(rec.line, 'warning', 'Advanced stset origin/exit/record-selection semantics are not fully reconstructed; verify risk intervals and exclusions before relying on survival estimates.', rec.text));
    return result(`# stset recorded: time = ${time}, event = ${event}${start ? `, entry = ${start}` : ''}, scale = ${scale}`, 'heuristic', ds);
  }

  if (!ctx.survival && ['stcox','streg','sts','stsum'].includes(cmd)) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `${cmd} needs a preceding translatable stset declaration.`, rec.text)]);

  if (cmd === 'stcox') {
    const q = extractQualifiers(rest);
    const model = nextModel(ctx, 'cox_model');
    const data = q.ifExpr || q.inExpr ? `${dt}[${rowFilter(q.ifExpr, q.inExpr, ctx)}]` : dt;
    let rhs = formulaTerms(q.core, ctx);
    const strataRaw = optionValues(options, 'strata').find(x => x !== true);
    if (strataRaw) rhs += ` + survival::strata(${formulaTerms(String(strataRaw), ctx)})`;
    const ties = hasOption(options, 'efron') ? 'efron' : hasOption(options, 'exactm') || hasOption(options, 'exactp') ? 'exact' : hasOption(options, 'breslow') ? 'breslow' : '';
    ctx.features.add('survival');
    ctx.lastModelKind = 'stcox';
    const ds = [diag(rec.line, 'warning', 'stcox is mapped to survival::coxph() using translated stset risk intervals. Verify multiple-failure/id semantics, time-varying covariates, weights, robust clustering, and Stata tie conventions.', rec.text)];
    if (optionValue(options, 'vce') || hasOption(options, 'robust')) ds.push(diag(rec.line, 'warning', 'stcox robust/cluster VCE options are not yet propagated to coxph() in this mapping.', rec.text));
    return result(`${model} <- survival::coxph(${survivalResponse(ctx)} ~ ${rhs}, data = ${data}${ties ? `, ties = "${ties}"` : ''})`, 'heuristic', ds);
  }

  if (cmd === 'streg') {
    if (optionValue(options, 'frailty') || optionValue(options, 'shared') || optionValue(options, 'strata')) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'streg frailty/shared()/strata() needs a dedicated likelihood mapping; do2R does not silently drop those terms.', rec.text)]);
    const q = extractQualifiers(rest);
    const data = q.ifExpr || q.inExpr ? `${dt}[${rowFilter(q.ifExpr, q.inExpr, ctx)}]` : dt;
    const distRaw = optionValues(options, 'distribution').find(x => x !== true) || optionValues(options, 'dist').find(x => x !== true) || ctx.survival.dist || 'weibull';
    const dist = String(distRaw).toLowerCase().replace(/[\s_-]+/g, '');
    ctx.survival.dist = dist;
    const aft = hasOption(options, 'time');
    const distMap = {
      weibull: aft ? 'weibull' : 'weibullPH',
      exponential: 'exp', exp: 'exp',
      gompertz: 'gompertz',
      lognormal: 'lnorm', lnormal: 'lnorm',
      loglogistic: 'llogis', logistic: 'llogis',
      gamma: 'gengamma', ggamma: 'gengamma', generalizedgamma: 'gengamma'
    };
    const rdist = distMap[dist];
    if (!rdist) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `streg distribution(${distRaw}) is not mapped safely yet.`, rec.text)]);
    const model = nextModel(ctx, 'streg_model');
    ctx.features.add('survival');
    ctx.features.add('flexsurv');
    ctx.lastModelKind = 'streg';
    const rhs = formulaTerms(q.core, ctx);
    const ds = [diag(rec.line, 'warning', `streg distribution(${distRaw}) is mapped to flexsurv::flexsurvreg(dist = "${rdist}"). Compare coefficient parameterization, ancillary parameters, and likelihood conventions with Stata.`, rec.text)];
    if (aft && ['exp','gompertz'].includes(rdist)) ds.push(diag(rec.line, 'warning', 'Stata time/AFT reporting for this PH-parameterized flexsurv distribution may require sign/scale transformation of coefficients.', rec.text));
    if (optionValue(options, 'vce') || hasOption(options, 'robust')) ds.push(diag(rec.line, 'warning', 'streg robust/cluster VCE options require explicit flexsurv variance handling and are not automatically reproduced.', rec.text));
    return result(`${model} <- flexsurv::flexsurvreg(${survivalResponse(ctx)} ~ ${rhs}, data = ${data}, dist = "${rdist}")`, 'heuristic', ds);
  }

  if (cmd === 'sts' || cmd === 'stsum') {
    const words = splitWords(rest);
    const sub = cmd === 'stsum' ? 'list' : (words.shift() || 'list').toLowerCase();
    const byRaw = optionValues(options, 'by').find(x => x !== true);
    const by = byRaw ? factorUnderlyingVariables(String(byRaw)) : [];
    const form = `${survivalResponse(ctx)} ~ ${by.length ? by.join(' + ') : '1'}`;
    ctx.features.add('survival');
    if (sub === 'graph') {
      const fun = hasOption(options, 'failure') ? ', fun = "event"' : hasOption(options, 'cumhaz') ? ', fun = "cumhaz"' : '';
      return result(`plot(survival::survfit(${form}, data = ${dt})${fun}, conf.int = ${hasOption(options, 'noci') ? 'FALSE' : 'TRUE'})`, 'heuristic', [diag(rec.line, 'warning', 'sts graph is mapped to plot.survfit(); Stata risk tables, graph styling, adjusted curves, and some failure/cumulative-hazard options require manual tuning.', rec.text)]);
    }
    if (sub === 'list' || cmd === 'stsum') return result(`summary(survival::survfit(${form}, data = ${dt}))`, 'heuristic', [diag(rec.line, 'info', 'Kaplan-Meier summaries are returned as survival::survfit output rather than Stata-formatted sts/stsum tables.', rec.text)]);
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `sts ${sub} is not mapped yet; sts list and sts graph are supported.`, rec.text)]);
  }

  if (cmd === 'stcurve') {
    if (!ctx.lastModel || !['stcox','streg'].includes(ctx.lastModelKind)) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'stcurve needs a preceding translated stcox or streg model.', rec.text)]);
    ctx.features.add('stcurve');
    const type = hasOption(options, 'hazard') ? 'hazard' : hasOption(options, 'cumhaz') ? 'cumhaz' : hasOption(options, 'failure') ? 'failure' : 'survival';
    const ds = [diag(rec.line, 'warning', 'stcurve is mapped to the available R model curve method. at()/at1()/at2(), range(), CI, and graph formatting options are not yet fully reproduced.', rec.text)];
    if (optionValues(options, 'at').length || optionValues(options, 'at1').length || optionValues(options, 'at2').length) ds.push(diag(rec.line, 'warning', 'stcurve at()/at#() covariate scenarios need manual newdata construction in the current mapping.', rec.text));
    return result(`stata_stcurve(${ctx.lastModel}, type = "${type}")`, 'heuristic', ds);
  }
  return null;
}

function translateReporting(cmd, rest, options, ctx, rec) {
  const dt = ctx.currentData;
  if (cmd === 'collect') {
    const words = splitWords(rest);
    const sub = (words.shift() || 'preview').toLowerCase();
    if (sub === 'clear') {
      ctx.lastTable = '';
      return result('.do2r_collection <- NULL', 'heuristic', [diag(rec.line, 'info', 'collect clear resets do2R reporting state; Stata collection styles and named collections are not persisted.', rec.text)]);
    }
    if (sub === 'preview') {
      if (!ctx.lastTable) return result('# No translated collection is active', 'heuristic', [diag(rec.line, 'info', 'collect preview was encountered before a translated table/dtable/etable result.', rec.text)]);
      return result(ctx.lastTable, 'heuristic');
    }
    if (sub === 'export') {
      if (!ctx.lastTable) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'collect export needs a preceding translated table, dtable, or etable result.', rec.text)]);
      const path = words.join(' ').trim();
      if (!path) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'collect export needs an output filename.', rec.text)]);
      ctx.features.add('reportexport');
      ctx.features.add('openxlsx');
      return result(`stata_collect_export(${ctx.lastTable}, ${rString(path, ctx)}, replace = ${hasOption(options, 'replace') ? 'TRUE' : 'FALSE'})`, 'heuristic', [diag(rec.line, 'warning', 'collect export is mapped for CSV/TSV/XLSX outputs. Stata collection layouts, styles, notes, and rich Word/PDF formatting are not reproduced automatically.', rec.text)]);
    }
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'collect layout/style/label/composite operations require a fuller collection-state model. Basic preview, clear, and export are translated.', rec.text)]);
  }

  const q = extractQualifiers(rest);
  const data = q.ifExpr || q.inExpr ? `${dt}[${rowFilter(q.ifExpr, q.inExpr, ctx)}]` : dt;

  if (cmd === 'table') {
    let dims = factorUnderlyingVariables(q.core);
    if (!dims.length) dims = splitWords(q.core.replace(/[()]/g, ' ')).map(plainStataVariable).filter(Boolean);
    dims = [...new Set(dims)];
    if (!dims.length) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'table needs at least one translatable grouping variable in the currently supported mapping.', rec.text)]);
    let stats = optionValues(options, 'statistic').filter(x => x !== true).map(String);
    const contents = optionValues(options, 'contents').find(x => x !== true);
    if (!stats.length && contents) {
      const bits = splitWords(String(contents));
      const known = new Set(['mean','sd','sum','count','n','min','max','median','p50','semean','variance','percent','frequency','freq']);
      for (let i = 0; i < bits.length;) {
        const stat = bits[i++].toLowerCase();
        if (!known.has(stat)) break;
        if (['percent','frequency','freq'].includes(stat)) stats.push(stat);
        else if (i < bits.length) stats.push(`${stat} ${plainStataVariable(bits[i++]) || bits[i - 1]}`);
      }
    }
    ctx.features.add('reporting');
    const name = nextTable(ctx, 'table');
    const statExpr = stats.length ? `c(${stats.map(x => `"${escapeRString(x)}"`).join(', ')})` : 'character()';
    const lines = [
      `${name} <- stata_table(${data}, dimensions = c(${dims.map(v => `"${escapeRString(v)}"`).join(', ')}), statistics = ${statExpr}, totals = ${hasOption(options, 'nototals') ? 'FALSE' : 'TRUE'})`,
      `${name}`
    ];
    return result(lines, 'heuristic', [diag(rec.line, 'warning', 'table is translated to a tidy data.table summary. Core frequencies and common statistics are mapped, but Stata collect dimensions, marginal totals, formatting, labels, and advanced statistic() syntax can differ.', rec.text)]);
  }

  if (cmd === 'dtable') {
    let variables = factorUnderlyingVariables(q.core);
    if (!variables.length) variables = splitWords(q.core).map(plainStataVariable).filter(Boolean);
    const categorical = splitWords(q.core).filter(x => /^(?:i|ib|ibn|bn|o)\./i.test(x)).map(plainStataVariable).filter(Boolean);
    const factorOpt = optionValues(options, 'factor').find(x => x !== true);
    if (factorOpt) categorical.push(...factorUnderlyingVariables(String(factorOpt).split(',')[0]));
    const continuousOpt = optionValues(options, 'continuous').find(x => x !== true);
    if (continuousOpt) variables.push(...factorUnderlyingVariables(String(continuousOpt).split(',')[0]));
    variables = [...new Set(variables)];
    const cats = [...new Set(categorical)];
    if (!variables.length) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'dtable needs a translatable variable list.', rec.text)]);
    const byRaw = optionValues(options, 'by').find(x => x !== true);
    const by = byRaw ? plainStataVariable(String(byRaw).split(',')[0].trim()) : '';
    let contStats = ['mean', 'sd'];
    const cstat = continuousOpt && String(continuousOpt).match(/statistics\(([^)]*)\)/i);
    if (cstat) contStats = splitWords(cstat[1]).map(x => x.toLowerCase());
    ctx.features.add('reporting');
    const name = nextTable(ctx, 'dtable');
    const lines = [
      `${name} <- stata_dtable(${data}, variables = c(${variables.map(v => `"${escapeRString(v)}"`).join(', ')}), categorical = c(${cats.map(v => `"${escapeRString(v)}"`).join(', ')})${by ? `, by = "${escapeRString(by)}"` : ''}, continuous_stats = c(${contStats.map(v => `"${escapeRString(v)}"`).join(', ')}))`,
      `${name}`
    ];
    return result(lines, 'heuristic', [diag(rec.line, 'warning', 'dtable is mapped to a tidy Table-1-style data.table with continuous summaries and categorical counts/percentages. Tests, survey adjustments, formatting, labels, notes, and the full collect-backed presentation layer remain approximate.', rec.text)]);
  }

  if (cmd === 'etable') {
    const estRaw = optionValues(options, 'estimates').find(x => x !== true);
    const models = estRaw ? splitWords(String(estRaw)).map(x => cleanIdentifier(x, x)).filter(Boolean) : (ctx.lastModel ? [ctx.lastModel] : []);
    if (!models.length) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'etable needs at least one translated estimation result. Use estimates() or place etable after an estimation command.', rec.text)]);
    ctx.features.add('modelsummary');
    const name = nextTable(ctx, 'etable');
    const modelList = `list(${models.map(m => `${m} = ${m}`).join(', ')})`;
    const lines = [
      `${name} <- modelsummary::modelsummary(${modelList}, output = "data.frame", stars = ${hasOption(options, 'showstars') || hasOption(options, 'stars') ? 'TRUE' : 'FALSE'})`,
      `${name}`
    ];
    return result(lines, 'heuristic', [diag(rec.line, 'warning', 'etable is mapped to modelsummary. Coefficient naming, stars, confidence-interval/statistic layout, margins integration, and Stata collect styling may require manual adjustment.', rec.text)]);
  }
  return null;
}

function translateSummaries(cmd, rest, options, ctx, rec) {
  const dt = ctx.currentData;
  const q = extractQualifiers(rest);
  const data = q.ifExpr || q.inExpr ? `${dt}[${rowFilter(q.ifExpr, q.inExpr, ctx)}]` : dt;
  if (cmd === 'summarize') {
    if (!q.core) return result(`summary(${data})`, 'heuristic');
    const cols = varListExpr(q.core, ctx);
    ctx.features.add('summarize');
    const detail = hasOption(options, 'detail') ? 'TRUE' : 'FALSE';
    return result([
      `.do2r_summary <- lapply(${cols}, function(.v) stata_summarize(${data}[[.v]], detail = ${detail}))`,
      `names(.do2r_summary) <- ${cols}`,
      `.do2r_r <- .do2r_summary[[length(.do2r_summary)]]`,
      `.do2r_summary`
    ], 'heuristic', [diag(rec.line, 'info', 'summarize is returned as named lists and also stored in .do2r_r so common r() references can be translated.', rec.text)]);
  }
  if (cmd === 'tabulate') {
    const vars = splitWords(q.core);
    if (vars.length === 1) return result(`${data}[, .N, by = ${cleanIdentifier(vars[0], vars[0])}][order(${cleanIdentifier(vars[0], vars[0])})]`, 'exact');
    if (vars.length >= 2) {
      const a = cleanIdentifier(vars[0], vars[0]), b = cleanIdentifier(vars[1], vars[1]);
      return result(`data.table::dcast(${data}[, .N, by = .(${a}, ${b})], ${a} ~ ${b}, value.var = "N", fill = 0)`, 'exact');
    }
  }
  if (cmd === 'tabstat') {
    const by = optionValue(options, 'by');
    const stats = optionValue(options, 'statistics') || optionValue(options, 'stat') || 'mean sd min max';
    ctx.features.add('tabstat');
    return result(`stata_tabstat(${data}, vars = ${varListExpr(q.core, ctx)}, stats = ${rString(stats, ctx)}${by && by !== true ? `, by = ${varListExpr(by, ctx)}` : ''})`, 'heuristic', [diag(rec.line, 'info', 'tabstat was translated through a helper that returns tidy one-row-per-group statistics.', rec.text)]);
  }
  if (cmd === 'correlate' || cmd === 'pwcorr') {
    const cols = varListExpr(q.core, ctx);
    return result(`stats::cor(as.data.frame(${data}[, .SD, .SDcols = ${cols}]), use = "pairwise.complete.obs")`, 'heuristic', [diag(rec.line, 'info', 'Pairwise-complete correlations can differ from listwise settings and Stata output formatting.', rec.text)]);
  }
  return null;
}

function translateTests(cmd, rest, options, ctx, rec) {
  const dt = ctx.currentData;
  if (cmd === 'ttest') {
    const by = optionValue(options, 'by');
    const unequal = hasOption(options, 'unequal') || hasOption(options, 'welch');
    const levelRaw = optionValue(options, 'level');
    const conf = levelRaw && levelRaw !== true ? Number(levelRaw) / 100 : 0.95;
    const confArg = `conf.level = ${Number.isFinite(conf) ? conf : 0.95}`;
    const mEq = rest.match(/^([^=]+)=([^=]+)$/);
    if (by && by !== true) {
      return result(`stats::t.test(${cleanIdentifier(rest.trim(), rest.trim())} ~ ${cleanIdentifier(by, by)}, data = ${dt}, var.equal = ${unequal ? 'FALSE' : 'TRUE'}, ${confArg})`, 'heuristic',
        [diag(rec.line, 'info', `Stata's two-sample ttest defaults to equal variances; do2R therefore emits var.equal = ${unequal ? 'FALSE' : 'TRUE'} explicitly.`, rec.text)]);
    }
    if (mEq) {
      const lhs = cleanIdentifier(mEq[1].trim(), mEq[1].trim());
      const rhsRaw = mEq[2].trim();
      if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(rhsRaw)) return result(`stats::t.test(${dt}$${lhs}, mu = ${rhsRaw}, ${confArg})`, 'heuristic');
      const rhs = cleanIdentifier(rhsRaw, rhsRaw);
      return result(`with(${dt}, stats::t.test(${lhs}, ${rhs}, paired = TRUE, ${confArg}))`, 'heuristic');
    }
    return result(`stats::t.test(${dt}$${cleanIdentifier(rest.trim(), rest.trim())}, mu = 0, ${confArg})`, 'heuristic');
  }
  if (cmd === 'ranksum') {
    const by = optionValue(options, 'by');
    if (by && by !== true) return result(`stats::wilcox.test(${cleanIdentifier(rest.trim(), rest.trim())} ~ ${cleanIdentifier(by, by)}, data = ${dt}, exact = FALSE)`, 'heuristic',
      [diag(rec.line, 'warning', 'ranksum was mapped to wilcox.test(); tie handling, exact/asymptotic choice, and continuity correction can differ from Stata.', rec.text)]);
  }
  if (cmd === 'oneway') {
    const w = splitWords(rest); if (w.length >= 2) return result(`summary(stats::aov(${cleanIdentifier(w[0], w[0])} ~ factor(${cleanIdentifier(w[1], w[1])}), data = ${dt}))`, 'heuristic');
  }
  if (cmd === 'anova') {
    const w = splitWords(rest); if (w.length >= 2) return result(`summary(stats::aov(${cleanIdentifier(w[0], w[0])} ~ ${formulaTerms(w.slice(1).join(' '), ctx)}, data = ${dt}))`, 'heuristic');
  }
  return null;
}

function translatePostestimation(cmd, rest, options, ctx, rec) {
  if (cmd === 'marginsplot') {
    if (!ctx.lastMargins) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'marginsplot needs a preceding translated margins command.', rec.text)]);
    ctx.features.add('ggplot2');
    ctx.features.add('marginsplot');
    return result(`stata_marginsplot(${ctx.lastMargins})`, 'heuristic', [diag(rec.line, 'warning', 'marginsplot is mapped to a generic ggplot of the translated marginaleffects result. Stata plotdimension(), recast(), legend, and graph styling options require manual adjustment.', rec.text)]);
  }
  if (!ctx.lastModel && ['predict', 'margins', 'lincom', 'nlcom', 'test', 'testnl', 'estat'].includes(cmd)) {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `${cmd} needs a preceding translated estimation command.`, rec.text)]);
  }
  if (cmd === 'predict') {
    const w = splitWords(rest); const target = rTargetName(w[0] || 'prediction', ctx);
    if (hasOption(options, 'residuals') || hasOption(options, 'resid')) return result(`${ctx.currentData}[, ${target} := as.numeric(stats::residuals(${ctx.lastModel}))]`, 'heuristic', [diag(rec.line, 'warning', 'Residual definitions vary by estimator; verify that R residuals() matches the requested Stata residual type.', rec.text)]);
    if (hasOption(options, 'xb')) return result(`${ctx.currentData}[, ${target} := as.numeric(stats::predict(${ctx.lastModel}, newdata = ${ctx.currentData}))]`, 'heuristic', [diag(rec.line, 'warning', 'For nonlinear models, Stata xb is the linear predictor. Confirm predict() is returning the same scale for this R model class.', rec.text)]);
    return result(`${ctx.currentData}[, ${target} := as.numeric(stats::predict(${ctx.lastModel}, newdata = ${ctx.currentData}, type = "response"))]`, 'heuristic', [diag(rec.line, 'warning', 'predict option semantics vary by estimator; verify the requested prediction scale/statistic.', rec.text)]);
  }
  if (cmd === 'estimates' && /^store\s+/i.test(rest)) {
    const name = cleanIdentifier(rest.replace(/^store\s+/i, '').trim());
    return result(`${name} <- ${ctx.lastModel}`, 'exact');
  }
  if (cmd === 'margins') {
    ctx.features.add('marginaleffects');
    const focal = [...new Set(factorUnderlyingVariables(rest).filter(Boolean))];
    const dydxRaw = optionValues(options, 'dydx').find(x => x !== true);
    const dydx = dydxRaw ? factorUnderlyingVariables(String(dydxRaw)) : [];
    const overRaw = optionValues(options, 'over').find(x => x !== true);
    const over = overRaw ? factorUnderlyingVariables(String(overRaw)) : [];
    const atSpecs = optionValues(options, 'at').filter(x => x !== true).map(String);
    const at = atSpecs.length ? parseAtAssignments(atSpecs[0], ctx) : [];
    const atmeans = hasOption(options, 'atmeans');
    const levelRaw = optionValue(options, 'level');
    const confArg = levelRaw && levelRaw !== true ? `, conf_level = ${Number(levelRaw) / 100}` : '';
    const name = nextTable(ctx, 'margins');
    ctx.lastMargins = name;
    let call;
    if (dydx.length) {
      const args = [`${ctx.lastModel}`, `variables = c(${dydx.map(v => `"${escapeRString(v)}"`).join(', ')})`];
      if (atmeans) args.push('newdata = "mean"');
      else if (at.length) args.push(`newdata = marginaleffects::datagrid(model = ${ctx.lastModel}, grid_type = "counterfactual", ${at.map(x => `${x.name} = ${x.value}`).join(', ')})`);
      const by = [...new Set([...focal, ...over])];
      if (by.length) args.push(`by = c(${by.map(v => `"${escapeRString(v)}"`).join(', ')})`);
      call = `marginaleffects::avg_slopes(${args.join(', ')}${confArg})`;
    } else if (atmeans) {
      const gridArgs = [...focal.map(v => `${v} = unique`), ...at.map(x => `${x.name} = ${x.value}`)];
      call = gridArgs.length
        ? `marginaleffects::predictions(${ctx.lastModel}, newdata = marginaleffects::datagrid(model = ${ctx.lastModel}, grid_type = "mean_or_mode", ${gridArgs.join(', ')})${over.length ? `, by = c(${over.map(v => `"${escapeRString(v)}"`).join(', ')})` : ''}${confArg})`
        : `marginaleffects::predictions(${ctx.lastModel}, newdata = "mean"${confArg})`;
    } else {
      const args = [`${ctx.lastModel}`];
      if (focal.length || at.length) {
        if (at.length) {
          const entries = [...focal.map(v => `${v} = unique`), ...at.map(x => `${x.name} = ${x.value}`)];
          args.push(`variables = list(${entries.join(', ')})`);
        } else args.push(`variables = c(${focal.map(v => `"${escapeRString(v)}"`).join(', ')})`);
      }
      if (over.length) args.push(`by = c(${over.map(v => `"${escapeRString(v)}"`).join(', ')})`);
      call = `marginaleffects::avg_predictions(${args.join(', ')}${confArg})`;
    }
    const ds = [diag(rec.line, 'warning', 'margins is mapped to marginaleffects counterfactual predictions/slopes. Verify Stata-specific predict() defaults, factor contrasts, survey/weights, estimability, VCE, and nonlinear transformations.', rec.text)];
    if (atSpecs.length > 1) ds.push(diag(rec.line, 'warning', 'Only the first repeated at() specification is currently translated; separate Stata at() scenarios should be expanded manually in R.', rec.text));
    return result([`${name} <- ${call}`, `${name}`], 'heuristic', ds);
  }
  if (cmd === 'lincom' || cmd === 'nlcom') {
    ctx.features.add('car');
    let expr = coefficientExpression(rest);
    if (hasOption(options, 'eform') || hasOption(options, 'or') || hasOption(options, 'irr') || hasOption(options, 'hr')) expr = `exp(${expr})`;
    const levelRaw = optionValue(options, 'level');
    const level = levelRaw && levelRaw !== true && Number.isFinite(Number(levelRaw)) ? Number(levelRaw) / 100 : 0.95;
    const ds = [diag(rec.line, 'warning', `${cmd} is mapped to car::deltaMethod(). Coefficient names for factor variables/interactions may differ from Stata, so inspect the translated expression.`, rec.text)];
    if (hasOption(options, 'post')) ds.push(diag(rec.line, 'warning', `${cmd}, post is not propagated into Stata-style e() estimation state; the transformed estimate is returned directly.`, rec.text));
    return result(`car::deltaMethod(${ctx.lastModel}, "${escapeRString(expr)}", level = ${level})`, 'heuristic', ds);
  }
  if (cmd === 'test' || cmd === 'testnl') {
    ctx.features.add('fixest');
    return result(`fixest::wald(${ctx.lastModel}, ${rString(rest, ctx)})`, 'heuristic', [diag(rec.line, 'warning', `${cmd} hypothesis syntax is preserved as text and may need rewriting to R coefficient names.`, rec.text)]);
  }
  if (cmd === 'estat') {
    return result(`# TODO: Stata estat ${rest}\nsummary(${ctx.lastModel})`, 'review', [diag(rec.line, 'review', 'estat subcommands are estimator-specific; use the corresponding R model diagnostic or package method.', rec.text)]);
  }
  return null;
}

function translateGraph(cmd, rest, options, ctx, rec) {
  const dt = ctx.currentData;
  if (cmd === 'histogram') {
    ctx.features.add('ggplot2');
    const x = cleanIdentifier(splitWords(rest)[0] || 'x');
    const density = hasOption(options, 'density') || hasOption(options, 'fraction');
    return result(`ggplot2::ggplot(${dt}, ggplot2::aes(x = ${x})) + ggplot2::geom_histogram(ggplot2::aes(y = ${density ? 'after_stat(density)' : 'after_stat(count)'}), bins = 30)${hasOption(options, 'normal') ? ` + ggplot2::stat_function(fun = stats::dnorm, args = list(mean = mean(${dt}$${x}, na.rm = TRUE), sd = sd(${dt}$${x}, na.rm = TRUE)))` : ''}`, 'heuristic', [diag(rec.line, 'warning', 'Histogram binning and graph styling were approximated; tune bins/binwidth and aesthetics.', rec.text)]);
  }
  if (cmd === 'kdensity') {
    ctx.features.add('ggplot2');
    const x = cleanIdentifier(splitWords(rest)[0] || 'x');
    return result(`ggplot2::ggplot(${dt}, ggplot2::aes(x = ${x})) + ggplot2::geom_density()`, 'heuristic');
  }
  if (cmd === 'scatter' || cmd === 'line') {
    ctx.features.add('ggplot2');
    const w = splitWords(rest); if (w.length < 2) return null;
    const y = cleanIdentifier(w[0], w[0]), x = cleanIdentifier(w[1], w[1]);
    return result(`ggplot2::ggplot(${dt}, ggplot2::aes(x = ${x}, y = ${y})) + ggplot2::${cmd === 'scatter' ? 'geom_point' : 'geom_line'}()`, 'heuristic');
  }
  if (cmd === 'twoway') {
    ctx.features.add('ggplot2');
    const scatter = rest.match(/\(?\s*scatter\s+([^\s\)]+)\s+([^\s\)]+)/i);
    if (scatter) {
      const y = cleanIdentifier(scatter[1], scatter[1]), x = cleanIdentifier(scatter[2], scatter[2]);
      let r = `ggplot2::ggplot(${dt}, ggplot2::aes(x = ${x}, y = ${y})) + ggplot2::geom_point()`;
      if (/\blfit\b/i.test(rest)) r += ' + ggplot2::geom_smooth(method = "lm", se = FALSE)';
      if (/\bconnected\b|\bline\b/i.test(rest)) r += ' + ggplot2::geom_line()';
      return result(r, 'heuristic', [diag(rec.line, 'warning', 'twoway layers were partially mapped to ggplot2; graph options, axes, legends, and uncommon plot types need manual styling.', rec.text)]);
    }
  }
  if (cmd === 'graph') {
    const words = splitWords(rest); const kind = (words.shift() || '').toLowerCase();
    if (kind === 'box') {
      ctx.features.add('ggplot2'); const y = cleanIdentifier(words[0] || 'y'); const over = optionValue(options, 'over');
      return result(`ggplot2::ggplot(${dt}, ggplot2::aes(x = ${over && over !== true ? `factor(${cleanIdentifier(over, over)})` : 'factor(1)'}, y = ${y})) + ggplot2::geom_boxplot()`, 'heuristic');
    }
    if (kind === 'bar') {
      ctx.features.add('ggplot2'); const over = optionValue(options, 'over');
      const y = cleanIdentifier(words.filter(x => !/^\(/.test(x))[0] || 'y');
      if (over && over !== true) {
        const g = cleanIdentifier(over, over);
        return result(`ggplot2::ggplot(${dt}[, .(value = mean(${y}, na.rm = TRUE)), by = ${g}], ggplot2::aes(x = ${g}, y = value)) + ggplot2::geom_col()`, 'heuristic');
      }
    }
  }
  return null;
}

function parseLabelPairs(text, ctx) {
  const m = text.match(/^([A-Za-z_]\w*)\s+(.+)$/);
  if (!m) return null;
  const name = cleanIdentifier(m[1]);
  const rest = m[2];
  const pairs = [];
  const re = /(-?\d+(?:\.\d+)?)\s+("(?:[^"]|"")*"|`"[\s\S]*?"')/g;
  let p;
  while ((p = re.exec(rest))) pairs.push({ value: p[1], label: unquoteStata(p[2]) });
  if (!pairs.length) return null;
  const vec = `c(${pairs.map(x => `"${escapeRString(x.label)}" = ${x.value}`).join(', ')})`;
  return { name, vec };
}

function translateDataUtility(cmd, rest, options, ctx, rec, by) {
  const dt = ctx.currentData;
  if (cmd === 'clear') return result(`${dt} <- data.table::data.table()`, 'heuristic', [diag(rec.line, 'info', 'clear was mapped to resetting the active data.table object.', rec.text)]);
  if (cmd === 'rename') {
    const gm = rest.match(/^\(([^)]*)\)\s*\(([^)]*)\)$/);
    if (gm) return result(`data.table::setnames(${dt}, old = ${varListExpr(gm[1], ctx)}, new = ${varListExpr(gm[2], ctx)})`, 'heuristic');
    const w = splitWords(rest); if (w.length >= 2) return result(`data.table::setnames(${dt}, ${rString(w[0], ctx)}, ${rString(w[1], ctx)})`, 'exact');
  }
  if (cmd === 'sort' || cmd === 'gsort') {
    const w = splitWords(rest);
    const cols = w.map(v => v.replace(/^[+-]/, ''));
    const order = w.map(v => v.startsWith('-') ? '-1L' : '1L');
    return result(`data.table::setorderv(${dt}, c(${cols.map(v => `"${escapeRString(v)}"`).join(', ')}), c(${order.join(', ')}))`, 'exact');
  }
  if (cmd === 'order') {
    const cols = varListExpr(rest, ctx);
    return result(`data.table::setcolorder(${dt}, c(${cols}, setdiff(names(${dt}), ${cols})))`, 'exact');
  }
  if (cmd === 'clonevar') {
    const m = rest.match(/^([^\s=]+)\s*=\s*([^\s]+)$/); if (m) return result(`${dt}[, ${rTargetName(m[1], ctx)} := ${rColumnRef(m[2], ctx)}]`, 'exact');
  }
  if (cmd === 'count') {
    const q = extractQualifiers(rest); const filter = rowFilter(q.ifExpr, q.inExpr, ctx);
    const expr = filter ? `nrow(${dt}[${filter}])` : `nrow(${dt})`;
    return result([`.__N <- ${expr}`, `.do2r_r <- list(N = .__N)`, '.__N'], 'exact');
  }
  if (cmd === 'assert') return result(`stopifnot(isTRUE(${dt}[, all(${translateExpression(rest, ctx, { context: 'generate' })})]))`, 'heuristic');
  if (cmd === 'isid') {
    const cols = varListExpr(rest, ctx);
    return result(`stopifnot(nrow(unique(${dt}[, .SD, .SDcols = ${cols}])) == nrow(${dt}))`, 'exact');
  }
  if (cmd === 'duplicates') {
    const w = splitWords(rest); const sub = (w.shift() || '').toLowerCase(); const vars = w.join(' ').replace(/,.*$/, '').trim(); const cols = varListExpr(vars, ctx);
    if (sub === 'drop') return result(`${dt} <- unique(${dt}, by = ${cols})`, 'heuristic', [diag(rec.line, 'warning', 'duplicates drop keeps the first R row in current order; confirm this matches the Stata ordering you intend.', rec.text)]);
    if (sub === 'tag') {
      const gen = optionValue(options, 'generate') || optionValue(options, 'gen');
      if (gen && gen !== true) return result(`${dt}[, ${rTargetName(gen, ctx)} := .N - 1L, by = ${cols}]`, 'exact');
    }
    if (sub === 'report' || sub === 'examples') return result(`${dt}[, .N, by = ${cols}][N > 1L][order(-N)]`, 'exact');
  }
  if (cmd === 'expand') {
    const q = extractQualifiers(rest); const times = translateExpression(q.core, ctx, { context: 'generate' });
    return result(`${dt} <- ${dt}[rep(seq_len(.N), times = ${times})]`, 'heuristic');
  }
  if (cmd === 'contract') {
    const freq = optionValue(options, 'freq') || '_freq';
    return result(`${dt} <- ${dt}[, .(${rTargetName(freq === true ? '_freq' : freq, ctx)} = .N), by = ${varListExpr(rest, ctx)}]`, 'exact');
  }
  if (cmd === 'sample') {
    const n = rest.trim();
    if (hasOption(options, 'count')) return result(`${dt} <- ${dt}[sample.int(.N, size = min(.N, ${translateExpression(n, ctx)}))]`, 'heuristic');
    return result(`${dt} <- ${dt}[sample.int(.N, size = floor(.N * ${translateExpression(n, ctx)} / 100))]`, 'heuristic');
  }
  if (cmd === 'describe') return result(`str(${dt})`, 'heuristic');
  if (cmd === 'codebook' || cmd === 'inspect') return result(`summary(${dt}${rest.trim() ? `[, .SD, .SDcols = ${varListExpr(rest, ctx)}]` : ''})`, 'heuristic');
  if (cmd === 'list') {
    const q = extractQualifiers(rest); const data = q.ifExpr || q.inExpr ? `${dt}[${rowFilter(q.ifExpr, q.inExpr, ctx)}]` : dt;
    return result(q.core ? `${data}[, .SD, .SDcols = ${varListExpr(q.core, ctx)}]` : data, 'exact');
  }
  if (cmd === 'recode') return translateRecode(rest, options, ctx, rec);
  if (cmd === 'encode') {
    const w = splitWords(rest); const src = cleanIdentifier(w[0] || 'x'); const gen = optionValue(options, 'generate') || optionValue(options, 'gen');
    if (gen && gen !== true) return result(`${dt}[, ${rTargetName(gen, ctx)} := as.integer(factor(${src}))]`, 'heuristic', [diag(rec.line, 'warning', 'encode factor codes depend on R level ordering; preserve/check Stata value labels explicitly.', rec.text)]);
  }
  if (cmd === 'decode') {
    const w = splitWords(rest); const src = cleanIdentifier(w[0] || 'x'); const gen = optionValue(options, 'generate') || optionValue(options, 'gen');
    ctx.features.add('haven');
    if (gen && gen !== true) return result(`${dt}[, ${rTargetName(gen, ctx)} := as.character(haven::as_factor(${src}))]`, 'heuristic');
  }
  if (cmd === 'destring' || cmd === 'tostring') {
    const q = extractQualifiers(rest); const cols = varListExpr(q.core, ctx); const replace = hasOption(options, 'replace'); const gen = optionValue(options, 'generate') || optionValue(options, 'gen');
    const conv = cmd === 'destring' ? 'as.numeric' : 'as.character';
    if (replace) return result(`${dt}[, (${cols}) := lapply(.SD, ${conv}), .SDcols = ${cols}]`, 'heuristic', [diag(rec.line, 'warning', `${cmd} ignore()/format()/force options may need manual handling.`, rec.text)]);
    if (gen && gen !== true && splitWords(q.core).length === 1) return result(`${dt}[, ${rTargetName(gen, ctx)} := ${conv}(${cleanIdentifier(q.core, q.core)})]`, 'heuristic');
  }
  if (cmd === 'label') {
    const words = splitWords(rest); const sub = (words.shift() || '').toLowerCase();
    if (sub === 'variable' || sub === 'var') {
      const v = cleanIdentifier(words.shift() || 'x'); const lab = words.join(' ');
      return result(`attr(${dt}$${v}, "label") <- ${rString(lab, ctx)}`, 'exact');
    }
    if (sub === 'define') {
      const parsed = parseLabelPairs(words.join(' '), ctx);
      if (parsed) { ctx.features.add('haven'); return result(`${parsed.name} <- ${parsed.vec}`, 'heuristic'); }
    }
    if (sub === 'values') {
      const v = cleanIdentifier(words[0] || 'x'); const labset = cleanIdentifier(words[1] || 'labels'); ctx.features.add('haven');
      return result(`${dt}[, ${v} := haven::labelled(${v}, labels = ${labset})]`, 'heuristic');
    }
  }
  if (cmd === 'format') return result(`# Stata display format preserved for review: format ${rest}`, 'heuristic', [diag(rec.line, 'info', 'Stata display formats are metadata/UI concepts; apply R formatting at presentation time if needed.', rec.text)]);
  return null;
}

function translateFrames(cmd, rest, options, ctx, rec) {
  if (cmd === 'frame') {
    const w = splitWords(rest); const sub = (w.shift() || '').toLowerCase();
    if (sub === 'create') {
      const name = cleanIdentifier(w[0] || 'frame'); ctx.frames.add(name); return result(`${name} <- data.table::data.table()`, 'exact');
    }
    if (sub === 'change') {
      const name = cleanIdentifier(w[0] || 'default');
      ctx.currentData = name === 'default' ? ctx.defaultData : name; ctx.frames.add(ctx.currentData);
      return result(`# Active R data.table is now: ${ctx.currentData}`, 'exact');
    }
    if (sub === 'copy') {
      const from = cleanIdentifier(w[0] || 'default'); const to = cleanIdentifier(w[1] || 'frame');
      const rFrom = from === 'default' ? ctx.defaultData : from; ctx.frames.add(to);
      return result(`${to} <- data.table::copy(${rFrom})`, 'exact');
    }
    if (sub === 'drop') return result(`rm(${w.map(cleanIdentifier).join(', ')})`, 'exact');
    if (sub === 'rename') {
      const a = cleanIdentifier(w[0] || 'old'), b = cleanIdentifier(w[1] || 'new'); return result(`${b} <- ${a}; rm(${a})`, 'heuristic');
    }
    if (sub === 'put') {
      const into = optionValue(options, 'into');
      if (into && into !== true) {
        const name = cleanIdentifier(into); ctx.frames.add(name);
        return result(`${name} <- data.table::copy(${ctx.currentData}[, .SD, .SDcols = ${varListExpr(w.join(' '), ctx)}])`, 'heuristic');
      }
    }
  }

  if (cmd === 'frlink') {
    if (/^(dir|describe|rebuild)\b/i.test(rest)) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
        [diag(rec.line, 'review', 'frlink dir/describe/rebuild management commands are not yet emulated; ordinary 1:1 and m:1 link creation is supported.', rec.text)]);
    }
    const m = rest.match(/^(1:1|m:1)\s+(.+)$/i);
    const frameOpt = optionValue(options, 'frame');
    if (!m || !frameOpt || frameOpt === true) return null;
    const type = m[1].toLowerCase();
    const keysCurrent = splitWords(m[2]).map(cleanIdentifier).filter(Boolean);
    const fw = splitWords(String(frameOpt));
    const frameName = cleanIdentifier(fw.shift() || 'frame');
    const keysTarget = fw.length ? fw.map(cleanIdentifier) : [...keysCurrent];
    if (!keysCurrent.length || keysCurrent.length !== keysTarget.length) {
      return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
        [diag(rec.line, 'review', 'frlink requires equal numbers of match variables in the current and linked frames.', rec.text)]);
    }
    const generated = optionValue(options, 'generate');
    const linkName = cleanIdentifier(generated && generated !== true ? generated : frameName);
    ctx.features.add('framelinks'); ctx.features.add('results');
    const kc = `c(${keysCurrent.map(x => `"${escapeRString(x)}"`).join(', ')})`;
    const kt = `c(${keysTarget.map(x => `"${escapeRString(x)}"`).join(', ')})`;
    return result([
      `${ctx.currentData} <- stata_frlink(${ctx.currentData}, ${frameName}, keys_current = ${kc}, keys_target = ${kt}, type = "${type}", link_name = "${escapeRString(linkName)}", target_name = "${escapeRString(frameName)}")`,
      `.do2r_r <- list(unmatched = sum(is.na(${ctx.currentData}[["${escapeRString(linkName)}"]])))`
    ], 'heuristic', [diag(rec.line, 'info', `frlink ${type} is represented by an integer target-row link plus link metadata. Unmatched rows retain NA links.`, rec.text)]);
  }

  if (cmd === 'frget') {
    const from = optionValue(options, 'from');
    if (!from || from === true) return null;
    ctx.features.add('framelinks'); ctx.features.add('results');
    const prefix = optionValue(options, 'prefix');
    const suffix = optionValue(options, 'suffix');
    const exclude = optionValue(options, 'exclude');
    return result([
      `.__frget <- stata_frget(${ctx.currentData}, from = ${rString(from, ctx)}, spec = ${rString(rest.trim() || '*', ctx)}, prefix = ${prefix && prefix !== true ? rString(prefix, ctx) : '""'}, suffix = ${suffix && suffix !== true ? rString(suffix, ctx) : '""'}, exclude = ${exclude && exclude !== true ? rString(exclude, ctx) : '""'})`,
      `${ctx.currentData} <- .__frget$data`,
      `.do2r_r <- .__frget$result`,
      `rm(.__frget)`
    ], 'heuristic', [diag(rec.line, 'info', 'frget copies variables through the integer frame link. Exact names, wildcards, new=old renames, prefix(), suffix(), and exclude() are supported.', rec.text)]);
  }

  if (cmd === 'fralias') {
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review',
      [diag(rec.line, 'review', 'fralias creates live alias variables. R data.table columns do not provide identical mutable cross-frame alias semantics; use frget for copied values.', rec.text)]);
  }
  return null;
}

function parseSyntaxOptionDescriptors(text) {
  const out = [];
  const src = String(text || '').trim();
  let i = 0;
  while (i < src.length) {
    while (i < src.length && /[\s,]/.test(src[i])) i += 1;
    if (i >= src.length) break;
    const m = src.slice(i).match(/^([A-Za-z][A-Za-z0-9_]*)/);
    if (!m) { i += 1; continue; }
    const rawName = m[1];
    i += rawName.length;
    while (i < src.length && /\s/.test(src[i])) i += 1;
    let descriptor = '';
    if (src[i] === '(') {
      let depth = 1; const begin = ++i;
      while (i < src.length && depth > 0) {
        if (src[i] === '(') depth += 1;
        else if (src[i] === ')') depth -= 1;
        i += 1;
      }
      descriptor = src.slice(begin, Math.max(begin, i - 1)).trim();
    }
    const upperPrefix = (rawName.match(/^[A-Z]+/) || [''])[0];
    out.push({
      rawName,
      name: rawName.toLowerCase(),
      min: (upperPrefix || rawName).toLowerCase(),
      descriptor
    });
  }
  return out;
}

function syntaxOptionR(spec, ctx) {
  const name = cleanIdentifier(spec.name);
  const d = spec.descriptor.trim();
  const dl = d.toLowerCase();
  let defaultExpr = 'NULL';
  let validation = [];
  let post = [];
  let macroTypeName = 'scalar';

  if (!d) {
    defaultExpr = 'FALSE';
    post.push(`${name} <- isTRUE(${name})`);
  } else if (/^cilevel\b/.test(dl)) {
    ctx.features.add('results');
    defaultExpr = `stata_c("level", ${ctx.currentData})`;
    validation.push(`is.numeric(${name})`, `length(${name}) == 1L`, `${name} > 0`, `${name} < 100`);
  } else if (/^crlevel\b/.test(dl)) {
    ctx.features.add('results');
    defaultExpr = `stata_c("clevel", ${ctx.currentData})`;
    validation.push(`is.numeric(${name})`, `length(${name}) == 1L`, `${name} > 0`, `${name} < 100`);
  } else if (/^integer\b/.test(dl)) {
    const def = d.match(/^integer\s+(.+)$/i);
    defaultExpr = def ? translateExpression(def[1], ctx) : 'NULL';
    validation.push(`is.null(${name}) || (is.numeric(${name}) && length(${name}) == 1L && !is.na(${name}) && ${name} == trunc(${name}))`);
  } else if (/^real\b/.test(dl)) {
    const def = d.match(/^real\s+(.+)$/i);
    defaultExpr = def ? translateExpression(def[1], ctx) : 'NULL';
    validation.push(`is.null(${name}) || (is.numeric(${name}) && length(${name}) == 1L && !is.na(${name}))`);
  } else if (/^(name|newvarname|varname)\b/.test(dl)) {
    validation.push(`is.null(${name}) || (is.character(${name}) && length(${name}) == 1L && grepl("^[A-Za-z_][A-Za-z0-9_]*$", ${name}))`);
    if (/^varname\b/.test(dl)) validation.push(`is.null(${name}) || ${name} %in% names(${ctx.currentData})`);
    if (/^newvarname\b/.test(dl)) validation.push(`is.null(${name}) || !(${name} %in% names(${ctx.currentData}))`);
    macroTypeName = /^varname\b/.test(dl) ? 'varname' : 'text';
  } else if (/^string\b/.test(dl)) {
    const def = d.match(/^string\s+(.+)$/i);
    defaultExpr = def ? rString(def[1], ctx) : 'NULL';
    validation.push(`is.null(${name}) || is.character(${name})`);
    macroTypeName = 'text';
  } else if (/^numlist\b/.test(dl)) {
    ctx.features.add('numlist');
    post.push(`${name} <- if (is.null(${name})) NULL else stata_numlist(as.character(${name}))`);
    if (/\binteger\b/i.test(d)) validation.push(`is.null(${name}) || all(${name} == trunc(${name}))`);
    const min = d.match(/\bmin\s*=\s*(\d+)/i); if (min) validation.push(`is.null(${name}) || length(${name}) >= ${min[1]}L`);
    const max = d.match(/\bmax\s*=\s*(\d+)/i); if (max) validation.push(`is.null(${name}) || length(${name}) <= ${max[1]}L`);
  }

  ctx.macros.set(spec.name, macroTypeName);
  const lines = [
    `${name} <- stata_option_get(.do2r_opts, "${escapeRString(spec.name)}", "${escapeRString(spec.min)}", default = ${defaultExpr}, flag = ${d ? 'FALSE' : 'TRUE'})`,
    ...post,
    ...validation.map(v => `stopifnot(${v})`),
    `stata_local_set(.do2r_local, "${escapeRString(spec.name)}", if (is.null(${name})) "" else ${name})`
  ];
  return lines;
}

function parseMacroDefinition(text) {
  const src = String(text || '').trimStart();
  if (!src) return null;
  let nameRaw = '';
  let pos = 0;

  if (src[0] === '`') {
    const end = findLocalMacroEnd(src, 0);
    if (end < 0) return null;
    nameRaw = src.slice(0, end + 1);
    pos = end + 1;
  } else if (src.startsWith('${')) {
    let depth = 1;
    let i = 2;
    for (; i < src.length; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) return null;
    nameRaw = src.slice(0, i + 1);
    pos = i + 1;
  } else if (src[0] === '$') {
    const m = src.match(/^\$[A-Za-z_]\w*/);
    if (!m) return null;
    nameRaw = m[0];
    pos = nameRaw.length;
  } else {
    const m = src.match(/^[A-Za-z_]\w*/);
    if (!m) return null;
    nameRaw = m[0];
    pos = nameRaw.length;
  }

  let tail = src.slice(pos).trimStart();
  let equals = false;
  if (tail.startsWith('=')) {
    equals = true;
    tail = tail.slice(1).trimStart();
  }
  return { nameRaw, equals, value: tail, dynamic: !/^[A-Za-z_]\w*$/.test(nameRaw) };
}

function macroAssignmentNameExpr(parsed, ctx) {
  if (!parsed.dynamic) return `"${escapeRString(parsed.nameRaw)}"`;
  ctx.features.add('macros');
  return `as.character(stata_macro_expand("${escapeRString(parsed.nameRaw)}", .do2r_local, data = ${ctx.currentData}))`;
}

function parseMacroEnname(raw) {
  const src = String(raw || '').trim();
  let m = src.match(/^\((local|global)\)\s+(.+)$/i);
  if (m) return { scope: m[1].toLowerCase(), name: m[2].trim() };
  return src ? { scope: 'local', name: src } : null;
}

function macroEnnameExpr(enname, ctx) {
  const name = String(enname?.name || '').trim();
  if (/^[A-Za-z0-9_*]+$/.test(name)) return `"${escapeRString(name)}"`;
  ctx.features.add('macros');
  return `as.character(stata_macro_expand("${escapeRString(name)}", .do2r_local, data = ${ctx.currentData}))`;
}

function macroEnnameRead(enname, ctx) {
  const name = macroEnnameExpr(enname, ctx);
  return enname?.scope === 'global' ? `stata_global_get(${name})` : `stata_local_get(.do2r_local, ${name})`;
}

function macroEnnameWrite(enname, value, ctx) {
  const name = macroEnnameExpr(enname, ctx);
  return enname?.scope === 'global' ? `stata_global_set(${name}, ${value})` : `stata_local_set(.do2r_local, ${name}, ${value})`;
}

function parseGettokenEnnames(lhs) {
  const out = [];
  const re = /\((?:local|global)\)\s+[^\s]+|[^\s]+/gi;
  for (const hit of String(lhs || '').matchAll(re)) out.push(parseMacroEnname(hit[0]));
  return out.filter(Boolean);
}

function translateProgramming(cmd, rest, options, ctx, rec) {
  if (cmd === 'tokenize') {
    ctx.features.add('macros');
    const parse = optionValue(options, 'parse');
    const source = rest.trim() ? rString(rest, ctx) : '""';
    const parseExpr = parse && parse !== true ? rString(parse, ctx) : '" "';
    const confidence = /[^\s]/.test(unquoteStata(parse && parse !== true ? parse : ' ')) ? 'heuristic' : 'exact';
    const diagnostics = confidence === 'heuristic'
      ? [diag(rec.line, 'info', 'tokenize parse() is emulated byte/character-wise: blanks delimit without becoming tokens, while nonblank parse characters are returned as tokens. Verify Unicode multibyte parsing if it matters.', rec.text)]
      : [];
    return result([
      `.__do2r_tokens <- stata_tokenize(${source}, parse = ${parseExpr})`,
      `stata_set_positional(.do2r_local, .__do2r_tokens)`,
      `rm(.__do2r_tokens)`
    ], confidence, diagnostics);
  }

  if (cmd === 'gettoken') {
    ctx.features.add('macros');
    const colon = rest.indexOf(':');
    if (colon < 0) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'gettoken requires destination macro(s), a colon, and a source macro.', rec.text)]);
    const dest = parseGettokenEnnames(rest.slice(0, colon));
    const source = parseMacroEnname(rest.slice(colon + 1));
    if (!source || dest.length < 1 || dest.length > 2) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'This gettoken enname form could not be parsed safely.', rec.text)]);
    const parse = optionValue(options, 'parse');
    const parseExpr = parse && parse !== true ? rString(parse, ctx) : '" "';
    const keepQuotes = hasOption(options, 'quotes');
    const qed = optionValue(options, 'qed');
    const match = optionValue(options, 'match');
    const bind = hasOption(options, 'bind');
    const lines = [
      `.__do2r_token <- stata_gettoken(${macroEnnameRead(source, ctx)}, parse = ${parseExpr}, keep_quotes = ${keepQuotes ? 'TRUE' : 'FALSE'}, match_paren = ${match && match !== true ? 'TRUE' : 'FALSE'}, bind = ${bind ? 'TRUE' : 'FALSE'})`,
      macroEnnameWrite(dest[0], '.__do2r_token$token', ctx)
    ];
    if (dest[1]) lines.push(macroEnnameWrite(dest[1], '.__do2r_token$rest', ctx));
    if (qed && qed !== true) lines.push(`stata_local_set(.do2r_local, "${escapeRString(cleanIdentifier(qed, qed))}", as.integer(.__do2r_token$quoted))`);
    if (match && match !== true) lines.push(`stata_local_set(.do2r_local, "${escapeRString(cleanIdentifier(match, match))}", if (.__do2r_token$matched) "(" else "")`);
    lines.push('rm(.__do2r_token)');
    return result(lines, (match || bind) ? 'heuristic' : 'exact', (match || bind) ? [diag(rec.line, 'warning', 'gettoken match()/bind are emulated for balanced parentheses/brackets and ordinary quoted strings; deeply nested compound-quote parsing should be validated.', rec.text)] : []);
  }

  if (cmd === 'levelsof') {
    const q = extractQualifiers(rest);
    const variable = cleanIdentifier(q.core, q.core);
    if (!variable) return null;
    const filter = rowFilter(q.ifExpr, q.inExpr, ctx);
    const data = filter ? `${ctx.currentData}[${filter}]` : ctx.currentData;
    const includeMissing = hasOption(options, 'missing');
    const sep = optionValue(options, 'separate');
    const local = optionValue(options, 'local');
    const lines = [
      `.__levels <- sort(unique(${data}[["${escapeRString(variable)}"]]), na.last = ${includeMissing ? 'TRUE' : 'NA'})`,
      `.do2r_r <- list(levels = paste(.__levels, collapse = ${sep && sep !== true ? rString(sep, ctx) : '" "'}))`
    ];
    if (local && local !== true) {
      ctx.features.add('macros');
      const name = cleanIdentifier(local); ctx.macros.set(name, 'text');
      lines.push(`${name} <- paste(.__levels, collapse = " ")`, `stata_local_set(.do2r_local, "${escapeRString(name)}", ${name})`);
    }
    lines.push('.__levels');
    return result(lines, 'heuristic', [diag(rec.line, 'warning', 'levelsof is represented as a sorted unique R vector; Stata quoting/clean display rules can differ.', rec.text)]);
  }
  if (cmd === 'unab') {
    const m = rest.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
    if (!m) return null;
    ctx.features.add('macros'); ctx.features.add('varlist');
    const name = cleanIdentifier(m[1]); ctx.macros.set(name, 'varlist');
    return result([`${name} <- stata_vars(${ctx.currentData}, ${rString(m[2], ctx)})`, `stata_local_set(.do2r_local, "${escapeRString(name)}", paste(${name}, collapse = " "))`], 'exact');
  }
  if (cmd === 'numlist') {
    ctx.features.add('numlist'); ctx.features.add('results');
    const spec = rest.trim();
    const source = /^(`"|")/.test(spec) ? rString(spec, ctx) : rString(unquoteStata(spec), ctx);
    const lines = [`.__numlist <- stata_numlist(${source})`, `.do2r_r <- list(numlist = paste(.__numlist, collapse = " "))`, '.__numlist'];
    return result(lines, options.trim() ? 'heuristic' : 'exact', options.trim() ? [diag(rec.line, 'warning', 'numlist options such as ascending were not fully reproduced; inspect the expanded R sequence.', rec.text)] : []);
  }
  if (cmd === 'confirm') {
    const w = splitWords(rest);
    const kind = (w.shift() || '').toLowerCase();
    if (kind === 'new' && /^var/i.test(w[0] || '')) { w.shift(); const v = unquoteStata(w.join(' ')); return result(`stopifnot(!(${rString(v, ctx)} %in% names(${ctx.currentData})))`, 'exact'); }
    if (/^var/i.test(kind) && w.length) {
      const v = unquoteStata(w.shift()); const checks = [`${rString(v, ctx)} %in% names(${ctx.currentData})`];
      if (/^num/i.test(w[0] || '')) checks.push(`is.numeric(${ctx.currentData}[[${rString(v, ctx)}]])`);
      if (/^str/i.test(w[0] || '')) checks.push(`is.character(${ctx.currentData}[[${rString(v, ctx)}]])`);
      return result(`stopifnot(${checks.join(', ')})`, 'exact');
    }
    if (kind === 'file' && w.length) return result(`stopifnot(file.exists(${rString(w.join(' '), ctx)}))`, 'exact');
    if (kind === 'number' && w.length) return result(`stopifnot(!is.na(suppressWarnings(as.numeric(${rString(w.join(' '), ctx)}))))`, 'heuristic');
    if (kind === 'integer' && w.length) return result(`stopifnot({ .__z <- suppressWarnings(as.numeric(${rString(w.join(' '), ctx)})); !is.na(.__z) && .__z == trunc(.__z) })`, 'heuristic');
    if (kind === 'name' && w.length) return result(`stopifnot(grepl("^[A-Za-z_][A-Za-z0-9_]*$", ${rString(w.join(' '), ctx)}))`, 'heuristic');
    if ((kind === 'scalar' || kind === 'matrix') && w.length) return result(`stopifnot(exists(${rString(w[0], ctx)}, inherits = TRUE))`, 'heuristic');
    return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'This confirm subtype is not yet mapped to an R assertion.', rec.text)]);
  }

  if (cmd === 'local' || cmd === 'global') {
    ctx.features.add('macros');
    const isGlobal = cmd === 'global';
    const inc = rest.match(/^(\+\+|--)([A-Za-z_]\w*)$/);
    if (inc) {
      const name = inc[2]; const delta = inc[1] === '++' ? '+ 1' : '- 1';
      if (isGlobal) return result(`stata_global_set("${escapeRString(name)}", as.numeric(stata_global_get("${escapeRString(name)}")) ${delta})`, 'heuristic');
      ctx.macros.set(name, 'scalar');
      return result([`${name} <- as.numeric(stata_local_get(.do2r_local, "${escapeRString(name)}")) ${delta}`, `stata_local_set(.do2r_local, "${escapeRString(name)}", ${name})`], 'heuristic');
    }

    const colon = rest.match(/^([A-Za-z_]\w*)\s*:\s*(.+)$/);
    if (colon) {
      const name = cleanIdentifier(colon[1]); const f = colon[2].trim();
      let rhs; let confidence = 'heuristic'; let valueType = 'text';
      if (/^word\s+\d+\s+of\s+/i.test(f)) {
        ctx.features.add('words'); const m = f.match(/^word\s+(\d+)\s+of\s+(.+)$/i); rhs = `stata_word(${translateExpression(m[2], ctx)}, ${m[1]})`;
      } else if (/^word count\s+/i.test(f)) {
        ctx.features.add('words'); valueType = 'scalar'; rhs = `stata_wordcount(${translateExpression(f.replace(/^word count\s+/i, ''), ctx)})`;
      } else if (/^(?:strlen|length|ustrlen|udstrlen)\s+(?:local|global)\s+[A-Za-z_]\w*$/i.test(f)) {
        const m = f.match(/^(strlen|length|ustrlen|udstrlen)\s+(local|global)\s+([A-Za-z_]\w*)$/i);
        const kind = m[1].toLowerCase(); const scope = m[2].toLowerCase(); const src = m[3];
        const getter = scope === 'global' ? `stata_global_get("${escapeRString(src)}")` : `stata_local_get(.do2r_local, "${escapeRString(src)}")`;
        const ntype = kind === 'strlen' ? 'bytes' : kind === 'udstrlen' ? 'width' : 'chars';
        valueType = 'scalar'; rhs = `nchar(as.character(${getter}), type = "${ntype}")`;
      } else if (/^copy\s+(?:local|global)\s+[A-Za-z_]\w*$/i.test(f)) {
        const m = f.match(/^copy\s+(local|global)\s+([A-Za-z_]\w*)$/i); const scope = m[1].toLowerCase(); const src = m[2];
        rhs = scope === 'global' ? `stata_global_get("${escapeRString(src)}")` : `stata_local_get(.do2r_local, "${escapeRString(src)}")`;
      } else if (/^subinstr\s+(?:local|global)\s+/i.test(f)) {
        const bits = splitWords(f);
        if (bits.length < 5 || !/^(?:local|global)$/i.test(bits[1]) || !/^[A-Za-z_]\w*$/.test(bits[2])) {
          return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'subinstr extended macro syntax could not be parsed safely.', rec.text)]);
        }
        ctx.features.add('macro_subinstr');
        const scope = bits[1].toLowerCase(); const src = bits[2];
        const getter = scope === 'global' ? `stata_global_get("${escapeRString(src)}")` : `stata_local_get(.do2r_local, "${escapeRString(src)}")`;
        const from = rString(bits[3], ctx); const to = rString(bits.slice(4).join(' '), ctx);
        const countRaw = optionValue(options, 'count');
        const countMatch = countRaw && countRaw !== true ? String(countRaw).trim().match(/^(local|global)\s+([A-Za-z_]\w*)$/i) : null;
        const lines = [`.__do2r_subinstr <- stata_macro_subinstr(${getter}, ${from}, ${to}, all = ${hasOption(options, 'all') ? 'TRUE' : 'FALSE'}, word = ${hasOption(options, 'word') ? 'TRUE' : 'FALSE'})`];
        if (isGlobal) lines.push(`stata_global_set("${escapeRString(name)}", .__do2r_subinstr$value)`);
        else { ctx.macros.set(name, 'text'); lines.push(`${name} <- .__do2r_subinstr$value`, `stata_local_set(.do2r_local, "${escapeRString(name)}", ${name})`); }
        if (countRaw && !countMatch) return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'subinstr count() must name a local or global macro in the currently supported mapping.', rec.text)]);
        if (countMatch) {
          const countScope = countMatch[1].toLowerCase(); const countName = cleanIdentifier(countMatch[2]);
          if (countScope === 'global') lines.push(`stata_global_set("${escapeRString(countName)}", .__do2r_subinstr$count)`);
          else { ctx.macros.set(countName, 'scalar'); lines.push(`${countName} <- .__do2r_subinstr$count`, `stata_local_set(.do2r_local, "${escapeRString(countName)}", ${countName})`); }
        }
        lines.push('rm(.__do2r_subinstr)');
        return result(lines, 'heuristic', [diag(rec.line, 'info', 'Extended macro subinstr was mapped with fixed-string replacement; word mode uses whitespace-delimited Stata-style tokens.', rec.text)]);
      } else if (/^list\s+/i.test(f)) rhs = rString(f.replace(/^list\s+/i, ''), ctx);
      else return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'This extended macro function needs a dedicated mapping.', rec.text)]);
      if (!isGlobal) ctx.macros.set(name, valueType);
      return isGlobal
        ? result(`stata_global_set("${escapeRString(name)}", ${rhs})`, confidence)
        : result([`${name} <- ${rhs}`, `stata_local_set(.do2r_local, "${escapeRString(name)}", ${name})`], confidence);
    }

    const parsed = parseMacroDefinition(rest);
    if (!parsed) return null;
    let value = parsed.value.trim();
    if (!value) value = '""';
    const rhs = parsed.equals ? translateExpression(value, ctx) : rString(value, ctx);
    const nameExpr = macroAssignmentNameExpr(parsed, ctx);

    if (isGlobal) {
      const shown = parsed.dynamic ? parsed.nameRaw : parsed.nameRaw;
      return result(`stata_global_set(${nameExpr}, ${rhs})`, 'heuristic',
        [diag(rec.line, 'info', `Stata global ${shown} is assigned in R's .GlobalEnv; local macros remain in a separate per-program/do-file environment.`, rec.text)]);
    }

    if (parsed.dynamic) {
      return result(`stata_local_set(.do2r_local, ${nameExpr}, ${rhs})`, 'heuristic',
        [diag(rec.line, 'info', 'Dynamic Stata local macro name is expanded first and assigned with assign() into the local macro environment.', rec.text)]);
    }

    const name = cleanIdentifier(parsed.nameRaw);
    ctx.macros.set(name, parsed.equals ? 'scalar' : 'text');
    return result([`${name} <- ${rhs}`, `stata_local_set(.do2r_local, "${escapeRString(name)}", ${name})`], 'heuristic');
  }

  if (cmd === 'macro') {
    ctx.features.add('macros');
    if (/^shift(?:\s+\d+)?$/i.test(rest.trim())) {
      const n = rest.trim().match(/^shift(?:\s+(\d+))?$/i)?.[1] || '1';
      return result(`stata_macro_shift(.do2r_local, ${n}L)`, 'exact');
    }
    if (/^drop\s+/i.test(rest)) {
      const names = splitWords(rest.replace(/^drop\s+/i, '')).map(cleanIdentifier);
      return result(names.map(n => `if (exists("${escapeRString(n)}", envir = .GlobalEnv, inherits = FALSE)) rm(list = "${escapeRString(n)}", envir = .GlobalEnv)`), 'heuristic', [diag(rec.line, 'info', 'macro drop is mapped to the global-macro namespace; local macro lifetime follows the translated R function/do-file environment.', rec.text)]);
    }
    if (/^list\b/i.test(rest) || /^dir\b/i.test(rest)) return result('as.list(.GlobalEnv)', 'heuristic', [diag(rec.line, 'warning', 'macro list/dir is approximated by inspecting .GlobalEnv; ordinary R objects share that environment with translated Stata globals.', rec.text)]);
  }

  if (cmd === 'tempfile') {
    ctx.features.add('macros');
    const names = splitWords(rest).map(cleanIdentifier); names.forEach(n => ctx.macros.set(n, 'text'));
    return result(names.flatMap(n => [`${n} <- tempfile(fileext = ".dta")`, `stata_local_set(.do2r_local, "${escapeRString(n)}", ${n})`]), 'heuristic');
  }
  if (cmd === 'tempvar' || cmd === 'tempname') {
    ctx.features.add('macros');
    const names = splitWords(rest).map(cleanIdentifier); names.forEach(n => ctx.macros.set(n, cmd === 'tempvar' ? 'varname' : 'text'));
    return result(names.flatMap(n => [`${n} <- paste0(".__${n}_", sample.int(1e9, 1L))`, `stata_local_set(.do2r_local, "${escapeRString(n)}", ${n})`]), 'heuristic');
  }
  if (cmd === 'scalar') {
    const m = rest.match(/^([^=\s]+)\s*=\s*(.+)$/); if (m) return result(`${cleanIdentifier(m[1])} <- ${translateExpression(m[2], ctx)}`, 'exact');
  }
  if (cmd === 'matrix') {
    const m = rest.match(/^([^=\s]+)\s*=\s*(.+)$/); if (m) return result(`${cleanIdentifier(m[1])} <- ${translateExpression(m[2], ctx)}`, 'heuristic');
  }

  if (cmd === 'program') {
    const m = rest.match(/^(?:define\s+)?([A-Za-z_]\w*)/i); if (!m) return null;
    ctx.features.add('macros'); ctx.features.add('results');
    const name = cleanIdentifier(m[1]);
    ctx.stack.push({ type: 'program', close: ['  return(result)', '}'] }); ctx.indent += 1;
    return result([
      `${name} <- function(${ctx.defaultData}, varlist = NULL, subset = NULL, rows = NULL, ...) {`,
      `${'  '.repeat(ctx.indent)}${ctx.currentData} <- data.table::copy(${ctx.defaultData})`,
      `${'  '.repeat(ctx.indent)}.do2r_local <- new.env(parent = emptyenv())`,
      `${'  '.repeat(ctx.indent)}.do2r_r <- list(); .do2r_e <- list(); .do2r_s <- list()`,
      `${'  '.repeat(ctx.indent)}do2r_subset <- if (is.null(subset)) rep(TRUE, nrow(${ctx.currentData})) else subset`,
      `${'  '.repeat(ctx.indent)}do2r_rows <- if (is.null(rows)) seq_len(nrow(${ctx.currentData})) else rows`,
      `${'  '.repeat(ctx.indent)}result <- list()`
    ], 'heuristic', [diag(rec.line, 'warning', 'ado programs are represented as R functions. syntax declarations below add stopifnot() contracts and option defaults, but command-line parsing and return codes are not identical to Stata.', rec.text)], { preindented: true });
  }

  if (cmd === 'syntax') {
    ctx.features.add('macros'); ctx.features.add('syntax');
    const lines = [`# Stata syntax: ${rest}${options ? `, ${options}` : ''}`];
    const varlist = rest.match(/(\[)?\bvarlist(?:\(([^)]*)\))?(\])?/i);
    if (varlist) {
      ctx.macros.set('varlist', 'varlist');
      const optional = Boolean(varlist[1] || varlist[3]);
      const rules = varlist[2] || '';
      const min = rules.match(/\bmin\s*=\s*(\d+)/i);
      const max = rules.match(/\bmax\s*=\s*(\d+)/i);
      if (!optional) lines.push('stopifnot(!is.null(varlist))');
      else lines.push('if (is.null(varlist)) varlist <- character()');
      lines.push(`stopifnot(is.character(varlist), all(varlist %in% names(${ctx.currentData})))`);
      if (min) lines.push(`stopifnot(length(varlist) >= ${min[1]}L)`);
      if (max) lines.push(`stopifnot(length(varlist) <= ${max[1]}L)`);
      if (/\bnumeric\b/i.test(rules)) lines.push(`stopifnot(all(vapply(${ctx.currentData}[, .SD, .SDcols = varlist], is.numeric, logical(1L))))`);
      lines.push('stata_local_set(.do2r_local, "varlist", paste(varlist, collapse = " "))');
    }
    if (/\[if\]/i.test(rest)) {
      ctx.macros.set('if', 'ifqual');
      lines.push(`stopifnot(length(do2r_subset) == nrow(${ctx.currentData}), is.logical(do2r_subset), !anyNA(do2r_subset))`);
      lines.push('stata_local_set(.do2r_local, "if", if (is.null(subset)) "" else "<R subset>")');
    }
    if (/\[in\]/i.test(rest)) {
      ctx.macros.set('in', 'inqual');
      lines.push(`stopifnot(is.numeric(do2r_rows), all(do2r_rows == trunc(do2r_rows)), all(do2r_rows >= 1L & do2r_rows <= nrow(${ctx.currentData})))`);
      lines.push('stata_local_set(.do2r_local, "in", if (is.null(rows)) "" else "<R rows>")');
    }

    const specs = parseSyntaxOptionDescriptors(options);
    if (specs.length) {
      lines.push('.do2r_opts <- list(...)');
      lines.push('if (length(.do2r_opts) && is.null(names(.do2r_opts))) stop("Translated Stata options must be named R arguments", call. = FALSE)');
      for (const spec of specs) lines.push(...syntaxOptionR(spec, ctx));
    }
    if (!varlist && !/\[if\]|\[in\]/i.test(rest) && !specs.length) lines.push('# No translatable syntax contract was detected.');
    return result(lines, 'heuristic', [diag(rec.line, 'info', 'syntax was converted into R argument extraction plus stopifnot() validation. Option names may use the Stata minimum abbreviation encoded by capitalization.', rec.text)]);
  }

  if (cmd === 'args') {
    ctx.features.add('macros');
    const args = splitWords(rest).map(cleanIdentifier); args.forEach(a => ctx.macros.set(a, 'scalar'));
    return result(args.flatMap((a, i) => [`${a} <- list(...)[[${i + 1}L]]`, `stata_local_set(.do2r_local, "${escapeRString(a)}", ${a})`]), 'heuristic', [diag(rec.line, 'warning', 'Stata args was mapped to positional values in ...; for a public R API, move these into explicit function parameters.', rec.text)]);
  }

  if (cmd === 'return' || cmd === 'ereturn' || cmd === 'sreturn') {
    ctx.features.add('results');
    const ns = cmd === 'return' ? '.do2r_r' : cmd === 'ereturn' ? '.do2r_e' : '.do2r_s';
    if (/^list$/i.test(rest)) return result(ns, 'exact');
    if (/^clear$/i.test(rest)) return result([`${ns} <- list()`, 'result <- list()'], 'exact');
    const m = rest.match(/^(scalar|local|matrix)\s+([A-Za-z_]\w*)\s*(?:=\s*)?(.+)$/i);
    if (m) {
      const kind = m[1].toLowerCase(); const name = cleanIdentifier(m[2]);
      if (cmd === 'sreturn' && kind !== 'local') return result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', 'sreturn stores macros; scalar/matrix sreturn is not valid Stata semantics.', rec.text)]);
      const value = kind === 'local' ? rString(m[3], ctx) : translateExpression(m[3], ctx);
      return result([`${ns}[["${escapeRString(name)}"]] <- ${value}`, `result[["${escapeRString(name)}"]] <- ${ns}[["${escapeRString(name)}"]]`], 'heuristic');
    }
  }
  if (cmd === 'creturn') {
    ctx.features.add('results');
    if (/^list$/i.test(rest)) return result(`stata_c_list(${ctx.currentData})`, 'heuristic', [diag(rec.line, 'info', 'c() is read-only in Stata. do2R exposes a portable subset of c-class settings and stops on unknown c() names rather than inventing values.', rec.text)]);
  }

  if (cmd === 'display') return result(`cat(${translateExpression(rest, ctx)}, "\\n")`, 'heuristic');
  if (cmd === 'version') return result(`# Stata version ${rest.trim()} compatibility requested`, 'exact');
  if (cmd === 'which' || cmd === 'help' || cmd === 'about') return result(`# Stata environment command omitted: ${cmd} ${rest}`, 'heuristic');
  if (cmd === 'do' || cmd === 'run' || cmd === 'include') return result(`source(${rString(rest, ctx)})`, 'heuristic', [diag(rec.line, 'warning', `${cmd} assumes the referenced Stata file has also been translated to R.`, rec.text)]);
  return null;
}

function translateControl(text, ctx, rec) {
  const trimmed = text.trim();
  if (/^continue\s*,\s*break$/i.test(trimmed)) return result('break', 'exact');
  if (/^continue$/i.test(trimmed)) return result('next', 'exact');
  if (trimmed === '}') {
    const frame = ctx.stack.pop();
    ctx.indent = Math.max(0, ctx.indent - 1);
    if (!frame) return result('}', 'review', [diag(rec.line, 'review', 'Unmatched closing brace.', rec.text)]);
    return result(frame.close || '}', 'exact', [], { closing: true });
  }
  if (/^}\s*else\s*{/i.test(trimmed)) {
    ctx.indent = Math.max(0, ctx.indent - 1);
    const line = '} else {';
    ctx.indent += 1;
    return result(line, 'exact', [], { rawIndent: true });
  }
  let m = trimmed.match(/^foreach\s+([A-Za-z_]\w*)\s+of\s+(varlist|newlist|numlist|local|global)\s+(.+?)\s*\{$/i);
  if (m) {
    const name = cleanIdentifier(m[1]); const kind = m[2].toLowerCase(); const spec = m[3].trim();
    let seq;
    if (kind === 'varlist' || kind === 'newlist') { ctx.macros.set(name, 'varname'); seq = varListExpr(spec, ctx); }
    else if (kind === 'numlist') { ctx.macros.set(name, 'scalar'); ctx.features.add('numlist'); seq = `stata_numlist(${rString(spec, ctx)})`; }
    else { ctx.macros.set(name, 'scalar'); seq = cleanIdentifier(spec); }
    ctx.stack.push({ type: 'loop', close: '}' }); ctx.indent += 1;
    return result(`for (${name} in ${seq}) {`, 'heuristic', [diag(rec.line, 'info', 'foreach was kept as an R for-loop because translated commands may mutate the active data.table or rebind it.', rec.text)], { opened: true });
  }
  m = trimmed.match(/^foreach\s+([A-Za-z_]\w*)\s+in\s+(.+?)\s*\{$/i);
  if (m) {
    const name = cleanIdentifier(m[1]); ctx.macros.set(name, 'scalar');
    const vals = splitWords(m[2]).map(v => /^"|^`"/.test(v) ? rString(v, ctx) : translateExpression(v, ctx));
    ctx.stack.push({ type: 'loop', close: '}' }); ctx.indent += 1;
    return result(`for (${name} in c(${vals.join(', ')})) {`, 'heuristic', [], { opened: true });
  }
  m = trimmed.match(/^forvalues\s+([A-Za-z_]\w*)\s*=\s*(.+?)\s*\{$/i);
  if (m) {
    const name = cleanIdentifier(m[1]); ctx.macros.set(name, 'scalar'); ctx.features.add('numlist');
    ctx.stack.push({ type: 'loop', close: '}' }); ctx.indent += 1;
    return result(`for (${name} in stata_numlist(${rString(m[2], ctx)})) {`, 'heuristic', [], { opened: true });
  }
  m = trimmed.match(/^while\s+(.+?)\s*\{$/i);
  if (m) { ctx.stack.push({ type: 'while', close: '}' }); ctx.indent += 1; return result(`while (${translateExpression(m[1], ctx)}) {`, 'exact', [], { opened: true }); }
  m = trimmed.match(/^if\s+(.+?)\s*\{$/i);
  if (m) { ctx.stack.push({ type: 'if', close: '}' }); ctx.indent += 1; return result(`if (${translateExpression(m[1], ctx)}) {`, 'heuristic', [diag(rec.line, 'warning', 'Programming if was mapped to scalar R if(); confirm the expression is scalar rather than observation-wise.', rec.text)], { opened: true }); }
  m = trimmed.match(/^else\s+if\s+(.+?)\s*\{$/i);
  if (m) { ctx.stack.push({ type: 'if', close: '}' }); ctx.indent += 1; return result(`else if (${translateExpression(m[1], ctx)}) {`, 'heuristic', [], { opened: true }); }
  if (/^else\s*\{$/i.test(trimmed)) { ctx.stack.push({ type: 'else', close: '}' }); ctx.indent += 1; return result('else {', 'exact', [], { opened: true }); }
  if (/^continue\b/i.test(trimmed)) return result('next', 'exact');
  if (/^break\b/i.test(trimmed)) return result('break', 'exact');
  return null;
}

function translateMataMatrixLiteral(rhs, ctx) {
  const s = String(rhs || '').trim();
  if (!(s.startsWith('(') && s.endsWith(')'))) return translateMataExpression(s, ctx);
  const inner = s.slice(1, -1);
  let depth = 0, quote = false, rows = [''], row = 0;
  for (let i = 0; i < inner.length; i += 1) {
    const c = inner[i];
    if (c === '"') quote = !quote;
    if (!quote && c === '(') depth += 1;
    else if (!quote && c === ')') depth -= 1;
    if (!quote && depth === 0 && c === '\\') { rows.push(''); row += 1; }
    else rows[row] += c;
  }
  const parsed = rows.map(r => splitArgs(r).map(x => translateMataExpression(x, ctx)));
  if (parsed.length > 1) return `rbind(${parsed.map(r => `c(${r.join(', ')})`).join(', ')})`;
  if (parsed[0].length > 1) return `c(${parsed[0].join(', ')})`;
  return `(${parsed[0][0] || ''})`;
}

function mataVarType(ctx, name) { return ctx.mataTypes.get(name) || 'unknown'; }

function inferMataType(rhs, ctx) {
  const x = rhs.trim();
  if (/^[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?i?$/.test(x) || /^"/.test(x)) return 'scalar';
  if (/\b(rows|cols|length|det|trace|sum|mean|max|min)\s*\(/.test(x)) return 'scalar';
  if (/\b(I|J|diag|diagonal|invsym|inv|solve|cross|crossprod|st_data|st_view|svd|qr|cholesky)\s*\(/i.test(x)) return 'matrix';
  if (/^\(.*[\\,].*\)$/.test(x)) return 'matrix';
  if (/%\*%/.test(x)) return 'matrix';
  return 'unknown';
}

function translateMataExpression(expr, ctx) {
  let x = String(expr || '').trim().replace(/;\s*$/, '');
  const ps = protectStrings(x, ctx); x = ps.text;
  x = x.replace(/(?<!\w)\.(?!\w)/g, 'NA');
  x = x.replace(/\b(\d+)::(\d+)\b/g, 'seq.int($1, $2)');
  x = x.replace(/\b(\d+)\.\.(\d+)\b/g, 'seq.int($1, $2)');
  x = x.replace(/:([+\-*\/^])/g, '$1');

  // Common implicit transpose-products such as X'X and X'y.
  x = x.replace(/\b([A-Za-z_]\w*)'\s*([A-Za-z_]\w*)\b/g, (_, a, b) => `crossprod(${a}, ${b})`);
  x = x.replace(/\b([A-Za-z_]\w*)'(?=\s|$|[\)\],+\-*\/])/g, 't($1)');
  x = x.replace(/\b([A-Za-z_]\w*)\[\|\s*([^,]+),\s*([^\\]+)\\\s*([^,]+),\s*([^|]+)\|\]/g, (_, a, r1, c1, r2, c2) => `${a}[seq.int(${r1.trim()}, ${r2.trim()}), seq.int(${c1.trim()}, ${c2.trim()})]`);

  if (/\bmean\s*\(/.test(x)) ctx.features.add('mata_mean');
  x = x.replace(/\bmean\s*\(/g, 'mata_mean(')
       .replace(/\bvariance\s*\(/g, 'stats::cov(')
       .replace(/\bcorrelation\s*\(/g, 'stats::cor(')
       .replace(/\binvsym\s*\(/g, 'solve(')
       .replace(/\binv\s*\(/g, 'solve(')
       .replace(/\bdiagonal\s*\(/g, 'diag(')
       .replace(/\btrace\s*\(([^()]+)\)/g, 'sum(diag($1))')
       .replace(/\brows\s*\(/g, 'nrow(')
       .replace(/\bcols\s*\(/g, 'ncol(')
       .replace(/\browsum\s*\(/g, 'rowSums(')
       .replace(/\bcolsum\s*\(/g, 'colSums(')
       .replace(/\browmean\s*\(/g, 'rowMeans(')
       .replace(/\bcolmean\s*\(/g, 'colMeans(')
       .replace(/\bI\s*\(([^()]*)\)/g, 'diag($1)')
       .replace(/\bJ\s*\(([^,]+),\s*([^,]+),\s*([^\)]+)\)/g, 'matrix($3, nrow = $1, ncol = $2)');

  // Replace explicit multiplications when operand types are known to be nonscalar.
  x = x.replace(/\b([A-Za-z_]\w*)\s*\*\s*([A-Za-z_]\w*)\b/g, (all, a, b) => {
    const ta = mataVarType(ctx, a), tb = mataVarType(ctx, b);
    if (ta === 'matrix' && tb === 'matrix') return `${a} %*% ${b}`;
    if (ta === 'scalar' || tb === 'scalar') return all;
    return all;
  });
  // Matrix-valued function calls are unambiguous operands.
  x = x.replace(/(solve\([^()]+\)|crossprod\([^()]+\)|t\([^()]+\))\s*\*\s*(solve\([^()]+\)|crossprod\([^()]+\)|t\([^()]+\))/g, '$1 %*% $2');
  x = x.replace(/\b([A-Za-z_]\w*)\s*\*\s*(solve\([^()]+\)|crossprod\([^()]+\)|t\([^()]+\))/g, (all, a, b) => mataVarType(ctx, a) === 'scalar' ? all : `${a} %*% ${b}`);
  x = x.replace(/(solve\([^()]+\)|crossprod\([^()]+\)|t\([^()]+\))\s*\*\s*\b([A-Za-z_]\w*)/g, (all, a, b) => mataVarType(ctx, b) === 'scalar' ? all : `${a} %*% ${b}`);
  x = x.replace(/\[\s*NA\s*,/g, '[,').replace(/,\s*NA\s*\]/g, ', ]');
  x = ps.restore(x);
  return x;
}

function translateMataLine(text, ctx, rec) {
  const t = text.trim().replace(/;\s*$/, '');
  if (!t) return result('', 'exact', [], { statement: false });
  if (/^\/\//.test(t) || /^\*/.test(t)) return result(`# ${t.replace(/^\/\/|^\*/, '').trim()}`, 'exact', [], { statement: false });
  if (/^end\s*$/i.test(t)) {
    ctx.mata = false;
    return result('# ---- end Mata translation ----', 'exact', [], { statement: false, mataEnd: true });
  }
  if (/^(class|struct)\b/i.test(t) || /->|&[A-Za-z_]\w*/.test(t)) {
    return result(`# TODO [Mata line ${rec.line}]: ${t}`, 'review', [diag(rec.line, 'review', 'Mata classes, structs, or pointer semantics need a manual R design.', rec.text)]);
  }

  const control = translateMataControl(t, ctx, rec);
  if (control) return control;

  let m = t.match(/^function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s+return\s*\((.*)\)$/i);
  if (m) {
    const args = splitArgs(m[2]).map(a => cleanIdentifier(a.replace(/^(?:real|string|complex|transmorphic)\s+(?:scalar|vector|rowvector|colvector|matrix)\s+/i, '').trim()));
    return result(`${cleanIdentifier(m[1])} <- function(${args.join(', ')}) ${translateMataExpression(m[3], ctx)}`, 'heuristic');
  }

  m = t.match(/^(?:(real|string|complex|transmorphic|void)\s+)?(?:(scalar|vector|rowvector|colvector|matrix)\s+)?([A-Za-z_]\w*)\s*\((.*)\)\s*\{$/i);
  if (m && (m[1] || m[2])) {
    const name = cleanIdentifier(m[3]);
    const args = splitArgs(m[4]).filter(Boolean).map(a => cleanIdentifier(a.replace(/^(?:real|string|complex|transmorphic)\s+(?:scalar|vector|rowvector|colvector|matrix)\s+/i, '').trim()));
    ctx.stack.push({ type: 'mata-fn', close: '}' }); ctx.indent += 1;
    return result(`${name} <- function(${args.join(', ')}) {`, 'heuristic', [diag(rec.line, 'info', 'Mata argument/return storage types are not enforced in R.', rec.text)], { opened: true });
  }

  // st_view(out=., ., ("x","y"))
  m = t.match(/^st_view\s*\(\s*([A-Za-z_]\w*)\s*=\s*\.\s*,\s*\.\s*,\s*(.+)\)$/i);
  if (m) {
    const name = cleanIdentifier(m[1]);
    const colsRaw = m[2].trim();
    let cols;
    if (/^\(.*\)$/.test(colsRaw)) cols = translateMataMatrixLiteral(colsRaw, ctx);
    else cols = translateMataExpression(colsRaw, ctx);
    ctx.mataTypes.set(name, 'matrix');
    return result(`${name} <- as.matrix(${ctx.currentData}[, .SD, .SDcols = ${cols}])`, 'heuristic', [diag(rec.line, 'warning', 'Mata st_view() is a live view into Stata data; this R matrix is a copy, so later matrix assignment will not mutate the data.table automatically.', rec.text)]);
  }
  m = t.match(/^st_data\s*\(\s*\.\s*,\s*(.+)\)$/i);
  if (m) return result(`as.matrix(${ctx.currentData}[, .SD, .SDcols = ${translateMataMatrixLiteral(m[1], ctx)}])`, 'heuristic');
  m = t.match(/^st_store\s*\(\s*\.\s*,\s*("[^"]+"|`".*"')\s*,\s*(.+)\)$/i);
  if (m) return result(`${ctx.currentData}[, ${rTargetName(unquoteStata(m[1]), ctx)} := as.vector(${translateMataExpression(m[2], ctx)})]`, 'heuristic');

  m = t.match(/^return\s*\((.*)\)$/i);
  if (m) return result(`return(${translateMataExpression(m[1], ctx)})`, 'exact');

  m = t.match(/^(?:(real|string|complex|transmorphic)\s+(scalar|vector|rowvector|colvector|matrix)\s+)?([A-Za-z_]\w*)\s*=\s*(.+)$/i);
  if (m) {
    const declared = m[2] ? (m[2].toLowerCase() === 'scalar' ? 'scalar' : 'matrix') : '';
    const name = cleanIdentifier(m[3]);
    const rhsRaw = m[4].trim();
    let rhs;
    if (/^\(.*\)$/.test(rhsRaw) && /[\\,]/.test(rhsRaw)) rhs = translateMataMatrixLiteral(rhsRaw, ctx);
    else {
      const joinedCols = splitTopLevel(rhsRaw, ',');
      if (joinedCols[1]) rhs = `cbind(${translateMataExpression(joinedCols[0], ctx)}, ${translateMataExpression(joinedCols[1], ctx)})`;
      else {
        let depth = 0, quote = false, slash = -1;
        for (let i = 0; i < rhsRaw.length; i += 1) { const c = rhsRaw[i]; if (c === '"') quote = !quote; if (!quote && (c === '(' || c === '[')) depth += 1; else if (!quote && (c === ')' || c === ']')) depth -= 1; else if (!quote && depth === 0 && c === '\\') { slash = i; break; } }
        rhs = slash >= 0 ? `rbind(${translateMataExpression(rhsRaw.slice(0, slash), ctx)}, ${translateMataExpression(rhsRaw.slice(slash + 1), ctx)})` : translateMataExpression(rhsRaw, ctx);
      }
    }
    ctx.mataTypes.set(name, declared || inferMataType(rhsRaw, ctx));
    let confidence = 'heuristic';
    const ds = [];
    if (/\*/.test(rhsRaw) && !/:\*/.test(rhsRaw) && /\b[A-Za-z_]\w*\s*\*\s*[A-Za-z_]\w*/.test(rhsRaw)) {
      const pair = rhsRaw.match(/\b([A-Za-z_]\w*)\s*\*\s*([A-Za-z_]\w*)/);
      if (pair && mataVarType(ctx, pair[1]) === 'unknown' && mataVarType(ctx, pair[2]) === 'unknown') {
        const d = diag(rec.line, ctx.options.strictMode ? 'review' : 'warning', 'Mata * may mean matrix multiplication or scalar multiplication. Type inference was inconclusive, so inspect this operator.', rec.text);
        if (ctx.options.strictMode) return result(`# TODO [Mata line ${rec.line}]: ambiguous * operator\n# Candidate after review: ${name} <- ${rhs}`, 'review', [d]);
        ds.push(d);
      }
    }
    return result(`${name} <- ${rhs}`, confidence, ds);
  }

  // Bare typed declaration.
  m = t.match(/^(real|string|complex|transmorphic)\s+(scalar|vector|rowvector|colvector|matrix)\s+([A-Za-z_]\w*)$/i);
  if (m) { const name = cleanIdentifier(m[3]); ctx.mataTypes.set(name, m[2].toLowerCase() === 'scalar' ? 'scalar' : 'matrix'); return result(`${name} <- NULL`, 'heuristic'); }

  // Common expression statement: preserve as translated R expression.
  if (/^[A-Za-z_]\w*\s*\(.*\)$/.test(t) || /^[A-Za-z_]\w*$/.test(t)) return result(translateMataExpression(t, ctx), 'heuristic');
  return result(`# TODO [Mata line ${rec.line}]: ${t}`, 'review', [diag(rec.line, 'review', 'Mata statement was not recognized safely.', rec.text)]);
}

function translateMataControl(t, ctx, rec) {
  if (t === '}') {
    const frame = ctx.stack.pop(); ctx.indent = Math.max(0, ctx.indent - 1);
    return result(frame?.close || '}', frame ? 'exact' : 'review', frame ? [] : [diag(rec.line, 'review', 'Unmatched Mata closing brace.', rec.text)], { closing: true });
  }
  if (/^}\s*else\s*{$/.test(t)) { ctx.indent = Math.max(0, ctx.indent - 1); ctx.indent += 1; return result('} else {', 'exact', [], { rawIndent: true }); }
  let m = t.match(/^if\s*\((.*)\)\s*\{$/i);
  if (m) { ctx.stack.push({ type: 'mata-if', close: '}' }); ctx.indent += 1; return result(`if (${translateMataExpression(m[1], ctx)}) {`, 'exact', [], { opened: true }); }
  m = t.match(/^while\s*\((.*)\)\s*\{$/i);
  if (m) { ctx.stack.push({ type: 'mata-while', close: '}' }); ctx.indent += 1; return result(`while (${translateMataExpression(m[1], ctx)}) {`, 'exact', [], { opened: true }); }
  m = t.match(/^for\s*\(\s*([A-Za-z_]\w*)\s*=\s*([^;]+);\s*\1\s*<=\s*([^;]+);\s*\1\+\+\s*\)\s*\{$/i);
  if (m) { ctx.stack.push({ type: 'mata-for', close: '}' }); ctx.indent += 1; return result(`for (${cleanIdentifier(m[1])} in seq.int(${translateMataExpression(m[2], ctx)}, ${translateMataExpression(m[3], ctx)})) {`, 'heuristic', [], { opened: true }); }
  return null;
}

function translateStataLine(text, ctx, rec) {
  let t = text.trim();
  if (!t) return result('', 'exact', [], { statement: false });
  if (/^\*/.test(t)) return result(`# ${t.replace(/^\*+\s?/, '')}`, 'exact', [], { statement: false });
  if (/^\/\//.test(t)) return result(`# ${t.replace(/^\/\/+\s?/, '')}`, 'exact', [], { statement: false });
  if (/^#/.test(t)) return result(`# ${t}`, 'heuristic', [], { statement: false });

  if (ctx.inputMode) return translateInputLine(t, ctx, rec);

  if (ctx.pythonMode) {
    if (/^end\s*$/i.test(t)) {
      ctx.pythonMode = false;
      ctx.features.add('reticulate');
      const code = ctx.pythonBuffer.join('\n');
      const ds = [];
      if (/\b(?:from\s+sfi\s+import|import\s+sfi\b)/m.test(code)) {
        ds.push(diag(ctx.pythonStartLine, 'review', 'The Python block uses Stata sfi. reticulate can execute the Python source, but sfi.Data/Macro/Frame/Scalar/Matrix calls need explicit R↔Python bridge translation.', code));
      } else {
        ds.push(diag(ctx.pythonStartLine, 'info', 'Embedded Python is executed with reticulate::py_run_string(). Python environment/configuration can differ from Stata PyStata integration.', code));
      }
      const out = result(`reticulate::py_run_string("${escapeRString(code)}")`, ds.some(d => d.level === 'review') ? 'review' : 'heuristic', ds, {
        sourceStart: ctx.pythonStartLine,
        sourceEnd: rec.endLine || rec.line
      });
      ctx.pythonBuffer = [];
      return out;
    }
    ctx.pythonBuffer.push(text);
    return result('', 'exact', [], { statement: false, map: false });
  }

  if (/^python\s*:?\s*$/i.test(t)) {
    ctx.pythonMode = true;
    ctx.pythonStartLine = rec.line;
    ctx.pythonBuffer = [];
    ctx.features.add('reticulate');
    return result('', 'exact', [], { statement: false, map: false });
  }

  if (/^python\s+script\s+/i.test(t)) {
    ctx.features.add('reticulate');
    const file = t.replace(/^python\s+script\s+/i, '').trim();
    return result(`reticulate::py_run_file(${rString(file, ctx)})`, 'heuristic', [diag(rec.line, 'info', 'python script was mapped to reticulate::py_run_file(); Stata sfi interactions inside the script still require adaptation.', rec.text)]);
  }
  if (/^python\s+query\b/i.test(t)) {
    ctx.features.add('reticulate');
    return result('reticulate::py_config()', 'heuristic');
  }

  if (macroType(ctx, 'if') === 'ifqual') t = t.replace(/`if'/gi, 'if .DO2R_IF');
  if (macroType(ctx, 'in') === 'inqual') t = t.replace(/`in'/gi, 'in .DO2R_IN');

  const control = translateControl(t, ctx, rec);
  if (control) return control;

  if (/^mata\s*:?[\s,]*(clear)?\s*$/i.test(t)) {
    ctx.mata = true; ctx.mataTypes.clear();
    return result('# ---- Mata block translated to R ----', 'exact', [], { statement: false, mataStart: true });
  }
  if (/^end\s*$/i.test(t)) {
    if (ctx.stack.length && ctx.stack[ctx.stack.length - 1].type === 'program') {
      const frame = ctx.stack.pop(); ctx.indent = Math.max(0, ctx.indent - 1);
      return result(frame.close, 'heuristic', [], { closing: true });
    }
    return result(`# Stata end`, 'review', [diag(rec.line, 'review', 'Unmatched Stata end; check whether it closes a program, Mata block, or input block.', rec.text)]);
  }

  let by = '';
  const bp = parseByPrefix(t);
  const preLines = [];
  if (bp) {
    by = bp.by; t = bp.body;
    if (bp.sort) {
      const sortSpec = [bp.by, bp.sortWithin].filter(Boolean).join(' ');
      const sw = splitWords(sortSpec); const cols = sw.map(v => v.replace(/^[+-]/, '')); const ord = sw.map(v => v.startsWith('-') ? '-1L' : '1L');
      preLines.push(`data.table::setorderv(${ctx.currentData}, c(${cols.map(v => `"${escapeRString(v)}"`).join(', ')}), c(${ord.join(', ')}))`);
    }
  }

  let capture = false, quiet = false;
  let changed = true;
  while (changed) {
    changed = false;
    if (/^(capture|cap)\s+/i.test(t)) { capture = true; t = t.replace(/^(capture|cap)\s+/i, ''); changed = true; }
    if (/^(quietly|qui)\s+/i.test(t)) { quiet = true; t = t.replace(/^(quietly|qui)\s+/i, ''); changed = true; }
    if (/^(noisily|noi)\s+/i.test(t)) { t = t.replace(/^(noisily|noi)\s+/i, ''); changed = true; }
  }

  const repeated = translateResamplingPrefix(t, ctx, rec);
  if (repeated) {
    if (preLines.length) repeated.lines = [...preLines, ...repeated.lines];
    return repeated;
  }

  if (/^statsby\b/i.test(t)) {
    const sr = translateStatsbyPrefix(t, ctx, rec);
    if (sr) {
      if (preLines.length) sr.lines = [...preLines, ...sr.lines];
      if (quiet && !sr.lines.every(x => /^\s*#/.test(x))) sr.diagnostics.push(diag(rec.line, 'info', 'quietly/noisily affects display, not core computation.', rec.text));
      if (capture) {
        const inner = sr.lines.map(x => `  ${x}`).join('\n');
        sr.lines = [`try({\n${inner}\n}, silent = TRUE)`];
        if (sr.confidence === 'exact') sr.confidence = 'heuristic';
        sr.diagnostics.push(diag(rec.line, 'warning', 'capture was mapped to try(..., silent=TRUE); Stata return-code logic via _rc may need explicit R error handling.', rec.text));
      }
      return sr;
    }
  }

  if (/^svy\b[\s\S]*:/i.test(t)) {
    const sr = translateSurveyPrefix(t, ctx, rec);
    if (sr) {
      if (preLines.length) sr.lines = [...preLines, ...sr.lines];
      if (quiet && !sr.lines.every(x => /^\s*#/.test(x))) sr.diagnostics.push(diag(rec.line, 'info', 'quietly/noisily affects display, not core computation.', rec.text));
      if (capture) {
        const inner = sr.lines.map(x => `  ${x}`).join('\n');
        sr.lines = [`try({\n${inner}\n}, silent = TRUE)`];
        if (sr.confidence === 'exact') sr.confidence = 'heuristic';
        sr.diagnostics.push(diag(rec.line, 'warning', 'capture was mapped to try(..., silent=TRUE); Stata return-code logic via _rc may need explicit R error handling.', rec.text));
      }
      return sr;
    }
  }

  const [main, options] = splitStataOptions(t);
  const firstSpace = main.search(/\s/);
  const rawCmd = firstSpace < 0 ? main : main.slice(0, firstSpace);
  const cmd = normalizeCommand(rawCmd);
  const rest = firstSpace < 0 ? '' : main.slice(firstSpace + 1).trim();

  let r = null;
  if (cmd === 'input') {
    const cols = parseInputSchema(rest);
    if (cols) { ctx.inputMode = { cols }; r = result('.__do2r_input_rows <- list()', 'heuristic', [diag(rec.line, 'info', 'input block translation supports ordinary typed variable declarations and row literals; _skip(), multiline quoted fields, and advanced input syntax remain for review.', rec.text)]); }
  }
  else if (cmd === 'generate' || cmd === 'replace') r = translateGenerate(`${cmd} ${rest}`, options, ctx, rec, by);
  else if (cmd === 'egen') r = translateEgen(`egen ${rest}`, options, ctx, rec, by);
  else if (cmd === 'keep' || cmd === 'drop') r = translateKeepDrop(cmd, rest, ctx, rec, by);
  else if (['use','save','import','export','insheet','outsheet'].includes(cmd)) r = translateIO(cmd, rest, options, ctx, rec);
  else if (cmd === 'putexcel') r = translatePutExcel(rest, options, ctx, rec);
  else if (['table','dtable','etable','collect'].includes(cmd)) r = translateReporting(cmd, rest, options, ctx, rec);
  else if (cmd === 'merge') r = translateMerge(rest, options, ctx, rec);
  else if (cmd === 'append') {
    const path = parseUsingPath(rest); ctx.features.add('haven');
    r = result(`${ctx.currentData} <- data.table::rbindlist(list(${ctx.currentData}, data.table::as.data.table(haven::read_dta(${rString(path, ctx)}))), use.names = TRUE, fill = TRUE)`, 'heuristic', [diag(rec.line, 'warning', 'append was mapped to rbindlist(fill=TRUE); verify variable types, labels, and force/nolabel semantics.', rec.text)]);
  }
  else if (cmd === 'reshape') r = translateReshape(rest, options, ctx, rec);
  else if (cmd === 'collapse') r = translateCollapse(rest, options, ctx, rec);
  else if (cmd === 'fvset' || cmd === 'fvrevar') r = translateFactorProgramming(cmd, rest, options, ctx, rec);
  else if (cmd === 'svyset') r = translateSvyset(rest, options, ctx, rec);
  else if (['stset','stcox','streg','sts','stsum','stcurve'].includes(cmd)) r = translateSurvival(cmd, rest, options, ctx, rec);
  else if (['mixed','meglm','melogit','meprobit','mecloglog','meologit','meoprobit','mepoisson','menbreg'].includes(cmd)) r = translateMixedModel(cmd, rest, options, ctx, rec);
  else if (['tsfill','tsappend','tssmooth','tsfilter'].includes(cmd)) r = translateTimeSeriesUtility(cmd, rest, options, ctx, rec);
  else if (['arima','dfuller','corrgram','var','varsoc','vargranger','varlmar','varnorm','varstable','vec','vecrank','irf'].includes(cmd)) r = translateTimeSeriesModel(cmd, rest, options, ctx, rec);
  else if (['cross','joinby','fillin','split','separate','stack','xpose','range','insobs','ipolate','pctile','_pctile','xtile','mvencode','mvdecode','assertnested','ds','lookfor','compare','recast','compress','copy','rmdir','type','sysuse','webuse'].includes(cmd)) r = translateExtraData(cmd, rest, options, ctx, rec, by);
  else if (['xtlogit','xtprobit','xtpoisson','xtologit','xtoprobit','xtgee'].includes(cmd)) r = translatePanelModel(cmd, rest, options, ctx, rec);
  else if (['regress','areg','xtreg','logit','probit','poisson','nbreg','qreg','tobit','ologit','oprobit','mlogit','clogit'].includes(cmd)) r = translateModel(cmd, rest, options, ctx, rec);
  else if (cmd === 'ivregress') r = translateIv(rest, options, ctx, rec);
  else if (cmd === 'glm') {
    const core = parseModelCore(rest, ctx); const model = nextModel(ctx); const family = optionValue(options, 'family') || 'gaussian'; const link = optionValue(options, 'link') || 'identity';
    r = result(`${model} <- stats::glm(${core.dep} ~ ${formulaTerms(core.rhs, ctx)}, data = ${modelDataExpr(ctx, core.subset)}, family = stats::${cleanIdentifier(family, family)}(link = "${escapeRString(link)}")${core.weight ? `, weights = ${core.weight}` : ''})`, 'heuristic', [diag(rec.line, 'warning', 'glm family/link were mapped to R glm(); verify Stata-specific family parameters, dispersion, scale, and VCE.', rec.text)]);
  }
  else if (['summarize','tabulate','tabstat','correlate','pwcorr'].includes(cmd)) r = translateSummaries(cmd, rest, options, ctx, rec);
  else if (['ttest','ranksum','oneway','anova'].includes(cmd)) r = translateTests(cmd, rest, options, ctx, rec);
  else if (['predict','margins','marginsplot','lincom','nlcom','test','testnl','estat','estimates'].includes(cmd)) r = translatePostestimation(cmd, rest, options, ctx, rec);
  else if (['histogram','kdensity','scatter','line','twoway','graph'].includes(cmd)) r = translateGraph(cmd, rest, options, ctx, rec);
  else if (['clear','rename','sort','gsort','order','clonevar','count','assert','isid','duplicates','expand','contract','sample','describe','codebook','inspect','list','recode','encode','decode','destring','tostring','label','format'].includes(cmd)) r = translateDataUtility(cmd, rest, options, ctx, rec, by);
  else if (['frame','frget','frlink','fralias'].includes(cmd)) r = translateFrames(cmd, rest, options, ctx, rec);
  else if (['local','global','macro','tokenize','gettoken','tempfile','tempvar','tempname','scalar','matrix','program','syntax','args','return','ereturn','sreturn','creturn','display','version','which','help','about','do','run','include','levelsof','unab','numlist','confirm'].includes(cmd)) r = translateProgramming(cmd, rest, options, ctx, rec);
  else if (cmd === 'preserve') {
    ctx.preserveCounter += 1; const name = `.__preserved_${ctx.preserveCounter}`; ctx.preserveStack.push(name); r = result(`${name} <- data.table::copy(${ctx.currentData})`, 'exact');
  }
  else if (cmd === 'restore') {
    const name = ctx.preserveStack.pop(); r = name ? result([`${ctx.currentData} <- ${name}`, `rm(${name})`], 'exact') : result('# TODO: restore without matching preserve', 'review', [diag(rec.line, 'review', 'restore has no matching preserve in the parsed source.', rec.text)]);
  }
  else if (cmd === 'xtset' || cmd === 'tsset') {
    const w = splitWords(rest);
    const deltaRaw = optionValue(options, 'delta');
    const delta = deltaRaw && deltaRaw !== true && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(deltaRaw).trim()) ? translateExpression(String(deltaRaw), ctx) : '1';
    if (cmd === 'tsset' && w.length === 1) ctx.panel = { id: '', time: cleanIdentifier(w[0] || ''), delta };
    else ctx.panel = { id: cleanIdentifier(w[0] || ''), time: cleanIdentifier(w[1] || ''), delta };
    const cols = [ctx.panel.id, ctx.panel.time].filter(Boolean);
    const ds = [diag(rec.line, 'info', `${cmd} metadata is used by translated lag/lead/difference operators and panel/time-series models; R has no identical global declaration.`, rec.text)];
    if (deltaRaw && deltaRaw !== true && delta === '1') ds.push(diag(rec.line, 'warning', `delta(${deltaRaw}) is not a simple numeric spacing, so do2R records a unit delta and leaves calendar/unit-aware gap checks for review.`, rec.text));
    r = result(cols.length ? `data.table::setorderv(${ctx.currentData}, c(${cols.map(v => `"${escapeRString(v)}"`).join(', ')})) # ${cmd}: panel/time metadata recorded by do2R` : `# ${cmd} ${rest}`, 'heuristic', ds);
  }
  else if (cmd === 'set' && /^obs\s+/i.test(rest)) {
    ctx.features.add('obs');
    const n = rest.replace(/^obs\s+/i, '').trim();
    r = result(`${ctx.currentData} <- stata_set_obs(${ctx.currentData}, ${translateExpression(n, ctx)})`, 'heuristic', [diag(rec.line, 'info', 'set obs was mapped to row extension; an internal sentinel column is removed after the next generated variable when starting from empty data.', rec.text)]);
  }
  else if (cmd === 'set' && /^seed\s+/i.test(rest)) r = result(`set.seed(${translateExpression(rest.replace(/^seed\s+/i, ''), ctx)})`, 'heuristic', [diag(rec.line, 'warning', 'R and Stata use different RNG algorithms, so identical seeds do not imply identical random draws.', rec.text)]);
  else if (cmd === 'set' && /^level\s+/i.test(rest)) {
    ctx.features.add('results');
    const level = translateExpression(rest.replace(/^level\s+/i, ''), ctx);
    r = result([`stopifnot(${level} > 0, ${level} < 100)`, `assign(".do2r_c_level", ${level}, envir = .GlobalEnv)`], 'heuristic', [diag(rec.line, 'info', 'set level is stored in .GlobalEnv so later translated c(level) and syntax (...cilevel...) defaults see the updated value.', rec.text)]);
  }
  else if (cmd === 'set' && /^more\s+off/i.test(rest)) r = result('# set more off is unnecessary in noninteractive R scripts', 'exact');
  else if (cmd === 'cd') r = result(`setwd(${rString(rest, ctx)})`, 'heuristic', [diag(rec.line, 'info', 'For reproducible R projects, relative paths or here/rprojroot are often preferable to setwd().', rec.text)]);
  else if (cmd === 'pwd') r = result('getwd()', 'exact');
  else if (cmd === 'mkdir') r = result(`dir.create(${rString(rest, ctx)}, recursive = TRUE, showWarnings = FALSE)`, 'exact');
  else if (cmd === 'erase' || cmd === 'rm') r = result(`file.remove(${rString(rest, ctx)})`, 'exact');

  if (!r) {
    r = result(`# TODO [Stata line ${rec.line}]: ${rec.text.trim()}`, 'review', [diag(rec.line, 'review', `Command “${rawCmd}” is not translated safely. It may be community-contributed or require command-specific semantics.`, rec.text)]);
  }

  const eClassCommands = new Set(['regress','areg','xtreg','xtlogit','xtprobit','xtpoisson','xtgee','logit','probit','poisson','nbreg','qreg','tobit','ologit','oprobit','mlogit','clogit','ivregress','glm','mixed','meglm','melogit','meprobit','mecloglog','meologit','meoprobit','mepoisson','menbreg','arima','stcox','streg']);
  if (eClassCommands.has(cmd) && ctx.lastModel && r.confidence !== 'review') {
    ctx.features.add('results');
    r.lines = [...r.lines, `.do2r_e <- stata_e_from_model(${ctx.lastModel}, cmd = "${escapeRString(cmd)}")`];
  }

  if (preLines.length) r.lines = [...preLines, ...r.lines];
  if (quiet && !r.lines.every(x => /^\s*#/.test(x))) r.diagnostics.push(diag(rec.line, 'info', 'quietly/noisily affects display, not core computation; the translated R statement is left unsuppressed unless it naturally assigns its result.', rec.text));
  if (capture) {
    const inner = r.lines.map(x => `  ${x}`).join('\n');
    r.lines = [`try({\n${inner}\n}, silent = TRUE)`];
    if (r.confidence === 'exact') r.confidence = 'heuristic';
    r.diagnostics.push(diag(rec.line, 'warning', 'capture was mapped to try(..., silent=TRUE); Stata return-code logic via _rc may need explicit R error handling.', rec.text));
  }
  return r;
}

function rScanTopLevel(text, wanted) {
  const hits = [];
  let round = 0, square = 0, curly = 0;
  let quote = '', escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') round += 1;
    else if (c === ')') round -= 1;
    else if (c === '[') square += 1;
    else if (c === ']') square -= 1;
    else if (c === '{') curly += 1;
    else if (c === '}') curly -= 1;
    if (round === 0 && square === 0 && curly === 0 && wanted(text, i)) hits.push(i);
  }
  return hits;
}

function rOperatorLayout(line, width = 108, depth = 0) {
  const text = String(line ?? '');
  if (text.length <= width || depth > 8) return [text];
  for (const op of [' + ', ' & ', ' | ', ' |> ']) {
    const hits = rScanTopLevel(text, (s, i) => s.startsWith(op, i));
    if (!hits.length) continue;
    const parts = [];
    let start = 0;
    for (const i of hits) { parts.push(text.slice(start, i).trimEnd()); start = i + op.length; }
    parts.push(text.slice(start).trim());
    if (parts.length < 2 || parts.some(x => !x)) continue;
    const leading = text.match(/^\s*/)?.[0] || '';
    const continuation = `${leading}  `;
    return parts.map((part, i) => `${i ? continuation : ''}${part}${i < parts.length - 1 ? op.trimEnd() : ''}`);
  }
  return [text];
}

function rBracketLayout(line, width = 108, depth = 0) {
  const text = String(line ?? '');
  if (text.length <= width || depth > 8 || !text.trimEnd().endsWith(']')) return [text];
  let quote = '', escaped = false, round = 0, square = 0, curly = 0;
  let open = -1, close = -1;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') round += 1;
    else if (c === ')') round -= 1;
    else if (c === '{') curly += 1;
    else if (c === '}') curly -= 1;
    else if (c === '[') {
      if (square === 0 && round === 0 && curly === 0 && open < 0) open = i;
      square += 1;
    } else if (c === ']') {
      square -= 1;
      if (square === 0 && open >= 0) { close = i; break; }
    }
  }
  if (open < 0 || close !== text.trimEnd().length - 1) return [text];

  const body = text.slice(open + 1, close);
  const parts = [];
  let start = 0;
  quote = ''; escaped = false; round = 0; square = 0; curly = 0;
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') round += 1;
    else if (c === ')') round -= 1;
    else if (c === '[') square += 1;
    else if (c === ']') square -= 1;
    else if (c === '{') curly += 1;
    else if (c === '}') curly -= 1;
    else if (c === ',' && round === 0 && square === 0 && curly === 0) {
      parts.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(body.slice(start).trim());
  if (parts.length < 2) return [text];

  const base = text.slice(0, open).trimEnd();
  const leading = text.match(/^\s*/)?.[0] || '';
  const inner = `${leading}  `;
  const baseLines = base.length > width ? rPrettyLayout(base, width, depth + 1) : [base];
  const out = [...baseLines];
  const first = parts.shift();
  if (first) {
    out[out.length - 1] += '[';
    const f = rPrettyLayout(`${inner}${first}`, width, depth + 1);
    if (f.length) f[f.length - 1] += ',';
    out.push(...f);
  } else {
    out[out.length - 1] += '[,';
  }
  parts.forEach((part, i) => {
    const rows = rPrettyLayout(`${inner}${part}`, width, depth + 1);
    if (i < parts.length - 1 && rows.length) rows[rows.length - 1] += ',';
    out.push(...rows);
  });
  out.push(`${leading}]`);
  return out;
}

function rCallLayout(line, width = 108, depthLevel = 0) {
  const text = String(line ?? '');
  if (text.length <= width || !text.trim() || /^\s*#/.test(text) || text.includes('\n') || depthLevel > 8) return [text];

  let open = -1;
  let quote = '';
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') { open = i; break; }
  }
  if (open < 0) return [text];

  let depth = 0;
  quote = '';
  escaped = false;
  let close = -1;
  for (let i = open; i < text.length; i += 1) {
    const c = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) { close = i; break; }
    }
  }
  if (close < 0 || text.slice(close + 1).trim()) return [text];

  const body = text.slice(open + 1, close);
  const args = [];
  let start = 0;
  depth = 0; quote = ''; escaped = false;
  let square = 0, curly = 0;
  for (let i = 0; i < body.length; i += 1) {
    const c = body[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') depth -= 1;
    else if (c === '[') square += 1;
    else if (c === ']') square -= 1;
    else if (c === '{') curly += 1;
    else if (c === '}') curly -= 1;
    else if (c === ',' && depth === 0 && square === 0 && curly === 0) { args.push(body.slice(start, i).trim()); start = i + 1; }
  }
  args.push(body.slice(start).trim());
  if (args.length < 2 || args.some(x => !x)) return [text];

  const leading = text.match(/^\s*/)?.[0] || '';
  const continuation = `${leading}  `;
  const out = [`${text.slice(0, open + 1).trimEnd()}`];
  args.forEach((arg, i) => {
    const nested = rPrettyLayout(`${continuation}${arg}`, width, depthLevel + 1);
    if (i < args.length - 1 && nested.length) nested[nested.length - 1] += ',';
    out.push(...nested);
  });
  out.push(`${leading})`);
  return out;
}

function rPrettyLayout(line, width = 108, depth = 0) {
  const text = String(line ?? '');
  if (text.length <= width || !text.trim() || /^\s*#/.test(text) || depth > 8) return [text];
  const bracket = rBracketLayout(text, width, depth);
  if (bracket.length > 1) return bracket;
  const call = rCallLayout(text, width, depth);
  if (call.length > 1) return call;
  const ops = rOperatorLayout(text, width, depth);
  if (ops.length > 1) return ops.flatMap(x => x.length > width ? rCallLayout(x, width, depth + 1) : [x]);
  return [text];
}

function formatRLines(lines, width = 108) {
  return (Array.isArray(lines) ? lines : [lines])
    .flatMap(line => String(line ?? '').split('\n'))
    .flatMap(line => rPrettyLayout(line, width));
}

function indentLines(lines, level, meta = {}) {
  const pad = '  '.repeat(level);
  if (meta.preindented) return lines;
  if (meta.rawIndent) return lines.map(x => `${'  '.repeat(Math.max(0, level - 1))}${x}`);
  return lines.map(x => x === '' ? '' : `${pad}${x}`);
}

function helperBlocks(features, dataName) {
  const blocks = [];
  if (features.has('macros')) blocks.push(`if (!exists(".do2r_local", inherits = FALSE)) .do2r_local <- new.env(parent = emptyenv())
stata_local_set <- function(env, name, value) {
  assign(as.character(name), value, envir = env)
  invisible(value)
}
stata_local_get <- function(env, name) get0(as.character(name), envir = env, inherits = FALSE, ifnotfound = "")
stata_global_set <- function(name, value) {
  assign(as.character(name), value, envir = .GlobalEnv)
  invisible(value)
}
stata_global_get <- function(name) get0(as.character(name), envir = .GlobalEnv, inherits = FALSE, ifnotfound = "")
stata_macro_expand <- function(text, local_env = .do2r_local, data = NULL, max_passes = 100L) {
  caller <- parent.frame()
  lookup_local <- function(name) {
    m <- regexec("^([res])\\\\(([^)]+)\\\\)$", name, ignore.case = TRUE)
    hit <- regmatches(name, m)[[1L]]
    if (length(hit)) {
      obj <- get0(paste0(".do2r_", tolower(hit[2L])), envir = caller, inherits = TRUE, ifnotfound = list())
      value <- obj[[hit[3L]]]
      return(if (is.null(value)) "" else value)
    }
    cm <- regexec("^c\\\\(([^)]+)\\\\)$", name, ignore.case = TRUE)
    chit <- regmatches(name, cm)[[1L]]
    if (length(chit) && exists("stata_c", mode = "function")) return(stata_c(chit[2L], data))
    stata_local_get(local_env, name)
  }
  expand_one <- function(z) {
    delayed_local <- ".__DO2R_DELAY_LOCAL__"
    delayed_global <- ".__DO2R_DELAY_GLOBAL__"
    z <- gsub(paste0("\\\\", intToUtf8(96L)), delayed_local, z, fixed = TRUE)
    z <- gsub("\\\\$", delayed_global, z, fixed = TRUE)
    replace_match <- function(z, m, value) paste0(substr(z, 1L, m[1L] - 1L), as.character(value), substr(z, m[1L] + attr(m, "match.length"), nchar(z)))
    for (pass in seq_len(max_passes)) {
      old <- z
      repeat {
        m <- regexpr("\x60[^\x60']*'", z, perl = TRUE)
        if (m[1L] < 0L) break
        token <- substr(z, m[1L], m[1L] + attr(m, "match.length") - 1L)
        name <- substr(token, 2L, nchar(token) - 1L)
        z <- replace_match(z, m, lookup_local(name))
      }
      repeat {
        m <- regexpr("\\\\$\\\\{[^{}]+\\\\}", z, perl = TRUE)
        if (m[1L] < 0L) break
        token <- substr(z, m[1L], m[1L] + attr(m, "match.length") - 1L)
        name <- substr(token, 3L, nchar(token) - 1L)
        name <- expand_one(name)
        z <- replace_match(z, m, stata_global_get(name))
      }
      repeat {
        m <- regexpr("\\\\$[A-Za-z_][A-Za-z0-9_]*", z, perl = TRUE)
        if (m[1L] < 0L) break
        token <- substr(z, m[1L], m[1L] + attr(m, "match.length") - 1L)
        z <- replace_match(z, m, stata_global_get(substr(token, 2L, nchar(token))))
      }
      if (identical(z, old)) break
    }
    z <- gsub(delayed_local, intToUtf8(96L), z, fixed = TRUE)
    z <- gsub(delayed_global, "$", z, fixed = TRUE)
    z
  }
  vapply(as.character(text), expand_one, character(1L), USE.NAMES = FALSE)
}

stata_gettoken <- function(text, parse = " ", keep_quotes = FALSE, match_paren = FALSE, bind = FALSE) {
  z <- as.character(if (is.null(text)) "" else text)[1L]
  parse <- as.character(if (is.null(parse)) " " else parse)[1L]
  chars <- strsplit(parse, "", fixed = TRUE)[[1L]]
  space_parse <- " " %in% chars
  nonspace <- setdiff(chars, " ")
  n <- nchar(z, type = "chars")
  ch <- function(i) if (i < 1L || i > n) "" else substr(z, i, i)
  is_delim <- function(c) (space_parse && grepl("\\\\s", c, perl = TRUE)) || c %in% nonspace
  skip_space <- function(i) { while (i <= n && space_parse && grepl("\\\\s", ch(i), perl = TRUE)) i <- i + 1L; i }
  i <- skip_space(1L)
  if (i > n) return(list(token = "", rest = "", quoted = FALSE, matched = FALSE))

  if (ch(i) == '"') {
    j <- i + 1L
    while (j <= n && ch(j) != '"') j <- j + 1L
    stop_at <- min(j, n)
    raw <- substr(z, i, stop_at)
    token <- if (keep_quotes) raw else if (nchar(raw) >= 2L) substr(raw, 2L, nchar(raw) - 1L) else ""
    k <- skip_space(stop_at + 1L)
    return(list(token = token, rest = if (k <= n) substr(z, k, n) else "", quoted = TRUE, matched = FALSE))
  }

  if (match_paren && ch(i) == "(") {
    depth <- 0L; quote <- FALSE; j <- i
    while (j <= n) {
      cj <- ch(j)
      if (cj == '"') quote <- !quote
      if (!quote && cj == "(") depth <- depth + 1L
      if (!quote && cj == ")") { depth <- depth - 1L; if (depth == 0L) break }
      j <- j + 1L
    }
    if (j <= n && depth == 0L) {
      token <- substr(z, i + 1L, j - 1L)
      k <- skip_space(j + 1L)
      return(list(token = token, rest = if (k <= n) substr(z, k, n) else "", quoted = FALSE, matched = TRUE))
    }
  }

  if (ch(i) %in% nonspace) {
    token <- ch(i)
    consume <- 1L
    if (token == "=" && ch(i + 1L) == "=") { token <- "=="; consume <- 2L }
    k <- skip_space(i + consume)
    return(list(token = token, rest = if (k <= n) substr(z, k, n) else "", quoted = FALSE, matched = FALSE))
  }

  depth_paren <- 0L; depth_bracket <- 0L; quote <- FALSE; j <- i
  while (j <= n) {
    cj <- ch(j)
    if (cj == '"') quote <- !quote
    if (!quote && bind && cj == "(") depth_paren <- depth_paren + 1L
    if (!quote && bind && cj == ")" && depth_paren > 0L) depth_paren <- depth_paren - 1L
    if (!quote && bind && cj == "[") depth_bracket <- depth_bracket + 1L
    if (!quote && bind && cj == "]" && depth_bracket > 0L) depth_bracket <- depth_bracket - 1L
    if (!quote && depth_paren == 0L && depth_bracket == 0L && is_delim(cj)) break
    j <- j + 1L
  }
  token <- if (j > i) substr(z, i, j - 1L) else ""
  if (j > n) return(list(token = token, rest = "", quoted = FALSE, matched = FALSE))
  if (space_parse && grepl("\\\\s", ch(j), perl = TRUE)) {
    k <- skip_space(j)
    rest <- if (k <= n) substr(z, k, n) else ""
  } else rest <- substr(z, j, n)
  list(token = token, rest = rest, quoted = FALSE, matched = FALSE)
}

stata_tokenize <- function(text, parse = " ") {
  rest <- as.character(if (is.null(text)) "" else text)[1L]
  out <- character()
  for (guard in seq_len(max(1L, nchar(rest) + 2L))) {
    if (!nzchar(rest)) break
    hit <- stata_gettoken(rest, parse = parse)
    if (!nzchar(hit$token) && identical(hit$rest, rest)) break
    if (nzchar(hit$token)) out <- c(out, hit$token)
    rest <- hit$rest
  }
  out
}

stata_set_positional <- function(env, tokens) {
  old <- ls(envir = env, all.names = TRUE)
  drop <- old[grepl("^[0-9]+$", old) | old == "*"]
  if (length(drop)) rm(list = drop, envir = env)
  tokens <- as.character(tokens)
  if (length(tokens)) for (i in seq_along(tokens)) assign(as.character(i), tokens[[i]], envir = env)
  assign(as.character(length(tokens) + 1L), "", envir = env)
  assign("*", paste(tokens, collapse = " "), envir = env)
  invisible(tokens)
}

stata_macro_shift <- function(env, n = 1L) {
  n <- max(0L, as.integer(n)[1L])
  vals <- character()
  i <- 1L
  repeat {
    val <- stata_local_get(env, as.character(i))
    if (!nzchar(as.character(val))) break
    vals <- c(vals, as.character(val)); i <- i + 1L
  }
  if (n >= length(vals)) vals <- character() else if (n > 0L) vals <- vals[(n + 1L):length(vals)]
  stata_set_positional(env, vals)
  invisible(NULL)
}`);
  if (features.has('framelinks')) blocks.push(`stata_frlink <- function(DT, target, keys_current, keys_target = keys_current, type = c("1:1", "m:1"), link_name, target_name) {
  type <- match.arg(type)
  stopifnot(length(keys_current) > 0L, length(keys_current) == length(keys_target))
  stopifnot(all(keys_current %in% names(DT)), all(keys_target %in% names(target)))
  if (type == "1:1") stopifnot(data.table::uniqueN(DT, by = keys_current) == nrow(DT))
  stopifnot(data.table::uniqueN(target, by = keys_target) == nrow(target))

  lhs <- data.table::copy(DT)[, .__do2r_master_row__ := .I]
  rhs <- data.table::copy(target)[, .__do2r_target_row__ := .I]
  rhs <- rhs[, c(keys_target, ".__do2r_target_row__"), with = FALSE]
  if (!identical(keys_current, keys_target)) data.table::setnames(rhs, keys_target, keys_current)
  map <- merge(lhs[, c(".__do2r_master_row__", keys_current), with = FALSE], rhs,
               by = keys_current, all.x = TRUE, sort = FALSE)
  data.table::setorder(map, .__do2r_master_row__)
  out <- data.table::copy(DT)
  out[, (link_name) := map$.__do2r_target_row__]
  links <- attr(out, "do2r_links")
  if (is.null(links)) links <- list()
  links[[link_name]] <- list(target_name = target_name, keys_current = keys_current, keys_target = keys_target, type = type)
  attr(out, "do2r_links") <- links
  out
}
stata_frget <- function(DT, from, spec = "*", prefix = "", suffix = "", exclude = "") {
  from <- as.character(from)
  links <- attr(DT, "do2r_links")
  meta <- if (is.null(links)) NULL else links[[from]]
  if (is.null(meta)) stop(sprintf("No do2R frame link metadata found for %s", from), call. = FALSE)
  target <- get(meta$target_name, envir = parent.frame(), inherits = TRUE)
  idx <- DT[[from]]

  expand_glob <- function(pattern, pool) {
    if (!grepl("[*?]", pattern)) return(pattern)
    grep(utils::glob2rx(pattern), pool, value = TRUE)
  }
  toks <- strsplit(trimws(as.character(spec)), "\\\\s+")[[1L]]
  toks <- toks[nzchar(toks)]
  if (!length(toks)) toks <- "*"
  ex <- strsplit(trimws(as.character(exclude)), "\\\\s+")[[1L]]
  ex <- ex[nzchar(ex)]
  ex <- unique(unlist(lapply(ex, expand_glob, pool = names(target)), use.names = FALSE))

  pairs <- list()
  for (tok in toks) {
    if (grepl("=", tok, fixed = TRUE)) {
      bits <- strsplit(tok, "=", fixed = TRUE)[[1L]]
      if (length(bits) == 2L) pairs[[length(pairs) + 1L]] <- c(new = bits[1L], old = bits[2L])
    } else {
      hits <- expand_glob(tok, names(target))
      for (v in hits) pairs[[length(pairs) + 1L]] <- c(new = v, old = v)
    }
  }
  if (!length(pairs)) return(list(data = DT, result = list(k = 0L, varlist = "")))
  keep <- !vapply(pairs, function(z) z[["old"]] %in% ex, logical(1L))
  pairs <- pairs[keep]

  out <- data.table::copy(DT)
  written <- character()
  for (z in pairs) {
    old <- z[["old"]]
    if (!old %in% names(target)) stop(sprintf("Variable %s not found in linked frame", old), call. = FALSE)
    new <- paste0(prefix, z[["new"]], suffix)
    out[, (new) := target[[old]][idx]]
    written <- c(written, new)
  }
  attr(out, "do2r_links") <- links
  list(data = out, result = list(k = length(written), varlist = paste(written, collapse = " ")))
}
stata_frval <- function(DT, link, variable) {
  links <- attr(DT, "do2r_links")
  meta <- if (is.null(links)) NULL else links[[as.character(link)]]
  if (is.null(meta)) stop(sprintf("No do2R frame link metadata found for %s", link), call. = FALSE)
  target <- get(meta$target_name, envir = parent.frame(), inherits = TRUE)
  target[[as.character(variable)]][DT[[as.character(link)]]]
}
`);
  if (features.has('resampling')) blocks.push(`stata_stat_vector <- function(x) {
  x <- unlist(x, use.names = TRUE)
  storage.mode(x) <- "double"
  if (is.null(names(x)) || any(!nzchar(names(x)))) names(x) <- paste0("stat", seq_along(x))
  x
}
stata_collect_stored <- function(e = list(), r = list()) {
  if (!is.null(e$b)) return(stata_stat_vector(e$b[1L, , drop = TRUE]))
  scalars <- unlist(r[vapply(r, function(x) is.atomic(x) && length(x) == 1L, logical(1L))], use.names = TRUE)
  if (length(scalars)) return(stata_stat_vector(scalars))
  numeric()
}
stata_bind_replications <- function(values) {
  if (!length(values)) return(data.table::data.table())
  rows <- lapply(values, function(x) as.list(stata_stat_vector(x)))
  data.table::rbindlist(rows, use.names = TRUE, fill = TRUE, idcol = ".rep")
}
stata_bootstrap <- function(DT, statistic, reps = 50L, seed = NULL, strata = NULL, cluster = NULL, size = NULL) {
  reps <- as.integer(reps); stopifnot(length(reps) == 1L, !is.na(reps), reps > 0L)
  if (!is.null(seed)) set.seed(as.integer(seed))
  theta <- stata_stat_vector(statistic(data.table::copy(DT)))
  sample_once <- function() {
    if (!is.null(cluster)) {
      clvars <- strsplit(trimws(cluster), "\\\\s+")[[1L]]
      stopifnot(all(clvars %in% names(DT)))
      key <- do.call(interaction, c(DT[, .SD, .SDcols = clvars], list(drop = TRUE, lex.order = TRUE)))
      groups <- split(seq_len(nrow(DT)), key)
      if (is.null(strata)) {
        ncluster <- if (is.null(size)) length(groups) else as.integer(size)
        stopifnot(ncluster > 0L, ncluster <= length(groups))
        picks <- sample(names(groups), ncluster, replace = TRUE)
        return(data.table::rbindlist(lapply(picks, function(k) DT[groups[[k]]]), use.names = TRUE, fill = TRUE))
      }
      svars <- strsplit(trimws(strata), "\\\\s+")[[1L]]
      stopifnot(all(svars %in% names(DT)))
      cluster_strata <- vapply(groups, function(ix) paste(unlist(DT[ix[1L], ..svars], use.names = FALSE), collapse = "\\r"), character(1L))
      picks <- unlist(lapply(split(names(groups), cluster_strata), function(g) {
        ncluster <- if (is.null(size)) length(g) else as.integer(size)
        stopifnot(ncluster > 0L, ncluster <= length(g))
        sample(g, ncluster, replace = TRUE)
      }), use.names = FALSE)
      return(data.table::rbindlist(lapply(picks, function(k) DT[groups[[k]]]), use.names = TRUE, fill = TRUE))
    }
    if (!is.null(strata)) {
      svars <- strsplit(trimws(strata), "\\\\s+")[[1L]]
      stopifnot(all(svars %in% names(DT)))
      key <- do.call(interaction, c(DT[, .SD, .SDcols = svars], list(drop = TRUE, lex.order = TRUE)))
      ix <- unlist(lapply(split(seq_len(nrow(DT)), key), function(g) sample(g, length(g), replace = TRUE)), use.names = FALSE)
      return(DT[ix])
    }
    n <- if (is.null(size)) nrow(DT) else as.integer(size)
    DT[sample.int(nrow(DT), n, replace = TRUE)]
  }
  reps_out <- lapply(seq_len(reps), function(i) statistic(data.table::copy(sample_once())))
  list(theta = theta, replicates = stata_bind_replications(reps_out))
}
stata_jackknife <- function(DT, statistic, cluster = NULL) {
  theta <- stata_stat_vector(statistic(data.table::copy(DT)))
  if (is.null(cluster)) groups <- as.list(seq_len(nrow(DT)))
  else {
    clvars <- strsplit(trimws(cluster), "\\\\s+")[[1L]]
    stopifnot(all(clvars %in% names(DT)))
    key <- do.call(interaction, c(DT[, .SD, .SDcols = clvars], list(drop = TRUE, lex.order = TRUE)))
    groups <- split(seq_len(nrow(DT)), key)
  }
  reps_out <- lapply(groups, function(drop) statistic(data.table::copy(DT[-drop])))
  list(theta = theta, replicates = stata_bind_replications(reps_out))
}
stata_permute <- function(DT, variable, statistic, reps = 100L, seed = NULL, strata = NULL) {
  stopifnot(variable %in% names(DT))
  reps <- as.integer(reps); stopifnot(reps > 0L)
  if (!is.null(seed)) set.seed(as.integer(seed))
  theta <- stata_stat_vector(statistic(data.table::copy(DT)))
  permute_once <- function() {
    out <- data.table::copy(DT)
    if (is.null(strata)) out[, (variable) := sample(get(variable), .N, replace = FALSE)]
    else {
      svars <- strsplit(trimws(strata), "\\\\s+")[[1L]]
      out[, (variable) := sample(get(variable), .N, replace = FALSE), by = svars]
    }
    out
  }
  reps_out <- lapply(seq_len(reps), function(i) statistic(permute_once()))
  list(theta = theta, replicates = stata_bind_replications(reps_out))
}
stata_simulate <- function(DT, statistic, reps, seed = NULL) {
  reps <- as.integer(reps); stopifnot(length(reps) == 1L, !is.na(reps), reps > 0L)
  if (!is.null(seed)) set.seed(as.integer(seed))
  stata_bind_replications(lapply(seq_len(reps), function(i) statistic(data.table::copy(DT))))
}
stata_rolling <- function(DT, statistic, window, step = 1L, mode = c("rolling", "recursive", "rrecursive")) {
  mode <- match.arg(mode); window <- as.integer(window); step <- as.integer(step)
  stopifnot(window > 0L, step > 0L, nrow(DT) >= window)
  ends <- seq.int(window, nrow(DT), by = step)
  ranges <- lapply(ends, function(e) {
    if (mode == "recursive") seq_len(e)
    else if (mode == "rrecursive") seq.int(e - window + 1L, nrow(DT))
    else seq.int(e - window + 1L, e)
  })
  vals <- lapply(ranges, function(ix) statistic(data.table::copy(DT[ix])))
  out <- stata_bind_replications(vals)
  data.table::set(out, j = ".start", value = vapply(ranges, min, integer(1L)))
  data.table::set(out, j = ".end", value = vapply(ranges, max, integer(1L)))
  out
}
stata_resample_e <- function(theta, replicates, cmd = "bootstrap", jackknife = FALSE) {
  theta <- stata_stat_vector(theta)
  stat_cols <- setdiff(names(replicates), ".rep")
  M <- as.matrix(replicates[, .SD, .SDcols = stat_cols])
  storage.mode(M) <- "double"
  V <- if (!nrow(M)) matrix(NA_real_, length(theta), length(theta), dimnames = list(names(theta), names(theta))) else if (jackknife) {
    z <- sweep(M, 2L, colMeans(M, na.rm = TRUE), "-")
    (nrow(M) - 1) / nrow(M) * crossprod(z)
  } else stats::cov(M, use = "pairwise.complete.obs")
  b <- matrix(theta, nrow = 1L, dimnames = list(NULL, names(theta)))
  list(N = NA_integer_, reps = nrow(M), b = b, V = V, cmd = cmd)
}`);
  if (features.has('factorvars')) blocks.push(`if (!exists(".do2r_fvset", inherits = FALSE)) .do2r_fvset <- character()
if (!exists(".do2r_fvdesign", inherits = FALSE)) .do2r_fvdesign <- character()
stata_factor <- function(x, base = "first", position = NULL) {
  f <- factor(x)
  lv <- levels(f)
  if (!length(lv) || identical(base, "none")) return(f)
  if (!is.null(position)) {
    position <- as.integer(position)
    if (is.na(position) || position < 1L || position > length(lv)) stop("factor base position is out of range", call. = FALSE)
    return(stats::relevel(f, ref = lv[position]))
  }
  base <- tolower(as.character(base))
  ref <- switch(base,
    first = lv[1L], default = lv[1L],
    last = lv[length(lv)],
    frequent = names(which.max(table(f, useNA = "no"))),
    freq = names(which.max(table(f, useNA = "no"))),
    as.character(base)
  )
  stats::relevel(f, ref = ref)
}`);
  if (features.has('results')) blocks.push(`if (!exists(".do2r_r", inherits = FALSE)) .do2r_r <- list()
if (!exists(".do2r_e", inherits = FALSE)) .do2r_e <- list()
if (!exists(".do2r_s", inherits = FALSE)) .do2r_s <- list()
stata_c <- function(name, DT = NULL) {
  key <- tolower(as.character(name))
  switch(key,
    n = if (is.null(DT)) NA_integer_ else nrow(DT),
    k = if (is.null(DT)) NA_integer_ else ncol(DT),
    pwd = getwd(),
    dirsep = .Platform$file.sep,
    os = Sys.info()[["sysname"]],
    pi = pi,
    level = get0(".do2r_c_level", envir = .GlobalEnv, inherits = FALSE, ifnotfound = 95),
    clevel = get0(".do2r_c_clevel", envir = .GlobalEnv, inherits = FALSE, ifnotfound = 95),
    current_date = format(Sys.Date(), "%d %b %Y"),
    current_time = format(Sys.time(), "%H:%M:%S"),
    stata_version = "19",
    version = "19",
    stop(sprintf("do2R has no portable R analogue for c(%s)", name), call. = FALSE)
  )
}
stata_c_list <- function(DT = NULL) list(
  N = stata_c("N", DT), k = stata_c("k", DT), pwd = stata_c("pwd", DT),
  dirsep = stata_c("dirsep", DT), os = stata_c("os", DT), pi = pi,
  level = stata_c("level", DT), current_date = stata_c("current_date", DT),
  current_time = stata_c("current_time", DT), stata_version = stata_c("stata_version", DT)
)
stata_e_from_model <- function(model, cmd = NULL) {
  sm <- tryCatch(summary(model), error = function(e) NULL)
  b <- tryCatch(stats::coef(model), error = function(e) NULL)
  V <- tryCatch(stats::vcov(model), error = function(e) NULL)
  n <- tryCatch(stats::nobs(model), error = function(e) NA_integer_)
  r2 <- if (!is.null(sm) && !is.null(sm$r.squared)) unname(sm$r.squared) else NA_real_
  ar2 <- if (!is.null(sm) && !is.null(sm$adj.r.squared)) unname(sm$adj.r.squared) else NA_real_
  resid <- tryCatch(stats::residuals(model), error = function(e) NULL)
  rss <- if (is.null(resid)) NA_real_ else sum(resid^2, na.rm = TRUE)
  df_r <- tryCatch(stats::df.residual(model), error = function(e) NA_real_)
  rmse <- if (is.finite(rss) && is.finite(df_r) && df_r > 0) sqrt(rss / df_r) else NA_real_
  out <- list(N = n, b = if (is.null(b)) NULL else matrix(b, nrow = 1L, dimnames = list(NULL, names(b))),
              V = V, df_r = df_r, r2 = r2, r2_a = ar2, rmse = rmse, rss = rss, cmd = cmd)
  out[!vapply(out, is.null, logical(1L))]
}`);
  if (features.has('irf')) blocks.push(`stata_irf_create <- function(model, n.ahead = 8L, boot = FALSE, runs = 200L, ci = 0.95, seed = NULL) {
  n.ahead <- as.integer(n.ahead); runs <- as.integer(runs); ci <- as.numeric(ci)
  if (!is.null(seed)) seed <- as.integer(seed)
  mk <- function(ortho, cumulative) vars::irf(model, n.ahead = n.ahead, ortho = ortho,
    cumulative = cumulative, boot = boot, runs = runs, ci = ci, seed = seed)
  list(
    irf = mk(FALSE, FALSE),
    oirf = mk(TRUE, FALSE),
    cirf = mk(FALSE, TRUE),
    coirf = mk(TRUE, TRUE),
    fevd = vars::fevd(model, n.ahead = n.ahead)
  )
}
stata_irf_table <- function(x, statistic = "oirf", impulse = NULL, response = NULL) {
  statistic <- tolower(as.character(statistic)[1L])
  if (statistic == "fevd") {
    z <- x$fevd
    ans <- data.table::rbindlist(lapply(names(z), function(resp) {
      m <- as.matrix(z[[resp]])
      out <- data.table::as.data.table(as.table(m))
      data.table::setnames(out, c("step", "impulse", "estimate"))
      out[, response := resp]
      out[, step := as.integer(step)]
      out
    }), use.names = TRUE, fill = TRUE)
  } else {
    z <- x[[statistic]]
    if (is.null(z) || is.null(z$irf)) stop(sprintf("Unknown IRF statistic: %s", statistic), call. = FALSE)
    ans <- data.table::rbindlist(lapply(names(z$irf), function(imp) {
      m <- as.matrix(z$irf[[imp]])
      out <- data.table::as.data.table(as.table(m))
      data.table::setnames(out, c("step", "response", "estimate"))
      out[, impulse := imp]
      out[, step := as.integer(step) - 1L]
      if (isTRUE(z$boot) && !is.null(z$Lower[[imp]])) {
        lo <- as.matrix(z$Lower[[imp]]); hi <- as.matrix(z$Upper[[imp]])
        out[, lower := as.vector(lo)]
        out[, upper := as.vector(hi)]
      }
      out
    }), use.names = TRUE, fill = TRUE)
  }
  impulse_keep <- if (is.null(impulse)) NULL else as.character(impulse)
  response_keep <- if (is.null(response)) NULL else as.character(response)
  if (!is.null(impulse_keep)) ans <- ans[impulse %in% impulse_keep]
  if (!is.null(response_keep)) ans <- ans[response %in% response_keep]
  data.table::setcolorder(ans, intersect(c("impulse", "response", "step", "estimate", "lower", "upper"), names(ans)))
  ans[]
}`);
  if (features.has('vargranger')) blocks.push(`stata_vargranger <- function(model) {
  eqs <- names(model$varresult)
  one_equation <- function(eq) {
    fit <- model$varresult[[eq]]
    cf <- stats::coef(fit)
    V <- stats::vcov(fit)
    others <- setdiff(eqs, eq)
    one_test <- function(excluded, label = excluded) {
      terms <- unlist(lapply(excluded, function(v) grep(paste0("^", v, "\\\\.l[0-9]+$"), names(cf), value = TRUE)), use.names = FALSE)
      terms <- unique(terms)
      if (!length(terms)) return(data.frame(equation = eq, excluded = label, chi2 = NA_real_, df = 0L, p = NA_real_))
      b <- cf[terms]
      VV <- V[terms, terms, drop = FALSE]
      stat <- tryCatch(as.numeric(crossprod(b, solve(VV, b))), error = function(e) NA_real_)
      data.frame(equation = eq, excluded = label, chi2 = stat, df = length(terms), p = stats::pchisq(stat, df = length(terms), lower.tail = FALSE))
    }
    pairwise <- lapply(others, one_test)
    all_test <- if (length(others) > 1L) list(one_test(others, "ALL")) else list()
    do.call(rbind, c(pairwise, all_test))
  }
  out <- do.call(rbind, lapply(eqs, one_equation))
  rownames(out) <- NULL
  out
}`);
  if (features.has('vardiagnostics')) blocks.push(`stata_varlmar <- function(model, mlag = 2L) {
  mlag <- as.integer(mlag); if (length(mlag) != 1L || is.na(mlag) || mlag < 1L) stop("mlag() must be a positive integer", call. = FALSE)
  out <- lapply(seq_len(mlag), function(j) {
    z <- vars::serial.test(model, lags.bg = j, type = "BG")$serial
    data.frame(lag = j, chi2 = unname(as.numeric(z$statistic)), df = unname(as.numeric(z$parameter)), p = unname(as.numeric(z$p.value)))
  })
  ans <- do.call(rbind, out); rownames(ans) <- NULL; ans
}
stata_varstable <- function(model, graph = FALSE) {
  eig <- vars::roots(model, modulus = FALSE)
  tab <- data.frame(real = Re(eig), imaginary = Im(eig), modulus = Mod(eig))
  stable <- all(tab$modulus < 1)
  if (isTRUE(graph)) {
    theta <- seq(0, 2 * pi, length.out = 361L)
    plot(cos(theta), sin(theta), type = "l", asp = 1, xlab = "Real", ylab = "Imaginary")
    points(tab$real, tab$imaginary)
    abline(h = 0, v = 0, lty = 3)
  }
  list(roots = tab, stable = stable)
}`);
  if (features.has('syntax')) blocks.push(`stata_option_get <- function(opts, full, min, default = NULL, flag = FALSE) {
  if (!length(opts)) return(default)
  nms <- tolower(names(opts))
  full <- tolower(full); min <- tolower(min)
  hit <- which(vapply(nms, function(nm) nchar(nm) >= nchar(min) && startsWith(full, nm), logical(1L)))
  if (!length(hit)) return(default)
  if (length(hit) > 1L) stop(sprintf("option %s specified more than once", full), call. = FALSE)
  value <- opts[[hit]]
  if (flag) {
    if (is.null(value)) return(TRUE)
    return(isTRUE(value))
  }
  value
}`);
  if (features.has('compare')) blocks.push(`stata_compare <- function(a, op, b) {
  n <- max(length(a), length(b))
  if (!n) return(logical())
  a <- rep_len(a, n); b <- rep_len(b, n)

  cmp <- function(x, y) switch(op,
    "<" = x < y, "<=" = x <= y, ">" = x > y, ">=" = x >= y,
    "==" = x == y, "!=" = x != y, stop("unknown comparison", call. = FALSE)
  )
  out <- cmp(a, b)

  # Stata orders all numeric missings above every finite numeric value:
  # finite < . < .a < ... < .z. Preserve NA storage, but reproduce comparison truth values.
  if ((is.numeric(a) || is.logical(a)) && (is.numeric(b) || is.logical(b))) {
    am <- is.na(a); bm <- is.na(b)
    only_a <- am & !bm; only_b <- !am & bm; both <- am & bm
    if (any(only_a)) out[only_a] <- switch(op, "<" = FALSE, "<=" = FALSE, ">" = TRUE, ">=" = TRUE, "==" = FALSE, "!=" = TRUE)
    if (any(only_b)) out[only_b] <- switch(op, "<" = TRUE, "<=" = TRUE, ">" = FALSE, ">=" = FALSE, "==" = FALSE, "!=" = TRUE)
    if (any(both)) {
      rank_missing <- function(x) {
        r <- rep.int(0L, length(x))
        if (requireNamespace("haven", quietly = TRUE)) {
          tagged <- haven::is_tagged_na(x)
          if (any(tagged)) r[tagged] <- match(haven::na_tag(x[tagged]), letters)
        }
        r
      }
      out[both] <- cmp(rank_missing(a[both]), rank_missing(b[both]))
    }
  }
  out
}
`);
  if (features.has('missing_order')) blocks.push(`stata_missing_rank <- function(x) {
  out <- rep.int(-1L, length(x))
  miss <- is.na(x)
  out[miss] <- 0L
  if (any(miss) && requireNamespace("haven", quietly = TRUE)) {
    tagged <- haven::is_tagged_na(x)
    if (any(tagged)) {
      tags <- haven::na_tag(x[tagged])
      out[tagged] <- match(tags, letters)
    }
  }
  out
}
stata_missing_compare <- function(x, op, tag = "") {
  target <- if (nzchar(tag)) match(tolower(tag), letters) else 0L
  xr <- stata_missing_rank(x)
  switch(op, "<" = xr < target, "<=" = xr <= target, ">" = xr > target,
         ">=" = xr >= target, "==" = xr == target, "!=" = xr != target,
         stop("unknown comparison"))
}`);
  if (features.has('varlist')) blocks.push(`stata_vars <- function(DT, spec) {
  nms <- names(DT)
  bits <- strsplit(trimws(as.character(spec)), "\\\\s+")[[1L]]
  unique(unlist(lapply(bits, function(bit) {
    if (!nzchar(bit)) return(character())
    if (bit == "_all") return(nms)
    if (grepl("[*?]", bit)) return(grep(utils::glob2rx(bit), nms, value = TRUE))
    if (grepl("^[A-Za-z_.][A-Za-z0-9_.]*-[A-Za-z_.][A-Za-z0-9_.]*$", bit)) {
      z <- strsplit(bit, "-", fixed = TRUE)[[1L]]
      a <- match(z[1L], nms); b <- match(z[2L], nms)
      if (!is.na(a) && !is.na(b)) return(nms[seq.int(min(a,b), max(a,b))])
    }
    bit
  }), use.names = FALSE))
}`);
  if (features.has('numlist')) blocks.push(`stata_numlist <- function(spec) {
  bits <- strsplit(trimws(as.character(spec)), "\\\\s+")[[1L]]
  unlist(lapply(bits, function(bit) {
    if (grepl("^-?[0-9.]+/-?[0-9.]+$", bit)) {
      z <- as.numeric(strsplit(bit, "/", fixed = TRUE)[[1L]])
      return(seq.int(z[1L], z[2L]))
    }
    m <- regexec("^(-?[0-9.]+)\\\\((-?[0-9.]+)\\\\)(-?[0-9.]+)$", bit)
    z <- regmatches(bit, m)[[1L]]
    if (length(z)) return(seq(as.numeric(z[2L]), as.numeric(z[4L]), by = as.numeric(z[3L])))
    as.numeric(bit)
  }), use.names = FALSE)
}`);
  if (features.has('tsfill')) blocks.push(`stata_tsfill <- function(DT, panel = NULL, time, delta = 1, full = FALSE) {
  stopifnot(time %in% names(DT))
  cols <- names(DT)
  make_seq <- function(lo, hi) seq(lo, hi, by = delta)
  if (is.null(panel)) {
    grid <- data.table::data.table(.time = make_seq(min(DT[[time]], na.rm = TRUE), max(DT[[time]], na.rm = TRUE)))
    data.table::setnames(grid, ".time", time)
    keys <- time
  } else {
    stopifnot(panel %in% names(DT))
    ids <- unique(DT[[panel]])
    if (full) {
      times <- make_seq(min(DT[[time]], na.rm = TRUE), max(DT[[time]], na.rm = TRUE))
      grid <- data.table::CJ(.panel = ids, .time = times, sorted = FALSE, unique = TRUE)
    } else {
      grid <- data.table::rbindlist(lapply(ids, function(id) {
        z <- DT[get(panel) == id, get(time)]
        data.table::data.table(.panel = id, .time = make_seq(min(z, na.rm = TRUE), max(z, na.rm = TRUE)))
      }))
    }
    data.table::setnames(grid, c(".panel", ".time"), c(panel, time)); keys <- c(panel, time)
  }
  out <- merge(grid, DT, by = keys, all.x = TRUE, sort = FALSE, allow.cartesian = TRUE)
  data.table::setorderv(out, keys)
  data.table::setcolorder(out, cols)
  out
}`);
  if (features.has('tsappend')) blocks.push(`stata_ts_parse_last <- function(value, fmt = NULL) {
  x <- trimws(as.character(value)[1L])
  x <- sub('^"(.*)"$', "\\1", x)
  if (is.null(fmt) || !nzchar(as.character(fmt)[1L])) {
    z <- suppressWarnings(as.numeric(x)); if (is.na(z)) stop("last() endpoint is not numeric and tsfmt() was not supplied", call. = FALSE); return(z)
  }
  f <- tolower(sub("^%", "", trimws(as.character(fmt)[1L])))
  period <- function(pattern, peryear) {
    m <- regexec(pattern, x, ignore.case = TRUE); z <- regmatches(x, m)[[1L]]
    if (!length(z)) stop(sprintf("Cannot parse last(%s) with tsfmt(%s)", x, f), call. = FALSE)
    (as.integer(z[2L]) - 1960L) * peryear + as.integer(z[3L]) - 1L
  }
  if (f == "tm") return(period("^([+-]?[0-9]+)m([0-9]{1,2})$", 12L))
  if (f == "tq") return(period("^([+-]?[0-9]+)q([1-4])$", 4L))
  if (f == "th") return(period("^([+-]?[0-9]+)h([1-2])$", 2L))
  if (f == "tw") return(period("^([+-]?[0-9]+)w([0-9]{1,2})$", 52L))
  if (f == "ty") return(as.numeric(x))
  parse_date <- function(z) {
    fmts <- c("%d%b%Y", "%d %b %Y", "%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y")
    for (ff in fmts) { d <- suppressWarnings(as.Date(z, format = ff)); if (!is.na(d)) return(d) }
    as.Date(NA)
  }
  if (f == "td") {
    d <- parse_date(x); if (is.na(d)) stop(sprintf("Cannot parse daily last(%s)", x), call. = FALSE)
    return(as.numeric(d - as.Date("1960-01-01")))
  }
  if (f == "tc") {
    fmts <- c("%d%b%Y %H:%M:%OS", "%d %b %Y %H:%M:%OS", "%Y-%m-%d %H:%M:%OS", "%Y/%m/%d %H:%M:%OS", "%d%b%Y")
    z <- as.POSIXct(NA, origin = "1970-01-01", tz = "UTC")
    for (ff in fmts) { z <- suppressWarnings(as.POSIXct(x, format = ff, tz = "UTC")); if (!is.na(z)) break }
    if (is.na(z)) stop(sprintf("Cannot parse clock last(%s)", x), call. = FALSE)
    return(as.numeric(difftime(z, as.POSIXct("1960-01-01", tz = "UTC"), units = "secs")) * 1000)
  }
  stop(sprintf("Unsupported tsfmt(%s)", fmt), call. = FALSE)
}
stata_tsappend <- function(DT, panel = NULL, time, delta = 1, add = NULL, last = NULL, tsfmt = NULL, panel_value = NULL) {
  DT <- stata_tsfill(DT, panel = panel, time = time, delta = delta, full = FALSE)
  delta <- as.numeric(delta); if (!is.finite(delta) || delta <= 0) stop("delta must be positive", call. = FALSE)
  target <- if (is.null(last)) NULL else stata_ts_parse_last(last, tsfmt)
  if (is.null(target)) {
    add <- as.integer(add); if (length(add) != 1L || is.na(add) || add < 0L) stop("add must be a nonnegative integer", call. = FALSE)
  }
  make_times <- function(cur) {
    n <- if (is.null(target)) add else max(0L, floor((target - cur) / delta + 1e-10))
    if (!n) return(numeric())
    cur + seq_len(n) * delta
  }
  if (is.null(panel)) {
    times <- make_times(max(DT[[time]], na.rm = TRUE))
    if (!length(times)) return(DT)
    extra <- data.table::data.table(.time = times)
    data.table::setnames(extra, ".time", time); keys <- time
  } else {
    ids <- unique(DT[[panel]]); if (!is.null(panel_value)) ids <- ids[ids %in% panel_value]
    parts <- lapply(ids, function(id) {
      times <- make_times(max(DT[get(panel) == id, get(time)], na.rm = TRUE))
      if (!length(times)) return(NULL)
      data.table::data.table(.panel = id, .time = times)
    })
    parts <- Filter(Negate(is.null), parts)
    if (!length(parts)) return(DT)
    extra <- data.table::rbindlist(parts, use.names = TRUE, fill = TRUE)
    data.table::setnames(extra, c(".panel", ".time"), c(panel, time)); keys <- c(panel, time)
  }
  out <- data.table::rbindlist(list(DT, extra), use.names = TRUE, fill = TRUE)
  data.table::setorderv(out, keys); out
}`);
  if (features.has('tsfilter_hp')) blocks.push(`stata_tsfilter_hp <- function(x, lambda = 1600, panel = NULL) {
  lambda <- as.numeric(lambda)[1L]
  if (!is.finite(lambda) || lambda <= 0) stop("HP smoothing parameter must be positive", call. = FALSE)
  one <- function(z) {
    z <- as.numeric(z)
    if (length(z) < 4L) stop("HP filtering requires at least four observations per series/panel", call. = FALSE)
    if (anyNA(z)) stop("HP filtering currently requires a complete series within each panel; fill or restrict gaps explicitly", call. = FALSE)
    fit <- mFilter::hpfilter(z, freq = lambda, type = "lambda", drift = FALSE)
    list(cycle = as.numeric(fit$cycle), trend = as.numeric(fit$trend))
  }
  if (is.null(panel)) return(one(x))
  groups <- split(seq_along(x), panel, drop = TRUE)
  cycle <- trend <- rep(NA_real_, length(x))
  for (idx in groups) {
    fit <- one(x[idx]); cycle[idx] <- fit$cycle; trend[idx] <- fit$trend
  }
  list(cycle = cycle, trend = trend)
}`);
  if (features.has('tssmooth')) blocks.push(`stata_tssmooth_ma <- function(x, offsets, weights, panel = NULL, time = NULL, delta = 1) {
  stopifnot(length(offsets) == length(weights))
  shifted <- lapply(offsets, function(k) {
    k <- as.integer(k)
    if (k == 0L) return(x)
    args <- list(x, n = -k, fill = NA)
    if (!is.null(panel)) args$g <- panel
    if (!is.null(time)) args$t <- time
    do.call(collapse::flag, args)
  })
  X <- do.call(cbind, shifted)
  W <- matrix(rep(weights, each = length(x)), nrow = length(x))
  keep <- !is.na(X) & W != 0
  den <- rowSums(W * keep)
  X0 <- X; X0[is.na(X0)] <- 0
  num <- rowSums(X0 * W)
  out <- num / den; out[den == 0] <- NA_real_; out
}`);
  if (features.has('tssmooth_exp')) blocks.push(`stata_tssmooth_exponential <- function(x, alpha = NULL, s0 = NULL, samp0 = NULL, forecast = 0L, panel = NULL) {
  forecast <- as.integer(forecast); if (length(forecast) != 1L || is.na(forecast) || forecast < 0L || forecast > 500L) stop("forecast must be an integer from 0 through 500", call. = FALSE)
  if (!is.null(alpha)) { alpha <- as.numeric(alpha); if (length(alpha) != 1L || is.na(alpha) || alpha <= 0 || alpha >= 1) stop("parms() must be strictly between 0 and 1", call. = FALSE) }
  if (!is.null(samp0)) { samp0 <- as.integer(samp0); if (length(samp0) != 1L || is.na(samp0) || samp0 < 1L) stop("samp0() must be a positive integer", call. = FALSE) }
  if (!is.null(s0) && !is.null(samp0)) stop("s0() and samp0() are mutually exclusive", call. = FALSE)
  one <- function(z) {
    observed <- which(!is.na(z))
    if (!length(observed)) return(list(value = rep(NA_real_, length(z)), results = list(N = 0L, alpha = NA_real_, rss = NA_real_, rmse = NA_real_, N_pre = 0L, s1_0 = NA_real_, method = "exponential")))
    first <- min(observed); last <- max(observed)
    npre <- if (!is.null(samp0)) min(samp0, length(observed)) else max(1L, floor(length(observed) / 2L))
    initial <- if (!is.null(s0)) as.numeric(s0)[1L] else mean(z[observed[seq_len(npre)]], na.rm = TRUE)
    run <- function(a, keep = TRUE) {
      state <- initial
      out <- rep(NA_real_, length(z))
      for (i in seq.int(first, last)) {
        out[i] <- state
        if (!is.na(z[i])) state <- a * z[i] + (1 - a) * state
      }
      if (forecast > 0L && last < length(z)) {
        hi <- min(length(z), last + forecast)
        if (hi >= last + 1L) out[(last + 1L):hi] <- state
      }
      resid <- z[observed] - out[observed]
      rss <- sum(resid^2, na.rm = TRUE)
      if (keep) list(value = out, rss = rss, rmse = sqrt(rss / max(1L, length(observed)))) else rss
    }
    a <- if (is.null(alpha)) stats::optimize(function(a) run(a, FALSE), interval = c(1e-7, 1 - 1e-7))$minimum else alpha
    fit <- run(a, TRUE)
    fit$results <- list(N = length(observed), alpha = unname(a), rss = fit$rss, rmse = fit$rmse, N_pre = npre, s1_0 = initial, method = "exponential")
    fit
  }
  if (is.null(panel)) {
    fit <- one(x)
    return(list(value = fit$value, results = fit$results))
  }
  groups <- split(seq_along(x), panel, drop = TRUE)
  out <- rep(NA_real_, length(x)); stats_out <- vector("list", length(groups)); names(stats_out) <- names(groups)
  j <- 0L
  for (idx in groups) {
    j <- j + 1L; fit <- one(x[idx]); out[idx] <- fit$value; stats_out[[j]] <- fit$results
  }
  list(value = out, results = list(panels = stats_out, method = "exponential"))
}`);
  if (features.has('excelio')) blocks.push(`stata_excel_col <- function(n) {
  n <- as.integer(n)
  vapply(n, function(k) {
    out <- character()
    while (k > 0L) {
      k <- k - 1L
      out <- c(intToUtf8(65L + k %% 26L), out)
      k <- k %/% 26L
    }
    paste0(out, collapse = "")
  }, character(1L))
}
stata_excel_cell <- function(cell) {
  m <- regexec("^([A-Za-z]+)([0-9]+)$", toupper(as.character(cell)))
  z <- regmatches(toupper(as.character(cell)), m)[[1L]]
  if (!length(z)) stop(sprintf("Invalid Excel cell: %s", cell), call. = FALSE)
  letters <- utf8ToInt(z[2L]) - 64L
  col <- Reduce(function(a, b) a * 26L + b, letters, init = 0L)
  c(row = as.integer(z[3L]), col = col)
}
stata_import_excel <- function(file, sheet = NULL, range = NULL, firstrow = FALSE, allstring = FALSE, case = "preserve", extvarlist = "") {
  args <- list(path = file, col_names = isTRUE(firstrow), .name_repair = "unique")
  if (!is.null(sheet) && nzchar(sheet)) args$sheet <- sheet
  if (!is.null(range) && nzchar(range)) args$range <- range
  if (isTRUE(allstring)) args$col_types <- "text"
  x <- do.call(readxl::read_excel, args)
  DT <- data.table::as.data.table(x)

  if (!isTRUE(firstrow)) data.table::setnames(DT, stata_excel_col(seq_len(ncol(DT))))
  case <- tolower(as.character(case))
  if (isTRUE(firstrow) && case == "lower") data.table::setnames(DT, tolower(names(DT)))
  if (isTRUE(firstrow) && case == "upper") data.table::setnames(DT, toupper(names(DT)))

  spec <- trimws(as.character(extvarlist))
  if (nzchar(spec)) {
    toks <- strsplit(spec, "\\\\s+")[[1L]]
    old <- character(length(toks)); new <- character(length(toks))
    for (i in seq_along(toks)) {
      bits <- strsplit(toks[i], "=", fixed = TRUE)[[1L]]
      if (length(bits) == 2L) {
        new[i] <- bits[1L]; old[i] <- toupper(bits[2L])
      } else {
        new[i] <- bits[1L]; old[i] <- stata_excel_col(i)
      }
    }
    stopifnot(all(old %in% names(DT)))
    DT <- DT[, ..old]
    data.table::setnames(DT, old, new)
  }
  DT
}
stata_export_excel <- function(DT, file, vars = names(DT), sheet = "Sheet1", sheet_mode = "", cell = "A1",
                               firstrow = "", missing = "", replace = FALSE, nolabel = FALSE) {
  vars <- as.character(vars)
  stopifnot(all(vars %in% names(DT)))
  X <- data.table::copy(DT[, .SD, .SDcols = vars])
  if (!isTRUE(nolabel)) {
    X <- X[, lapply(.SD, function(x) if (inherits(x, "haven_labelled")) as.character(haven::as_factor(x)) else x)]
  }

  if (isTRUE(replace) || !file.exists(file)) wb <- openxlsx::createWorkbook()
  else wb <- openxlsx::loadWorkbook(file)

  existing <- names(wb)
  mode <- tolower(as.character(sheet_mode))
  if (sheet %in% existing && mode == "replace") {
    openxlsx::removeWorksheet(wb, sheet)
    existing <- names(wb)
  } else if (sheet %in% existing && !mode %in% c("modify", "replace")) {
    stop(sprintf("Worksheet %s already exists; use sheet(..., modify) or sheet(..., replace)", sheet), call. = FALSE)
  }
  if (!sheet %in% names(wb)) openxlsx::addWorksheet(wb, sheet)

  pos <- stata_excel_cell(cell)
  header <- tolower(as.character(firstrow))
  if (header == "varlabels") {
    labs <- vapply(X, function(x) {
      z <- attr(x, "label", exact = TRUE)
      if (is.null(z) || !nzchar(as.character(z))) "" else as.character(z)
    }, character(1L))
    labs[!nzchar(labs)] <- names(X)[!nzchar(labs)]
    openxlsx::writeData(wb, sheet, t(labs), startCol = pos[["col"]], startRow = pos[["row"]], colNames = FALSE,
                        keepNA = nzchar(missing), na.string = missing)
    openxlsx::writeData(wb, sheet, X, startCol = pos[["col"]], startRow = pos[["row"]] + 1L, colNames = FALSE,
                        keepNA = nzchar(missing), na.string = missing)
  } else {
    openxlsx::writeData(wb, sheet, X, startCol = pos[["col"]], startRow = pos[["row"]],
                        colNames = header == "variables", keepNA = nzchar(missing), na.string = missing)
  }
  openxlsx::saveWorkbook(wb, file, overwrite = TRUE)
  invisible(file)
}
stata_putexcel_set <- function(file, sheet = "Sheet1", replace = FALSE, sheet_mode = "") {
  if (isTRUE(replace) || !file.exists(file)) wb <- openxlsx::createWorkbook() else wb <- openxlsx::loadWorkbook(file)
  mode <- tolower(as.character(sheet_mode))
  if (sheet %in% names(wb) && mode == "replace") openxlsx::removeWorksheet(wb, sheet)
  if (!sheet %in% names(wb)) openxlsx::addWorksheet(wb, sheet)
  openxlsx::saveWorkbook(wb, file, overwrite = TRUE)
  list(file = file, sheet = sheet)
}
stata_putexcel_write <- function(state, cell, value, names = FALSE) {
  if (is.null(state) || is.null(state$file)) stop("Run translated putexcel set first", call. = FALSE)
  wb <- if (file.exists(state$file)) openxlsx::loadWorkbook(state$file) else openxlsx::createWorkbook()
  if (!state$sheet %in% names(wb)) openxlsx::addWorksheet(wb, state$sheet)
  start <- strsplit(as.character(cell), ":", fixed = TRUE)[[1L]][1L]
  pos <- stata_excel_cell(start)
  if (isTRUE(names) && !is.null(dim(value))) {
    openxlsx::writeData(wb, state$sheet, value, startCol = pos[["col"]], startRow = pos[["row"]],
                        rowNames = !is.null(rownames(value)), colNames = !is.null(colnames(value)))
  } else {
    openxlsx::writeData(wb, state$sheet, value, startCol = pos[["col"]], startRow = pos[["row"]], colNames = FALSE)
  }
  openxlsx::saveWorkbook(wb, state$file, overwrite = TRUE)
  invisible(value)
}
stata_putexcel_formula <- function(state, cell, formula) {
  if (is.null(state) || is.null(state$file)) stop("Run translated putexcel set first", call. = FALSE)
  wb <- if (file.exists(state$file)) openxlsx::loadWorkbook(state$file) else openxlsx::createWorkbook()
  if (!state$sheet %in% names(wb)) openxlsx::addWorksheet(wb, state$sheet)
  pos <- stata_excel_cell(cell)
  openxlsx::writeFormula(wb, state$sheet, x = as.character(formula), startCol = pos[["col"]], startRow = pos[["row"]])
  openxlsx::saveWorkbook(wb, state$file, overwrite = TRUE)
  invisible(formula)
}
stata_putexcel_image <- function(state, cell, file, width = 6, height = 4) {
  if (is.null(state) || is.null(state$file)) stop("Run translated putexcel set first", call. = FALSE)
  wb <- openxlsx::loadWorkbook(state$file)
  pos <- stata_excel_cell(cell)
  openxlsx::insertImage(wb, state$sheet, file, startCol = pos[["col"]], startRow = pos[["row"]],
                        width = width, height = height)
  openxlsx::saveWorkbook(wb, state$file, overwrite = TRUE)
  invisible(file)
}
`);
  if (features.has('rows')) blocks.push(`stata_rows <- function(n, spec) {
  s <- trimws(as.character(spec))
  s <- sub("^f\\\\b", "1", s, ignore.case = TRUE)
  s <- sub("\\\\bl$", as.character(n), s, ignore.case = TRUE)
  if (grepl("^-?[0-9]+/-?[0-9]+$", s)) {
    z <- as.integer(strsplit(s, "/", fixed = TRUE)[[1L]])
    z[z < 0L] <- n + z[z < 0L] + 1L
    return(seq.int(z[1L], z[2L]))
  }
  z <- as.integer(s); if (z < 0L) z <- n + z + 1L; z
}`);
  if (features.has('missing')) blocks.push(`stata_missing <- function(...) Reduce(\`|\`, lapply(list(...), is.na))`);
  if (features.has('inlist')) blocks.push(`stata_inlist <- function(x, ...) x %in% c(...)`);
  if (features.has('mod')) blocks.push(`stata_mod <- function(x, y) ifelse(is.na(y) | y == 0, NA_real_, x - y * floor(x / y))`);
  if (features.has('cond')) blocks.push(`stata_cond <- function(test, yes, no, missing = no) ifelse(is.na(test), missing, ifelse(test != 0, yes, no))`);
  if (features.has('round')) blocks.push(`stata_round <- function(x, y = 1) {
  u <- abs(y)
  ifelse(is.na(x) | is.na(y), NA_real_, ifelse(u == 0, x, floor(x / u + 0.5) * u))
}`);
  if (features.has('minmax')) blocks.push(`stata_pmax <- function(...) {
  z <- list(...); out <- do.call(pmax, c(z, list(na.rm = TRUE))); allna <- Reduce(\`&\`, lapply(z, is.na)); out[allna] <- NA; out
}
stata_pmin <- function(...) {
  z <- list(...); out <- do.call(pmin, c(z, list(na.rm = TRUE))); allna <- Reduce(\`&\`, lapply(z, is.na)); out[allna] <- NA; out
}`);
  if (features.has('strpos')) blocks.push(`stata_strpos <- function(s, needle) { z <- regexpr(needle, s, fixed = TRUE); ifelse(z < 0L, 0L, z) }`);
  if (features.has('substr')) blocks.push(`stata_substr <- function(s, start, length) substr(s, start, start + length - 1L)`);
  if (features.has('subinstr')) blocks.push(`stata_subinstr <- function(s, from, to, n = NA) {
  if (length(n) == 1L && (is.na(n) || n < 0)) return(gsub(from, to, s, fixed = TRUE))
  if (n == 1L) return(sub(from, to, s, fixed = TRUE))
  # For n > 1, replace left-to-right up to n occurrences.
  vapply(s, function(one) { for (i in seq_len(n)) { newer <- sub(from, to, one, fixed = TRUE); if (identical(newer, one)) break; one <- newer }; one }, character(1L))
}`);
  if (features.has('words')) blocks.push(`stata_word <- function(s, n) vapply(strsplit(trimws(as.character(s)), "\\\\s+"), function(x) if (length(x) >= n) x[n] else "", character(1L))
stata_wordcount <- function(s) lengths(strsplit(trimws(as.character(s)), "\\\\s+"))`);
  if (features.has('macro_subinstr')) blocks.push(`stata_macro_subinstr <- function(text, from, to, all = FALSE, word = FALSE) {
  text <- as.character(text)[1L]; from <- as.character(from)[1L]; to <- as.character(to)[1L]
  if (!nzchar(from)) return(list(value = text, count = 0L))
  if (word) {
    quoted <- paste0("\\Q", gsub("\\E", "\\E\\\\E\\Q", from, fixed = TRUE), "\\E")
    pattern <- paste0("(?<!\\S)", quoted, "(?!\\S)")
    hits <- gregexpr(pattern, text, perl = TRUE)[[1L]]
    count <- if (hits[1L] < 0L) 0L else length(hits)
    value <- if (all) gsub(pattern, to, text, perl = TRUE) else sub(pattern, to, text, perl = TRUE)
  } else {
    hits <- gregexpr(from, text, fixed = TRUE)[[1L]]
    count <- if (hits[1L] < 0L) 0L else length(hits)
    value <- if (all) gsub(from, to, text, fixed = TRUE) else sub(from, to, text, fixed = TRUE)
  }
  if (!all && count > 1L) count <- 1L
  list(value = value, count = as.integer(count))
}`);
  if (features.has('fillin')) blocks.push(`stata_fillin <- function(DT, vars) {
  if (!length(vars)) return(DT)
  levels <- setNames(lapply(vars, function(v) unique(DT[[v]])), vars)
  grid <- do.call(data.table::CJ, c(levels, list(sorted = FALSE, unique = TRUE)))
  original <- data.table::copy(DT)[, .__do2r_present__ := TRUE]
  out <- merge(grid, original, by = vars, all.x = TRUE, sort = FALSE, allow.cartesian = TRUE)
  out[, \`_fillin\` := as.integer(is.na(.__do2r_present__))]
  out[, .__do2r_present__ := NULL]
  out
}`);
  if (features.has('split')) blocks.push(`stata_split <- function(DT, var, stub = var, pattern = "\\\\s+", limit = Inf, subset = rep(TRUE, nrow(DT)), trim = TRUE, destring = FALSE, ignore = NULL, force = FALSE, percent = FALSE) {
  idx <- which(!is.na(subset) & subset)
  x <- as.character(DT[[var]][idx])
  if (trim) x <- trimws(x)
  parts <- strsplit(x, pattern, perl = TRUE)
  nout <- if (!length(parts)) 0L else max(lengths(parts))
  if (is.finite(limit)) nout <- min(nout, as.integer(limit))
  created <- paste0(stub, seq_len(nout))
  invisible(lapply(seq_len(nout), function(j) {
    out <- rep(NA_character_, nrow(DT))
    vals <- vapply(parts, function(z) if (length(z) >= j) z[j] else "", character(1L))
    out[idx] <- vals
    if (destring) {
      z <- out
      if (!is.null(ignore) && nzchar(ignore)) z <- Reduce(function(.x, ch) gsub(ch, "", .x, fixed = TRUE), strsplit(ignore, "", fixed = TRUE)[[1L]], init = z)
      if (percent) z <- gsub("%", "", z, fixed = TRUE)
      num <- suppressWarnings(as.numeric(z))
      if (percent) num <- num / 100
      convertible <- is.na(z) | !nzchar(z) | !is.na(num)
      if (force || all(convertible)) out <- num
    }
    data.table::set(DT, j = created[j], value = out)
    NULL
  }))
  invisible(created)
}`);
  if (features.has('separate')) blocks.push(`stata_separate <- function(DT, var, group, stub = var, subset = rep(TRUE, nrow(DT)), sequential = FALSE, include_missing = FALSE) {
  if (length(group) == 1L) group <- rep(group, nrow(DT))
  idx <- !is.na(subset) & subset
  levels <- unique(group[idx])
  if (!include_missing) levels <- levels[!is.na(levels)]
  nonmissing <- levels[!is.na(levels)]
  numeric_suffix <- !sequential && is.numeric(group) && length(nonmissing) && all(nonmissing >= 0 & nonmissing < 10000 & nonmissing == trunc(nonmissing))
  created <- vapply(seq_along(levels), function(seqno) {
    lev <- levels[seqno]
    suffix <- if (is.na(lev)) "_" else if (numeric_suffix) as.character(as.integer(lev)) else as.character(seqno)
    name <- paste0(stub, suffix)
    hit <- idx & if (is.na(lev)) is.na(group) else !is.na(group) & group == lev
    out <- DT[[var]]
    out[!hit] <- NA
    data.table::set(DT, j = name, value = out)
    name
  }, character(1L))
  invisible(created)
}`);
  if (features.has('stack')) blocks.push(`stata_stack <- function(DT, vars, into) {
  if (!length(into) || length(vars) %% length(into)) stop("stack: number of source variables must be a multiple of length(into)")
  groups <- split(vars, ceiling(seq_along(vars) / length(into)))
  data.table::rbindlist(lapply(seq_along(groups), function(g) {
    z <- data.table::copy(DT[, .SD, .SDcols = groups[[g]]])
    data.table::setnames(z, into)
    z[, \`_stack\` := as.integer(g)]
    data.table::setcolorder(z, c("_stack", into))
    z
  }), use.names = TRUE, fill = TRUE)
}`);
  if (features.has('xpose')) blocks.push(`stata_xpose <- function(DT, varname = FALSE) {
  vars <- names(DT)[vapply(DT, is.numeric, logical(1L))]
  if (!length(vars)) return(data.table::data.table())
  out <- data.table::as.data.table(t(as.matrix(DT[, .SD, .SDcols = vars])))
  data.table::setnames(out, paste0("v", seq_len(ncol(out))))
  if (varname) {
    out[, \`_varname\` := vars]
    data.table::setcolorder(out, c("_varname", setdiff(names(out), "_varname")))
  }
  out
}`);
  if (features.has('obs')) blocks.push(`stata_set_obs <- function(DT, n) {
  n <- as.integer(n)
  if (n < nrow(DT)) stop("set obs cannot reduce the current number of observations")
  if (n == nrow(DT)) return(DT)
  if (!ncol(DT)) return(data.table::data.table(.__do2r_obs__ = seq_len(n)))
  blank <- DT[rep(NA_integer_, n - nrow(DT))]
  data.table::rbindlist(list(DT, blank), use.names = TRUE, fill = TRUE)
}
stata_insobs <- function(DT, n, before = NULL, after = NULL) {
  n <- as.integer(n)
  if (n <= 0L) return(DT)
  if (!ncol(DT)) return(stata_set_obs(DT, nrow(DT) + n))
  blank <- DT[rep(NA_integer_, n)]
  if (!is.null(before)) k <- max(0L, min(nrow(DT), as.integer(before) - 1L))
  else if (!is.null(after)) k <- max(0L, min(nrow(DT), as.integer(after)))
  else k <- nrow(DT)
  data.table::rbindlist(list(DT[seq_len(k)], blank, if (k < nrow(DT)) DT[(k + 1L):nrow(DT)] else DT[0]), use.names = TRUE, fill = TRUE)
}`);
  if (features.has('ipolate')) blocks.push(`stata_ipolate <- function(x, y, subset = rep(TRUE, length(x)), epolate = FALSE) {
  out <- rep(NA_real_, length(y))
  idx <- !is.na(subset) & subset
  ok <- idx & !is.na(x) & !is.na(y)
  target <- idx & !is.na(x)
  if (sum(ok) >= 2L) out[target] <- stats::approx(x[ok], y[ok], xout = x[target], rule = if (epolate) 2L else 1L, ties = "ordered")$y
  out[ok] <- y[ok]
  out
}`);
  if (features.has('assertnested')) blocks.push(`stata_assertnested <- function(DT, vars, within = character(), missing = FALSE) {
  check <- function(v) {
    if (length(v) < 2L) return(invisible(TRUE))
    invisible(lapply(2:length(v), function(j) {
      z <- DT[, .SD, .SDcols = v[seq_len(j)]]
      if (!missing) z <- z[stats::complete.cases(z)]
      child <- v[j]; parent <- v[seq_len(j - 1L)]
      bad <- z[, data.table::uniqueN(.SD), by = child, .SDcols = parent][V1 > 1L]
      if (nrow(bad)) stop(sprintf("assertnested failed: %s is not nested within %s", child, paste(parent, collapse = ", ")))
      NULL
    }))
    invisible(TRUE)
  }
  if (!length(within)) check(vars) else invisible(lapply(within, function(w) check(c(w, vars))))
  invisible(TRUE)
}`);

  if (features.has('recode')) blocks.push(`stata_recode <- function(.x, ...) {
  args <- list(...); out <- .x; done <- rep(FALSE, length(.x))
  for (i in seq(1L, length(args), by = 2L)) {
    hit <- args[[i]] & !done; hit[is.na(hit)] <- FALSE
    val <- args[[i + 1L]]; out[hit] <- if (length(val) == 1L) val else val[hit]
    done[hit] <- TRUE
  }
  out
}`);
  if (features.has('reshape')) blocks.push(`stata_reshape_long <- function(DT, stubs, i, j) {
  parts <- lapply(stubs, function(stub) {
    cols <- grep(paste0("^", stub), names(DT), value = TRUE)
    z <- data.table::melt(DT, id.vars = i, measure.vars = cols, variable.name = ".__name", value.name = stub)
    z[, (j) := type.convert(sub(paste0("^", stub), "", .__name), as.is = TRUE)]
    z[, .__name := NULL]
    z
  })
  Reduce(function(x, y) merge(x, y, by = c(i, j), all = TRUE), parts)
}
stata_reshape_wide <- function(DT, stubs, i, j) {
  data.table::dcast(DT, stats::as.formula(paste(paste(i, collapse = " + "), "~", j)), value.var = stubs, sep = "")
}`);
  if (features.has('datetime')) blocks.push(`stata_as_date <- function(x) {
  if (inherits(x, "Date")) return(x)
  if (inherits(x, "POSIXt")) return(as.Date(x, tz = "UTC"))
  if (is.numeric(x)) return(as.Date(x, origin = "1960-01-01"))
  as.Date(x)
}
stata_date <- function(x, mask = "DMY", topyear = 2029L) {
  if (is.numeric(x) || inherits(x, "Date")) return(stata_as_date(x))
  key <- toupper(gsub("[^A-Za-z]", "", as.character(mask)[1L]))
  formats <- switch(key,
    DMY = c("%d%b%Y", "%d %b %Y", "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d%b%y", "%d/%m/%y"),
    MDY = c("%b%d%Y", "%b %d %Y", "%m/%d/%Y", "%m-%d-%Y", "%m.%d.%Y", "%m/%d/%y"),
    YMD = c("%Y%b%d", "%Y %b %d", "%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d", "%y-%m-%d"),
    c("%Y-%m-%d", "%d%b%Y", "%m/%d/%Y", "%d/%m/%Y")
  )
  init <- as.Date(rep(NA_character_, length(x)))
  Reduce(function(acc, fmt) {
    parsed <- suppressWarnings(as.Date(as.character(x), format = fmt))
    take <- is.na(acc) & !is.na(parsed)
    acc[take] <- parsed[take]
    acc
  }, formats, init = init)
}
stata_clock <- function(x, mask = "DMYhms", tz = "UTC") {
  if (inherits(x, "POSIXt")) return(as.POSIXct(x, tz = tz))
  if (is.numeric(x)) return(as.POSIXct(x / 1000, origin = "1960-01-01", tz = tz))
  key <- gsub("[^A-Za-z]", "", as.character(mask)[1L])
  formats <- switch(key,
    DMYhms = c("%d%b%Y %H:%M:%OS", "%d %b %Y %H:%M:%OS", "%d/%m/%Y %H:%M:%OS"),
    MDYhms = c("%b%d%Y %H:%M:%OS", "%b %d %Y %H:%M:%OS", "%m/%d/%Y %H:%M:%OS"),
    YMDhms = c("%Y%b%d %H:%M:%OS", "%Y-%m-%d %H:%M:%OS", "%Y/%m/%d %H:%M:%OS"),
    DMYhm = c("%d%b%Y %H:%M", "%d/%m/%Y %H:%M"),
    MDYhm = c("%b%d%Y %H:%M", "%m/%d/%Y %H:%M"),
    YMDhm = c("%Y%b%d %H:%M", "%Y-%m-%d %H:%M"),
    c("%Y-%m-%d %H:%M:%OS", "%d%b%Y %H:%M:%OS", "%m/%d/%Y %H:%M:%OS")
  )
  init <- as.POSIXct(rep(NA_real_, length(x)), origin = "1970-01-01", tz = tz)
  Reduce(function(acc, fmt) {
    parsed <- suppressWarnings(as.POSIXct(as.character(x), format = fmt, tz = tz))
    take <- is.na(acc) & !is.na(parsed)
    acc[take] <- parsed[take]
    acc
  }, formats, init = init)
}
stata_mdy <- function(m, d, y) as.Date(sprintf("%04d-%02d-%02d", as.integer(y), as.integer(m), as.integer(d)))
stata_dmy <- function(d, m, y) stata_mdy(m, d, y)
stata_ymd <- function(y, m, d) stata_mdy(m, d, y)
stata_year <- function(x) as.integer(format(stata_as_date(x), "%Y"))
stata_month <- function(x) as.integer(format(stata_as_date(x), "%m"))
stata_day <- function(x) as.integer(format(stata_as_date(x), "%d"))
stata_dow <- function(x) as.integer(format(stata_as_date(x), "%w"))
stata_doy <- function(x) as.integer(format(stata_as_date(x), "%j"))
stata_quarter <- function(x) (stata_month(x) - 1L) %/% 3L + 1L
stata_halfyear <- function(x) (stata_month(x) - 1L) %/% 6L + 1L
stata_dofm <- function(x) { x <- as.integer(x); stata_mdy(x %% 12L + 1L, 1L, 1960L + x %/% 12L) }
stata_mofd <- function(x) { d <- stata_as_date(x); (stata_year(d) - 1960L) * 12L + stata_month(d) - 1L }
stata_dofq <- function(x) { x <- as.integer(x); stata_mdy((x %% 4L) * 3L + 1L, 1L, 1960L + x %/% 4L) }
stata_qofd <- function(x) { d <- stata_as_date(x); (stata_year(d) - 1960L) * 4L + stata_quarter(d) - 1L }
stata_dofh <- function(x) { x <- as.integer(x); stata_mdy((x %% 2L) * 6L + 1L, 1L, 1960L + x %/% 2L) }
stata_hofd <- function(x) { d <- stata_as_date(x); (stata_year(d) - 1960L) * 2L + stata_halfyear(d) - 1L }
stata_dofy <- function(x) stata_mdy(1L, 1L, as.integer(x) + 1960L)
stata_yofd <- function(x) stata_year(x) - 1960L
stata_dofc <- function(x) {
  if (inherits(x, "POSIXt")) return(as.Date(x, tz = "UTC"))
  if (is.numeric(x)) return(as.Date(as.POSIXct(x / 1000, origin = "1960-01-01", tz = "UTC"), tz = "UTC"))
  as.Date(x)
}
stata_cofd <- function(x) as.POSIXct(stata_as_date(x), tz = "UTC")`);
  if (features.has('tsops')) blocks.push(`stata_ts_shift <- function(x, n = 1L, type = c("lag", "lead"), panel = NULL, time = NULL, delta = 1) {
  type <- match.arg(type)
  n <- as.integer(n)
  if (is.null(panel)) {
    shifted <- data.table::shift(x, n, type = type)
    time_shifted <- if (is.null(time)) NULL else data.table::shift(time, n, type = type)
  } else {
    z <- data.table::data.table(.x = x, .panel = panel, .time = if (is.null(time)) seq_along(x) else time)
    z[, .shifted := data.table::shift(.x, n, type = type), by = .panel]
    shifted <- z$.shifted
    time_shifted <- if (is.null(time)) NULL else z[, data.table::shift(.time, n, type = type), by = .panel]$V1
  }
  if (!is.null(time_shifted) && (is.numeric(time) || inherits(time, "Date"))) {
    gap <- abs(as.numeric(time - time_shifted)) != n * as.numeric(delta)
    shifted[!is.na(gap) & gap] <- NA
  }
  shifted
}
stata_ts_diff <- function(x, n = 1L, panel = NULL, time = NULL, delta = 1) {
  Reduce(function(z, i) z - stata_ts_shift(z, 1L, "lag", panel, time, delta), seq_len(as.integer(n)), init = x)
}
stata_ts_seasonal_diff <- function(x, n = 1L, panel = NULL, time = NULL, delta = 1) {
  x - stata_ts_shift(x, as.integer(n), "lag", panel, time, delta)
}`);
  if (features.has('mata_mean')) blocks.push(`mata_mean <- function(x) if (is.null(dim(x))) mean(x) else colMeans(x)`);
  if (features.has('pctile')) blocks.push(`stata_quantile <- function(x, probs, altdef = FALSE) {
  x <- x[!is.na(x)]
  if (!length(x)) return(rep(NA_real_, length(probs)))
  as.numeric(stats::quantile(x, probs = probs, na.rm = TRUE, names = FALSE, type = if (altdef) 6L else 2L))
}
stata_xtile <- function(x, cutpoints) {
  out <- findInterval(x, cutpoints, left.open = TRUE) + 1L
  out[is.na(x)] <- NA_integer_
  as.integer(out)
}`);
  if (features.has('summarize')) blocks.push(`stata_summarize <- function(x, detail = FALSE) {
  z <- list(N = sum(!is.na(x)), mean = mean(x, na.rm = TRUE), sd = sd(x, na.rm = TRUE), min = min(x, na.rm = TRUE), max = max(x, na.rm = TRUE))
  if (detail) {
    p <- stats::quantile(x, probs = c(.01, .05, .10, .25, .50, .75, .90, .95, .99), na.rm = TRUE, names = FALSE, type = 2L)
    names(p) <- c("p1", "p5", "p10", "p25", "p50", "p75", "p90", "p95", "p99")
    z <- c(z, as.list(p))
  }
  z
}`);
  if (features.has('tabstat')) blocks.push(`stata_tabstat <- function(DT, vars, stats = "mean sd min max", by = NULL) {
  fs <- strsplit(trimws(stats), "\\\\s+")[[1L]]
  one <- function(x, f) switch(tolower(f), mean = mean(x, na.rm = TRUE), sd = sd(x, na.rm = TRUE), min = min(x, na.rm = TRUE), max = max(x, na.rm = TRUE), n = sum(!is.na(x)), count = sum(!is.na(x)), p50 = median(x, na.rm = TRUE), median = median(x, na.rm = TRUE), NA_real_)
  calc <- function(.SD) unlist(lapply(names(.SD), function(v) setNames(vapply(fs, function(f) one(.SD[[v]], f), numeric(1L)), paste(v, fs, sep = "_"))))
  if (is.null(by)) return(DT[, as.list(calc(.SD)), .SDcols = vars])
  DT[, as.list(calc(.SD)), by = by, .SDcols = vars]
}`);
  if (features.has('marginsplot')) blocks.push(`stata_marginsplot <- function(x) {
  d <- as.data.frame(x)
  est <- intersect(c("estimate", "Estimate"), names(d))[1L]
  lo <- intersect(c("conf.low", "conf_low", "2.5 %"), names(d))[1L]
  hi <- intersect(c("conf.high", "conf_high", "97.5 %"), names(d))[1L]
  reserved <- c("estimate", "Estimate", "std.error", "Std. Error", "statistic", "p.value", "s.value", "conf.low", "conf.high", "conf_low", "conf_high", "df", "term", "contrast", "type", "rowid")
  dims <- setdiff(names(d), reserved)
  if (!length(est)) stop("Could not identify an estimate column in translated margins output.", call. = FALSE)
  if (!length(dims)) { d$.__index <- seq_len(nrow(d)); dims <- ".__index" }
  xvar <- dims[1L]
  p <- ggplot2::ggplot(d, ggplot2::aes(x = .data[[xvar]], y = .data[[est]])) + ggplot2::geom_point()
  if (length(lo) && length(hi)) p <- p + ggplot2::geom_errorbar(ggplot2::aes(ymin = .data[[lo]], ymax = .data[[hi]]), width = 0.1)
  p + ggplot2::labs(x = xvar, y = "Estimate")
}`);
  if (features.has('stcurve')) blocks.push(`stata_stcurve <- function(model, type = c("survival", "failure", "hazard", "cumhaz")) {
  type <- match.arg(type)
  if (inherits(model, "flexsurvreg")) {
    if (type == "failure") {
      s <- summary(model, type = "survival")
      z <- s[[1L]]
      graphics::plot(z$time, 1 - z$est, type = "l", xlab = "Time", ylab = "Failure probability")
      return(invisible(z))
    }
    return(plot(model, type = type))
  }
  if (inherits(model, "coxph")) {
    sf <- survival::survfit(model)
    if (type == "hazard") stop("Direct hazard plotting after coxph needs smoothing; translate manually for publication use.", call. = FALSE)
    fun <- if (type == "failure") "event" else if (type == "cumhaz") "cumhaz" else NULL
    if (is.null(fun)) plot(sf) else plot(sf, fun = fun)
    return(invisible(sf))
  }
  stop("stata_stcurve supports translated flexsurvreg and coxph models.", call. = FALSE)
}`);
  if (features.has('reporting')) blocks.push(`stata_table <- function(DT, dimensions, statistics = character(), totals = TRUE) {
  dimensions <- as.character(dimensions)
  statistics <- as.character(statistics)
  stopifnot(length(dimensions) > 0L, all(dimensions %in% names(DT)))
  parse_stat <- function(spec) {
    bits <- strsplit(trimws(spec), "\\s+")[[1L]]
    list(stat = tolower(bits[1L]), var = if (length(bits) > 1L) bits[2L] else "")
  }
  calc <- function(stat, var, n_group) {
    if (stat %in% c("frequency", "freq")) return(n_group)
    if (stat == "percent") return(100 * n_group / nrow(DT))
    if (!nzchar(var) || !var %in% names(DT)) return(NA_real_)
    x <- get(var)
    switch(stat,
      mean = mean(x, na.rm = TRUE), sd = stats::sd(x, na.rm = TRUE),
      sum = sum(x, na.rm = TRUE), min = min(x, na.rm = TRUE), max = max(x, na.rm = TRUE),
      median = stats::median(x, na.rm = TRUE), p50 = stats::median(x, na.rm = TRUE),
      count = sum(!is.na(x)), n = sum(!is.na(x)),
      semean = stats::sd(x, na.rm = TRUE) / sqrt(sum(!is.na(x))),
      variance = stats::var(x, na.rm = TRUE), NA_real_)
  }
  if (!length(statistics)) return(DT[, .(frequency = .N), by = dimensions])
  parsed <- lapply(statistics, parse_stat)
  DT[, {
    vals <- lapply(parsed, function(z) calc(z$stat, z$var, .N))
    nms <- vapply(parsed, function(z) if (nzchar(z$var)) paste(z$stat, z$var, sep = "_") else z$stat, character(1L))
    stats::setNames(vals, make.unique(nms))
  }, by = dimensions]
}
stata_dtable <- function(DT, variables, categorical = character(), by = NULL, continuous_stats = c("mean", "sd")) {
  variables <- unique(as.character(variables))
  categorical <- unique(as.character(categorical))
  stopifnot(all(variables %in% names(DT)))
  if (!is.null(by)) stopifnot(length(by) == 1L, by %in% names(DT))
  one_cont <- function(v) {
    calc <- function(x) {
      out <- lapply(continuous_stats, function(st) switch(tolower(st),
        n = sum(!is.na(x)), count = sum(!is.na(x)), mean = mean(x, na.rm = TRUE),
        sd = stats::sd(x, na.rm = TRUE), se = stats::sd(x, na.rm = TRUE) / sqrt(sum(!is.na(x))),
        semean = stats::sd(x, na.rm = TRUE) / sqrt(sum(!is.na(x))),
        min = min(x, na.rm = TRUE), max = max(x, na.rm = TRUE),
        median = stats::median(x, na.rm = TRUE), p50 = stats::median(x, na.rm = TRUE), NA_real_))
      stats::setNames(out, continuous_stats)
    }
    z <- if (is.null(by)) data.table::as.data.table(calc(DT[[v]])) else DT[, as.list(calc(get(v))), by = by]
    z[, variable := v]
    z[, level := NA_character_]
    z
  }
  one_cat <- function(v) {
    groups <- if (is.null(by)) v else c(by, v)
    z <- DT[!is.na(get(v)), .(N = .N), by = groups]
    if (is.null(by)) z[, percent := 100 * N / sum(N)] else z[, percent := 100 * N / sum(N), by = by]
    z[, variable := v]
    z[, level := as.character(get(v))]
    z[, (v) := NULL]
    z
  }
  parts <- lapply(variables, function(v) if (v %in% categorical || !is.numeric(DT[[v]])) one_cat(v) else one_cont(v))
  data.table::rbindlist(parts, use.names = TRUE, fill = TRUE)
}`);
  if (features.has('reportexport')) blocks.push(`stata_collect_export <- function(x, path, replace = FALSE) {
  path <- as.character(path)[1L]
  if (file.exists(path) && !replace) stop(sprintf("File exists: %s", path), call. = FALSE)
  ext <- tolower(tools::file_ext(path))
  if (ext == "csv") data.table::fwrite(as.data.frame(x), path)
  else if (ext %in% c("tsv", "txt")) data.table::fwrite(as.data.frame(x), path, sep = "\\t")
  else if (ext %in% c("xlsx", "xlsm")) openxlsx::write.xlsx(as.data.frame(x), path, overwrite = replace)
  else stop("Translated collect export currently supports .csv, .tsv/.txt, .xlsx, and .xlsm output.", call. = FALSE)
  invisible(path)
}`);
  return blocks;
}

function buildHeader(ctx) {
  if (!ctx.options.addHeader) return '';
  const packages = new Set(['data.table']);
  const featurePackages = {
    haven: 'haven', glue: 'glue', fixest: 'fixest', plm: 'plm', MASS: 'MASS', quantreg: 'quantreg', AER: 'AER',
    nnet: 'nnet', survival: 'survival', flexsurv: 'flexsurv', marginaleffects: 'marginaleffects', car: 'car', modelsummary: 'modelsummary', ggplot2: 'ggplot2', readxl: 'readxl', openxlsx: 'openxlsx', arrow: 'arrow', survey: 'survey', lme4: 'lme4', ordinal: 'ordinal', urca: 'urca', vars: 'vars', reticulate: 'reticulate', collapse: 'collapse', geepack: 'geepack', mFilter: 'mFilter'
  };
  for (const [f, p] of Object.entries(featurePackages)) if (ctx.features.has(f)) packages.add(p);
  const lines = [
    '# Translated from Stata by do2R',
    '# Review every warning/TODO and validate statistical results against the original workflow.',
    `# Packages used: ${[...packages].join(', ')}`,
    '',
    'library(data.table)'
  ];
  const helpers = helperBlocks(ctx.features, ctx.defaultData);
  if (helpers.length) lines.push(
    '',
    '# ============================================================================',
    '# Compatibility helpers (generated support code; not direct Stata translation)',
    '# ============================================================================',
    ...helpers.flatMap((b, i) => [...(i ? [''] : []), ...formatRLines(String(b).split('\n'))])
  );
  lines.push(
    '',
    '# ============================================================================',
    '# Translated Stata code',
    '# ============================================================================'
  );
  return `${lines.join('\n')}\n\n`;
}

export function translateStata(source, options = {}) {
  const defaultData = cleanIdentifier(options.dataName || 'dt', 'dt');
  const ctx = {
    options: { addHeader: options.addHeader !== false, sourceComments: Boolean(options.sourceComments), strictMode: options.strictMode !== false },
    defaultData,
    currentData: defaultData,
    features: new Set(),
    macros: new Map(),
    factorBases: new Map(),
    mataTypes: new Map(),
    mata: false, inputMode: null, pythonMode: false, pythonBuffer: [], pythonStartLine: null,
    indent: 0,
    stack: [],
    frames: new Set([defaultData]),
    preserveStack: [], preserveCounter: 0,
    modelCounter: 0, lastModel: '', lastModelKind: '', tableCounter: 0, lastTable: '', lastMargins: '', lastIrf: '', panel: null, survival: null, survey: null,
    diagnostics: [], counts: { exact: 0, heuristic: 0, review: 0 }, statements: 0
  };

  const out = [];
  const sourceMap = [];
  const appendLines = lines => {
    for (const line of (Array.isArray(lines) ? lines : [lines])) out.push(...String(line ?? '').split('\n'));
  };

  for (const rec of logicalLines(source)) {
    const beforeIndent = ctx.indent;
    const translated = ctx.mata ? translateMataLine(rec.text, ctx, rec) : translateStataLine(rec.text, ctx, rec);
    const isStatement = translated.statement !== false && rec.text.trim() !== '' && !/^\s*(\*|\/\/)/.test(rec.text);
    if (isStatement) {
      ctx.statements += 1;
      ctx.counts[translated.confidence] = (ctx.counts[translated.confidence] || 0) + 1;
    }
    ctx.diagnostics.push(...(translated.diagnostics || []));

    let level = beforeIndent;
    if (translated.closing) level = ctx.indent;
    if (translated.opened || (ctx.indent > beforeIndent && !translated.preindented)) level = beforeIndent;
    if (translated.rawIndent) level = ctx.indent;

    const rStartBody = out.length + 1;
    if (ctx.options.sourceComments && isStatement && translated.lines.some(x => x && !/^\s*#/.test(x))) {
      appendLines(`${'  '.repeat(level)}# Stata L${rec.line}: ${rec.text.trim()}`);
    }

    let renderedLines = formatRLines(translated.lines);
    const attachedComments = (rec.comments || []).map(x => String(x).trim()).filter(Boolean);
    if (attachedComments.length) {
      const lastCode = [...renderedLines].map((x, i) => [String(x ?? ''), i]).reverse().find(([x]) => x.trim() && !/^\s*#/.test(x));
      if (lastCode) {
        renderedLines[lastCode[1]] = `${lastCode[0]} # ${attachedComments[0]}`;
        renderedLines.push(...attachedComments.slice(1).map(x => `# ${x}`));
      } else {
        renderedLines = [...renderedLines.filter(x => String(x ?? '').trim()), ...attachedComments.map(x => `# ${x}`)];
      }
    }
    appendLines(indentLines(renderedLines, level, translated));
    const rEndBody = Math.max(rStartBody, out.length);
    if (translated.map !== false) sourceMap.push({
      sourceStart: translated.sourceStart || rec.line,
      sourceEnd: translated.sourceEnd || rec.endLine || rec.line,
      rStart: rStartBody,
      rEnd: rEndBody,
      confidence: translated.confidence,
      statement: isStatement
    });
  }

  while (ctx.stack.length) {
    const frame = ctx.stack.pop(); ctx.indent = Math.max(0, ctx.indent - 1);
    const closers = Array.isArray(frame.close) ? frame.close : [frame.close || '}'];
    appendLines(`${'  '.repeat(ctx.indent)}# TODO: source ended before this ${frame.type} block was closed`);
    appendLines(indentLines(closers, ctx.indent));
    ctx.diagnostics.push(diag(null, 'review', `Source ended with an unclosed ${frame.type} block.`, ''));
    ctx.counts.review += 1; ctx.statements += 1;
  }
  if (ctx.mata) {
    appendLines('# TODO: source ended before Mata end');
    ctx.diagnostics.push(diag(null, 'review', 'Source ended while still inside a Mata block.', ''));
  }
  if (ctx.pythonMode) {
    appendLines('# TODO: source ended before Python block end');
    ctx.diagnostics.push(diag(ctx.pythonStartLine, 'review', 'Source ended while still inside a python: block.', ''));
    ctx.counts.review += 1; ctx.statements += 1;
  }
  if (ctx.inputMode) {
    appendLines('# TODO: source ended before input block end');
    ctx.diagnostics.push(diag(null, 'review', 'Source ended while still inside an input block.', ''));
    ctx.counts.review += 1; ctx.statements += 1;
  }

  const coverage = ctx.statements ? Math.round(100 * (ctx.counts.exact + ctx.counts.heuristic) / ctx.statements) : 0;
  const header = buildHeader(ctx);
  const headerLineOffset = (header.match(/\n/g) || []).length;
  const code = `${header}${out.join('\n')}${out.length ? '\n' : ''}`;
  return {
    code,
    diagnostics: ctx.diagnostics,
    counts: ctx.counts,
    statements: ctx.statements,
    coverage,
    packages: [...ctx.features],
    sourceMap: sourceMap.map(x => ({ ...x, rStart: x.rStart + headerLineOffset, rEnd: x.rEnd + headerLineOffset }))
  };
}
