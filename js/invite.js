// Génère la carte personnalisée à partir du gabarit PDF (2 pages, le nom va sur la page 2).
// Position relevée sur Invitation_POSITION_NOM.pdf : <<NOM>>, Satoshi Black 14 pt, #FF7F47,
// x = 42.52 pt, ligne de base à 154.88 pt du haut de la page (A5 419.53 × 595.28 pt).

export const LAYOUT = {
  pageIndex: 1,
  pageWidth: 419.528,
  pageHeight: 595.276,
  x: 42.5197,
  baselineFromTop: 154.8805,
  fontSize: 14,
  minFontSize: 8,
  maxWidth: 419.528 - 42.5197 * 2,
  color: [1, 0x7f / 255, 0x47 / 255],
};

export function fitFontSize(measure, text, layout = LAYOUT) {
  const w = measure(text, layout.fontSize);
  if (w <= layout.maxWidth) return layout.fontSize;
  return Math.max(layout.minFontSize, Math.floor(((layout.fontSize * layout.maxWidth) / w) * 10) / 10);
}

export function createInviteFactory({ PDFLib, fontkit, templateBytes, fontBytes }) {
  const { PDFDocument, rgb } = PDFLib;

  return async function makeInvite(name) {
    const doc = await PDFDocument.load(templateBytes);
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fontBytes, { subset: false });
    const page = doc.getPage(LAYOUT.pageIndex);
    const { height } = page.getSize();
    // Dernier filet : on retire tout caractère absent de la police (sinon il s'imprime en blanc)
    const supported = new Set(font.getCharacterSet());
    const text = [...name.trim()].filter((c) => c === ' ' || supported.has(c.codePointAt(0))).join('').trim();
    const size = fitFontSize((t, s) => font.widthOfTextAtSize(t, s), text);

    page.drawText(text, {
      x: LAYOUT.x,
      y: height - LAYOUT.baselineFromTop,
      size,
      font,
      color: rgb(...LAYOUT.color),
    });

    doc.setTitle(`Invitation — ${text} — Black Excellence Dinner 2026`);
    doc.setSubject('Gala des 10 ans — I AM FOUNDATION');
    return doc.save();
  };
}
