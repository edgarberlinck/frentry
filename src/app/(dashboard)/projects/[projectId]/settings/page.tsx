import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/lib/actions";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await requireAuth();
  const { projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    include: {
      releases: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!project) notFound();

  const deleteAction = deleteProject.bind(null, project.id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/issues`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← {project.name} Issues
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Project Settings</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">DSN (Data Source Name)</CardTitle>
            <CardDescription>
              Use this key to send events from your application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block rounded bg-neutral-100 p-3 text-sm break-all">
              {project.dsn}
            </code>
            <div className="mt-4 rounded bg-neutral-50 p-3 text-sm text-neutral-600">
              <p className="font-medium">Usage example:</p>
              <pre className="mt-2 overflow-x-auto text-xs">{`fetch('${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ingest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dsn: '${project.dsn}',
    type: 'Error',
    message: 'Something went wrong',
    stacktrace: error.stack,
    release: '1.0.0',
    metadata: { browser: navigator.userAgent }
  })
})`}</pre>
            </div>
          </CardContent>
        </Card>

        {project.releases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Releases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {project.releases.map((release) => (
                  <div
                    key={release.id}
                    className="flex items-center justify-between rounded border p-3"
                  >
                    <span className="font-mono text-sm">{release.version}</span>
                    <span className="text-xs text-neutral-500">
                      {new Date(release.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Deleting a project will remove all associated issues, events, and source maps.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <form action={deleteAction}>
              <Button variant="destructive">Delete Project</Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
