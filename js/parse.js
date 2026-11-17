// Transforme un texte collé (liste, CSV, export Excel/Sheets) en liste de noms.

const HEADER_FIRST = /^(pr[ée]nom|first[\s_-]?name|given[\s_-]?name)$/i;
const HEADER_LAST = /^(nom(\s+de\s+famille)?|last[\s_-]?name|surname|family[\s_-]?name)$/i;
const HEADER_FULL = /^(nom\s+complet|full[\s_-]?name|name|invit[ée]e?s?|participants?|noms?|guests?)$/i;
const HEADER_TITLE = /^(civilit[ée]|titre|title)$/i;

// Supprime les caractères invisibles collés depuis Excel, Sheets, Notion, WhatsApp…
// (espaces de largeur nulle, marques de direction, trait d'union conditionnel, BOM, espaces
// « vides » Braille/Hangul) et ramène tous les types d'espaces à une espace simple.
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Co}\p{Cn}⠀ㅤᅟᅠﾠ]/gu;
export function sanitizeName(s) {
  return String(s)
    .normalize('NFC')
    .replace(/[\t\r\n]/g, ' ')
    .replace(INVISIBLE, '')
    .replace(/[\p{Z}\s]+/gu, ' ')
    .replace(/^[^\p{L}\p{N}]+/u, '') // rien d'autre qu'une lettre ou un chiffre en tête
    .replace(/[^\p{L}\p{N}.)]+$/u, '') // ni de ponctuation parasite en fin
    .trim();
}

function cleanCell(s) {
  return sanitizeName(s);
}

// Retire puces et numérotation : "1. ", "12) ", "- ", "• ", "* "
function stripBullet(s) {
  return s.replace(/^\s*(?:\d{1,4}\s*[.)\-:]\s+|[-–—•*·▪►]\s*)/, '').trim();
}

function isNoise(cell) {
  if (!cell) return true;
  if (/@/.test(cell)) return true; // e-mail
  if (/^https?:\/\//i.test(cell)) return true;
  if (/^[+\d\s().\-\/]{4,}$/.test(cell)) return true; // téléphone, date, nombre
  if (/^(oui|non|yes|no|x|ok|true|false|confirm[ée]e?|vip|table\s*\d+)$/i.test(cell)) return true;
  return false;
}

function splitCsvLine(line, delim) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === delim && !q) {
      out.push(cur); cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map(cleanCell);
}

function detectDelimiter(lines) {
  const candidates = ['\t', ';', ','];
  for (const d of candidates) {
    const withD = lines.filter((l) => l.includes(d)).length;
    if (withD >= Math.max(1, Math.ceil(lines.length * 0.6))) return d;
  }
  return null;
}

export function parseNames(raw) {
  if (!raw) return [];
  const text = String(raw).replace(/\r\n?/g, '\n');
  let lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  let names = [];

  // Une seule ligne avec des séparateurs : "Aïcha Dossou, Koffi Mensah; Awa Diop"
  if (lines.length === 1 && /[,;\t]/.test(lines[0])) {
    names = lines[0].split(/[,;\t]/).map(cleanCell).map(stripBullet);
  } else {
    const delim = detectDelimiter(lines);
    if (!delim) {
      const first = cleanCell(lines[0]).toLowerCase();
      if ([HEADER_FIRST, HEADER_LAST, HEADER_FULL].some((re) => re.test(first))) lines = lines.slice(1);
      names = lines.map(cleanCell).map(stripBullet);
    } else {
      const rows = lines.map((l) => splitCsvLine(l, delim));
      const header = rows[0].map((h) => h.toLowerCase());
      const idx = {
        first: header.findIndex((h) => HEADER_FIRST.test(h)),
        last: header.findIndex((h) => HEADER_LAST.test(h)),
        full: header.findIndex((h) => HEADER_FULL.test(h)),
        title: header.findIndex((h) => HEADER_TITLE.test(h)),
      };
      const hasHeader = Object.values(idx).some((i) => i >= 0);
      const body = hasHeader ? rows.slice(1) : rows;

      for (const r of body) {
        let n = '';
        if (hasHeader) {
          if (idx.first >= 0 || idx.last >= 0) {
            n = [idx.title, idx.first, idx.last]
              .filter((i) => i >= 0)
              .map((i) => r[i] || '')
              .join(' ');
          } else if (idx.full >= 0) {
            n = [idx.title >= 0 ? r[idx.title] : '', r[idx.full] || ''].join(' ');
          }
        } else {
          // Sans en-tête : on garde les cellules qui ressemblent à du texte de nom
          n = r.filter((c) => !isNoise(c)).join(' ');
        }
        names.push(stripBullet(cleanCell(n)));
      }
    }
  }

  // Nettoyage + dédoublonnage (insensible à la casse et aux espaces)
  const seen = new Set();
  const out = [];
  for (const n of names) {
    const v = cleanCell(n);
    if (!v || isNoise(v)) continue;
    const key = v.toLocaleLowerCase('fr').normalize('NFC');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v.normalize('NFC'));
  }
  return out;
}

export function slugify(name) {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'invite'
  );
}
