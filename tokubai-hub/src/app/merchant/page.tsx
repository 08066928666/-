"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, ORDER_STATUS_LABELS, formatExpiry, formatPrice } from "@/lib/constants";

interface StoreData {
  id: string;
  name: string;
  chain: string;
  products: {
    id: string;
    name: string;
    category: string;
    originalPrice: number;
    discountPrice: number;
    discountPercent: number;
    expiryAt: string;
    quantity: number;
    isActive: boolean;
    imageEmoji: string;
  }[];
  orders: {
    id: string;
    pickupCode: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    user: { name: string; email: string };
    items: { quantity: number; product: { name: string } }[];
  }[];
}

export default function MerchantPage() {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [tab, setTab] = useState<"products" | "orders" | "add">("products");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "BENTO",
    originalPrice: 500,
    discountPercent: 50,
    expiryAt: "",
    quantity: 1,
    imageEmoji: "🍱",
  });

  async function fetchData() {
    const res = await fetch("/api/merchant");
    if (res.status === 401 || res.status === 403) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setStores(data);
    if (data.length > 0 && !selectedStore) setSelectedStore(data[0].id);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store = stores.find((s) => s.id === selectedStore);

  async function updateProduct(id: string, data: Record<string, unknown>) {
    await fetch(`/api/merchant/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    fetchData();
  }

  async function updateOrder(id: string, status: string) {
    await fetch(`/api/merchant/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStore) return;
    const res = await fetch("/api/merchant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newProduct, storeId: selectedStore }),
    });
    if (res.ok) {
      setNewProduct({
        name: "",
        category: "BENTO",
        originalPrice: 500,
        discountPercent: 50,
        expiryAt: "",
        quantity: 1,
        imageEmoji: "🍱",
      });
      setTab("products");
      fetchData();
    }
  }

  if (loading) return <div className="py-20 text-center text-gray-500">読み込み中...</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">店舗管理</h1>
      <p className="mb-6 text-gray-600">値下げ商品の登録・在庫管理・注文処理</p>

      {stores.length > 1 && (
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="mb-6 rounded-xl border px-4 py-2 text-sm"
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      <div className="mb-6 flex gap-2">
        {(["products", "orders", "add"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "products" ? "商品一覧" : t === "orders" ? "注文管理" : "商品追加"}
          </button>
        ))}
      </div>

      {tab === "products" && store && (
        <div className="space-y-3">
          {store.products.filter((p) => p.isActive).map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border bg-white p-4">
              <span className="text-3xl">{p.imageEmoji}</span>
              <div className="flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-gray-500">
                  {CATEGORY_LABELS[p.category]} · {formatExpiry(p.expiryAt)} · 残り{p.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-red-600">{formatPrice(p.discountPrice)}</p>
                <p className="text-xs text-gray-400">{p.discountPercent}% OFF</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateProduct(p.id, { quantity: Math.max(0, p.quantity - 1) })}
                  className="rounded-lg bg-gray-100 px-3 py-1 text-sm"
                >
                  在庫−
                </button>
                <button
                  onClick={() => updateProduct(p.id, { quantity: p.quantity + 1 })}
                  className="rounded-lg bg-gray-100 px-3 py-1 text-sm"
                >
                  在庫+
                </button>
                <button
                  onClick={() => updateProduct(p.id, { isActive: false })}
                  className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
          {store.products.filter((p) => p.isActive).length === 0 && (
            <p className="py-8 text-center text-gray-500">商品がありません</p>
          )}
        </div>
      )}

      {tab === "orders" && store && (
        <div className="space-y-3">
          {store.orders.map((o) => (
            <div key={o.id} className="rounded-xl border bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-orange-600">{o.pickupCode}</span>
                  <span className="ml-3 text-sm text-gray-500">{o.user.name}</span>
                </div>
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                  {ORDER_STATUS_LABELS[o.status]}
                </span>
              </div>
              <p className="mb-2 text-sm text-gray-600">
                {o.items.map((i) => `${i.product.name}×${i.quantity}`).join(", ")}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-bold">{formatPrice(o.totalAmount)}</span>
                <div className="flex gap-2">
                  {o.status === "CONFIRMED" && (
                    <button
                      onClick={() => updateOrder(o.id, "READY")}
                      className="rounded-lg bg-green-500 px-3 py-1 text-sm text-white"
                    >
                      受取可能にする
                    </button>
                  )}
                  {o.status === "READY" && (
                    <button
                      onClick={() => updateOrder(o.id, "PICKED_UP")}
                      className="rounded-lg bg-blue-500 px-3 py-1 text-sm text-white"
                    >
                      受取完了
                    </button>
                  )}
                  {o.status !== "PICKED_UP" && o.status !== "CANCELLED" && (
                    <button
                      onClick={() => updateOrder(o.id, "CANCELLED")}
                      className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600"
                    >
                      キャンセル
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {store.orders.length === 0 && (
            <p className="py-8 text-center text-gray-500">注文がありません</p>
          )}
        </div>
      )}

      {tab === "add" && (
        <form onSubmit={addProduct} className="max-w-lg space-y-4 rounded-2xl border bg-white p-6">
          <div>
            <label className="mb-1 block text-sm font-medium">商品名</label>
            <input
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              required
              className="w-full rounded-xl border px-4 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">カテゴリ</label>
              <select
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full rounded-xl border px-4 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">絵文字</label>
              <input
                value={newProduct.imageEmoji}
                onChange={(e) => setNewProduct({ ...newProduct, imageEmoji: e.target.value })}
                className="w-full rounded-xl border px-4 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">定価（円）</label>
              <input
                type="number"
                value={newProduct.originalPrice}
                onChange={(e) => setNewProduct({ ...newProduct, originalPrice: +e.target.value })}
                className="w-full rounded-xl border px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">割引率（%）</label>
              <input
                type="number"
                value={newProduct.discountPercent}
                onChange={(e) => setNewProduct({ ...newProduct, discountPercent: +e.target.value })}
                className="w-full rounded-xl border px-4 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">在庫数</label>
              <input
                type="number"
                value={newProduct.quantity}
                onChange={(e) => setNewProduct({ ...newProduct, quantity: +e.target.value })}
                className="w-full rounded-xl border px-4 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">消費期限</label>
            <input
              type="datetime-local"
              value={newProduct.expiryAt}
              onChange={(e) => setNewProduct({ ...newProduct, expiryAt: e.target.value })}
              required
              className="w-full rounded-xl border px-4 py-2 text-sm"
            />
          </div>
          <button type="submit" className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">
            商品を登録
          </button>
        </form>
      )}
    </div>
  );
}
