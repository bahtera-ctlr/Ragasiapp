import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase
    .from('products')
    .select('*')

  return (
    <div className="min-h-screen bg-black text-white p-10">
      <h1 className="text-3xl font-bold mb-6">Products</h1>

      {error && (
        <p className="text-red-500">Error: {error.message}</p>
      )}

      {data && data.length === 0 && (
        <p>No products found.</p>
      )}

      <div className="space-y-4">
        {data?.map((product) => (
          <div
            key={product.id}
            className="bg-gray-800 p-4 rounded-lg"
          >
            <h2 className="text-xl font-semibold">
              {product.name}
            </h2>
            <p>SKU: {product.sku}</p>
            <p>Price: Rp {product.price}</p>
            <p>Stock: {product.stock}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
