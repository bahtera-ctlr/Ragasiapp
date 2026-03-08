"use client";

import { useEffect, useMemo, useState, useRef } from "react"
import { supabase } from "@/lib/supabase";

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
    alert("Outlet dan item harus diisi");
    return;
  }

  const itemsPayload = cart.map((item) => ({
  product_id: item.product.id,
  quantity: item.qty,  // ⬅️ GANTI INI
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
    alert("Gagal post order");
    return;
  }

  alert("Order berhasil!");

setCart([]);

await fetchProducts(); 
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
      key={item.product.id}   // 🔥 GANTI key
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
          className="relative z-50 pointer-events-auto text-blue-600 font-semibold mr-4"
        >
          Edit
        </button>
        <button
          onClick={() => handleRemove(index)}
          className="text-red-600 font-semibold"
        >
          Hapus
        </button>
      </div>
    </div>
  );
})}

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
      </div>
    </div>
  );
}

