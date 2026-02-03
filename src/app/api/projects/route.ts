import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/projects - List all projects for the current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        _count: {
          select: {
            breakdowns: true,
            characters: true,
          },
        },
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          where: { userId: session.user.id },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Transform to include user's role
    const projectsWithRole = projects.map((project) => ({
      ...project,
      userRole: project.ownerId === session.user.id
        ? "owner"
        : project.members[0]?.role || null,
      members: undefined, // Remove members array from response
    }));

    return NextResponse.json(projectsWithRole);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, director, producer, ad, scriptDate } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Create project with an empty schedule
    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        director: director?.trim() || null,
        producer: producer?.trim() || null,
        ad: ad?.trim() || null,
        scriptDate: scriptDate ? new Date(scriptDate) : null,
        ownerId: session.user.id,
        schedule: {
          create: {}, // Auto-create empty schedule
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        schedule: true,
        _count: {
          select: {
            breakdowns: true,
            characters: true,
          },
        },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
