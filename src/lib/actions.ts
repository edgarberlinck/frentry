"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDSN } from "@/lib/dsn";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  if (!name || name.trim().length === 0) throw new Error("Name is required");

  const dsn = generateDSN();

  await prisma.project.create({
    data: {
      name: name.trim(),
      dsn,
      userId: session.user.id,
    },
  });

  revalidatePath("/projects");
  redirect("/projects");
}

export async function deleteProject(projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.project.deleteMany({
    where: { id: projectId, userId: session.user.id },
  });

  revalidatePath("/projects");
  redirect("/projects");
}

export async function updateIssueStatus(issueId: string, status: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify ownership through project
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: true },
  });

  if (!issue || issue.project.userId !== session.user.id) {
    throw new Error("Not found");
  }

  await prisma.issue.update({
    where: { id: issueId },
    data: { status },
  });

  revalidatePath(`/projects/${issue.projectId}/issues/${issueId}`);
}
