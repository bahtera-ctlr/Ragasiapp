"use client";

import { useEffect, useMemo, useState, useRef } from "react"
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Outlet = {
  id: string;
  name: string;
  cluster: string | null;
  tempo: number | null;
  credit_limit: number | null;
  current_saldo: number | null;
  me: string | null;
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
  product: Product;
  qty: number;
  discount: number;
  subtotal: number;
};

export default function SalesPage() {
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
const [bulkText, setBulkText] = useState("");
const [editingId, setEditingId] = useState<string | null>(null);
const [editQty, setEditQty] = useState<number>(1);
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
        .select("id, name, price, stock, gol, komposisi")
        .order("name", { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
  console.log("FULL ERROR:", error);
  alert("Gagal post order");
  return;
}

      if (data && data.length > 0) {
        allProducts = [...allProducts, ...data];
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
  setSelectedProduct(product);
  setProductSearch(product.name);
  setShowProductDropdown(false);
}

function handleBulkAdd() {
  if (!selectedOutlet) {
    alert("Pilih outlet terlebih dahulu");
    return;
  }

  const lines = bulkText
    .split("\n")
    .map((l) => l.replace(/•/g, "").trim())
    .filter((l) => l.length > 0 && !l.toLowerCase().includes("list"));

  const notFound: string[] = [];

  lines.forEach((line) => {
    // Cari angka pertama dalam kalimat
    const qtyMatch = line.match(/\d+/);

    if (!qtyMatch) return;

    const qty = parseInt(qtyMatch[0]);

    // Nama produk = semua sebelum angka
    const productName = line
      .split(qtyMatch[0])[0]
      .trim()
      .toLowerCase();

    // Cari produk dengan includes
    const found = products.find((p) =>
      p.name.toLowerCase().includes(productName)
    );

    if (found) {
      setCart((prev) => {
        // Jika produk sudah ada di cart → tambahkan qty
        const existing = prev.find(
          (item) => item.product.id === found.id
        );

        if (existing) {
          return prev.map((item) =>
            item.product.id === found.id
              ? {
                  ...item,
                  qty: item.qty + qty,
                  subtotal: (item.qty + qty) * item.product.price,
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
    } else {
      notFound.push(line);
    }
  });

  if (notFound.length > 0) {
    alert(
      "Produk tidak ditemukan:\n\n" + notFound.join("\n")
    );
  }

  setBulkText("");
}

function handleAddItem() {
  if (!selectedProduct || !selectedOutlet) return;

  setCart((prev) => {
    const existing = prev.find(
  (item) => item.product.id === selectedProduct.id
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
        item.product.id === selectedProduct.id
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
}


  // REMOVE ITEM
  function handleRemove(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  // SAVE EDIT
  function handleSaveEdit(product: any) {
  setCart((prev) =>
    prev.map((item) => {
      if (item.product.id !== product.id) return item;

      const discount = getDiscount(
        selectedOutlet?.cluster || null,
        product,
        editQty
      );

      const subtotal =
        editQty *
        (product.price -
          (product.price * discount) / 100);

      return {
        ...item,
        qty: editQty,
        discount,
        subtotal,
      };
    })
  );

  setEditingId(null);
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
  product_id: item.product.id,
  quantity: item.qty,
  price: item.product.price,
  discount: item.discount,
  subtotal:
    item.product.price *
    item.qty *
    (1 - item.discount / 100),
}));

  const { error } = await supabase.rpc("create_sales_order", {
    p_outlet_id: selectedOutlet.id,
    p_total: total,
    p_items: itemsPayload,
  });

  if (error) {
    console.error(error);
    setResultModal({
      type: "error",
      title: "Gagal Post Order",
      message: error.message || "Terjadi kesalahan saat memproses order"
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
  async function handleDownloadPDF() {
    const invoiceElement = document.getElementById("invoice-content");
    if (!invoiceElement) return;

    try {
      const canvas = await html2canvas(invoiceElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - 20;
      }

      const fileName = `Invoice_${resultModal?.orderData?.outlet?.name}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Gagal download PDF");
    }
  }


  // TOTAL
  const total = useMemo(() => {
    return cart.reduce((acc, item) => {
      const priceAfterDiscount =
        item.product.price * (1 - item.discount / 100);

      return acc + priceAfterDiscount * item.qty;
    }, 0);
  }, [cart]);

  const sisaLimit = useMemo(() => {
  if (!selectedOutlet) return 0;

  return (
    (selectedOutlet.credit_limit || 0) -
    (selectedOutlet.current_saldo || 0)
  );
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
            <div>Tempo: {selectedOutlet.tempo} hari</div>
            <div>
              Sisa Limit: Rp {sisaLimit.toLocaleString()}
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
      return handleSelectProduct(p);
    }}
    className="p-3 hover:bg-gray-100 cursor-pointer border-b"
  >
    <div className="font-semibold text-gray-800">
      {p.name}
    </div>

    <div className="text-sm text-gray-600">
      HJR: Rp {p.price?.toLocaleString()} | 
      <span className={p.stock === 0 ? "text-red-600 font-semibold" : ""}>
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
  const priceAfterDiscount =
    item.product.price * (1 - item.discount / 100);

  const subtotal =
    priceAfterDiscount * item.qty;

  return (
    <div
      key={index}
      className="border border-gray-300 p-4 rounded-lg bg-gray-50 flex justify-between items-center"
    >
      <div>
        <div className="font-semibold">
          {item.product.name} x {item.qty}
        </div>
        <div>Diskon: {item.discount}%</div>
        <div>
          Subtotal: Rp {subtotal.toLocaleString()}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingId(item.product.id);
            setEditQty(item.qty);
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
    <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
      <h2 className="text-xl font-bold mb-4">Edit Item</h2>
      
      {cart.find((item) => item.product.id === editingId) && (
        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-2">Nama Produk:</label>
            <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
              {cart.find((item) => item.product.id === editingId)?.product.name}
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-2">Harga (Rp):</label>
            <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
              {cart.find((item) => item.product.id === editingId)?.product.price.toLocaleString()}
            </div>
          </div>

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

          <div>
            <label className="block font-semibold mb-2">Diskon:</label>
            <div className="p-3 bg-gray-100 rounded-lg border border-gray-300">
              {cart.find((item) => item.product.id === editingId)?.discount}%
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                const item = cart.find((item) => item.product.id === editingId);
                if (item) {
                  handleSaveEdit(item.product);
                }
              }}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
            >
              Simpan
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="flex-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 font-semibold"
            >
              Batal
            </button>
          </div>
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
  <button
    onClick={handleSubmitOrder}
    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
  >
    Post Order
  </button>
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
    <div id="invoice-content" className="bg-white rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-96 overflow-y-auto">
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
              <div className="font-semibold text-gray-800">{resultModal?.orderData?.outlet?.tempo} hari</div>
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
              const priceAfterDiscount =
                item.product.price * (1 - item.discount / 100);
              const subtotal = priceAfterDiscount * item.qty;

              return (
                <div key={index} className="bg-white p-4 rounded border border-gray-200 mb-3">
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                    <div>
                      <div className="font-bold text-gray-800 text-base">{item.product.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Gol: <span className="font-semibold">{item.product.gol || "-"}</span>
                      </div>
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
                        Rp {item.product.price.toLocaleString()}
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
          onClick={() => setResultModal(null)}
          className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-semibold"
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

