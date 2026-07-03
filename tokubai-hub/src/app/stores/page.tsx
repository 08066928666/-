"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then(setStores);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">店舗一覧</h1>
      <p className="mb-8 text-gray-600">提携店舗と現在の値下げ商品数</p>

      <div className="grid gap-4 md:grid-cols-2">
        {stores.map((store) => {
          const color = CHAIN_COLORS[store.chain] ?? "bg-gray-500";
          return (
            <div key={store.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <span className={`mb-2 inline-block rounded px-2 py-0.5 text-xs font-bold text-white ${color}`}>
                    {store.chain}
                  </span>
                  <h2 className="font-bold text-gray-900">{store.name}</h2>
                </div>
                <div className="rounded-full bg-orange-100 px-3 py-1 text-sm font-bold text-orange-700">
                  {store._count.products}品
                </div>
              </div>
              <p className="mb-1 text-sm text-gray-600">📍 {store.address}</p>
              <p className="mb-1 text-sm text-gray-500">🕐 {store.openHours}</p>
              {store.phone && <p className="mb-4 text-sm text-gray-500">📞 {store.phone}</p>}
              <Link
                href={`/products?storeId=${store.id}`}
                className="inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                値下げ商品を見る →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
