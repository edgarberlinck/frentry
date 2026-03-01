import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { updateIssueStatus } from "@/lib/actions";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; issueId: string }>;
}) {
  const session = await requireAuth();
  const { projectId, issueId } = await params;

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      project: true,
      events: {
        orderBy: { timestamp: "desc" },
        take: 50,
      },
    },
  });

  if (!issue || issue.project.userId !== session.user.id) notFound();

  const resolveAction = updateIssueStatus.bind(null, issueId, "resolved");
  const reopenAction = updateIssueStatus.bind(null, issueId, "open");
  const ignoreAction = updateIssueStatus.bind(null, issueId, "ignored");

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/issues`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← {issue.project.name} Issues
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
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
              <h1 className="text-xl font-bold">{issue.title}</h1>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              First seen {new Date(issue.firstSeen).toLocaleString()} ·
              Last seen {new Date(issue.lastSeen).toLocaleString()} ·
              {issue.eventCount} events
            </p>
          </div>
          <div className="flex gap-2">
            {issue.status !== "resolved" && (
              <form action={resolveAction}>
                <Button variant="outline" size="sm">
                  Resolve
                </Button>
              </form>
            )}
            {issue.status === "resolved" && (
              <form action={reopenAction}>
                <Button variant="outline" size="sm">
                  Reopen
                </Button>
              </form>
            )}
            {issue.status !== "ignored" && (
              <form action={ignoreAction}>
                <Button variant="ghost" size="sm">
                  Ignore
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {issue.events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-neutral-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{event.message}</span>
                  <span className="text-xs text-neutral-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                {event.release && (
                  <div className="mt-1 text-xs text-neutral-500">
                    Release: {event.release}
                  </div>
                )}
                {(event.resolved || event.stacktrace) && (
                  <pre className="mt-2 overflow-x-auto rounded bg-neutral-900 p-3 text-xs text-neutral-100">
                    {event.resolved || event.stacktrace}
                  </pre>
                )}
                {event.metadata && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-neutral-500">
                      Metadata
                    </summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-neutral-100 p-2 text-xs">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
