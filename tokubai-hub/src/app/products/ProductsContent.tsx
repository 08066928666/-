"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/components/CartProvider";
import { useToast } from "@/components/ToastProvider";
import EmptyState, { ProductGridSkeleton } from "@/components/ui/EmptyState";
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
  const storeId = searchParams.get("storeId") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [chain, setChain] = useState("");
  const [search, setSearch] = useState("");
  const [storeName, setStoreName] = useState("");
  const { addItem } = useCart();
  const { toast } = useToast();

  const hasFilters = !!(category || chain || search || storeId);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (chain) params.set("chain", chain);
      if (storeId) params.set("storeId", storeId);
      if (search) params.set("q", search);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setProducts(data);
      if (storeId && data[0]?.store?.name) setStoreName(data[0].store.name);
      else setStoreName("");
    } catch {
      setError("商品の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [category, chain, storeId, search]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts, search]);

  function clearFilters() {
    setCategory("");
    setChain("");
    setSearch("");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="bg-gradient-to-b from-brand-500 to-brand-600 px-4 pb-6 pt-6 text-white lg:rounded-b-3xl lg:px-8">
        <h1 className="text-2xl font-bold">値下げ商品</h1>
        <p className="mt-1 text-sm text-orange-100">
          {storeName ? `${storeName} の商品` : "リアルタイム在庫 · 期限間近のお得な商品"}
        </p>
        {!loading && !error && (
          <p className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            {products.length} 件のお得な商品
          </p>
        )}
      </div>

      <div className="sticky top-[var(--header-height)] z-30 -mt-3 border-b border-stone-100 bg-background/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
          <input
            type="search"
            placeholder="商品名・店舗名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
          />
        </div>

        <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setCategory("")}
            className={`filter-pill ${!category ? "filter-pill-active" : "filter-pill-inactive"}`}
          >
            すべて
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`filter-pill ${category === key ? "filter-pill-active" : "filter-pill-inactive"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="scrollbar-hide mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setChain("")}
            className={`filter-pill ${!chain ? "filter-pill-active" : "filter-pill-inactive"}`}
          >
            全チェーン
          </button>
          {CHAINS.map((c) => (
            <button
              key={c}
              onClick={() => setChain(c)}
              className={`filter-pill ${chain === c ? "filter-pill-active" : "filter-pill-inactive"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-6 lg:px-8">
        {loading ? (
          <ProductGridSkeleton />
        ) : error ? (
          <EmptyState
            icon="⚠️"
            title="読み込みエラー"
            description={error}
            actionLabel="再試行"
            onAction={fetchProducts}
          />
        ) : products.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="該当する商品がありません"
            description={hasFilters ? "フィルタ条件を変更してみてください" : "新しい値下げ商品が入荷されるまでお待ちください"}
            actionLabel={hasFilters ? "フィルタをクリア" : "店舗を見る"}
            onAction={hasFilters ? clearFilters : undefined}
            actionHref={hasFilters ? undefined : "/stores"}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAdd={() => {
                  addItem({
                    productId: p.id,
                    name: p.name,
                    storeId: p.store.id,
                    storeName: p.store.name,
                    price: p.discountPrice,
                    maxQuantity: p.quantity,
                    imageEmoji: p.imageEmoji,
                  });
                  toast(`${p.name} をカートに追加`);
                }}
              />
            ))}
          </div>
        )}

        {storeId && (
          <div className="mt-8 text-center">
            <Link href="/products" className="text-sm font-medium text-brand-600 hover:underline">
              ← すべての店舗の商品を見る
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
