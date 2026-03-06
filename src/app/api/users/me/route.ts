import { NextRequest, NextResponse } from "next/server";
import { requireSessionForApi } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getFriendCount } from "@/lib/friends";

export async function GET() {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        friendCapLimit: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const friendCount = await getFriendCount(user.id);

    return NextResponse.json({ user: { ...user, friendCount } });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  let session: Awaited<ReturnType<typeof requireSessionForApi>>;
  try {
    session = await requireSessionForApi();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Only allow updating specific fields
    const allowedFields: Record<string, unknown> = {};
    if (body.name !== undefined) allowedFields.name = body.name;
    if (body.bio !== undefined) allowedFields.bio = body.bio;
    if (body.image !== undefined) allowedFields.image = body.image;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: allowedFields,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        friendCapLimit: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
