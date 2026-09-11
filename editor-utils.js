const STATA_KEYWORDS = new Set(`
  clear use save import export merge append joinby cross fillin reshape collapse generate gen replace egen
  keep drop rename sort gsort order by bysort if in quietly noisily capture preserve restore
  regress reg areg xtreg logit logistic probit poisson nbreg qreg tobit ologit oprobit mlogit clogit glm ivregress
  mixed meglm melogit meprobit mecloglog meologit meoprobit mepoisson menbreg svy svyset mean total proportion tabulate summarize tabstat correlate pwcorr
  arima arch var vec dfuller corrgram tsset xtset tsfill tsappend tssmooth tsline tsreport
  predict margins test testnl estat estimates histogram kdensity scatter line twoway graph
  local global macro tempfile tempvar tempname scalar matrix program define syntax args return ereturn display version
  foreach forvalues while continue break exit end mata input set seed obs format label encode decode destring tostring
  frame frget frlink putexcel tokenize gettoken fralias levelsof unab numlist confirm statsby bootstrap jackknife permute simulate rolling
  real string complex transmorphic void scalar vector rowvector colvector class struct function
`.trim().split(/\s+/));

const R_KEYWORDS = new Set(`if else repeat while function for in next break TRUE FALSE NULL Inf NaN NA NA_integer_ NA_real_ NA_complex_ NA_character_`.split(/\s+/));
const STATA_SPECIAL = new Set(['_n', '_N', '_pi', '_cons', '_rc', 'r', 'e', 's', 'c']);

function escapeHtml(text) {
  return String(text).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function span(type, value) {
  return `<span class="tok-${type}">${escapeHtml(value)}</span>`;
}

function nextNonSpace(line, at) {
  let i = at;
  while (i < line.length && /\s/.test(line[i])) i += 1;
  return line[i] || '';
}

function highlightStataLine(line, state) {
  let i = 0;
  let out = '';
  const firstNonSpace = line.search(/\S/);
  while (i < line.length) {
    if (state.blockComment) {
      const end = line.indexOf('*/', i);
      if (end < 0) return out + span('comment', line.slice(i));
      out += span('comment', line.slice(i, end + 2));
      state.blockComment = false;
      i = end + 2;
      continue;
    }
    if (i === firstNonSpace && line[i] === '*') return out + span('comment', line.slice(i));
    if (line.startsWith('//', i)) return out + span('comment', line.slice(i));
    if (line.startsWith('/*', i)) {
      const end = line.indexOf('*/', i + 2);
      if (end < 0) {
        state.blockComment = true;
        return out + span('comment', line.slice(i));
      }
      out += span('comment', line.slice(i, end + 2));
      i = end + 2;
      continue;
    }
    if (line.startsWith('`"', i)) {
      const end = line.indexOf("\"'", i + 2);
      const stop = end < 0 ? line.length : end + 2;
      out += span('string', line.slice(i, stop));
      i = stop;
      continue;
    }
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '"') { j += 1; break; }
        j += 1;
      }
      out += span('string', line.slice(i, j));
      i = j;
      continue;
    }
    if (line[i] === '`') {
      let depth = 1;
      let j = i + 1;
      while (j < line.length && depth > 0) {
        if (line[j] === '`') depth += 1;
        else if (line[j] === "'") depth -= 1;
        j += 1;
      }
      if (depth === 0) {
        out += span('macro', line.slice(i, j));
        i = j;
        continue;
      }
    }
    if (line[i] === '$') {
      if (line[i + 1] === '{') {
        let depth = 1; let j = i + 2;
        while (j < line.length && depth > 0) {
          if (line[j] === '{') depth += 1;
          else if (line[j] === '}') depth -= 1;
          j += 1;
        }
        if (depth === 0) { out += span('macro', line.slice(i, j)); i = j; continue; }
      }
      const m = line.slice(i).match(/^\$[A-Za-z_]\w*/);
      if (m) { out += span('macro', m[0]); i += m[0].length; continue; }
    }
    const fv = line.slice(i).match(/^(?:(?:ib|b)(?:\d+|first|last)?|bn|i|c|o)\.(?=[A-Za-z_])/i);
    if (fv) { out += span('special', fv[0]); i += fv[0].length; continue; }
    const ts = line.slice(i).match(/^(?:[LFDS]\d*\.?)+(?:\([^)]*\))?\.(?=[A-Za-z_(])/i);
    if (ts) { out += span('special', ts[0]); i += ts[0].length; continue; }
    const num = line.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (num) { out += span('number', num[0]); i += num[0].length; continue; }
    const word = line.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (word) {
      const value = word[0];
      const lower = value.toLowerCase();
      const after = nextNonSpace(line, i + value.length);
      const type = STATA_KEYWORDS.has(lower) ? 'keyword' : STATA_SPECIAL.has(value) ? 'special' : after === '(' ? 'function' : 'plain';
      out += type === 'plain' ? escapeHtml(value) : span(type, value);
      i += value.length;
      continue;
    }
    const op = line.slice(i).match(/^(?:##|!=|~=|<=|>=|==|\|\||&&|\+|-|\*|\/|\^|=|<|>|&|\||#|:|,|\.|\\)/);
    if (op) { out += span('operator', op[0]); i += op[0].length; continue; }
    out += escapeHtml(line[i]);
    i += 1;
  }
  return out;
}

function highlightRLine(line) {
  let i = 0;
  let out = '';
  while (i < line.length) {
    if (line[i] === '#') return out + span('comment', line.slice(i));
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '\\') { j += 2; continue; }
        if (line[j] === quote) { j += 1; break; }
        j += 1;
      }
      out += span(quote === '`' ? 'macro' : 'string', line.slice(i, j));
      i = j;
      continue;
    }
    const num = line.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?L?/);
    if (num) { out += span('number', num[0]); i += num[0].length; continue; }
    const percentOp = line.slice(i).match(/^%[^%\s]+%/);
    if (percentOp) { out += span('operator', percentOp[0]); i += percentOp[0].length; continue; }
    const word = line.slice(i).match(/^[A-Za-z_.][A-Za-z0-9._]*/);
    if (word) {
      const value = word[0];
      const afterIndex = i + value.length;
      const after = nextNonSpace(line, afterIndex);
      const namespace = line.slice(afterIndex).match(/^\s*:::{0,1}/);
      const type = R_KEYWORDS.has(value) ? 'keyword' : namespace ? 'namespace' : after === '(' ? 'function' : /^NA(?:_|$)/.test(value) ? 'special' : 'plain';
      out += type === 'plain' ? escapeHtml(value) : span(type, value);
      i += value.length;
      continue;
    }
    const op = line.slice(i).match(/^(?:::|:::|<-|->>|->|<<-|<=|>=|==|!=|&&|\|\||:=|\+|-|\*|\/|\^|=|<|>|&|\||~|!|\$|@|:|,)/);
    if (op) { out += span('operator', op[0]); i += op[0].length; continue; }
    out += escapeHtml(line[i]);
    i += 1;
  }
  return out;
}

export function highlightCodeLines(code, language = 'r') {
  const lines = String(code ?? '').replace(/\r\n?/g, '\n').split('\n');
  const state = { blockComment: false };
  const stata = String(language).toLowerCase() === 'stata';
  return lines.map(line => stata ? highlightStataLine(line, state) : highlightRLine(line));
}

export function highlightCode(code, language = 'r') {
  return highlightCodeLines(code, language).join('\n');
}

export function lineAtOffset(text, offset) {
  const s = String(text ?? '');
  const stop = Math.max(0, Math.min(Number(offset) || 0, s.length));
  let line = 1;
  for (let i = 0; i < stop; i += 1) if (s.charCodeAt(i) === 10) line += 1;
  return line;
}

export function lineStartOffset(text, line) {
  const s = String(text ?? '');
  const target = Math.max(1, Number(line) || 1);
  if (target === 1) return 0;
  let current = 1;
  for (let i = 0; i < s.length; i += 1) {
    if (s.charCodeAt(i) === 10 && ++current === target) return i + 1;
  }
  return s.length;
}

export function findLineMapping(sourceMap, side, line, nearest = false) {
  const map = Array.isArray(sourceMap) ? sourceMap : [];
  const loKey = side === 'r' ? 'rStart' : 'sourceStart';
  const hiKey = side === 'r' ? 'rEnd' : 'sourceEnd';
  const exact = map.find(x => line >= x[loKey] && line <= x[hiKey]);
  if (exact || !nearest || !map.length) return exact || null;
  return map.reduce((best, x) => {
    const distance = line < x[loKey] ? x[loKey] - line : line > x[hiKey] ? line - x[hiKey] : 0;
    return !best || distance < best.distance ? { entry: x, distance } : best;
  }, null)?.entry || null;
}


export function mapVisualPosition(sourceMap, fromSide, position, nearest = false) {
  const map = Array.isArray(sourceMap) ? sourceMap : [];
  if (!map.length) return null;
  const loKey = fromSide === 'r' ? 'rStart' : 'sourceStart';
  const hiKey = fromSide === 'r' ? 'rEnd' : 'sourceEnd';
  const toLoKey = fromSide === 'r' ? 'sourceStart' : 'rStart';
  const toHiKey = fromSide === 'r' ? 'sourceEnd' : 'rEnd';
  const pos = Number(position);
  if (!Number.isFinite(pos)) return null;

  let entry = map.find(x => pos >= x[loKey] && pos < x[hiKey] + 1);
  let clamped = pos;
  if (!entry && nearest) {
    const hit = map.reduce((best, x) => {
      const lo = x[loKey];
      const hi = x[hiKey] + 1;
      const distance = pos < lo ? lo - pos : pos >= hi ? pos - hi : 0;
      return !best || distance < best.distance ? { entry: x, distance } : best;
    }, null);
    entry = hit?.entry || null;
    if (entry) clamped = Math.max(entry[loKey], Math.min(pos, entry[hiKey] + 1));
  }
  if (!entry) return null;

  const fromStart = entry[loKey];
  const fromStop = entry[hiKey] + 1;
  const toStart = entry[toLoKey];
  const toStop = entry[toHiKey] + 1;
  const fraction = fromStop > fromStart ? Math.max(0, Math.min(1, (clamped - fromStart) / (fromStop - fromStart))) : 0;
  return { position: toStart + fraction * (toStop - toStart), entry };
}

export function mapLine(sourceMap, fromSide, line, nearest = false) {
  const entry = findLineMapping(sourceMap, fromSide, line, nearest);
  if (!entry) return null;
  const fromStart = fromSide === 'r' ? entry.rStart : entry.sourceStart;
  const fromEnd = fromSide === 'r' ? entry.rEnd : entry.sourceEnd;
  const toStart = fromSide === 'r' ? entry.sourceStart : entry.rStart;
  const toEnd = fromSide === 'r' ? entry.sourceEnd : entry.rEnd;
  const fraction = fromEnd > fromStart ? (Math.max(fromStart, Math.min(line, fromEnd)) - fromStart) / (fromEnd - fromStart) : 0;
  const mapped = Math.round(toStart + fraction * (toEnd - toStart));
  return { line: mapped, entry };
}
