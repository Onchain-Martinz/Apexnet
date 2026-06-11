import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const EMAIL = "iwualakizitto@gmail.com";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { email: EMAIL },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await db.lecturerProfile.update({
    where: { userId: user.id },
    data: { verified: true, verifiedAt: new Date() },
    select: { verified: true, verifiedAt: true },
  });

  return NextResponse.json({ success: true, verified: updated.verified });
}
