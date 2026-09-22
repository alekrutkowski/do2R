import { translateStata, EXAMPLES, COVERAGE_ROADMAP } from './translator.js?v=0.9.0';
import { highlightCodeLines, lineAtOffset, lineStartOffset, mapLine, mapVisualPosition } from './editor-utils.js?v=0.9.0';

const $ = id => document.getElementById(id);
const input = $('stataInput');
const output = $('rOutput');
const sourceHighlight = $('stataHighlight');
const rHighlight = $('rHighlight');
const sourceActive = $('stataActiveLine');
const rActive = $('rActiveLine');
const sourceNumbers = $('sourceLineNumbers');
const outputNumbers = $('outputLineNumbers');
const lineLinkStatus = $('lineLinkStatus');
const fileInput = $('fileInput');
const dropZone = $('dropZone');
const optionsPanel = $('optionsPanel');
const diagnosticsSection = $('diagnosticsSection');
const diagnosticsList = $('diagnosticsList');
const collapseDiagnostics = $('collapseDiagnostics');
const toast = $('toast');

let filename = 'untitled.do';
let timer = null;
let latestResult = { sourceMap: [] };
let activeSourceLine = null;
let activeRLine = null;
const programmedScrollTop = new WeakMap();

function lineCount(text) {
  return Math.max(1, String(text ?? '').replace(/\r\n?/g, '\n').split('\n').length);
}

function alignPresentationLayer(editor, layer, lines) {
  const style = getComputedStyle(editor);
  for (const prop of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'tabSize', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) {
    layer.style[prop] = style[prop];
  }
  layer.style.setProperty('--runtime-line-height', style.lineHeight);
  if (lines) {
    lines.style.fontFamily = style.fontFamily;
    lines.style.fontSize = style.fontSize;
    lines.style.lineHeight = style.lineHeight;
    lines.style.paddingTop = style.paddingTop;
    lines.style.setProperty('--runtime-line-height', style.lineHeight);
  }
}

function renderLineNumbers(lines, text) {
  const n = lineCount(text);
  lines.innerHTML = Array.from({ length: n }, (_, i) => `<span class="line-number" data-line="${i + 1}">${i + 1}</span>`).join('');
}

function syncRenderedRowGeometry(editor, layer, lines) {
  // A textarea's clientWidth excludes its vertical scrollbar. Give the syntax
  // layer the same padding-box width so horizontal scrolling stays pixel-aligned.
  layer.style.right = 'auto';
  layer.style.width = `${editor.clientWidth}px`;

  const rows = [...layer.querySelectorAll('.syntax-line')];
  const numbers = [...lines.querySelectorAll('.line-number')];
  for (let i = 0; i < Math.min(rows.length, numbers.length); i += 1) {
    const h = Math.max(1, rows[i].getBoundingClientRect().height || rows[i].offsetHeight || 21);
    numbers[i].style.height = `${h}px`;
    numbers[i].style.minHeight = `${h}px`;
    numbers[i].style.lineHeight = `${getComputedStyle(editor).lineHeight}`;
  }
}

function renderHighlight(editor, layer, language) {
  const lines = editor === input ? sourceNumbers : outputNumbers;
  alignPresentationLayer(editor, layer, lines);
  const highlighted = highlightCodeLines(editor.value, language);
  layer.innerHTML = highlighted.map((html, i) => `<span class="syntax-line" data-line="${i + 1}">${html || '&#8203;'}</span>`).join('');
  renderLineNumbers(lines, editor.value);
  syncRenderedRowGeometry(editor, layer, lines);
  layer.scrollTop = editor.scrollTop;
  layer.scrollLeft = editor.scrollLeft;
  lines.scrollTop = editor.scrollTop;
}

function rowAt(layer, line) {
  if (!line || !layer) return null;
  return layer.children[Math.max(0, Number(line) - 1)] || null;
}

function rowBaseline(layer) {
  return layer.firstElementChild?.offsetTop ?? 0;
}

function rowContentTop(layer, line) {
  const row = rowAt(layer, line);
  return row ? row.offsetTop - rowBaseline(layer) : null;
}

function rowHeight(layer, line = 1) {
  const row = rowAt(layer, line) || layer.firstElementChild;
  return row?.getBoundingClientRect().height || row?.offsetHeight || 21;
}

function positionActiveLine(overlay, editor, layer, line) {
  layer.querySelectorAll('.syntax-line.is-active-row').forEach(row => row.classList.remove('is-active-row'));
  overlay.classList.remove('is-active');
  const row = rowAt(layer, line);
  if (!row) return;
  row.classList.add('is-active-row');
}

function syncOwnEditor(editor, lines, layer, overlay, activeLine) {
  lines.scrollTop = editor.scrollTop;
  layer.scrollTop = editor.scrollTop;
  layer.scrollLeft = editor.scrollLeft;
  positionActiveLine(overlay, editor, layer, activeLine);
}

function setProgrammaticScroll(editor, top) {
  const value = Math.max(0, top);
  programmedScrollTop.set(editor, value);
  editor.scrollTop = value;
}

function wasProgrammaticScroll(editor) {
  if (!programmedScrollTop.has(editor)) return false;
  const expected = programmedScrollTop.get(editor);
  programmedScrollTop.delete(editor);
  return Math.abs(editor.scrollTop - expected) < 1.25;
}

function visualPositionFromScroll(layer, scrollTop) {
  const rows = layer.children;
  if (!rows.length) return 1;
  const baseline = rowBaseline(layer);
  const target = Math.max(0, Number(scrollTop) || 0) + baseline;
  let lo = 0;
  let hi = rows.length - 1;
  let idx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].offsetTop <= target) {
      idx = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  const row = rows[idx];
  const height = Math.max(1, row.offsetHeight || row.getBoundingClientRect().height || 21);
  const fraction = Math.max(0, Math.min(0.999999, (target - row.offsetTop) / height));
  return idx + 1 + fraction;
}

function scrollForVisualPosition(layer, position) {
  const rows = layer.children;
  if (!rows.length) return 0;
  const pos = Math.max(1, Number(position) || 1);
  const idx = Math.min(rows.length - 1, Math.max(0, Math.floor(pos) - 1));
  const fraction = Math.max(0, Math.min(0.999999, pos - Math.floor(pos)));
  const row = rows[idx];
  const height = Math.max(1, row.offsetHeight || row.getBoundingClientRect().height || 21);
  return Math.max(0, row.offsetTop - rowBaseline(layer) + fraction * height);
}

function syncPairedScroll(fromSide) {
  if (!latestResult.sourceMap?.length) return;
  const fromLayer = fromSide === 'source' ? sourceHighlight : rHighlight;
  const toLayer = fromSide === 'source' ? rHighlight : sourceHighlight;
  const to = fromSide === 'source' ? output : input;
  const visualPosition = visualPositionFromScroll(fromLayer, fromSide === 'source' ? input.scrollTop : output.scrollTop);
  const mapped = mapVisualPosition(latestResult.sourceMap, fromSide === 'source' ? 'source' : 'r', visualPosition, true);
  if (!mapped) return;
  setProgrammaticScroll(to, scrollForVisualPosition(toLayer, mapped.position));
}

function setActiveLines(sourceLine, rLine, label = null) {
  activeSourceLine = sourceLine || null;
  activeRLine = rLine || null;
  positionActiveLine(sourceActive, input, sourceHighlight, activeSourceLine);
  positionActiveLine(rActive, output, rHighlight, activeRLine);
  if (label) lineLinkStatus.textContent = label;
  else if (activeSourceLine && activeRLine) lineLinkStatus.textContent = `Stata ${activeSourceLine} ↔ R ${activeRLine}`;
  else if (activeSourceLine) lineLinkStatus.textContent = `Stata ${activeSourceLine} · no R line`;
  else if (activeRLine) lineLinkStatus.textContent = `R ${activeRLine} · generated setup`;
  else lineLinkStatus.textContent = 'Linked lines';
}

function moveCaretToLine(editor, line) {
  if (!line) return;
  const offset = lineStartOffset(editor.value, line);
  try { editor.setSelectionRange(offset, offset); } catch { /* readonly browsers may decline */ }
}

function linkFromEditor(side, { nearest = false, jump = false } = {}) {
  const editor = side === 'source' ? input : output;
  const ownLine = lineAtOffset(editor.value, editor.selectionStart ?? 0);
  const mapped = mapLine(latestResult.sourceMap, side === 'source' ? 'source' : 'r', ownLine, nearest);
  if (side === 'source') {
    if (mapped) {
      setActiveLines(ownLine, mapped.line);
      if (jump) {
        jumpToLine(output, rHighlight, mapped.line, `Jumped · Stata ${ownLine} → R ${mapped.line}`);
        showToast(`Jumped to R line ${mapped.line}`);
      }
    } else setActiveLines(ownLine, null);
  } else if (mapped) {
    setActiveLines(mapped.line, ownLine);
    if (jump) {
      jumpToLine(input, sourceHighlight, mapped.line, `Jumped · R ${ownLine} → Stata ${mapped.line}`);
      showToast(`Jumped to Stata line ${mapped.line}`);
    }
  } else {
    setActiveLines(null, ownLine, `R ${ownLine} · generated setup`);
  }
}

function flashRow(layer, line) {
  const row = rowAt(layer, line);
  if (!row) return;
  row.classList.remove('jump-flash');
  // Force the animation to restart even when repeatedly jumping to one line.
  void row.offsetWidth;
  row.classList.add('jump-flash');
  window.setTimeout(() => row.classList.remove('jump-flash'), 760);
}

function bringPaneIntoViewport(editor) {
  const card = editor.closest('.editor-card');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const headerRoom = 84;
  if (rect.top < headerRoom || rect.bottom > window.innerHeight) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }
}

function scrollLineIntoView(editor, layer, line, { center = false, flash = false } = {}) {
  const y = rowContentTop(layer, line);
  if (y == null) return;
  const height = rowHeight(layer, line);
  if (center) {
    setProgrammaticScroll(editor, Math.max(0, y - (editor.clientHeight - height) / 2));
  } else {
    const top = editor.scrollTop;
    const bottom = top + editor.clientHeight;
    const margin = 2 * height;
    if (y < top + margin) setProgrammaticScroll(editor, Math.max(0, y - margin));
    else if (y + height > bottom - margin) setProgrammaticScroll(editor, y + height - editor.clientHeight + margin);
  }
  if (flash) flashRow(layer, line);
}

function jumpToLine(editor, layer, line, label) {
  if (!line) return;
  try { editor.focus({ preventScroll: true }); } catch { editor.focus(); }
  moveCaretToLine(editor, line);
  scrollLineIntoView(editor, layer, line, { center: true, flash: true });
  bringPaneIntoViewport(editor);
  if (label) lineLinkStatus.textContent = label;
}

function updateSourceMeta() {
  const n = input.value ? input.value.split('\n').length : 0;
  $('sourceLines').textContent = `${n} ${n === 1 ? 'line' : 'lines'}`;
  $('sourceFilename').textContent = filename;
  renderHighlight(input, sourceHighlight, 'stata');
}

function updateOutputMeta() {
  renderHighlight(output, rHighlight, 'r');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.t);
  showToast.t = window.setTimeout(() => toast.classList.remove('show'), 1800);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderDiagnostics(items) {
  if (!items.length) {
    diagnosticsSection.hidden = true;
    return;
  }
  diagnosticsSection.hidden = false;
  diagnosticsList.innerHTML = items.map(item => {
    const level = item.level === 'review' ? 'review' : item.level === 'warning' ? 'warning' : 'info';
    const icon = level === 'review' ? '!' : level === 'warning' ? '△' : 'i';
    const source = item.source ? `<code>${escapeHtml(item.source.trim())}</code>` : '';
    const attrs = item.line ? ` data-source-line="${Number(item.line)}" tabindex="0" role="button" title="Jump to source line ${Number(item.line)}"` : '';
    return `<article class="diagnostic-item ${level}"${attrs}>
      <span class="diagnostic-icon" aria-hidden="true">${icon}</span>
      <div class="diagnostic-copy"><strong>${escapeHtml(item.message)}</strong>${source}</div>
      <span class="line-pill">${item.line ? `line ${item.line}` : 'file'}</span>
    </article>`;
  }).join('');
}

function renderRoadmap() {
  const added = $('coverageAdded');
  const next = $('coverageNext');
  if (!added || !next) return;

  added.innerHTML = COVERAGE_ROADMAP.added.map(item => `<article class="roadmap-item roadmap-added">
    <span class="roadmap-check" aria-hidden="true">✓</span>
    <div><strong>${escapeHtml(item.family)}</strong><code>${escapeHtml(item.commands)}</code></div>
  </article>`).join('');

  next.innerHTML = COVERAGE_ROADMAP.next.map(item => `<article class="roadmap-item roadmap-next">
    <span class="priority-pill ${escapeHtml(item.priority.toLowerCase())}">${escapeHtml(item.priority)}</span>
    <div><strong>${escapeHtml(item.family)}</strong><code>${escapeHtml(item.commands)}</code><p>${escapeHtml(item.note)}</p></div>
  </article>`).join('');
}

function renderSummary(res) {
  const total = res.statements;
  $('exactCount').textContent = res.counts.exact || 0;
  $('heuristicCount').textContent = res.counts.heuristic || 0;
  $('reviewCount').textContent = res.counts.review || 0;
  if (!total) {
    $('coveragePct').textContent = '–';
    $('coverageRing').style.setProperty('--coverage', '0deg');
    $('summaryTitle').textContent = 'Ready when you are';
    $('summaryText').textContent = 'Paste Stata code or open a file to see translation coverage and review notes.';
    return;
  }
  $('coveragePct').textContent = `${res.coverage}%`;
  $('coverageRing').style.setProperty('--coverage', `${res.coverage * 3.6}deg`);
  if ((res.counts.review || 0) === 0) {
    $('summaryTitle').textContent = 'Everything received an R translation';
    $('summaryText').textContent = `${total} Stata statements translated. Heuristic lines still deserve numerical validation against Stata.`;
  } else {
    $('summaryTitle').textContent = `${res.counts.review} ${res.counts.review === 1 ? 'statement needs' : 'statements need'} manual review`;
    $('summaryText').textContent = `${res.coverage}% of executable statements received direct or heuristic R translations. TODOs preserve unsupported source lines.`;
  }
}

function remapActiveLine() {
  if (!latestResult.sourceMap?.length) return setActiveLines(activeSourceLine, null);
  if (activeSourceLine) {
    const mapped = mapLine(latestResult.sourceMap, 'source', activeSourceLine, false);
    if (mapped) return setActiveLines(activeSourceLine, mapped.line);
  }
  if (activeRLine) {
    const mapped = mapLine(latestResult.sourceMap, 'r', activeRLine, false);
    if (mapped) return setActiveLines(mapped.line, activeRLine);
  }
}

function translate({ quiet = false } = {}) {
  const res = translateStata(input.value, {
    dataName: $('dataName').value || 'dt',
    addHeader: $('addHeader').checked,
    sourceComments: $('sourceComments').checked,
    strictMode: $('strictMode').checked
  });
  latestResult = res;
  output.value = res.code;
  updateOutputMeta();
  renderSummary(res);
  renderDiagnostics(res.diagnostics);
  remapActiveLine();
  if (!quiet && input.value.trim()) showToast(`Translated ${res.statements} statements`);
  return res;
}

function scheduleTranslate() {
  updateSourceMeta();
  const sourceLine = lineAtOffset(input.value, input.selectionStart ?? 0);
  const mapped = mapLine(latestResult.sourceMap, 'source', sourceLine, false);
  setActiveLines(sourceLine, mapped?.line || null);
  if (!$('autoTranslate').checked) return;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => translate({ quiet: true }), 280);
}

async function loadFile(file) {
  if (!file) return;
  const ok = /\.(do|ado|mata|txt)$/i.test(file.name) || file.type.startsWith('text/');
  if (!ok) {
    showToast('Please choose a .do, .ado, .mata, or .txt file');
    return;
  }
  input.value = await file.text();
  filename = file.name;
  activeSourceLine = input.value ? 1 : null;
  activeRLine = null;
  updateSourceMeta();
  translate({ quiet: true });
}

function applyTheme(theme, persist = false) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  $('themeToggle').setAttribute('aria-pressed', String(next === 'dark'));
  $('themeToggle').setAttribute('aria-label', `Switch to ${next === 'dark' ? 'light' : 'dark'} theme`);
  $('themeLabel').textContent = next === 'dark' ? 'Light' : 'Dark';
  $('themeColorMeta').setAttribute('content', next === 'dark' ? '#121715' : '#f8f5ee');
  if (persist) {
    try { localStorage.setItem('do2r-theme', next); } catch { /* storage can be disabled */ }
  }
}

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

$('translateBtn').addEventListener('click', () => translate());
input.addEventListener('input', scheduleTranslate);
input.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey) return;
  e.preventDefault();
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? start;
  input.setRangeText('\t', start, end, 'end');
  scheduleTranslate();
});

input.addEventListener('scroll', () => {
  syncOwnEditor(input, sourceNumbers, sourceHighlight, sourceActive, activeSourceLine);
  if (!wasProgrammaticScroll(input)) syncPairedScroll('source');
});
output.addEventListener('scroll', () => {
  syncOwnEditor(output, outputNumbers, rHighlight, rActive, activeRLine);
  if (!wasProgrammaticScroll(output)) syncPairedScroll('r');
});

for (const [editor, side] of [[input, 'source'], [output, 'r']]) {
  editor.addEventListener('click', e => {
    // Some browsers/textareas delay or suppress dblclick after changing a text
    // selection. The second click itself is therefore the primary jump signal.
    if (e.detail >= 2) {
      e.preventDefault();
      linkFromEditor(side, { nearest: true, jump: true });
      return;
    }
    if (e.detail === 1) linkFromEditor(side, { nearest: false, jump: false });
  });
  editor.addEventListener('dblclick', e => {
    // Fallback for browsers that report dblclick separately from click.detail.
    e.preventDefault();
    e.stopPropagation();
    linkFromEditor(side, { nearest: true, jump: true });
  });
  editor.addEventListener('keyup', e => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) linkFromEditor(side, { nearest: false, jump: false });
  });
}

$('dataName').addEventListener('input', scheduleTranslate);
$('addHeader').addEventListener('change', scheduleTranslate);
$('sourceComments').addEventListener('change', scheduleTranslate);
$('strictMode').addEventListener('change', scheduleTranslate);
fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));

$('themeToggle').addEventListener('click', () => applyTheme(currentTheme() === 'dark' ? 'light' : 'dark', true));

$('optionsBtn').addEventListener('click', () => {
  const hidden = optionsPanel.hidden;
  optionsPanel.hidden = !hidden;
  $('optionsBtn').setAttribute('aria-expanded', String(hidden));
});

$('exampleSelect').addEventListener('change', e => {
  const key = e.target.value;
  if (!key) return;
  input.value = EXAMPLES[key];
  const exampleFiles = {
    ado: 'winsor2r.ado', mata: 'matrices.do', plotting: 'graphics.do', macros: 'macros.do',
    syntax: 'syntax_validation.ado', results: 'stored_results.do', missing: 'missing_values.do',
    survey: 'survey.do', timeseries: 'time_series.do', mixed: 'multilevel.do',
    python: 'python_bridge.do', frames: 'frames_reshape.do', excel: 'excel_reporting.do',
    panel: 'panel_models.do', factorvars: 'factor_variables.do', resampling: 'resampling.do',
    strings_dates: 'strings_dates.do', joins_reshape: 'joins_reshape.do',
    testing: 'descriptives_tests.do', macro_tokens: 'macro_tokens.do', workflow: 'panel_workflow.do'
  };
  filename = exampleFiles[key] || `${key}.do`;
  activeSourceLine = 1;
  activeRLine = null;
  updateSourceMeta();
  translate({ quiet: true });
  e.target.value = '';
});

$('clearBtn').addEventListener('click', () => {
  input.value = '';
  output.value = '';
  filename = 'untitled.do';
  latestResult = { sourceMap: [] };
  updateSourceMeta();
  updateOutputMeta();
  setActiveLines(null, null);
  renderSummary({ statements: 0, counts: { exact: 0, heuristic: 0, review: 0 }, coverage: 0 });
  diagnosticsSection.hidden = true;
  input.focus();
});

$('copyBtn').addEventListener('click', async () => {
  if (!output.value) return showToast('Nothing to copy yet');
  try { await navigator.clipboard.writeText(output.value); showToast('R code copied'); }
  catch { output.select(); document.execCommand('copy'); showToast('R code copied'); }
});

$('downloadBtn').addEventListener('click', () => {
  if (!output.value) return showToast('Nothing to download yet');
  const stem = filename.replace(/\.(do|ado|mata|txt)$/i, '') || 'translation';
  const blob = new Blob([output.value], { type: 'text/x-r;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `${stem}.R`; a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

for (const event of ['dragenter', 'dragover']) {
  dropZone.addEventListener(event, e => { e.preventDefault(); dropZone.classList.add('is-dragging'); });
}
for (const event of ['dragleave', 'drop']) {
  dropZone.addEventListener(event, e => { e.preventDefault(); dropZone.classList.remove('is-dragging'); });
}
dropZone.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));

diagnosticsList.addEventListener('click', e => {
  const item = e.target.closest('[data-source-line]');
  if (!item) return;
  const line = Number(item.dataset.sourceLine);
  moveCaretToLine(input, line);
  const mapped = mapLine(latestResult.sourceMap, 'source', line, false);
  setActiveLines(line, mapped?.line || null);
  scrollLineIntoView(input, sourceHighlight, line);
  if (mapped) scrollLineIntoView(output, rHighlight, mapped.line);
  input.focus({ preventScroll: true });
});
diagnosticsList.addEventListener('keydown', e => {
  if (!['Enter', ' '].includes(e.key)) return;
  const item = e.target.closest('[data-source-line]');
  if (!item) return;
  e.preventDefault();
  item.click();
});

collapseDiagnostics.addEventListener('click', () => {
  diagnosticsSection.classList.toggle('is-collapsed');
  collapseDiagnostics.textContent = diagnosticsSection.classList.contains('is-collapsed') ? 'Expand' : 'Collapse';
});

$('aboutBtn').addEventListener('click', () => $('aboutDialog').showModal());

window.addEventListener('resize', () => {
  renderHighlight(input, sourceHighlight, 'stata');
  renderHighlight(output, rHighlight, 'r');
  syncOwnEditor(input, sourceNumbers, sourceHighlight, sourceActive, activeSourceLine);
  syncOwnEditor(output, outputNumbers, rHighlight, rActive, activeRLine);
});

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    renderHighlight(input, sourceHighlight, 'stata');
    renderHighlight(output, rHighlight, 'r');
    syncOwnEditor(input, sourceNumbers, sourceHighlight, sourceActive, activeSourceLine);
    syncOwnEditor(output, outputNumbers, rHighlight, rActive, activeRLine);
  });
}

applyTheme(currentTheme());
renderRoadmap();
updateSourceMeta();
updateOutputMeta();
setActiveLines(null, null);
