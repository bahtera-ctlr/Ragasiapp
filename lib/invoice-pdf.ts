import { jsPDF } from 'jspdf';

interface InvoiceItem {
  product_name?: string;
  nama_barang?: string;
  name?: string;
  customName?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  harga?: number;
  customPrice?: number;
  discount?: number;
  subtotal?: number;
  product?: { name?: string; price?: number };
  [key: string]: unknown;
}

interface InvoiceForPDF {
  id: string;
  order_id?: string;
  items?: InvoiceItem[] | string | unknown;
  amount?: number;
  released_at?: string;
  faktur_number?: string;
  faktur_officer_name?: string;
  pb?: boolean;
  outlet?: {
    name?: string;
    me?: string;
    nio?: string;
    NIO?: string;
    cluster?: string;
    top_hari?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function parseInvoiceItemsForPDF(invoice: InvoiceForPDF): InvoiceItem[] {
  if (!invoice?.items) return [];
  if (Array.isArray(invoice.items)) return invoice.items as InvoiceItem[];
  if (typeof invoice.items === 'string') {
    try { return JSON.parse(invoice.items); } catch { return []; }
  }
  return [];
}

export function formatOrderIdForPDF(orderId?: string): string {
  if (!orderId) return 'N/A';
  return orderId.slice(0, 8).toUpperCase();
}

export function formatDateForPDF(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export function generateInvoicePDF(invoice: InvoiceForPDF): void {
  const items = parseInvoiceItemsForPDF(invoice);
  if (!items || items.length === 0) {
    alert('Invoice ini belum memiliki detail barang. Pastikan order sudah berisi item.');
    return;
  }

  try {
    const outlet = invoice.outlet || {};
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth  = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin       = 14;
    const contentWidth = pageWidth - margin * 2;

    const PRIMARY   = [15,  98, 254] as const;
    const PRIMARY_L = [219, 234, 254] as const;
    const GRAY_D    = [30,  30,  30] as const;
    const GRAY_M    = [100, 100, 100] as const;
    const GRAY_L    = [240, 240, 240] as const;
    const WHITE     = [255, 255, 255] as const;

    const rp       = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
    const setColor = (...c: readonly [number,number,number]) => pdf.setTextColor(c[0], c[1], c[2]);
    const setFill  = (...c: readonly [number,number,number]) => pdf.setFillColor(c[0], c[1], c[2]);
    const setDraw  = (...c: readonly [number,number,number]) => pdf.setDrawColor(c[0], c[1], c[2]);

    // ── HEADER BAND ──────────────────────────────────────────────
    setFill(...PRIMARY);
    pdf.rect(0, 0, pageWidth, 36, 'F');

    try {
      pdf.addImage('/logo.png', 'PNG', margin, 6, 22, 22);
    } catch { /* logo optional */ }

    setColor(...WHITE);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PT. RAGASI', margin + 26, 16);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Distributor Produk Farmasi & Kesehatan', margin + 26, 22);

    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INVOICE', pageWidth - margin, 18, { align: 'right' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Dokumen Serah Terima Logistik', pageWidth - margin, 24, { align: 'right' });

    let y = 44;

    // ── INFO GRID ────────────────────────────────────────────────
    const leftW  = contentWidth * 0.55;
    const rightX = margin + leftW + 6;
    const rightW = contentWidth - leftW - 6;
    const infoBoxH = 48;

    // Outlet box — 6 baris: name, NIO, ME, Cluster, Tempo, Status
    setFill(...GRAY_L); setDraw(...GRAY_L);
    pdf.roundedRect(margin, y, leftW, infoBoxH, 2, 2, 'F');
    setColor(...PRIMARY);
    pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
    pdf.text('KEPADA', margin + 4, y + 7);
    setColor(...GRAY_D);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.text(outlet.name || '-', margin + 4, y + 14);
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    setColor(...GRAY_M);
    pdf.text(`NIO     : ${outlet.NIO || outlet.nio || '-'}`,               margin + 4, y + 21);
    pdf.text(`ME      : ${outlet.me || '-'}`,                              margin + 4, y + 27);
    pdf.text(`Cluster : ${outlet.cluster || '-'}`,                         margin + 4, y + 33);
    pdf.text(`Tempo   : ${outlet.top_hari != null ? `${outlet.top_hari} hari` : '-'}`, margin + 4, y + 39);
    pdf.text(`Status  : ${invoice.pb ? 'PB (Promo Bundling)' : 'Regular'}`,margin + 4, y + 45);

    // Invoice detail box
    setFill(...PRIMARY_L); setDraw(...PRIMARY_L);
    pdf.roundedRect(rightX, y, rightW, infoBoxH, 2, 2, 'F');
    const infoRows = [
      ['No. Faktur', invoice.faktur_number || '-'],
      ['No. Order',  formatOrderIdForPDF(invoice.order_id)],
      ['Tgl. Order', formatDateForPDF(invoice.released_at)],
      ['Fakturis',   invoice.faktur_officer_name || '-'],
    ];
    infoRows.forEach(([label, value], i) => {
      const iy = y + 9 + i * 9;
      setColor(...PRIMARY);
      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
      pdf.text(label, rightX + 4, iy);
      setColor(...GRAY_D);
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
      pdf.text(String(value), rightX + rightW - 4, iy, { align: 'right' });
    });

    y += infoBoxH + 6;

    // ── TABLE HEADER ─────────────────────────────────────────────
    // Columns: No(8) | Nama Barang(72) | Qty(14) | Harga(28) | Diskon(22) | Subtotal(38)
    const COL = {
      no:       { x: margin,           w: 8  },
      name:     { x: margin + 8,       w: 72 },
      qty:      { x: margin + 80,      w: 14 },
      price:    { x: margin + 94,      w: 28 },
      discount: { x: margin + 122,     w: 22 },
      sub:      { x: margin + 144,     w: contentWidth - 144 },
    };

    const drawTableHeader = (yy: number) => {
      setFill(...PRIMARY);
      pdf.rect(margin, yy, contentWidth, 8, 'F');
      setColor(...WHITE);
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
      pdf.text('No',          COL.no.x + 1,                    yy + 5.5);
      pdf.text('Nama Barang', COL.name.x + 1,                  yy + 5.5);
      pdf.text('Qty',         COL.qty.x + COL.qty.w,           yy + 5.5, { align: 'right' });
      pdf.text('Harga',       COL.price.x + COL.price.w,       yy + 5.5, { align: 'right' });
      pdf.text('Diskon',      COL.discount.x + COL.discount.w, yy + 5.5, { align: 'right' });
      pdf.text('Subtotal',    COL.sub.x + COL.sub.w,           yy + 5.5, { align: 'right' });
      return yy + 8;
    };

    y = drawTableHeader(y);

    // ── TABLE ROWS ───────────────────────────────────────────────
    let total = 0;
    items.forEach((item, idx) => {
      const itemName = item.product_name || item.nama_barang || item.name || item.customName || item.product?.name || '-';
      const qty      = item.qty || item.quantity || 0;
      const price    = item.price || item.harga || item.product?.price || item.customPrice || 0;
      const discount = item.discount || 0;
      const subtotal = item.subtotal ?? (qty * price - discount);
      total += subtotal;

      const nameLines = pdf.splitTextToSize(itemName, COL.name.w - 2);
      const rowH = Math.max(nameLines.length * 4.5, 7);

      if (y + rowH > pageHeight - 40) {
        pdf.addPage();
        y = drawTableHeader(16);
      }

      if (idx % 2 === 0) {
        setFill(248, 250, 255); setDraw(248, 250, 255);
        pdf.rect(margin, y, contentWidth, rowH, 'F');
      }

      setColor(...GRAY_D);
      pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
      pdf.text(`${idx + 1}`, COL.no.x + 1, y + 5);
      nameLines.forEach((line: string, li: number) => {
        pdf.text(line, COL.name.x + 1, y + 5 + li * 4.5);
      });
      pdf.text(`${qty}`,  COL.qty.x + COL.qty.w,           y + 5, { align: 'right' });
      pdf.text(rp(price), COL.price.x + COL.price.w,       y + 5, { align: 'right' });

      if (discount > 0) {
        setColor(220, 50, 50);
        pdf.text(`-${rp(discount)}`, COL.discount.x + COL.discount.w, y + 5, { align: 'right' });
        setColor(...GRAY_D);
      } else {
        setColor(...GRAY_M);
        pdf.text('-', COL.discount.x + COL.discount.w, y + 5, { align: 'right' });
        setColor(...GRAY_D);
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text(rp(subtotal), COL.sub.x + COL.sub.w, y + 5, { align: 'right' });
      pdf.setFont('helvetica', 'normal');

      setDraw(220, 220, 220); pdf.setLineWidth(0.2);
      pdf.line(margin, y + rowH, margin + contentWidth, y + rowH);
      y += rowH;
    });

    // ── TOTAL ────────────────────────────────────────────────────
    y += 3;
    setFill(...PRIMARY);
    pdf.rect(margin + contentWidth * 0.55, y, contentWidth * 0.45, 10, 'F');
    setColor(...WHITE);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', margin + contentWidth * 0.57, y + 7);
    pdf.text(rp(total), margin + contentWidth, y + 7, { align: 'right' });

    // ── SIGNATURE ────────────────────────────────────────────────
    y += 18;
    if (y > pageHeight - 50) { pdf.addPage(); y = 20; }

    const sigW = contentWidth / 3 - 4;
    const sigLabels = ['Dibuat Oleh', 'Diperiksa Oleh', 'Diterima Oleh'];
    [0, 1, 2].forEach((si) => {
      const sx = margin + si * (contentWidth / 3);
      setDraw(...GRAY_M); pdf.setLineWidth(0.3);
      setFill(250, 250, 250);
      pdf.roundedRect(sx, y, sigW, 28, 2, 2, 'FD');
      setColor(...PRIMARY);
      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
      pdf.text(sigLabels[si], sx + sigW / 2, y + 5, { align: 'center' });
      setDraw(...GRAY_M);
      pdf.line(sx + 8, y + 23, sx + sigW - 8, y + 23);
      setColor(...GRAY_M);
      pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
      pdf.text('( ________________ )', sx + sigW / 2, y + 27, { align: 'center' });
    });

    // ── FOOTER ───────────────────────────────────────────────────
    setFill(...PRIMARY);
    pdf.rect(0, pageHeight - 10, pageWidth, 10, 'F');
    setColor(...WHITE);
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
    pdf.text('PT. RAGASI — Dokumen ini dicetak secara otomatis oleh sistem', pageWidth / 2, pageHeight - 4, { align: 'center' });

    const fakturLabel = invoice.faktur_number || formatOrderIdForPDF(invoice.order_id);
    const fileName = `FAKTUR_${(outlet.name || 'OUTLET').toString().replace(/\s+/g, '_')}_${fakturLabel}.pdf`;
    pdf.save(fileName);
  } catch (err) {
    console.error('Error generating PDF:', err);
    alert('Gagal membuat PDF invoice.');
  }
}
