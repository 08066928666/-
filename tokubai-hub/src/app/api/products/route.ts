import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const chain = searchParams.get("chain");
  const q = searchParams.get("q");
  const storeId = searchParams.get("storeId");

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      quantity: { gt: 0 },
      expiryAt: { gt: new Date() },
      ...(category ? { category: category as never } : {}),
      ...(storeId ? { storeId } : {}),
      ...(chain ? { store: { chain } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { store: { name: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { store: true },
    orderBy: [{ discountPercent: "desc" }, { expiryAt: "asc" }],
  });

  return NextResponse.json(products);
}
