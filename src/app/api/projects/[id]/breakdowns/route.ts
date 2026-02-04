import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/breakdowns - List all breakdown sheets
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const breakdowns = await prisma.breakdownSheet.findMany({
      where: { projectId },
      orderBy: { sortOrder: "asc" },
      include: {
        cast: {
          include: {
            character: true,
          },
          orderBy: {
            character: { number: "asc" },
          },
        },
        elements: {
          include: {
            element: true,
          },
          orderBy: {
            element: { name: "asc" },
          },
        },
      },
    });

    return NextResponse.json(breakdowns);
  } catch (error) {
    console.error("Error fetching breakdowns:", error);
    return NextResponse.json(
      { error: "Failed to fetch breakdowns" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/breakdowns - Create a breakdown sheet
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
        { error: "You don't have permission to create breakdowns" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      sceneNumbers,
      intExt,
      location,
      dayNight,
      pageCount,
      description,
      storyDay,
      cameraSetups,
      isFlashback,
      stunts,
      extras,
      wardrobe,
      props,
      setDressing,
      artDept,
      specialPersonnel,
      vehicles,
      camera,
      mechanicalFx,
      visualFx,
      specialEquip,
      animals,
      soundMusic,
      other,
      dqs,
      castIds,
      elementIds,
    } = body;

    if (!sceneNumbers || typeof sceneNumbers !== "string") {
      return NextResponse.json(
        { error: "Scene numbers are required" },
        { status: 400 }
      );
    }

    // Get the next sortOrder
    const maxSortOrder = await prisma.breakdownSheet.aggregate({
      where: { projectId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSortOrder._max.sortOrder || 0) + 1;

    // Get the project's schedule
    const schedule = await prisma.schedule.findUnique({
      where: { projectId },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Project schedule not found" },
        { status: 500 }
      );
    }

    // Get the next strip position
    const maxPosition = await prisma.stripSlot.aggregate({
      where: { scheduleId: schedule.id },
      _max: { position: true },
    });
    const nextPosition = (maxPosition._max.position || 0) + 1;

    // Validate castIds if provided
    let validCastIds: string[] = [];
    if (castIds && Array.isArray(castIds) && castIds.length > 0) {
      const characters = await prisma.character.findMany({
        where: {
          projectId,
          id: { in: castIds },
        },
        select: { id: true },
      });
      validCastIds = characters.map((c) => c.id);
    }

    // Validate elementIds if provided
    let validElementIds: string[] = [];
    if (elementIds && Array.isArray(elementIds) && elementIds.length > 0) {
      const elements = await prisma.productionElement.findMany({
        where: {
          projectId,
          id: { in: elementIds },
        },
        select: { id: true },
      });
      validElementIds = elements.map((e: { id: string }) => e.id);
    }

    // Create breakdown with strip slot in a transaction
    const breakdown = await prisma.$transaction(async (tx) => {
      const newBreakdown = await tx.breakdownSheet.create({
        data: {
          projectId,
          sceneNumbers: sceneNumbers.trim(),
          intExt: intExt || null,
          location: location?.trim() || null,
          dayNight: dayNight || null,
          pageCount: pageCount?.trim() || null,
          description: description?.trim() || null,
          storyDay: storyDay ? parseInt(storyDay, 10) : null,
          cameraSetups: cameraSetups ? parseInt(cameraSetups, 10) : null,
          isFlashback: isFlashback || false,
          sortOrder: nextSortOrder,
          stunts: stunts?.trim() || null,
          extras: extras?.trim() || null,
          wardrobe: wardrobe?.trim() || null,
          props: props?.trim() || null,
          setDressing: setDressing?.trim() || null,
          artDept: artDept?.trim() || null,
          specialPersonnel: specialPersonnel?.trim() || null,
          vehicles: vehicles?.trim() || null,
          camera: camera?.trim() || null,
          mechanicalFx: mechanicalFx?.trim() || null,
          visualFx: visualFx?.trim() || null,
          specialEquip: specialEquip?.trim() || null,
          animals: animals?.trim() || null,
          soundMusic: soundMusic?.trim() || null,
          other: other?.trim() || null,
          dqs: dqs?.trim() || null,
          cast: {
            create: validCastIds.map((characterId) => ({
              characterId,
            })),
          },
          elements: {
            create: validElementIds.map((elementId) => ({
              elementId,
            })),
          },
        },
        include: {
          cast: {
            include: { character: true },
          },
          elements: {
            include: { element: true },
          },
        },
      });

      // Auto-create strip slot
      await tx.stripSlot.create({
        data: {
          scheduleId: schedule.id,
          breakdownId: newBreakdown.id,
          position: nextPosition,
        },
      });

      return newBreakdown;
    });

    return NextResponse.json(breakdown, { status: 201 });
  } catch (error) {
    console.error("Error creating breakdown:", error);
    return NextResponse.json(
      { error: "Failed to create breakdown" },
      { status: 500 }
    );
  }
}
