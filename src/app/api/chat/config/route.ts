import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      return NextResponse.json({ chatEnabled: false });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { chatEnabled: true },
    });

    return NextResponse.json({
      chatEnabled: org?.chatEnabled ?? false,
    });
  } catch (error) {
    console.error("Error fetching chat config:", error);
    return NextResponse.json({ chatEnabled: false });
  }
}
