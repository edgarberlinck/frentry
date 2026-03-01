import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateFingerprint } from "@/lib/fingerprint";
import { resolveStackTrace } from "@/lib/sourcemap";
import { notifyNewIssue } from "@/lib/notifications";
import { ingestEventSchema } from "@/lib/validators";

/**
 * Public event ingestion endpoint.
 * Events are processed synchronously (simple, low-volume use case).
 *
 * POST /api/ingest
 * Body: { dsn, type, message, stacktrace?, release?, metadata?, timestamp? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ingestEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { dsn, type, message, stacktrace, release, metadata, timestamp } =
      parsed.data;

    // Find project by DSN
    const project = await prisma.project.findUnique({
      where: { dsn },
      include: { user: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Invalid DSN" },
        { status: 401 }
      );
    }

    // Resolve stack trace using source maps if available
    const resolvedStacktrace = stacktrace
      ? await resolveStackTrace(stacktrace, release, project.id)
      : null;

    // Generate fingerprint for issue grouping
    const fingerprint = generateFingerprint({
      type,
      message,
      stacktrace: resolvedStacktrace || stacktrace,
    });

    // Truncate message for issue title
    const title =
      `${type}: ${message}`.length > 200
        ? `${type}: ${message}`.slice(0, 197) + "..."
        : `${type}: ${message}`;

    // Find or create issue
    const existingIssue = await prisma.issue.findUnique({
      where: { projectId_fingerprint: { projectId: project.id, fingerprint } },
    });

    const isNewIssue = !existingIssue;

    const issue = existingIssue
      ? await prisma.issue.update({
          where: { id: existingIssue.id },
          data: {
            lastSeen: new Date(),
            eventCount: { increment: 1 },
            // Reopen if it was resolved
            status:
              existingIssue.status === "resolved"
                ? "open"
                : existingIssue.status,
          },
        })
      : await prisma.issue.create({
          data: {
            fingerprint,
            title,
            projectId: project.id,
          },
        });

    // Create event
    const event = await prisma.event.create({
      data: {
        type,
        message,
        stacktrace: stacktrace || null,
        resolved: resolvedStacktrace,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        release: release || null,
        projectId: project.id,
        issueId: issue.id,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    // Send notification for new issues (fire and forget)
    if (isNewIssue) {
      notifyNewIssue(
        {
          issueId: issue.id,
          issueTitle: title,
          projectName: project.name,
          projectId: project.id,
        },
        project.userId
      ).catch((err) =>
        console.error("Failed to send notification:", err)
      );
    }

    return NextResponse.json(
      { id: event.id, issueId: issue.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Event ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
