import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireAuth();
  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) notFound();

  const issues = await prisma.issue.findMany({
    where: { projectId },
    orderBy: { lastSeen: "desc" },
    include: { _count: { select: { events: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/projects"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            ← Projects
          </Link>
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
        <Link
          href={`/projects/${projectId}/settings`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          Settings
        </Link>
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-neutral-500">No issues yet. Events will appear here once errors are reported.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {issues.map((issue) => (
            <Link
              key={issue.id}
              href={`/projects/${projectId}/issues/${issue.id}`}
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          issue.status === "open"
                            ? "destructive"
                            : issue.status === "resolved"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {issue.status}
                      </Badge>
                      <span className="truncate font-medium">
                        {issue.title}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {issue._count.events} events · Last seen{" "}
                      {new Date(issue.lastSeen).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
