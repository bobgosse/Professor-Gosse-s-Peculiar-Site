import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getProjectAccess } from "@/lib/project-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/projects/[id]/characters/reorder - Reorder characters
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
        { error: "You don't have permission to reorder characters" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { characterIds } = body;

    if (!Array.isArray(characterIds) || characterIds.length === 0) {
      return NextResponse.json(
        { error: "characterIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Verify all character IDs belong to this project
    const characters = await prisma.character.findMany({
      where: { projectId },
      select: { id: true },
    });

    const validIds = new Set(characters.map((c) => c.id));
    const invalidIds = characterIds.filter((id: string) => !validIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Some character IDs are invalid or don't belong to this project" },
        { status: 400 }
      );
    }

    // Check that all characters are included (no missing ones)
    if (characterIds.length !== characters.length) {
      return NextResponse.json(
        { error: "All characters must be included in the reorder array" },
        { status: 400 }
      );
    }

    // Update each character's number in a transaction
    await prisma.$transaction(
      characterIds.map((charId: string, index: number) =>
        prisma.character.update({
          where: { id: charId },
          data: { number: index + 1 },
        })
      )
    );

    // Return the reordered characters
    const reorderedCharacters = await prisma.character.findMany({
      where: { projectId },
      orderBy: { number: "asc" },
    });

    return NextResponse.json(reorderedCharacters);
  } catch (error) {
    console.error("Error reordering characters:", error);
    return NextResponse.json(
      { error: "Failed to reorder characters" },
      { status: 500 }
    );
  }
}
