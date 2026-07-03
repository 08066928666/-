import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import path from "path";

const dbUrl = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("demo1234", 10);

  const admin = await prisma.user.create({
    data: { email: "admin@tokubai.jp", password, name: "管理者", role: "ADMIN" },
  });

  const merchant1 = await prisma.user.create({
    data: { email: "merchant@seven.jp", password, name: "田中店長", role: "MERCHANT" },
  });

  const merchant2 = await prisma.user.create({
    data: { email: "merchant@lawson.jp", password, name: "佐藤店長", role: "MERCHANT" },
  });

  const customer = await prisma.user.create({
    data: { email: "user@example.com", password, name: "山田太郎", role: "CUSTOMER" },
  });

  const store1 = await prisma.store.create({
    data: {
      name: "セブン-イレブン 渋谷道玄坂店",
      chain: "セブン-イレブン",
      address: "東京都渋谷区道玄坂1-2-3",
      latitude: 35.6591,
      longitude: 139.6986,
      phone: "03-1234-5678",
      merchantId: merchant1.id,
    },
  });

  const store2 = await prisma.store.create({
    data: {
      name: "ローソン 新宿西口店",
      chain: "ローソン",
      address: "東京都新宿区西新宿1-1-1",
      latitude: 35.6896,
      longitude: 139.7006,
      phone: "03-2345-6789",
      merchantId: merchant2.id,
    },
  });

  const store3 = await prisma.store.create({
    data: {
      name: "ファミリーマート 池袋東口店",
      chain: "ファミリーマート",
      address: "東京都豊島区東池袋1-5-1",
      latitude: 35.7295,
      longitude: 139.7109,
      phone: "03-3456-7890",
      merchantId: merchant1.id,
    },
  });

  const store4 = await prisma.store.create({
    data: {
      name: "まいばすけっと 恵比寿店",
      chain: "まいばすけっと",
      address: "東京都渋谷区恵比寿4-20-3",
      latitude: 35.6467,
      longitude: 139.7100,
      phone: "03-4567-8901",
      merchantId: merchant2.id,
    },
  });

  const products = [
  // Store 1 - Seven
  { storeId: store1.id, name: "のり弁当", category: "BENTO" as const, originalPrice: 498, discountPrice: 249, discountPercent: 50, expiryAt: hoursFromNow(2), quantity: 3, imageEmoji: "🍱" },
  { storeId: store1.id, name: "からあげ弁当", category: "BENTO" as const, originalPrice: 548, discountPrice: 329, discountPercent: 40, expiryAt: hoursFromNow(3), quantity: 2, imageEmoji: "🍗" },
  { storeId: store1.id, name: "サラダチキン プレーン", category: "SIDE_DISH" as const, originalPrice: 218, discountPrice: 109, discountPercent: 50, expiryAt: hoursFromNow(4), quantity: 5, imageEmoji: "🥗" },
  { storeId: store1.id, name: "たまごサンド", category: "BREAD" as const, originalPrice: 198, discountPrice: 99, discountPercent: 50, expiryAt: hoursFromNow(1.5), quantity: 4, imageEmoji: "🥪" },
  { storeId: store1.id, name: "ポテトサラダ", category: "SIDE_DISH" as const, originalPrice: 168, discountPrice: 84, discountPercent: 50, expiryAt: hoursFromNow(5), quantity: 2, imageEmoji: "🥔" },
  // Store 2 - Lawson
  { storeId: store2.id, name: "赤坂璃宮監修 麻婆豆腐弁当", category: "BENTO" as const, originalPrice: 598, discountPrice: 299, discountPercent: 50, expiryAt: hoursFromNow(2.5), quantity: 2, imageEmoji: "🍱" },
  { storeId: store2.id, name: "うなぎ蒲焼き弁当", category: "BENTO" as const, originalPrice: 798, discountPrice: 479, discountPercent: 40, expiryAt: hoursFromNow(3), quantity: 1, imageEmoji: "🍱" },
  { storeId: store2.id, name: "キムチ", category: "SEASONING" as const, originalPrice: 298, discountPrice: 149, discountPercent: 50, expiryAt: hoursFromNow(48), quantity: 6, imageEmoji: "🌶️" },
  { storeId: store2.id, name: "プレミアムロールケーキ", category: "SNACK" as const, originalPrice: 138, discountPrice: 69, discountPercent: 50, expiryAt: hoursFromNow(6), quantity: 3, imageEmoji: "🍰" },
  { storeId: store2.id, name: "野菜ジュース", category: "BEVERAGE" as const, originalPrice: 128, discountPrice: 64, discountPercent: 50, expiryAt: hoursFromNow(12), quantity: 8, imageEmoji: "🥤" },
  // Store 3 - FamilyMart
  { storeId: store3.id, name: "幕の内弁当", category: "BENTO" as const, originalPrice: 598, discountPrice: 358, discountPercent: 40, expiryAt: hoursFromNow(2), quantity: 2, imageEmoji: "🍱" },
  { storeId: store3.id, name: "おにぎり 鮭", category: "SIDE_DISH" as const, originalPrice: 138, discountPrice: 69, discountPercent: 50, expiryAt: hoursFromNow(4), quantity: 6, imageEmoji: "🍙" },
  { storeId: store3.id, name: "バナナ", category: "OTHER" as const, originalPrice: 108, discountPrice: 54, discountPercent: 50, expiryAt: hoursFromNow(8), quantity: 10, imageEmoji: "🍌" },
  { storeId: store3.id, name: "醤油", category: "SEASONING" as const, originalPrice: 198, discountPrice: 99, discountPercent: 50, expiryAt: hoursFromNow(720), quantity: 4, imageEmoji: "🫙" },
  // Store 4 - My Basket
  { storeId: store4.id, name: "牛乳 1L", category: "DAIRY" as const, originalPrice: 228, discountPrice: 114, discountPercent: 50, expiryAt: hoursFromNow(24), quantity: 5, imageEmoji: "🥛" },
  { storeId: store4.id, name: "豆腐ハンバーグ", category: "SIDE_DISH" as const, originalPrice: 298, discountPrice: 149, discountPercent: 50, expiryAt: hoursFromNow(3), quantity: 3, imageEmoji: "🍖" },
  { storeId: store4.id, name: "惣菜パック 5品", category: "SIDE_DISH" as const, originalPrice: 498, discountPrice: 249, discountPercent: 50, expiryAt: hoursFromNow(2), quantity: 2, imageEmoji: "🥘" },
  { storeId: store4.id, name: "食パン 6枚切", category: "BREAD" as const, originalPrice: 158, discountPrice: 79, discountPercent: 50, expiryAt: hoursFromNow(18), quantity: 4, imageEmoji: "🍞" },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  console.log("Seed completed!");
  console.log("Demo accounts (password: demo1234):");
  console.log("  Customer:", customer.email);
  console.log("  Merchant:", merchant1.email, merchant2.email);
  console.log("  Admin:", admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
