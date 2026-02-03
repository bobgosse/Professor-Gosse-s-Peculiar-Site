import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_BANNER_TYPES = ["TRAVEL", "MOVE", "HOLIDAY", "PRERIG", "INFO"];

// POST /api/projects/[id]/schedule/banners - Create a banner strip
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const access = await getProjectAccess(projectId, session.user.id);

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to manage banners" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { afterPosition, label, bannerType } = body;

    if (typeof afterPosition !== "number" || afterPosition < 0) {
      return NextResponse.json(
        { error: "afterPosition must be a non-negative number" },
        { status: 400 }
      );
    }

    if (!label || typeof label !== "string" || label.trim().length === 0) {
      return NextResponse.json(
        { error: "label is required" },
        { status: 400 }
      );
    }

    if (!bannerType || !VALID_BANNER_TYPES.includes(bannerType)) {
      return NextResponse.json(
        { error: `bannerType must be one of: ${VALID_BANNER_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Get the schedule
    const schedule = await prisma.schedule.findUnique({
      where: { projectId },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }

    const banner = await prisma.bannerStrip.create({
      data: {
        scheduleId: schedule.id,
        afterPosition,
        label: label.trim(),
        bannerType,
      },
    });

    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    console.error("Error creating banner:", error);
    return NextResponse.json(
      { error: "Failed to create banner" },
      { status: 500 }
    );
  }
}
