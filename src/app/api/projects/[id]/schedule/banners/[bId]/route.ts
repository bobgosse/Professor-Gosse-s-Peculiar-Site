import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string; bId: string }>;
}

// DELETE /api/projects/[id]/schedule/banners/[bId] - Remove a banner strip
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, bId } = await params;
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

    // Verify the banner belongs to this schedule
    const banner = await prisma.bannerStrip.findFirst({
      where: { id: bId, scheduleId: schedule.id },
    });

    if (!banner) {
      return NextResponse.json(
        { error: "Banner not found" },
        { status: 404 }
      );
    }

    await prisma.bannerStrip.delete({
      where: { id: bId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting banner:", error);
    return NextResponse.json(
      { error: "Failed to delete banner" },
      { status: 500 }
    );
  }
}
