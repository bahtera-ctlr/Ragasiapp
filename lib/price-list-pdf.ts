import { jsPDF } from 'jspdf';

export type PriceListPdfRow = {
  nama_barang: string;
  principle: string | null;
  komposisi: string | null;
  hjr: number;
  rate: number;
  nett: number;
};

export function generatePriceListPDF(
  clusterLabel: string,
  filterSummary: string,
  rows: PriceListPdfRow[],
  terms: { extra: string[]; general: string[] }
): void {
  if (!rows || rows.length === 0) {
    alert('Tidak ada data untuk diunduh. Sesuaikan filter terlebih dahulu.');
    return;
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth  = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin       = 12;
  const contentWidth = pageWidth - margin * 2;

  const PRIMARY   = [15,  98, 254] as const;
  const GRAY_D    = [30,  30,  30] as const;
  const GRAY_M    = [100, 100, 100] as const;
  const WHITE     = [255, 255, 255] as const;

  const rp       = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
  const setColor = (...c: readonly [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);
  const setFill  = (...c: readonly [number, number, number]) => pdf.setFillColor(c[0], c[1], c[2]);

  // ── HEADER BAND ──────────────────────────────────────────────
  setFill(...PRIMARY);
  pdf.rect(0, 0, pageWidth, 22, 'F');

  setColor(...WHITE);
  pdf.setFontSize(15);
  pdf.setFont('helvetica', 'bold');
  pdf.text('APOTEK RAGASI', margin, 10);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Daftar Harga', margin, 16);

  pdf.setFontSize(9);
  pdf.text(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }), pageWidth - margin, 10, { align: 'right' });
  if (filterSummary) {
    pdf.setFontSize(8);
    pdf.text(filterSummary, pageWidth - margin, 16, { align: 'right' });
  }

  let y = 28;

  const COL = {
    no:    { x: 0, w: 8  },
    nama:  { x: 0, w: 78 },
    princ: { x: 0, w: 38 },
    komp:  { x: 0, w: 60 },
    hjr:   { x: 0, w: 24 },
    disk:  { x: 0, w: 20 },
    nett:  { x: 0, w: 24 },
  };
  let cursor = margin;
  (Object.keys(COL) as (keyof typeof COL)[]).forEach((k) => {
    COL[k].x = cursor;
    cursor += COL[k].w;
  });
  const used = cursor - margin;
  COL.nett.w += contentWidth - used;

  const drawTableHeader = (yy: number) => {
    setFill(...PRIMARY);
    pdf.rect(margin, yy, contentWidth, 9, 'F');
    setColor(...WHITE);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('No',          COL.no.x + 1,               yy + 6);
    pdf.text('Nama Barang', COL.nama.x + 1,              yy + 6);
    pdf.text('Principle',   COL.princ.x + 1,             yy + 6);
    pdf.text('Komposisi',   COL.komp.x + 1,              yy + 6);
    pdf.text('HJR',         COL.hjr.x + COL.hjr.w - 1,   yy + 6, { align: 'right' });
    pdf.text('Diskon',      COL.disk.x + COL.disk.w - 1, yy + 6, { align: 'right' });
    pdf.text('Nett',        COL.nett.x + COL.nett.w - 1, yy + 6, { align: 'right' });
    return yy + 9;
  };

  y = drawTableHeader(y);

  rows.forEach((row, idx) => {
    const nameLines = pdf.splitTextToSize(row.nama_barang || '-', COL.nama.w - 2);
    const kompLines = pdf.splitTextToSize(row.komposisi || '-', COL.komp.w - 2);
    const princLines = pdf.splitTextToSize(row.principle || '-', COL.princ.w - 2);
    const lineCount = Math.max(nameLines.length, kompLines.length, princLines.length, 1);
    const rowH = Math.max(lineCount * 3.6, 6.5);

    if (y + rowH > pageHeight - 14) {
      pdf.addPage();
      y = drawTableHeader(margin);
    }

    if (idx % 2 === 0) {
      setFill(248, 250, 255);
      pdf.rect(margin, y, contentWidth, rowH, 'F');
    }

    setColor(...GRAY_D);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${idx + 1}`, COL.no.x + 1, y + 4.5);
    nameLines.forEach((line: string, li: number) => pdf.text(line, COL.nama.x + 1, y + 4.5 + li * 3.6));
    princLines.forEach((line: string, li: number) => pdf.text(line, COL.princ.x + 1, y + 4.5 + li * 3.6));
    kompLines.forEach((line: string, li: number) => pdf.text(line, COL.komp.x + 1, y + 4.5 + li * 3.6));
    pdf.text(rp(row.hjr), COL.hjr.x + COL.hjr.w - 1, y + 4.5, { align: 'right' });
    setColor(...GRAY_M);
    pdf.text(`${row.rate}%`, COL.disk.x + COL.disk.w - 1, y + 4.5, { align: 'right' });
    setColor(...GRAY_D);
    pdf.text(rp(row.nett), COL.nett.x + COL.nett.w - 1, y + 4.5, { align: 'right' });

    y += rowH;
  });

  // ── SYARAT & KETENTUAN ──────────────────────────────────────
  const termLines = [...terms.extra, ...terms.general];
  if (termLines.length > 0) {
    const lineH = 4;
    const blockH = 6 + termLines.length * lineH;
    if (y + blockH > pageHeight - 14) {
      pdf.addPage();
      y = margin;
    } else {
      y += 4;
    }
    setColor(...GRAY_D);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Syarat & Ketentuan Diskon', margin, y);
    y += 4.5;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    setColor(...GRAY_M);
    termLines.forEach((line) => {
      const wrapped = pdf.splitTextToSize(`•  ${line}`, contentWidth);
      wrapped.forEach((wLine: string) => {
        if (y > pageHeight - 10) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(wLine, margin, y);
        y += lineH;
      });
    });
  }

  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    setColor(...GRAY_M);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Halaman ${p} dari ${totalPages} — ${rows.length} item`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  pdf.save(`daftar-harga-${clusterLabel.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`);
}
