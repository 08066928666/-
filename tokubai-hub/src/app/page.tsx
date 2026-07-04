import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-500 to-amber-400 px-4 pb-16 pt-12 text-white sm:pb-20 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <div className="absolute -left-4 top-8 text-8xl">🍱</div>
          <div className="absolute right-4 top-16 text-7xl">🥛</div>
          <div className="absolute bottom-8 left-1/4 text-6xl">🍞</div>
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="mb-4 inline-block rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold backdrop-blur">
            食品ロス削減プラットフォーム
          </span>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl">
            値下げ商品を、
            <br />
            リアルタイムで。
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-base text-orange-50 sm:text-lg">
            スーパー・コンビニの期限間近商品を一覧表示。
            オンライン予約 → 店頭受取で、もったいないをなくそう。
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link href="/demo" className="btn-primary w-full max-w-xs !bg-white !text-brand-600 !shadow-lg sm:w-auto">
              デモを体験する
            </Link>
            <Link
              href="/products"
              className="w-full max-w-xs rounded-2xl border-2 border-white/60 px-8 py-3 text-center text-sm font-bold text-white transition hover:bg-white/10 sm:w-auto"
            >
              値下げ商品を見る
            </Link>
          </div>
        </div>

        <div className="relative mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3 px-2">
          {[
            { n: "4", label: "提携店舗" },
            { n: "18+", label: "値下げ商品" },
            { n: "50%", label: "最大割引" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/10 px-3 py-4 text-center backdrop-blur">
              <div className="text-2xl font-extrabold">{s.n}</div>
              <div className="text-xs text-orange-100">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-8 text-center text-xl font-bold text-stone-900 sm:text-2xl">こんな課題を解決します</h2>
        <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {[
            { icon: "👀", title: "情報が見えない", desc: "お店に行かないと値下げ情報がわからない。タイミングを逃して食品ロスに。" },
            { icon: "📱", title: "リアルタイム在庫", desc: "近くの店舗の値下げ商品をリアルタイムで確認。残り在庫も一目瞭然。" },
            { icon: "🏪", title: "予約して受取", desc: "オンラインで予約、店頭で受取。無駄なく、便利に買い物。" },
          ].map((item) => (
            <div key={item.title} className="card-surface p-6 transition hover:shadow-card-hover">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
                {item.icon}
              </div>
              <h3 className="mb-2 font-bold text-stone-900">{item.title}</h3>
              <p className="text-sm leading-relaxed text-stone-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-10 text-center text-xl font-bold text-stone-900 sm:text-2xl">3ステップで完了</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { step: "01", title: "探す", desc: "近くの値下げ商品を検索", icon: "🔍" },
              { step: "02", title: "予約", desc: "カートに入れて注文", icon: "🛒" },
              { step: "03", title: "受取", desc: "店頭でコードを提示", icon: "✅" },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-2xl text-white shadow-sm">
                  {item.icon}
                </div>
                <p className="mb-1 text-xs font-bold text-brand-500">STEP {item.step}</p>
                <h3 className="mb-1 font-bold text-stone-900">{item.title}</h3>
                <p className="text-sm text-stone-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-lg px-4 py-14 text-center">
        <div className="card-surface p-8">
          <h2 className="mb-2 text-lg font-bold">すぐに試せます</h2>
          <p className="mb-6 text-sm text-stone-500">デモアカウントで全機能を体験</p>
          <Link href="/demo" className="btn-primary mb-4 w-full">
            ワンクリックデモを開始
          </Link>
          <p className="text-xs text-stone-400">パスワード: demo1234 · user@example.com</p>
        </div>
      </section>
    </div>
  );
}
