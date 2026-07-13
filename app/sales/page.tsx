"use client";

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { computeDiscountRate } from "@/lib/cluster-discount";

type Outlet = {
  id: string;
  name: string;
  cluster: string | null;
  top_hari: number | null;
  limit_rupiah: number | null;
  current_saldo: number | null;
  me: string | null;
  nio: string | null;
  due: number | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  gol: string | null;
  pro: string | null;
  isi_box: number | null;
  komposisi: string | null;
};

type CartItem = {
  product: Product | null;
  customName?: string;
  customPrice?: number;
  qty: number;
  discount: number;
  subtotal: number;
  isCustom?: boolean;
};

export default function SalesPage() {
  const router = useRouter();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [shippingRequest, setShippingRequest] = useState<'OTS' | 'REGULER ONGKIR' | 'REGULER FREE ONGKIR' | 'EXPRESS' | 'SAME DAY'>('REGULER ONGKIR');
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [outletSearch, setOutletSearch] = useState("");
const [productSearch, setProductSearch] = useState("");
const [showOutletDropdown, setShowOutletDropdown] = useState(false);
const [showProductDropdown, setShowProductDropdown] = useState(false);
const outletRef = useRef<HTMLDivElement>(null)
const invoiceRef = useRef<HTMLDivElement>(null);
const [bulkText, setBulkText] = useState("");
const [editingId, setEditingId] = useState<string | null>(null);
const [editQty, setEditQty] = useState<number>(1);
const [editDiscount, setEditDiscount] = useState<number>(0);
const [editProduct, setEditProduct] = useState<Product | null>(null);
const [editProductSearch, setEditProductSearch] = useState("");
const [showEditProductDropdown, setShowEditProductDropdown] = useState(false);
const [editCustomName, setEditCustomName] = useState("");
const [editCustomPrice, setEditCustomPrice] = useState<number>(0);
const [notification, setNotification] = useState<{
  message: string;
  type: "success" | "error" | "info";
} | null>(null);
const [resultModal, setResultModal] = useState<{
  type: "success" | "error";
  title: string;
  message?: string;
  orderData?: {
    outlet: Outlet;
    items: CartItem[];
    total: number;
    invoiceCount?: number;
  };
} | null>(null);


  // FETCH OUTLETS
  useEffect(() => {
  async function fetchOutlets() {
    let allOutlets: Outlet[] = [];
    let from = 0;
    const batchSize = 1000;
    let done = false;

    while (!done) {
      const { data, error } = await supabase
        .from("outlets")
        .select("*")
        .order("name", { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error(error);
        break;
      }

      if (data && data.length > 0) {
        allOutlets = allOutlets.concat(data);
        from += batchSize;
      } else {
        done = true;
      }
    }

    setOutlets(allOutlets);
  }

  fetchOutlets();
}, []);

  // FETCH PRODUCTS
  async function fetchProducts() {
    let allProducts: Product[] = [];
    let from = 0;
    const batchSize = 1000;
    let done = false;

    while (!done) {
      const { data, error } = await supabase
        .from("products")
        .select("id, nama_barang, harga_jual_ragasi, stok, golongan_barang, program, isi_box, komposisi")
        .order("nama_barang", { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
  console.error("Gagal fetch products:", error);
  return;
}

      if (data && data.length > 0) {
        // Map database field names to Product type field names
        type ProductRow = {
          id: string;
          nama_barang: string;
          harga_jual_ragasi: number;
          stok: number;
          golongan_barang: string | null;
          program: string | null;
          isi_box: number | null;
          komposisi: string | null;
        };

        const mappedData: Product[] = data.map((item: ProductRow) => ({
          id: item.id,
          name: item.nama_barang,
          price: item.harga_jual_ragasi,
          stock: item.stok,
          gol: item.golongan_barang,
          pro: item.program,
          isi_box: item.isi_box,
          komposisi: item.komposisi,
        }));
        allProducts = allProducts.concat(mappedData);
        from += batchSize;
      } else {
        done = true;
      }
    }

    setProducts(allProducts);
  }

  useEffect(() => {
  fetchProducts();
}, []);

  useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (
      outletRef.current &&
      !outletRef.current.contains(event.target as Node)
    ) {
      setShowOutletDropdown(false)
    }
  }

  document.addEventListener("mousedown", handleClickOutside)
  return () => {
    document.removeEventListener("mousedown", handleClickOutside)
  }
}, [])

  // ADD ITEM
  function getDiscount(
  cluster: string | null,
  product: Product,
  qty: number
) {
  return computeDiscountRate(cluster, product.gol, product.pro, product.price * qty);
}

function handleSelectProduct(product: Product) {
  if (product.stock === 0) {
    showNotification("Produk ini stoknya kosong dan tidak bisa dipesan", "error");
    return;
  }
  setSelectedProduct(product);
  setProductSearch(product.name);
  setShowProductDropdown(false);
}

// ─── Bulk matching utilities ────────────────────────────────────────────────

// Units that appear in product names but should be ignored when comparing
const UNIT_RE = /\b(?:\d*\s*(?:mg|ml|mcg|iu|gr?|kg|l|cc|kaps?(?:ul)?|tab(?:let)?|sachet|sach|pcs|btl|botol|box|strip|amp|vial|tube|biji|unit|lembar|caps?))\b/gi;

function normStr(s: string): string {
  return s
    .toLowerCase()
    .replace(UNIT_RE, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordSet(s: string): Set<string> {
  return new Set(normStr(s).split(' ').filter(w => w.length > 1));
}

// Token recall: percentage of the user's words found in the product name
function tokenRecall(input: string, product: string): number {
  const inputWords = wordSet(input);
  const productWords = wordSet(product);
  if (inputWords.size === 0) return 0;
  let matched = 0;
  for (const w of inputWords) {
    if (productWords.has(w)) {
      matched += 1;
    } else {
      // Allow prefix match for abbreviations (min 3 chars, min 60% of target length)
      let prefixHit = false;
      for (const pw of productWords) {
        if (pw.startsWith(w) && w.length >= 3 && w.length / pw.length >= 0.6) {
          prefixHit = true;
          break;
        }
      }
      if (prefixHit) matched += 0.8;
    }
  }
  return (matched / inputWords.size) * 100;
}

// Sørensen–Dice on character trigrams — catches typos
function trigramScore(a: string, b: string): number {
  const tri = (s: string): Set<string> => {
    const n = normStr(s).replace(/\s/g, '');
    const set = new Set<string>();
    for (let i = 0; i <= n.length - 3; i++) set.add(n.slice(i, i + 3));
    return set;
  };
  const ta = tri(a);
  const tb = tri(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return (2 * inter / (ta.size + tb.size)) * 100;
}

function calculateSimilarity(input: string, productName: string): number {
  if (!input.trim()) return 0;
  const normInput  = normStr(input);
  const normProd   = normStr(productName);

  if (normInput === normProd) return 100;

  // Normalized contains (faster than token for exact sub-phrases)
  if (normProd.includes(normInput)) {
    const ratio = normInput.length / normProd.length;
    return ratio >= 0.5 ? 95 : ratio >= 0.3 ? 85 : 75;
  }
  if (normInput.includes(normProd) && normProd.length > 3) return 88;

  // Token recall (main signal) + trigram (typo tolerance)
  const recall = tokenRecall(input, productName);
  const tScore  = trigramScore(input, productName);
  return Math.round(recall * 0.7 + tScore * 0.3);
}

// Satuan DOSIS/UKURAN: angka sebelumnya adalah bagian dari nama produk (bukan qty)
const DOSAGE_UNIT = /^(?:mg|ml|mcg|iu|gr?|kg|cc|cm|mm|inch|in)$/i;
// Satuan KUANTITAS: angka sebelumnya ADALAH qty (diperluas dengan keyword box)
const QTY_UNIT_RE = /^(?:box|boc|bov|bog|bqll|bwll|bju|ball|bx|bk|bok|kotak|pcs|btl|botol|sachet|sach|strip|str|tab(?:let)?|kaps?(?:ul)?|bls|blstr|biji|unit|lembar|pak(?:et)?|dus|karton|slop|lusin|lsn|selusin|roll|tube|tubr|tubd|tbr|amp|vial)$/i;
// Regex untuk angka yang langsung menempel ke satuan (tanpa spasi): "1boc", "3btl", "10tube"
const GLUED_QTY = /(\d+)(boc|bov|bog|bqll|bwll|bju|ball|box|bx|bk|bok|kotak|pcs|btl|botol|sachet|sach|strip|str|tablet|kapsul|kap|bls|biji|unit|slop|dus|pak|roll|tube|tubr|tubd|tbr|amp|vial|lsn)/i;

// Klasifikasi unit type untuk keperluan diskon
const BOX_UNIT_RE = /^(?:boc|bov|bog|bqll|bwll|bju|ball|box|pak(?:et)?|bx|bk|bok|kotak|dus|karton)$/i;
const STRIP_UNIT_RE = /^(?:str|strip|bls|blstr|blister|tab(?:let)?|kaps?(?:ul)?)$/i;

function detectUnitType(unitToken: string): 'box' | 'satuan' | 'strip' {
  const u = unitToken.toLowerCase().replace(/[^a-z]/g, '');
  if (BOX_UNIT_RE.test(u)) return 'box';
  if (STRIP_UNIT_RE.test(u)) return 'strip';
  return 'satuan';
}

function parseBulkLine(line: string): { name: string; qty: number; unitType: 'box' | 'satuan' | 'strip' } | null {
  const cleaned = line
    .replace(/^[\s•\-*]+/, '')   // leading bullets
    .replace(/^\d+[.)]\s+/, '')  // "1. " or "1) " numbered list
    .replace(/[,;]+\s*$/, '')    // trailing comma or semicolon
    .trim();
  if (!cleaned) return null;

  // Explicit × separator: "Panadol x 5"  or  "5 x Panadol" — no unit info → strip (conservative)
  const xEnd   = cleaned.match(/^(.+?)\s+[xX]\s+(\d+)\s*$/);
  if (xEnd) return { name: xEnd[1].trim(), qty: parseInt(xEnd[2]), unitType: 'strip' };
  const xStart = cleaned.match(/^(\d+)\s*[xX]\s+(.+)$/);
  if (xStart) return { name: xStart[2].trim(), qty: parseInt(xStart[1]), unitType: 'strip' };

  // Handle "1boc", "3btl", "10tube" — number glued to qty unit without space
  const glued = cleaned.match(GLUED_QTY);
  if (glued) {
    const qty = parseInt(glued[1]);
    const detectedUnit = glued[2];
    const name = cleaned.replace(glued[0], '').replace(/\s+/g, ' ').trim();
    if (name.length >= 2 && qty > 0 && qty <= 9999) {
      return { name, qty, unitType: detectUnitType(detectedUnit) };
    }
  }

  // Classify all integers: dosage/size (skip) vs qty (keep)
  const allNums: Array<{ val: number; start: number; len: number; isQty: boolean; unitToken: string }> = [];
  const numRe = /(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = numRe.exec(cleaned)) !== null) {
    const idx        = m.index;
    const numStr     = m[1];
    const charBefore = idx > 0 ? cleaned[idx - 1] : ' ';
    const charAfter  = idx + numStr.length < cleaned.length ? cleaned[idx + numStr.length] : '';

    // Skip numbers that are part of Indonesian/standard decimals: "0,75" or "0.75"
    if (charAfter === ',' || charAfter === '.') {
      if (/^\d/.test(cleaned.slice(idx + numStr.length + 1))) continue;
    }
    if (charBefore === ',' || charBefore === '.') continue;

    // Skip numbers glued inside a word (e.g. "Vit-C1000")
    if (/[a-zA-Z]/.test(charBefore)) continue;

    const afterStr  = cleaned.slice(idx + numStr.length).trimStart();
    const nextToken = afterStr.split(/[\s,]/)[0].toLowerCase().replace(/[^a-z]/g, '');

    const isDosage  = DOSAGE_UNIT.test(nextToken);
    const isQtyUnit = QTY_UNIT_RE.test(nextToken);

    allNums.push({
      val: parseInt(numStr),
      start: idx,
      len: numStr.length,
      isQty: !isDosage || isQtyUnit,
      unitToken: nextToken,
    });
  }

  if (allNums.length === 0) return null;

  // Pick the last number classified as qty
  const qtyNums = allNums.filter(n => n.isQty);
  const chosen  = qtyNums.length > 0 ? qtyNums[qtyNums.length - 1] : allNums[allNums.length - 1];
  const chosenUnitType = QTY_UNIT_RE.test(chosen.unitToken) ? detectUnitType(chosen.unitToken) : 'strip';

  // Remove chosen number AND any qty unit word from the name
  let name = (cleaned.slice(0, chosen.start) + cleaned.slice(chosen.start + chosen.len))
    .replace(/\b(?:boc|bov|bog|bqll|bwll|bju|ball|box|bx|bk|bok|kotak|pcs|btl|botol|sachet|sach|strip|str|tablet|kapsul|kap|bls|biji|unit|lembar|pak|paket|dus|karton|slop|lusin|lsn|roll|tube|tubr|tubd|tbr|amp|vial)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (name.length >= 2 && chosen.val > 0 && chosen.val <= 9999) {
    return { name, qty: chosen.val, unitType: chosenUnitType };
  }

  // Fallback: first number = qty (format "5 Panadol"), no unit info → strip
  const first = allNums[0];
  const nameFromFirst = cleaned.slice(first.start + first.len).trim();
  if (nameFromFirst.length >= 2 && first.val > 0 && first.val <= 9999) {
    return { name: nameFromFirst, qty: first.val, unitType: 'strip' };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

function handleBulkAdd() {
  if (!selectedOutlet) {
    showNotification("Pilih outlet terlebih dahulu", "error");
    return;
  }

  const lines = bulkText
    .split("\n")
    .filter((l) => l.trim().length > 0 && !l.toLowerCase().includes("list"));

  const notFound: { name: string; qty: number; suggestions: string[] }[] = [];
  const autocorrected: { input: string; matched: string }[] = [];
  let successCount = 0;

  // Kumpulkan semua item dalam urutan yang sama seperti teks bulk
  type BulkCartItem =
    | { isCustom: false; product: NonNullable<typeof products[0]>; qty: number }
    | { isCustom: true; customName: string; qty: number };

  const orderedItems: BulkCartItem[] = [];

  lines.forEach((line) => {
    const parsed = parseBulkLine(line);
    if (!parsed) return;

    const { name: productName, qty: rawQty, unitType } = parsed;
    const normInput = normStr(productName);

    // Exact / contains match first — pakai cache, tidak panggil normStr ulang
    let found = products.find((p) => {
      const nc = productNormCache.get(p.id) ?? '';
      return nc.includes(normInput) || normInput.includes(nc);
    });

    // Fuzzy match if no exact hit
    if (!found) {
      const scored = products
        .map((p) => ({ product: p, score: calculateSimilarity(productName, p.name) }))
        .filter((p) => p.score >= 72)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        found = scored[0].product;
        autocorrected.push({ input: productName, matched: found.name });
      }
    }

    if (found) {
      const qty = unitType === 'box' ? rawQty * (found.isi_box || 1) : rawQty;
      orderedItems.push({ isCustom: false, product: found, qty });
      successCount++;
    } else {
      // Suggestions for not-found items (score 45–71)
      const suggestions = products
        .map((p) => ({ name: p.name, score: calculateSimilarity(productName, p.name) }))
        .filter((p) => p.score >= 45 && p.score < 72)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((p) => p.name);

      notFound.push({ name: productName, qty: rawQty, suggestions });
      orderedItems.push({ isCustom: true, customName: `${productName} (Tidak Tersedia)`, qty: rawQty });
    }
  });

  // Satu kali setCart — urutan sesuai teks bulk, produk duplikat di-merge in-place
  setCart((prev) => {
    const updatedPrev = [...prev];
    const toAppend: typeof prev = [];

    for (const item of orderedItems) {
      if (!item.isCustom) {
        const existingIdx = updatedPrev.findIndex(
          (c) => !c.isCustom && c.product && c.product.id === item.product.id
        );
        if (existingIdx !== -1) {
          const existing = updatedPrev[existingIdx];
          const newQty = existing.qty + item.qty;
          const newDiscount = getDiscount(selectedOutlet.cluster, item.product, newQty);
          const newSubtotal = newQty * (item.product.price - (item.product.price * newDiscount) / 100);
          updatedPrev[existingIdx] = { ...existing, qty: newQty, discount: newDiscount, subtotal: newSubtotal };
        } else {
          const discount = getDiscount(selectedOutlet.cluster, item.product, item.qty);
          const subtotal = item.qty * (item.product.price - (item.product.price * discount) / 100);
          toAppend.push({ product: item.product, qty: item.qty, discount, subtotal });
        }
      } else {
        toAppend.push({
          product: null,
          customName: item.customName,
          customPrice: 0,
          qty: item.qty,
          discount: 0,
          subtotal: 0,
          isCustom: true,
        });
      }
    }

    return [...updatedPrev, ...toAppend];
  });

  // Show autocorrection summary (one notification, not per-item)
  if (autocorrected.length > 0) {
    const msg = autocorrected
      .map((c) => `"${c.input}" → "${c.matched}"`)
      .join('\n');
    showNotification(`${autocorrected.length} nama dicocokkan otomatis:\n${msg}`, "info");
  }

  if (notFound.length > 0) {
    let message = `${notFound.length} item tidak ditemukan (Masuk ke Recap Barang Kosong):\n`;
    notFound.forEach((item) => {
      message += `\n• "${item.name}"`;
      if (item.suggestions.length > 0) {
        message += `\n  Mirip dengan: ${item.suggestions.join(", ")}`;
      }
    });
    showNotification(message, "info");
  }

  if (successCount > 0) {
    showNotification(`${successCount} item berhasil ditambahkan ke keranjang`, "success");
  }

  setBulkText("");
}

const MAX_FAKTUR_ITEMS = 22;

function handleAddItem() {
  if (!selectedProduct || !selectedOutlet) return;

  // Tidak ada batas — jika melebihi MAX_FAKTUR_ITEMS akan dipecah otomatis saat submit

  setCart((prev) => {
    const existing = prev.find(
      (item) => !item.isCustom && item.product && item.product.id === selectedProduct.id
    );

    const discount = getDiscount(
      selectedOutlet.cluster,
      selectedProduct,
      qty
    );

    if (existing) {
      const newQty = existing.qty + qty;

      const newDiscount = getDiscount(
        selectedOutlet.cluster,
        selectedProduct,
        newQty
      );

      const newSubtotal =
        newQty *
        (selectedProduct.price -
          (selectedProduct.price * newDiscount) / 100);

      return prev.map((item) =>
        !item.isCustom && item.product && item.product.id === selectedProduct.id
          ? {
              ...item,
              qty: newQty,
              discount: newDiscount,
              subtotal: newSubtotal,
            }
          : item
      );
    }

    const subtotal =
      qty *
      (selectedProduct.price -
        (selectedProduct.price * discount) / 100);

    return [
      ...prev,
      {
        product: selectedProduct,
        qty,
        discount,
        subtotal,
      },
    ];
  });

  showNotification(`${selectedProduct.name} berhasil ditambahkan ke keranjang`, "success");
  setQty(1);
  setSelectedProduct(null);
  setProductSearch("");
}

  // SHOW NOTIFICATION
  function showNotification(message: string, type: "success" | "error" | "info" = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  // REMOVE ITEM
  function handleRemove(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  // SAVE EDIT
  function handleSaveEdit(index: number) {
    const currentItem = cart[index];
    if (!currentItem) return;

    // Jika custom item yang di-convert ke regular (dipilih dari dropdown)
    if (currentItem.isCustom && editProduct) {
      const subtotal =
        editQty *
        (editProduct.price -
          (editProduct.price * editDiscount) / 100);

      setCart((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                product: editProduct,
                qty: editQty,
                discount: editDiscount,
                subtotal,
                isCustom: false,
              }
            : item
        )
      );
    }
    // Jika custom item yang tetap custom (manual input)
    else if (currentItem.isCustom && !editProduct) {
      const subtotal = (editCustomPrice || 0) * editQty;
      setCart((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                customName: editCustomName || item.customName,
                customPrice: editCustomPrice || item.customPrice,
                qty: editQty,
                subtotal,
              }
            : item
        )
      );
    }
    // Jika produk regular
    else {
      const selectedProductForEdit = editProduct || currentItem.product;
      if (!selectedProductForEdit) return;

      const subtotal =
        editQty *
        (selectedProductForEdit.price -
          (selectedProductForEdit.price * editDiscount) / 100);

      setCart((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                product: selectedProductForEdit,
                qty: editQty,
                discount: editDiscount,
                subtotal,
              }
            : item
        )
      );
    }

    setEditingId(null);
    setEditProduct(null);
    setEditProductSearch("");
    setEditQty(1);
    setEditDiscount(0);
    setEditCustomName("");
    setEditCustomPrice(0);
  }

  // SUBMIT ORDER
  async function handleSubmitOrder() {
  if (!selectedOutlet || cart.length === 0) {
    setResultModal({
      type: "error",
      title: "Data Tidak Lengkap",
      message: "Pilih outlet dan tambahkan minimal 1 item ke keranjang"
    });
    return;
  }

  // Pecah cart menjadi chunks maks MAX_FAKTUR_ITEMS
  const chunks: CartItem[][] = [];
  for (let i = 0; i < cart.length; i += MAX_FAKTUR_ITEMS) {
    chunks.push(cart.slice(i, i + MAX_FAKTUR_ITEMS));
  }

  const toPayload = (items: CartItem[]) => items.map((item) => ({
    product_id: item.product?.id || null,
    product_name: item.isCustom ? item.customName : item.product?.name,
    quantity: item.qty,
    price: item.isCustom ? item.customPrice : item.product?.price,
    discount: item.discount,
    is_custom: item.isCustom || false,
    subtotal: item.subtotal,
  }));

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkTotal = chunk.reduce((acc, item) => acc + item.subtotal, 0);

    const { error } = await supabase.rpc("create_sales_order_v2", {
      p_outlet_id: selectedOutlet.id,
      p_total: chunkTotal,
      p_items: toPayload(chunk),
      p_shipping_request: shippingRequest,
    });

    if (error) {
      console.error(error);
      let errorMessage = error.message || "Terjadi kesalahan saat memproses order";
      if (errorMessage.includes("Stok tidak mencukupi")) {
        errorMessage = errorMessage.replace(/Produk ID ([a-f0-9\-]+)/gi, (_match, uuid) => {
          const cartItem = cart.find(item => item.product?.id === uuid);
          return `Produk ${cartItem?.product?.name || uuid}`;
        });
      }
      setResultModal({
        type: "error",
        title: `Gagal Post Order (Invoice ${i + 1} dari ${chunks.length})`,
        message: errorMessage,
      });
      return;
    }
  }

  // Store data sebelum clear
  const orderData = {
    outlet: selectedOutlet,
    items: cart,
    total: total,
    invoiceCount: chunks.length,
  };

  setResultModal({
    type: "success",
    title: chunks.length > 1
      ? `Order Berhasil! (${chunks.length} Invoice)`
      : "Order Berhasil!",
    message: chunks.length > 1
      ? `${cart.length} item dipecah otomatis menjadi ${chunks.length} invoice untuk ${selectedOutlet.name}.`
      : undefined,
    orderData: orderData,
  });

  // Kurangi stok produk secara lokal — tidak perlu full refetch
  setProducts(prev => {
    const soldMap = new Map(
      cart
        .filter(item => !item.isCustom && item.product)
        .map(item => [item.product!.id, item.qty])
    );
    return prev.map(p =>
      soldMap.has(p.id) ? { ...p, stock: Math.max(0, p.stock - soldMap.get(p.id)!) } : p
    );
  });

  // Clear state setelah disimpan di modal
  setTimeout(() => {
    setCart([]);
    setSelectedOutlet(null);
    setProductSearch("");
    setSelectedProduct(null);
    setShippingRequest('REGULER ONGKIR');
    setQty(1);
  }, 100);
}

  // TOTAL
  const total = useMemo(() => {
    return cart.reduce((acc, item) => {
      const itemPrice = item.isCustom ? item.customPrice : item.product?.price;
      const priceAfterDiscount = (itemPrice || 0) * (1 - item.discount / 100);

      return acc + priceAfterDiscount * item.qty;
    }, 0);
  }, [cart]);

const filteredOutlets = useMemo(() => {
  if (!outletSearch) return [];
  const kw = outletSearch.toLowerCase();
  return outlets.filter(o => o.name.toLowerCase().includes(kw));
}, [outlets, outletSearch]);

const filteredProducts = useMemo(() => {
  if (!productSearch) return [];
  const keyword = productSearch.toLowerCase();
  const matched = products.filter(p => p.name?.toLowerCase().includes(keyword));
  return matched.slice(0, 80); // batas render dropdown
}, [products, productSearch]);

// Cache normStr per produk — HARUS di bawah deklarasi normStr & UNIT_RE
const productNormCache = useMemo(
  () => new Map(products.map(p => [p.id, normStr(p.name)])),
  [products]
);

  return (
    <div className="min-h-screen bg-gray-200 p-10 text-gray-800">
      <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl p-8 space-y-6">

        <h1 className="text-3xl font-bold">Sales Order</h1>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-semibold z-40 transition-all ${
            notification.type === "success" ? "bg-green-500" :
            notification.type === "error" ? "bg-red-500" :
            "bg-blue-500"
          }`}>
            {notification.message}
          </div>
        )}

        {/* OUTLET SELECT */}
<div>
  <label className="block mb-2 font-semibold">Pilih Outlet</label>

  <div className="relative">
    <input
      type="text"
      placeholder="Ketik nama outlet..."
      value={outletSearch}
      onFocus={() => setShowOutletDropdown(true)}
      onChange={(e) => {
        const value = e.target.value;
        setOutletSearch(value);
        setSelectedOutlet(null);
        setShowOutletDropdown(true);
      }}
      className="w-full border rounded-lg p-3"
    />

    {showOutletDropdown && outletSearch && (
      <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow">
        {filteredOutlets.map((o) => (
          <div
            key={o.id}
            onClick={() => {
              setSelectedOutlet(o);
              setOutletSearch(o.name);
              setShowOutletDropdown(false);
            }}
            className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
          >
            {o.name}
          </div>
        ))}
        {filteredOutlets.length === 0 && (
          <div className="px-3 py-2 text-gray-400">
            Outlet tidak ditemukan
          </div>
        )}
      </div>
    )}
  </div>


        </div>

        {/* OUTLET INFO */}
        {selectedOutlet && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-1">
            <div><strong>ME:</strong> {selectedOutlet.me || '-'}</div>
            <div><strong>Cluster:</strong> {selectedOutlet.cluster || '-'}</div>
            <div><strong>TOP:</strong> {selectedOutlet.top_hari || '-'} hari</div>
            <div>
              <strong>Limit Tersedia:</strong> Rp {((selectedOutlet.limit_rupiah || 0) - (selectedOutlet.current_saldo || 0)).toLocaleString()}
            </div>
            <div>
              <strong>Saldo Piutang:</strong> Rp {(selectedOutlet.current_saldo || 0).toLocaleString()}
            </div>
            {selectedOutlet.due && (
              <div><strong>DUE:</strong> {selectedOutlet.due} hari</div>
            )}
          </div>
        )}

        {/* SHIPPING REQUEST SELECT */}
        <div>
          <label className="block mb-2 font-semibold">Request Pengiriman</label>
          <select
            value={shippingRequest}
            onChange={(e) => setShippingRequest(e.target.value as 'OTS' | 'REGULER ONGKIR' | 'REGULER FREE ONGKIR' | 'EXPRESS' | 'SAME DAY')}
            className="w-full border rounded-lg p-3 bg-white"
          >
            <option value="OTS">OTS</option>
            <option value="REGULER ONGKIR">Reguler Ongkir</option>
            <option value="REGULER FREE ONGKIR">Reguler Free Ongkir</option>
            <option value="EXPRESS">EXPRESS</option>
            <option value="SAME DAY">Same Day</option>
          </select>
        </div>

        {/* PRODUCT SELECT */}
<div className="grid grid-cols-3 gap-4 items-end">
  <div className="col-span-2">
    <label className="block mb-2 font-semibold">Pilih Produk</label>

    <div className="relative">
      <input
        type="text"
        placeholder="Cari produk..."
        value={productSearch}
        onFocus={() => setShowProductDropdown(true)}
        onChange={(e) => {
          const value = e.target.value;
          setProductSearch(value);
          setSelectedProduct(null);
          setShowProductDropdown(true);
        }}
        className="w-full border rounded-lg p-3"
      />

      {showProductDropdown && productSearch && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow">
          
          {filteredProducts.map((p) => (
  <div
    key={p.id}
    onClick={() => {
      if (p.stock > 0) {
        return handleSelectProduct(p);
      }
    }}
    className={`p-3 border-b ${
      p.stock === 0 
        ? "bg-red-50 cursor-not-allowed opacity-60" 
        : "hover:bg-gray-100 cursor-pointer"
    }`}
  >
    <div className={`font-semibold ${p.stock === 0 ? "text-red-700" : "text-gray-800"}`}>
      {p.name}
      {p.stock === 0 && <span className="text-xs ml-2 text-red-600">(Habis)</span>}
    </div>

    <div className={`text-sm mt-1 flex flex-wrap gap-x-3 gap-y-0.5 ${p.stock === 0 ? "text-red-600" : "text-gray-600"}`}>
      <span>HJR: <span className="font-medium">Rp {p.price?.toLocaleString()}</span></span>
      <span>Stok: <span className={`font-medium ${p.stock === 0 ? "font-bold" : ""}`}>{p.stock}</span></span>
      <span>Gol: <span className="font-medium">{p.gol || "-"}</span></span>
      {p.pro && <span>Pro: <span className="font-medium">{p.pro}</span></span>}
    </div>

    {p.komposisi && (
      <div className="text-xs text-gray-400 mt-1">
        {p.komposisi}
      </div>
    )}
  </div>
))}

          {filteredProducts.length === 0 && (
            <div className="px-3 py-2 text-gray-400">
              Produk tidak ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  </div>

  {/* QTY INPUT */}
  <div>
    <label className="block mb-2 font-semibold">Qty</label>
    <input
      type="number"
      value={qty}
      onChange={(e) => setQty(Number(e.target.value))}
      className="w-20 border rounded-lg p-3"
    />
  </div>

  <button
    onClick={handleAddItem}
    className="bg-blue-600 text-white px-4 py-2 rounded-lg"
  >
    Add Item
  </button>
</div>

{/* BULK INPUT */}
        <div className="mt-6">
          <label className="font-semibold">Bulk Input</label>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Contoh:
• Kolicgon 1 box
• Vesperum tab 1 box
• Pimtrakol cherry 3 pcs`}
            className="w-full border p-3 rounded-lg mt-2"
            rows={6}
          />
          <button
            onClick={handleBulkAdd}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg mt-3"
          >
            Proses Bulk
          </button>
        </div>

{/* CART HEADER & ITEM COUNTER */}
{cart.length > 0 && (() => {
  const invoiceCount = Math.ceil(cart.length / MAX_FAKTUR_ITEMS);
  const isOverLimit = cart.length > MAX_FAKTUR_ITEMS;
  const isNearLimit = !isOverLimit && cart.length >= MAX_FAKTUR_ITEMS - 3;
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-2 text-sm font-semibold ${
      isOverLimit
        ? 'bg-blue-100 border border-blue-400 text-blue-700'
        : isNearLimit
        ? 'bg-yellow-100 border border-yellow-400 text-yellow-700'
        : 'bg-gray-100 border border-gray-300 text-gray-600'
    }`}>
      <span>Keranjang</span>
      <span>
        {cart.length} item
        {isOverLimit
          ? ` — akan dipecah jadi ${invoiceCount} invoice`
          : ` / ${MAX_FAKTUR_ITEMS}`}
      </span>
    </div>
  );
})()}

{/* CART */}
{cart.map((item, index) => {
  const itemName = item.isCustom ? item.customName : item.product?.name;
  const itemPrice = item.isCustom ? item.customPrice : item.product?.price;
  const itemGol = item.isCustom ? null : item.product?.gol;
  const itemPro = item.isCustom ? null : item.product?.pro;
  const priceAfterDiscount = (itemPrice || 0) * (1 - item.discount / 100);
  const subtotal = priceAfterDiscount * item.qty;

  return (
    <div
      key={index}
      className={`border p-4 rounded-lg flex justify-between items-center ${
        item.isCustom ? "bg-yellow-50 border-yellow-300" : "bg-gray-50 border-gray-300"
      }`}
    >
      <div>
        <div className="font-semibold">
          {itemName} x {item.qty}
          {item.isCustom && <span className="ml-2 text-xs bg-yellow-200 px-2 py-1 rounded">Custom</span>}
        </div>
        {!item.isCustom && (
          <div className="text-sm text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            {itemGol && <span>Gol: <span className="font-medium text-gray-700">{itemGol}</span></span>}
            {itemPro && <span>Pro: <span className="font-medium text-gray-700">{itemPro}</span></span>}
            {item.product?.stock !== undefined && (
              <span>Stok: <span className="font-medium text-gray-700">{item.product.stock}</span></span>
            )}
          </div>
        )}
        <div className="text-sm mt-1">Diskon: {item.discount}%</div>
        <div className="text-sm">
          Subtotal: Rp {subtotal.toLocaleString()}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingId(`item-${index}`);
            setEditQty(item.qty);
            setEditDiscount(item.discount);
            if (item.isCustom) {
              setEditProduct(null);
              setEditProductSearch("");
              setEditCustomName(item.customName || "");
              setEditCustomPrice(item.customPrice || 0);
            } else {
              setEditProduct(item.product || null);
              setEditProductSearch(item.product?.name || "");
              setEditCustomName("");
              setEditCustomPrice(0);
            }
            setShowEditProductDropdown(false);
          }}
          className="text-blue-600 font-semibold hover:underline"
        >
          Edit
        </button>
        <button
          onClick={() => handleRemove(index)}
          className="text-red-600 font-semibold hover:underline"
        >
          Hapus
        </button>
      </div>
    </div>
  );
})}

{/* EDIT MODAL */}
{editingId && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-96 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Edit Item</h2>
      
      {editingId.startsWith("item-") && (
        <div className="space-y-4">
          {(() => {
            const index = parseInt(editingId.split("-")[1]);
            const item = cart[index];
            if (!item) return null;

            const isCustom = item.isCustom;
            const itemPrice = editProduct ? editProduct.price : (item.isCustom ? item.customPrice : item.product?.price);
            const itemGol = editProduct ? editProduct.gol : (item.isCustom ? null : item.product?.gol);

            return (
              <>
                {/* NAMA PRODUK */}
                {!isCustom ? (
                  <div>
                    <label className="block font-semibold mb-2">Nama Produk:</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Cari produk..."
                        value={editProductSearch}
                        onChange={(e) => {
                          setEditProductSearch(e.target.value);
                          setShowEditProductDropdown(true);
                        }}
                        onFocus={() => {
                          setShowEditProductDropdown(true);
                        }}
                        className="w-full border rounded-lg p-3"
                      />
                      {showEditProductDropdown && (
                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow">
                          {products
                            .filter((p) =>
                              editProductSearch === "" || p.name.toLowerCase().includes(editProductSearch.toLowerCase())
                            )
                            .map((p) => (
                              <div
                                key={p.id}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setEditProduct(p);
                                  setEditProductSearch(p.name);
                                  setShowEditProductDropdown(false);
                                }}
                                className={`p-3 hover:bg-blue-100 cursor-pointer border-b text-sm ${
                                  editProduct?.id === p.id ? "bg-blue-50 font-semibold" : ""
                                }`}
                              >
                                <div className="font-semibold">{p.name}</div>
                                <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 mt-0.5">
                                  <span>Harga: Rp {p.price?.toLocaleString()}</span>
                                  {p.gol && <span>Gol: {p.gol}</span>}
                                  {p.pro && <span>Pro: {p.pro}</span>}
                                </div>
                              </div>
                            ))}
                          {products.filter((p) =>
                            editProductSearch === "" || p.name.toLowerCase().includes(editProductSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="p-3 text-gray-400 text-sm">Produk tidak ditemukan</div>
                          )}
                        </div>
                      )}
                    </div>
                    {editProduct && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                        <div className="font-semibold text-green-700">✓ {editProduct.name}</div>
                        <div className="text-xs text-green-600 flex flex-wrap gap-x-3 mt-0.5">
                          <span>Harga: Rp {editProduct.price?.toLocaleString()}</span>
                          {editProduct.gol && <span>Gol: {editProduct.gol}</span>}
                          {editProduct.pro && <span>Pro: {editProduct.pro}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block font-semibold mb-2">Nama Produk (Cari atau Manual):</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Cari di database atau ketik manual..."
                          value={editProductSearch}
                          onChange={(e) => {
                            setEditProductSearch(e.target.value);
                            setShowEditProductDropdown(true);
                          }}
                          onFocus={() => {
                            setShowEditProductDropdown(true);
                          }}
                          className="w-full border border-gray-300 rounded-lg p-3"
                        />
                        {showEditProductDropdown && (
                          <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white shadow">
                            {products
                              .filter((p) =>
                                editProductSearch === "" || p.name.toLowerCase().includes(editProductSearch.toLowerCase())
                              )
                              .map((p) => (
                                <div
                                  key={p.id}
                                  onMouseDown={(e) => {
                                    if (p.stock === 0) {
                                      e.preventDefault();
                                      return;
                                    }
                                    e.preventDefault();
                                    setEditProduct(p);
                                    setEditProductSearch(p.name);
                                    setShowEditProductDropdown(false);
                                    // Auto-update harga dan diskon dari database
                                    if (selectedOutlet) {
                                      const autoDiscount = getDiscount(selectedOutlet.cluster, p, editQty);
                                      setEditDiscount(autoDiscount);
                                    }
                                  }}
                                  className={`p-3 border-b text-sm ${
                                    p.stock === 0
                                      ? "bg-red-50 cursor-not-allowed opacity-60"
                                      : "hover:bg-blue-100 cursor-pointer"
                                  } ${
                                    editProduct?.id === p.id ? "bg-blue-50 font-semibold" : ""
                                  }`}
                                >
                                  <div className={`font-semibold ${p.stock === 0 ? "text-red-700" : ""}`}>
                                    {p.name}
                                    {p.stock === 0 && <span className="text-xs ml-2 text-red-600">(Habis)</span>}
                                  </div>
                                  <div className={`text-xs ${p.stock === 0 ? "text-red-600" : "text-gray-600"}`}>
                                    Gol: {p.gol} | Harga: Rp {p.price?.toLocaleString()} | Stok: {p.stock}
                                  </div>
                                </div>
                              ))}
                            {products.filter((p) =>
                              editProductSearch === "" || p.name.toLowerCase().includes(editProductSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="p-3 text-gray-400 text-sm">Produk tidak ditemukan</div>
                            )}
                          </div>
                        )}
                      </div>
                      {editProduct && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                          <div className="font-semibold text-green-700">✓ {editProduct.name}</div>
                          <div className="text-xs text-green-600">Gol: {editProduct.gol} | Harga: Rp {editProduct.price?.toLocaleString()}</div>
                        </div>
                      )}
                      {!editProduct && editProductSearch && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <div className="font-semibold text-yellow-700">ℹ Manual Input</div>
                          <div className="text-xs text-yellow-600">Produk tidak ditemukan, akan disimpan sebagai custom</div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block font-semibold mb-2">Harga (Rp):</label>
                      {editProduct ? (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-300 font-semibold text-blue-700">
                          Rp {editProduct.price?.toLocaleString()}
                        </div>
                      ) : (
                        <input
                          type="number"
                          placeholder="Masukkan harga manual (jika tidak ada di database)..."
                          value={editCustomPrice}
                          onChange={(e) => setEditCustomPrice(Number(e.target.value))}
                          className="w-full border border-gray-300 rounded-lg p-3"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* GOLONGAN BARANG - tampil saat convert ke regular */}
                {isCustom && editProduct && (
                  <div>
                    <label className="block font-semibold mb-2">Golongan Barang:</label>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-300 font-semibold text-blue-700">
                      {editProduct.gol}
                    </div>
                  </div>
                )}

                {/* GOLONGAN BARANG - untuk produk regular */}
                {!isCustom && itemGol && (
                  <div>
                    <label className="block font-semibold mb-2">Golongan Barang:</label>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-300 font-semibold text-blue-700">
                      {itemGol}
                    </div>
                  </div>
                )}

                {/* HARGA (READ-ONLY) - untuk produk regular */}
                {!isCustom && (
                  <div>
                    <label className="block font-semibold mb-2">Harga (Rp):</label>
                    <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                      {itemPrice?.toLocaleString()}
                    </div>
                  </div>
                )}

                {/* QUANTITY */}
                <div>
                  <label className="block font-semibold mb-2">Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    value={editQty}
                    onChange={(e) => {
                      const newQty = Number(e.target.value);
                      setEditQty(newQty);
                      // Recalculate discount sesuai qty baru (hanya untuk produk regular)
                      if (selectedOutlet && !isCustom) {
                        const productForDiscount = editProduct || item.product;
                        if (productForDiscount) {
                          setEditDiscount(getDiscount(selectedOutlet.cluster, productForDiscount, newQty));
                        }
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg p-3 text-lg"
                  />
                </div>

                {/* DISKON */}
                {isCustom && !editProduct ? (
                  <div>
                    <label className="block font-semibold mb-2">Diskon:</label>
                    <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
                      0% (Custom item tidak ada diskon)
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold mb-2">Diskon (%):</label>
                    <div className="w-full border border-gray-200 rounded-lg p-3 text-lg bg-gray-100 text-gray-600 select-none">
                      {editDiscount}%
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      handleSaveEdit(index);
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditProduct(null);
                      setEditProductSearch("");
                      setEditQty(1);
                      setEditDiscount(0);
                      setEditCustomName("");
                      setEditCustomPrice(0);
                    }}
                    className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 font-semibold"
                  >
                    Batal
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  </div>
)}

{/* TOTAL */}
<div className="text-xl font-bold space-y-4">
  <div>
    Total: Rp {total.toLocaleString()}
  </div>
  <div className="flex gap-3">
    <button
      onClick={handleSubmitOrder}
      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
    >
      Post Order
    </button>
    <button
      onClick={() => router.push('/marketing')}
      className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
    >
      ← Kembali ke Marketing
    </button>
  </div>
</div>

{/* ERROR MODAL */}
{resultModal?.type === "error" && (
  <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'rgba(0, 0, 0, 0.3)'}}>
    <div className="bg-white rounded-lg p-8 w-96 shadow-xl">
      <div className="mb-4">
        <div className="text-red-600 text-5xl mb-4 text-center">⚠️</div>
        <h2 className="text-2xl font-bold text-red-600 text-center">{resultModal.title}</h2>
      </div>
      
      {resultModal.message && (
        <p className="text-gray-700 mb-6 text-center text-lg leading-relaxed">
          {resultModal.message}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => setResultModal(null)}
          className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-semibold"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
)}

{/* SUCCESS MODAL - INVOICE */}
{resultModal?.type === "success" && (
  <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'rgba(0, 0, 0, 0.3)'}}>
    <div ref={invoiceRef} className="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-96 overflow-y-auto">
      <div className="mb-6">
        <div className="text-green-600 text-5xl mb-4 text-center">✓</div>
        <h2 className="text-2xl font-bold text-green-600 text-center">{resultModal.title}</h2>
      </div>

      {/* Invoice Content */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        {/* Outlet Info */}
        <div className="mb-6 pb-4 border-b-2 border-gray-300">
          <h3 className="font-bold text-lg text-gray-800 mb-2">Informasi Outlet</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Nama Outlet:</span>
              <div className="font-semibold text-gray-800">{resultModal?.orderData?.outlet?.name}</div>
            </div>
            <div>
              <span className="text-gray-600">Cluster:</span>
              <div className="font-semibold text-gray-800">{resultModal?.orderData?.outlet?.cluster}</div>
            </div>
            <div>
              <span className="text-gray-600">Tempo:</span>
              <div className="font-semibold text-gray-800">{resultModal?.orderData?.outlet?.top_hari} hari</div>
            </div>
            <div>
              <span className="text-gray-600">ME:</span>
              <div className="font-semibold text-gray-800">{resultModal?.orderData?.outlet?.me || "-"}</div>
            </div>
          </div>
        </div>

        {/* Items Detail */}
        <div className="mb-6">
          <h3 className="font-bold text-lg text-gray-800 mb-3">Detail Produk</h3>
          <div className="space-y-3">
            {resultModal?.orderData?.items?.map((item, index) => {
              const itemName = item.isCustom ? item.customName : item.product?.name;
              const itemPrice = item.isCustom ? item.customPrice : item.product?.price;
              const itemGol = item.isCustom ? null : item.product?.gol;
              
              const priceAfterDiscount = (itemPrice || 0) * (1 - item.discount / 100);
              const subtotal = priceAfterDiscount * item.qty;

              return (
                <div key={index} className={`p-4 rounded border mb-3 ${
                  item.isCustom ? "bg-yellow-50 border-yellow-300" : "bg-white border-gray-200"
                }`}>
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                    <div>
                      <div className="font-bold text-gray-800 text-base">
                        {itemName}
                        {item.isCustom && <span className="ml-2 text-xs bg-yellow-200 px-2 py-1 rounded">Custom</span>}
                      </div>
                      {itemGol && (
                        <div className="text-sm text-gray-600 mt-1">
                          Gol: <span className="font-semibold">{itemGol || "-"}</span>
                          {!item.isCustom && item.product?.stock !== undefined && (
                            <span className="ml-3">Stok: <span className="font-semibold">{item.product.stock}</span></span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right bg-blue-50 px-3 py-1 rounded">
                      <div className="text-lg font-bold text-blue-600">{item.qty}</div>
                      <div className="text-xs text-gray-600">unit</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Harga Jual Retail</div>
                      <div className="font-bold text-gray-800">
                        Rp {(itemPrice || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Diskon</div>
                      <div className="font-bold text-red-600">{item.discount}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Harga Bersih / Unit</div>
                      <div className="font-bold text-gray-800">
                        Rp {priceAfterDiscount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Subtotal</div>
                      <div className="font-bold text-green-600 text-lg">
                        Rp {subtotal.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total */}
        <div className="bg-green-100 p-4 rounded-lg border-2 border-green-600">
          <div className="text-center">
            <div className="text-gray-700 font-semibold mb-1">TOTAL ORDER</div>
            <div className="text-3xl font-bold text-green-600">
              Rp {resultModal?.orderData?.total?.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setResultModal(null)}
          className="flex-1 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 font-semibold"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
)}
      </div>
    </div>
  );
}

