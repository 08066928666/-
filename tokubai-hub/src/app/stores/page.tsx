"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { CHAIN_COLORS } from "@/lib/constants";

interface Store {
  id: string;
  name: string;
  chain: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  openHours: string;
  _count: { products: number };
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setStores)
      .catch(() => setError("店舗の読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  const totalProducts = stores.reduce((s, st) => s + st._count.products, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="bg-gradient-to-b from-brand-500 to-brand-600 px-4 pb-6 pt-6 text-white lg:rounded-b-3xl lg:px-8">
        <h1 className="text-2xl font-bold">店舗一覧</h1>
        <p className="mt-1 text-sm text-orange-100">提携店舗と現在の値下げ商品数</p>
        {!loading && !error && (
          <p className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            {stores.length} 店舗 · {totalProducts} 商品
          </p>
        )}
      </div>

      <div className="px-4 py-6 lg:px-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-32 w-full rounded-3xl" />
            ))}
          </div>
        ) : error ? (
          <EmptyState icon="⚠️" title="読み込みエラー" description={error} />
        ) : stores.length === 0 ? (
          <EmptyState icon="🏪" title="店舗がありません" description="近日中に店舗が追加されます" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {stores.map((store) => {
              const color = CHAIN_COLORS[store.chain] ?? "bg-stone-500";
              return (
                <article
                  key={store.id}
                  className="card-surface overflow-hidden transition hover:shadow-card-hover"
                >
                  <div className="flex items-start justify-between gap-3 p-5">
                    <div className="min-w-0 flex-1">
                      <span className={`mb-2 inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold text-white ${color}`}>
                        {store.chain}
                      </span>
                      <h2 className="font-bold text-stone-900">{store.name}</h2>
                      <p className="mt-2 text-sm text-stone-500">📍 {store.address}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-stone-400">
                        <span>🕐 {store.openHours}</span>
                        {store.phone && <span>📞 {store.phone}</span>}
                      </div>
                    </div>
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50">
                      <span className="text-lg font-extrabold text-brand-600">{store._count.products}</span>
                      <span className="text-[10px] font-medium text-brand-500">商品</span>
                    </div>
                  </div>
                  <div className="border-t border-stone-50 bg-stone-50/50 px-5 py-3">
                    <Link
                      href={`/products?storeId=${store.id}`}
                      className="flex items-center justify-between text-sm font-semibold text-brand-600"
                    >
                      値下げ商品を見る
                      <span>→</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
