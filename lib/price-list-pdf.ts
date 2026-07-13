import { jsPDF } from 'jspdf';

export type PriceListPdfRow = {
  nomor_barang: string | null;
  nama_barang: string;
  principle: string | null;
  komposisi: string | null;
  golongan_barang: string | null;
  hjr: number;
  rate1: number;
  net1: number;
  rate2: number;
  net2: number;
};

export function generatePriceListPDF(
  clusterLabel: string,
  filterSummary: string,
  rows: PriceListPdfRow[]
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
  pdf.text('PT. RAGASI', margin, 10);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Daftar Harga — ${clusterLabel}`, margin, 16);

  pdf.setFontSize(9);
  pdf.text(new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }), pageWidth - margin, 10, { align: 'right' });
  if (filterSummary) {
    pdf.setFontSize(8);
    pdf.text(filterSummary, pageWidth - margin, 16, { align: 'right' });
  }

  let y = 28;

  const COL = {
    no:      { x: margin,       w: 8  },
    kode:    { x: 0, w: 18 },
    nama:    { x: 0, w: 58 },
    princ:   { x: 0, w: 30 },
    komp:    { x: 0, w: 45 },
    gol:     { x: 0, w: 12 },
    hjr:     { x: 0, w: 22 },
    d1:      { x: 0, w: 16 },
    n1:      { x: 0, w: 24 },
    d2:      { x: 0, w: 16 },
    n2:      { x: 0, w: 24 },
  };
  // lay out columns left→right based on declared widths
  let cursor = margin;
  (Object.keys(COL) as (keyof typeof COL)[]).forEach((k) => {
    COL[k].x = cursor;
    cursor += COL[k].w;
  });
  // stretch last column to fill remaining width
  const used = cursor - margin;
  COL.n2.w += contentWidth - used;

  const drawTableHeader = (yy: number) => {
    setFill(...PRIMARY);
    pdf.rect(margin, yy, contentWidth, 9, 'F');
    setColor(...WHITE);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('No',            COL.no.x + 1,                yy + 6);
    pdf.text('Kode',          COL.kode.x + 1,               yy + 6);
    pdf.text('Nama Barang',   COL.nama.x + 1,               yy + 6);
    pdf.text('Principle',     COL.princ.x + 1,              yy + 6);
    pdf.text('Komposisi',     COL.komp.x + 1,               yy + 6);
    pdf.text('Gol',           COL.gol.x + 1,                yy + 6);
    pdf.text('HJR',           COL.hjr.x + COL.hjr.w - 1,    yy + 6, { align: 'right' });
    pdf.text('Disk Qty1',     COL.d1.x + COL.d1.w - 1,      yy + 6, { align: 'right' });
    pdf.text('Net Qty1',      COL.n1.x + COL.n1.w - 1,      yy + 6, { align: 'right' });
    pdf.text('Disk >350rb',   COL.d2.x + COL.d2.w - 1,      yy + 6, { align: 'right' });
    pdf.text('Net >350rb',    COL.n2.x + COL.n2.w - 1,      yy + 6, { align: 'right' });
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
    pdf.text(row.nomor_barang || '-', COL.kode.x + 1, y + 4.5);
    nameLines.forEach((line: string, li: number) => pdf.text(line, COL.nama.x + 1, y + 4.5 + li * 3.6));
    princLines.forEach((line: string, li: number) => pdf.text(line, COL.princ.x + 1, y + 4.5 + li * 3.6));
    kompLines.forEach((line: string, li: number) => pdf.text(line, COL.komp.x + 1, y + 4.5 + li * 3.6));
    pdf.text(row.golongan_barang || '-', COL.gol.x + 1, y + 4.5);
    pdf.text(rp(row.hjr), COL.hjr.x + COL.hjr.w - 1, y + 4.5, { align: 'right' });

    setColor(...GRAY_M);
    pdf.text(`${row.rate1}%`, COL.d1.x + COL.d1.w - 1, y + 4.5, { align: 'right' });
    setColor(...GRAY_D);
    pdf.text(rp(row.net1), COL.n1.x + COL.n1.w - 1, y + 4.5, { align: 'right' });
    setColor(...GRAY_M);
    pdf.text(`${row.rate2}%`, COL.d2.x + COL.d2.w - 1, y + 4.5, { align: 'right' });
    setColor(...GRAY_D);
    pdf.text(rp(row.net2), COL.n2.x + COL.n2.w - 1, y + 4.5, { align: 'right' });

    y += rowH;
  });

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
