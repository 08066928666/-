import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

const productSchema = z.object({
  storeId: z.string(),
  name: z.string().min(1),
  category: z.enum(["BENTO", "SIDE_DISH", "SEASONING", "BREAD", "DAIRY", "SNACK", "BEVERAGE", "OTHER"]),
  description: z.string().optional(),
  originalPrice: z.number().int().min(1),
  discountPercent: z.number().int().min(1).max(90),
  expiryAt: z.string(),
  quantity: z.number().int().min(0),
  imageEmoji: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    if (session.role !== "MERCHANT" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const stores = await prisma.store.findMany({
      where: session.role === "ADMIN" ? {} : { merchantId: session.id },
      include: {
        products: { orderBy: { expiryAt: "asc" } },
        orders: {
          where: { status: { in: ["PENDING", "CONFIRMED", "READY"] } },
          include: { user: { select: { name: true, email: true } }, items: { include: { product: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(stores);
  } catch {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role !== "MERCHANT" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const body = await req.json();
    const data = productSchema.parse(body);

    const store = await prisma.store.findFirst({
      where: {
        id: data.storeId,
        ...(session.role === "ADMIN" ? {} : { merchantId: session.id }),
      },
    });
    if (!store) {
      return NextResponse.json({ error: "店舗が見つかりません" }, { status: 404 });
    }

    const discountPrice = Math.round(data.originalPrice * (1 - data.discountPercent / 100));

    const product = await prisma.product.create({
      data: {
        storeId: data.storeId,
        name: data.name,
        category: data.category,
        description: data.description,
        originalPrice: data.originalPrice,
        discountPrice,
        discountPercent: data.discountPercent,
        expiryAt: new Date(data.expiryAt),
        quantity: data.quantity,
        imageEmoji: data.imageEmoji ?? "🍱",
      },
    });

    return NextResponse.json(product);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "入力内容を確認してください" }, { status: 400 });
    }
    return NextResponse.json({ error: "商品の追加に失敗しました" }, { status: 500 });
  }
}
