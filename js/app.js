import { parseNames, slugify, sanitizeName } from './parse.js';
import { createInviteFactory, fitFontSize, LAYOUT } from './invite.js';

const $ = (s) => document.querySelector(s);
const els = {
  tabSingle: $('#tab-single'), tabList: $('#tab-list'),
  paneSingle: $('#pane-single'), paneList: $('#pane-list'),
  singleName: $('#single-name'), singleDl: $('#single-dl'),
  listInput: $('#list-input'), listFile: $('#list-file'), listParse: $('#list-parse'),
  results: $('#results'), count: $('#count'), zipDl: $('#zip-dl'), progress: $('#progress'),
  nameList: $('#name-list'), addRow: $('#add-row'), rowTpl: $('#row-tpl'),
  upper: $('#opt-upper'),
  sideVerso: $('#side-verso'), sideRecto: $('#side-recto'),
  cardImg: $('#card-img'), cardName: $('#card-name'),
};

const state = { mode: 'single', names: [], active: 0, side: 'verso' };

/* ---------- Génération PDF (chargée à la première demande) ---------- */
let factoryPromise;
function getFactory() {
  if (!factoryPromise) {
    factoryPromise = Promise.all([
      fetch('assets/invitation-template.pdf').then((r) => r.arrayBuffer()),
      fetch('assets/Satoshi-Black-subset.ttf').then((r) => r.arrayBuffer()),
    ]).then(([templateBytes, fontBytes]) =>
      createInviteFactory({ PDFLib: window.PDFLib, fontkit: window.fontkit, templateBytes, fontBytes })
    );
    factoryPromise.catch(() => { factoryPromise = null; });
  }
  return factoryPromise;
}
// Préchargement discret
if ('requestIdleCallback' in window) requestIdleCallback(() => getFactory());
else setTimeout(getFactory, 800);

const finalName = (n) => {
  const v = sanitizeName(n);
  return els.upper.checked ? v.toLocaleUpperCase('fr') : v;
};

function fileName(name, used) {
  let base = `Invitation_BED2026_${slugify(name)}`;
  let f = `${base}.pdf`;
  let i = 2;
  while (used && used.has(f.toLowerCase())) f = `${base}-${i++}.pdf`;
  used && used.add(f.toLowerCase());
  return f;
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function downloadOne(raw, btn) {
  const name = finalName(raw);
  if (!name) return;
  const label = btn && btn.textContent;
  if (btn) { btn.disabled = true; if (btn.classList.contains('btn')) btn.textContent = 'Génération…'; }
  try {
    const make = await getFactory();
    const bytes = await make(name);
    saveBlob(new Blob([bytes], { type: 'application/pdf' }), fileName(name));
  } catch (e) {
    console.error(e);
    alert("Impossible de générer le PDF. Recharge la page et réessaie.");
  } finally {
    if (btn) { btn.disabled = false; if (btn.classList.contains('btn')) btn.textContent = label; }
  }
}

async function downloadZip() {
  const names = state.names.map(finalName).filter(Boolean);
  if (!names.length) return;
  const btn = els.zipDl;
  const bar = els.progress.firstElementChild;
  btn.disabled = true;
  els.progress.hidden = false;
  bar.style.width = '0%';
  try {
    const make = await getFactory();
    const zip = new window.JSZip();
    const used = new Set();
    for (let i = 0; i < names.length; i++) {
      btn.textContent = `Génération ${i + 1}/${names.length}…`;
      zip.file(fileName(names[i], used), await make(names[i]));
      bar.style.width = `${((i + 1) / names.length) * 90}%`;
      if (i % 5 === 4) await new Promise((r) => setTimeout(r)); // laisse respirer l'interface
    }
    btn.textContent = 'Compression…';
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    bar.style.width = '100%';
    const stamp = new Date().toISOString().slice(0, 10);
    saveBlob(blob, `Invitations_BED2026_${names.length}-cartes_${stamp}.zip`);
  } catch (e) {
    console.error(e);
    alert("La génération du ZIP a échoué. Réessaie.");
  } finally {
    btn.disabled = false;
    btn.textContent = 'Tout télécharger (.zip)';
    setTimeout(() => { els.progress.hidden = true; }, 800);
  }
}

/* ---------- Aperçu ---------- */
let measureCtx;
function measure(text, size) {
  measureCtx ||= document.createElement('canvas').getContext('2d');
  measureCtx.font = `900 ${size}px Satoshi`;
  return measureCtx.measureText(text).width;
}

function renderPreview() {
  let raw = '';
  if (state.mode === 'single') raw = els.singleName.value;
  else raw = state.names[state.active] ?? '';
  const name = finalName(raw);
  els.cardImg.setAttribute('href', `assets/${state.side}.webp`);
  els.cardName.style.display = state.side === 'verso' ? '' : 'none';
  els.cardName.textContent = name || (state.mode === 'single' ? 'Nom de l’invité·e' : '');
  els.cardName.style.opacity = name ? 1 : 0.35;
  els.cardName.setAttribute('font-size', fitFontSize(measure, els.cardName.textContent, LAYOUT));
}
document.fonts && document.fonts.load('900 14px Satoshi').then(renderPreview);

/* ---------- Onglets ---------- */
function setMode(mode) {
  state.mode = mode;
  const single = mode === 'single';
  els.tabSingle.setAttribute('aria-selected', single);
  els.tabList.setAttribute('aria-selected', !single);
  els.paneSingle.hidden = !single;
  els.paneList.hidden = single;
  renderPreview();
}
els.tabSingle.addEventListener('click', () => setMode('single'));
els.tabList.addEventListener('click', () => setMode('list'));

function setSide(side) {
  state.side = side;
  els.sideVerso.classList.toggle('active', side === 'verso');
  els.sideRecto.classList.toggle('active', side === 'recto');
  renderPreview();
}
els.sideVerso.addEventListener('click', () => setSide('verso'));
els.sideRecto.addEventListener('click', () => setSide('recto'));

/* ---------- Un nom ---------- */
els.singleName.addEventListener('input', () => {
  els.singleDl.disabled = !els.singleName.value.trim();
  renderPreview();
});
els.singleName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && els.singleName.value.trim()) downloadOne(els.singleName.value, els.singleDl);
});
els.singleDl.addEventListener('click', () => downloadOne(els.singleName.value, els.singleDl));
els.upper.addEventListener('change', renderPreview);

/* ---------- Liste ---------- */
function updateCount() {
  const n = state.names.filter((x) => x.trim()).length;
  els.count.textContent = `${n} carte${n > 1 ? 's' : ''}`;
  els.zipDl.disabled = n === 0;
}

function setActive(i) {
  state.active = i;
  [...els.nameList.children].forEach((li, j) => li.classList.toggle('active', j === i));
  if (state.side !== 'verso') setSide('verso');
  else renderPreview();
}

function renderList() {
  els.nameList.replaceChildren();
  state.names.forEach((n, i) => els.nameList.appendChild(makeRow(n, i)));
  els.results.hidden = state.names.length === 0 && !els.results.dataset.touched;
  updateCount();
  setActive(Math.min(state.active, Math.max(0, state.names.length - 1)));
}

function makeRow(name, i) {
  const li = els.rowTpl.content.firstElementChild.cloneNode(true);
  const input = li.querySelector('.name-input');
  input.value = name;
  const idx = () => [...els.nameList.children].indexOf(li);
  input.addEventListener('focus', () => setActive(idx()));
  input.addEventListener('input', () => { state.names[idx()] = input.value; updateCount(); renderPreview(); });
  li.querySelector('.dl').addEventListener('click', (e) => { setActive(idx()); downloadOne(input.value, e.currentTarget); });
  li.querySelector('.rm').addEventListener('click', () => {
    state.names.splice(idx(), 1);
    renderList();
  });
  return li;
}

function parseAndShow() {
  state.names = parseNames(els.listInput.value);
  state.active = 0;
  els.results.dataset.touched = '1';
  renderList();
  if (!state.names.length) els.count.textContent = 'Aucun nom trouvé dans la liste';
  else els.results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
els.listParse.addEventListener('click', parseAndShow);

async function readFile(file) {
  if (!file) return;
  if (/\.(xlsx?|numbers|docx?)$/i.test(file.name)) {
    alert('Exporte ton tableau en .csv (Fichier › Exporter) ou copie-colle directement les colonnes ici.');
    return;
  }
  const buf = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(buf);
  if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf); // export Excel Windows
  els.listInput.value = text;
  parseAndShow();
}
els.listFile.addEventListener('change', (e) => { readFile(e.target.files[0]); e.target.value = ''; });
els.listInput.addEventListener('dragover', (e) => e.preventDefault());
els.listInput.addEventListener('drop', (e) => {
  if (e.dataTransfer.files.length) { e.preventDefault(); readFile(e.dataTransfer.files[0]); }
});

els.addRow.addEventListener('click', () => {
  state.names.push('');
  renderList();
  const last = els.nameList.lastElementChild;
  last && last.querySelector('.name-input').focus();
});
els.zipDl.addEventListener('click', downloadZip);

renderPreview();
