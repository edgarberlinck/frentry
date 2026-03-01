import { requireAuth } from "@/lib/session";
import { createProject } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";

export default async function NewProjectPage() {
  await requireAuth();

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>New Project</CardTitle>
          <CardDescription>Create a new project to start tracking errors.</CardDescription>
        </CardHeader>
        <form action={createProject}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Project Name
              </label>
              <Input id="name" name="name" placeholder="My App" required />
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Link href="/projects">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit">Create Project</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
