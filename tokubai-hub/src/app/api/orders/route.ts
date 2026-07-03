import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { generatePickupCode } from "@/lib/constants";

const orderSchema = z.object({
  storeId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().min(1),
    })
  ).min(1),
  note: z.string().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const orders = await prisma.order.findMany({
      where: { userId: session.id },
      include: {
        store: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const data = orderSchema.parse(body);

    const productIds = data.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: data.storeId,
        isActive: true,
        quantity: { gt: 0 },
        expiryAt: { gt: new Date() },
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "一部の商品が購入できなくなりました" }, { status: 400 });
    }

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.quantity < item.quantity) {
        return NextResponse.json(
          { error: `「${product.name}」の在庫が不足しています（残り${product.quantity}点）` },
          { status: 400 }
        );
      }
    }

    let pickupCode = generatePickupCode();
    while (await prisma.order.findUnique({ where: { pickupCode } })) {
      pickupCode = generatePickupCode();
    }

    const totalAmount = data.items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return sum + product.discountPrice * item.quantity;
    }, 0);

    const order = await prisma.$transaction(async (tx) => {
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return tx.order.create({
        data: {
          userId: session.id,
          storeId: data.storeId,
          pickupCode,
          totalAmount,
          note: data.note,
          status: "CONFIRMED",
          items: {
            create: data.items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: product.discountPrice,
              };
            }),
          },
        },
        include: {
          store: true,
          items: { include: { product: true } },
        },
      });
    });

    return NextResponse.json(order);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "注文内容を確認してください" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }
    return NextResponse.json({ error: "注文に失敗しました" }, { status: 500 });
  }
}
