import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Upload source maps for a release.
 *
 * POST /api/projects/[projectId]/releases
 * Body: { version, sourceMaps: [{ fileName, content }] }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { version, sourceMaps } = body as {
    version: string;
    sourceMaps: { fileName: string; content: string }[];
  };

  if (
    !version ||
    !sourceMaps ||
    !Array.isArray(sourceMaps) ||
    sourceMaps.length === 0
  ) {
    return NextResponse.json(
      { error: "version and sourceMaps are required" },
      { status: 400 }
    );
  }

  // Create or update release
  const release = await prisma.release.upsert({
    where: { projectId_version: { projectId, version } },
    create: { version, projectId },
    update: {},
  });

  // Upsert source maps
  for (const sm of sourceMaps) {
    await prisma.sourceMap.upsert({
      where: {
        releaseId_fileName: { releaseId: release.id, fileName: sm.fileName },
      },
      create: {
        fileName: sm.fileName,
        content: sm.content,
        releaseId: release.id,
      },
      update: { content: sm.content },
    });
  }

  return NextResponse.json(
    { releaseId: release.id, version },
    { status: 201 }
  );
}
