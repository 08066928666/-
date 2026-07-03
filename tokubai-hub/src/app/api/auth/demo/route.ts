import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, setSessionCookie } from "@/lib/auth";

export async function POST() {
  const user = await prisma.user.findUnique({ where: { email: "user@example.com" } });
  if (!user) {
    return NextResponse.json({ error: "デモデータがありません。npm run db:seed を実行してください。" }, { status: 500 });
  }

  const token = await createToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await setSessionCookie(token);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    redirect: "/products",
  });
}
