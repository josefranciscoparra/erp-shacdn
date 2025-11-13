import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.orgId) {
      return NextResponse.json({ shiftsEnabled: false });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.orgId },
      select: { shiftsEnabled: true },
    });

    return NextResponse.json({
      shiftsEnabled: org?.shiftsEnabled ?? false,
    });
  } catch (error) {
    console.error("Error fetching shifts config:", error);
    return NextResponse.json({ shiftsEnabled: false });
  }
}
