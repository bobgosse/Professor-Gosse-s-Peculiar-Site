import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/characters - List all characters
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

    const characters = await prisma.character.findMany({
      where: { projectId },
      orderBy: { number: "asc" },
    });

    return NextResponse.json(characters);
  } catch (error) {
    console.error("Error fetching characters:", error);
    return NextResponse.json(
      { error: "Failed to fetch characters" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/characters - Add a character
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

    // Must have edit access
    if (!access.canEdit && !access.isOwner) {
      return NextResponse.json(
        { error: "You don't have permission to add characters" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, actor } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Character name is required" },
        { status: 400 }
      );
    }

    // Get the next available number
    const maxNumber = await prisma.character.aggregate({
      where: { projectId },
      _max: { number: true },
    });

    const nextNumber = (maxNumber._max.number || 0) + 1;

    const character = await prisma.character.create({
      data: {
        projectId,
        name: name.trim(),
        actor: actor?.trim() || null,
        number: nextNumber,
      },
    });

    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    console.error("Error creating character:", error);
    return NextResponse.json(
      { error: "Failed to create character" },
      { status: 500 }
    );
  }
}
