import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 px-4 py-14 text-white sm:py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-10 top-10 text-6xl">🍱</div>
          <div className="absolute right-20 top-20 text-5xl">🥛</div>
          <div className="absolute bottom-10 left-1/3 text-4xl">🍞</div>
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            値下げ商品を、
            <br />
            リアルタイムで。
          </h1>
          <p className="mb-8 text-lg text-orange-50 md:text-xl">
            スーパー・コンビニの期限間近商品を一覧表示。
            <br />
            オンライン予約 → 店頭受取で、もったいないをなくそう。
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/products"
              className="rounded-xl bg-white px-8 py-3 font-bold text-orange-600 shadow-lg transition hover:shadow-xl"
            >
              値下げ商品を見る
            </Link>
            <Link
              href="/register"
              className="rounded-xl border-2 border-white px-8 py-3 font-bold text-white transition hover:bg-white/10"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">こんな課題を解決します</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: "👀",
              title: "情報が見えない",
              desc: "お店に行かないと値下げ情報がわからない。タイミングを逃して食品ロスに。",
            },
            {
              icon: "📱",
              title: "リアルタイム在庫",
              desc: "近くの店舗の値下げ商品をリアルタイムで確認。残り在庫も一目瞭然。",
            },
            {
              icon: "🏪",
              title: "予約して受取",
              desc: "オンラインで予約、店頭で受取。無駄なく、便利に買い物。",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
              <div className="mb-3 text-3xl">{item.icon}</div>
              <h3 className="mb-2 font-bold text-gray-900">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-orange-50 px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">使い方</h2>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: "1", title: "登録", desc: "無料アカウントを作成" },
              { step: "2", title: "探す", desc: "近くの値下げ商品を検索" },
              { step: "3", title: "予約", desc: "カートに入れて注文" },
              { step: "4", title: "受取", desc: "店頭で受取コードを提示" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-1 font-bold">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="mb-4 text-2xl font-bold">デモアカウント</h2>
        <p className="mb-6 text-gray-600">すぐにお試しいただけます（パスワード: demo1234）</p>
        <div className="inline-grid gap-2 rounded-xl bg-gray-50 p-6 text-left text-sm">
          <p><span className="font-medium">一般ユーザー:</span> user@example.com</p>
          <p><span className="font-medium">店舗管理者:</span> merchant@seven.jp</p>
        </div>
      </section>
    </div>
  );
}
