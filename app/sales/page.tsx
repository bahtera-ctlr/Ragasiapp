"use client";

import { useEffect, useMemo, useState, useRef } from "react"
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Outlet = {
  id: string;
  name: string;
  cluster: string | null;
  top_hari: number | null;
  limit_rupiah: number | null;
  current_saldo: number | null;
  me: string | null;
  nio: string | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  gol: string | null;
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
        allOutlets = [...allOutlets, ...data];
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
        .select("id, nama_barang, harga_jual_ragasi, stok, golongan_barang, komposisi")
        .order("nama_barang", { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
  console.log("FULL ERROR:", error);
  alert("Gagal post order");
  return;
}

      if (data && data.length > 0) {
        // Map database field names to Product type field names
        const mappedData: Product[] = data.map((item: any) => ({
          id: item.id,
          name: item.nama_barang,
          price: item.harga_jual_ragasi,
          stock: item.stok,
          gol: item.golongan_barang,
          komposisi: item.komposisi,
        }));
        allProducts = [...allProducts, ...mappedData];
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
  product: any,
  qty: number
) {
  const subtotal = product.price * qty;
  const gol = product.gol?.toUpperCase() || "";

  // ===== CLUSTER 1 =====
  if (cluster === "C1") {
    if (subtotal > 333000) return 15;
    return 12.5;
  }

  // ===== CLUSTER 2 =====
  if (cluster === "C2") {
    if (["F1", "F2", "F3"].includes(gol)) {
      if (subtotal > 333000) return 20;
      return 17.5;
    }

    if (gol === "F4") {
      if (subtotal > 333000) return 15;
      return 12.5;
    }
  }

  // ===== CLUSTER 3 =====
  if (cluster === "C3") {
    if (gol === "F1") return 25;
    if (gol === "F2") return 22.5;
    if (gol === "F3") return 20;
    if (gol === "F4") return 15;
  }

  return 0;
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

function handleBulkAdd() {
  if (!selectedOutlet) {
    showNotification("Pilih outlet terlebih dahulu", "error");
    return;
  }

  const lines = bulkText
    .split("\n")
    .map((l) => l.replace(/•/g, "").trim())
    .filter((l) => l.length > 0 && !l.toLowerCase().includes("list"));

  const notFound: { name: string; qty: number }[] = [];
  let successCount = 0;

  lines.forEach((line) => {
    // Cari angka pertama dalam kalimat
    const qtyMatch = line.match(/\d+/);

    if (!qtyMatch) return;

    const qty = parseInt(qtyMatch[0]);

    // Nama produk = semua sebelum angka
    const productName = line
      .split(qtyMatch[0])[0]
      .trim();

    // Cari produk dengan includes
    const found = products.find((p) =>
      p.name.toLowerCase().includes(productName.toLowerCase())
    );

    if (found) {
      setCart((prev) => {
        // Jika produk sudah ada di cart → tambahkan qty
        const existing = prev.find(
          (item) => !item.isCustom && item.product && item.product.id === found.id
        );

        if (existing) {
          return prev.map((item) =>
            !item.isCustom && item.product && item.product.id === found.id
              ? {
                  ...item,
                  qty: item.qty + qty,
                  subtotal: (item.qty + qty) * (item.product?.price || 0),
                }
              : item
          );
        }
        const discount = getDiscount(
          selectedOutlet.cluster,
          found,
          qty
        );

        const subtotal =
          qty *
          (found.price -
            (found.price * discount) / 100);

        return [
          ...prev,
          {
            product: found,
            qty,
            discount,
            subtotal,
          },
        ];
      });
      successCount++;
    } else {
      notFound.push({ name: productName, qty });
    }
  });

  // Auto-add item yang tidak ditemukan sebagai custom item
  if (notFound.length > 0) {
    setCart((prev) => {
      const customItems = notFound.map((item) => ({
        product: null,
        customName: `${item.name} (Tidak Tersedia)`,
        customPrice: 0,
        qty: item.qty,
        discount: 0,
        subtotal: 0,
        isCustom: true,
      }));
      return [...prev, ...customItems];
    });
    showNotification(`${notFound.length} item tidak tersedia dan masuk ke 'Recap Barang Kosong'`, "info");
  }

  if (successCount > 0) {
    showNotification(`${successCount} item berhasil ditambahkan ke keranjang`, "success");
  }

  setBulkText("");
}

function handleAddItem() {
  if (!selectedProduct || !selectedOutlet) return;

  let isAdded = false;

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

    isAdded = true;
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

  const itemsPayload = cart.map((item) => ({
    product_id: item.product?.id || null,
    product_name: item.isCustom ? item.customName : item.product?.name,
    quantity: item.qty,
    price: item.isCustom ? item.customPrice : item.product?.price,
    discount: item.discount,
    is_custom: item.isCustom || false,
    subtotal: item.subtotal,
  }));

  const { error } = await supabase.rpc("create_sales_order_v2", {
    p_outlet_id: selectedOutlet.id,
    p_total: total,
    p_items: itemsPayload,
  });

  if (error) {
    console.error(error);
    let errorMessage = error.message || "Terjadi kesalahan saat memproses order";
    
    // Parse error message untuk lebih readable - replace product ID dengan product name
    if (errorMessage.includes("Stok tidak mencukupi")) {
      // Format: "Stok tidak mencukupi: Produk ID {uuid} hanya tersedia {x} unit, diminta {y}"
      errorMessage = errorMessage.replace(/Produk ID ([a-f0-9\-]+)/gi, (match, uuid) => {
        const cartItem = cart.find(item => item.product?.id === uuid);
        const productName = cartItem?.product?.name || uuid;
        return `Produk ${productName}`;
      });
    }
    
    setResultModal({
      type: "error",
      title: "Gagal Post Order",
      message: errorMessage
    });
    return;
  }

  // Store data sebelum clear
  const orderData = {
    outlet: selectedOutlet,
    items: cart,
    total: total
  };

  setResultModal({
    type: "success",
    title: "Order Berhasil!",
    orderData: orderData
  });

  // Clear state setelah disimpan di modal
  setTimeout(() => {
    setCart([]);
    setSelectedOutlet(null);
    setProductSearch("");
    setSelectedProduct(null);
    setQty(1);
  }, 100);

  await fetchProducts();
}

  // DOWNLOAD INVOICE AS PDF
  function handleDownloadPDF() {
    if (!resultModal?.orderData) return;

    try {
      const outlet = resultModal.orderData.outlet;
      const items = resultModal.orderData.items;
      const total = resultModal.orderData.total;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      const lineHeight = 7;

      // Title
      pdf.setFontSize(16);
      pdf.setFont("", "bold");
      pdf.text("SALES ORDER INVOICE", margin, yPosition);
      yPosition += lineHeight + 5;

      // Date
      pdf.setFontSize(10);
      pdf.setFont("", "normal");
      pdf.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, margin, yPosition);
      yPosition += lineHeight + 5;

      // Separator
      pdf.setDrawColor(0);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Outlet Info
      pdf.setFontSize(11);
      pdf.setFont("", "bold");
      pdf.text("INFORMASI OUTLET", margin, yPosition);
      yPosition += lineHeight + 2;

      pdf.setFontSize(10);
      pdf.setFont("", "normal");
      pdf.text(`Nama Outlet: ${outlet.name}`, margin, yPosition);
      yPosition += lineHeight;
      pdf.text(`Tempo: ${outlet.top_hari} hari`, margin, yPosition);
      yPosition += lineHeight;
      if (outlet.cluster) {
        pdf.text(`Cluster: ${outlet.cluster}`, margin, yPosition);
        yPosition += lineHeight;
      }
      if (outlet.me) {
        pdf.text(`ME: ${outlet.me}`, margin, yPosition);
        yPosition += lineHeight;
      }
      yPosition += 3;

      // Separator
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Items Header
      pdf.setFontSize(11);
      pdf.setFont("", "bold");
      pdf.text("DAFTAR BARANG", margin, yPosition);
      yPosition += lineHeight + 3;

      // Column headers
      pdf.setFontSize(9);
      pdf.setFont("", "bold");
      const col1 = margin;
      const col2 = pageWidth - margin - 60;
      const col3 = pageWidth - margin - 45;
      const col4 = pageWidth - margin - 20;

      pdf.text("No", col1, yPosition);
      pdf.text("Produk", col1 + 8, yPosition);
      pdf.text("Qty", col3, yPosition);
      pdf.text("Harga", col4, yPosition, { align: "right" });
      yPosition += lineHeight;

      // Items line
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 2;

      // Items
      pdf.setFont("", "normal");
      items.forEach((item, index) => {
        const itemName = item.isCustom ? item.customName : item.product?.name;
        const itemPrice = item.isCustom ? item.customPrice : item.product?.price;
        const itemSubtotal = item.subtotal;

        // Check if we need a new page
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(9);
        pdf.text(`${index + 1}`, col1, yPosition);
        
        // Product name with wrapping
        const nameLines = pdf.splitTextToSize(itemName || "", 40);
        nameLines.forEach((line: string, lineIdx: number) => {
          pdf.text(line, col1 + 8, yPosition + lineIdx * 4);
        });
        
        const nameHeight = nameLines.length * 4;
        pdf.text(`${item.qty}`, col3, yPosition + (nameHeight - 4) / 2);
        pdf.text(`Rp ${(itemPrice || 0).toLocaleString("id-ID")}`, col4, yPosition + (nameHeight - 4) / 2, { align: "right" });
        
        yPosition += Math.max(nameHeight, lineHeight);
      });

      // Separator
      yPosition += 2;
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Total
      pdf.setFontSize(12);
      pdf.setFont("", "bold");
      pdf.text(`TOTAL: Rp ${total.toLocaleString("id-ID")}`, margin, yPosition, { align: "right" });

      // Save
      const fileName = `Invoice_${outlet.name}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
      
      alert("PDF berhasil diunduh!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Gagal download PDF: " + error);
    }
  }

  // SHARE VIA WHATSAPP
  function handleShareWhatsApp() {
    if (!resultModal?.orderData) return;

    const outlet = resultModal.orderData.outlet;
    const items = resultModal.orderData.items;
    const total = resultModal.orderData.total;

    let message = `*SALES ORDER*\n\n`;
    message += `📍 Outlet: ${outlet.name}\n`;
    message += `📦 Cluster: ${outlet.cluster}\n`;
    message += `⏱️ Tempo: ${outlet.top_hari} hari\n`;
    message += `👤 ME: ${outlet.me || "-"}\n`;
    message += `\n*DETAIL PRODUK:*\n`;

    items.forEach((item, index) => {
      const productName = item.isCustom ? item.customName : item.product?.name;
      const price = item.isCustom ? item.customPrice : item.product?.price;
      const priceAfterDiscount = (price || 0) * (1 - item.discount / 100);
      const subtotal = priceAfterDiscount * item.qty;

      message += `\n${index + 1}. ${productName}\n`;
      message += `   Qty: ${item.qty} unit\n`;
      message += `   Harga: Rp ${(price || 0).toLocaleString("id-ID")}\n`;
      message += `   Diskon: ${item.discount}%\n`;
      message += `   Subtotal: Rp ${subtotal.toLocaleString("id-ID")}\n`;
    });

    message += `\n*TOTAL: Rp ${total.toLocaleString("id-ID")}*\n`;
    message += `\n_Generated from Ragasi App_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  }


  // TOTAL
  const total = useMemo(() => {
    return cart.reduce((acc, item) => {
      const itemPrice = item.isCustom ? item.customPrice : item.product?.price;
      const priceAfterDiscount = (itemPrice || 0) * (1 - item.discount / 100);

      return acc + priceAfterDiscount * item.qty;
    }, 0);
  }, [cart]);

  const sisaLimit = useMemo(() => {
  if (!selectedOutlet) return 0;

  // Show current saldo, ensure non-negative
  const saldo = selectedOutlet.current_saldo || 0;
  return Math.max(0, saldo);
}, [selectedOutlet]);

const filteredProducts = useMemo(() => {
  const keyword = productSearch.toLowerCase();

  return products.filter((p) =>
    p.name?.toLowerCase().includes(keyword)
  );
}, [products, productSearch]);
console.log("TOTAL PRODUCTS:", products.length);
console.log("SEARCH:", productSearch);
console.log("FILTERED:", filteredProducts.length);

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
        {outlets
          .filter((o) =>
            o.name.toLowerCase().includes(outletSearch.toLowerCase())
          )
          .map((o) => (
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

        {outlets.filter((o) =>
          o.name.toLowerCase().includes(outletSearch.toLowerCase())
        ).length === 0 && (
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
            <div>Cluster: {selectedOutlet.cluster}</div>
            <div>Tempo: {selectedOutlet.top_hari} hari</div>
            <div>
              Saldo: Rp {sisaLimit.toLocaleString()}
            </div>
            <div>ME: {selectedOutlet.me}</div>
          </div>
        )}

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

    <div className={`text-sm ${p.stock === 0 ? "text-red-600" : "text-gray-600"}`}>
      HJR: Rp {p.price?.toLocaleString()} | 
      <span className={p.stock === 0 ? "font-semibold" : ""}>
  Stok: {p.stock}
</span> 
      Gol: {p.gol || "-"}
    </div>

    {p.komposisi && (
      <div className="text-xs text-gray-500 mt-1">
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

{/* CART */}
{cart.map((item, index) => {
  const itemName = item.isCustom ? item.customName : item.product?.name;
  const itemPrice = item.isCustom ? item.customPrice : item.product?.price;
  const itemGol = item.isCustom ? null : item.product?.gol;
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
        {itemGol && <div className="text-sm text-gray-600">Gol: <span className="font-semibold">{itemGol}</span></div>}
        <div>Diskon: {item.discount}%</div>
        <div>
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
                                <div className="text-xs text-gray-600">
                                  Gol: {p.gol} | Harga: Rp {p.price?.toLocaleString()}
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
                    onChange={(e) => setEditQty(Number(e.target.value))}
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
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg p-3 text-lg"
                    />
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
          onClick={handleDownloadPDF}
          className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
        >
          📥 Download PDF
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
        >
          💬 Share WhatsApp
        </button>
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

