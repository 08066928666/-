"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/components/CartProvider";
import { CATEGORY_LABELS } from "@/lib/constants";

interface Product {
  id: string;
  name: string;
  category: string;
  originalPrice: number;
  discountPrice: number;
  discountPercent: number;
  expiryAt: string;
  quantity: number;
  imageEmoji: string;
  store: { id: string; name: string; chain: string; address: string };
}

const CHAINS = ["セブン-イレブン", "ローソン", "ファミリーマート", "まいばすけっと"];

export default function ProductsContent() {
  const searchParams = useSearchParams();
  const initialStoreId = searchParams.get("storeId") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [chain, setChain] = useState("");
  const [storeId] = useState(initialStoreId);
  const [search, setSearch] = useState("");
  const { addItem } = useCart();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (chain) params.set("chain", chain);
    if (storeId) params.set("storeId", storeId);
    if (search) params.set("q", search);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }, [category, chain, storeId, search]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts, search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">値下げ商品一覧</h1>
        <p className="text-gray-600">リアルタイム在庫 · 期限間近のお得な商品</p>
      </div>

      <div className="mb-6 space-y-4">
        <input
          type="text"
          placeholder="商品名・店舗名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !category ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            すべて
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                category === key ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setChain("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !chain ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            全チェーン
          </button>
          {CHAINS.map((c) => (
            <button
              key={c}
              onClick={() => setChain(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                chain === c ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">読み込み中...</div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center text-gray-500">該当する商品がありません</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAdd={() =>
                addItem({
                  productId: p.id,
                  name: p.name,
                  storeId: p.store.id,
                  storeName: p.store.name,
                  price: p.discountPrice,
                  maxQuantity: p.quantity,
                  imageEmoji: p.imageEmoji,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
