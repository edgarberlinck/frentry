import { prisma } from "./prisma";
import nodemailer from "nodemailer";

interface NotificationPayload {
  issueId: string;
  issueTitle: string;
  projectName: string;
  projectId: string;
}

/**
 * Sends notifications when a new issue is created.
 * Supports email and webhook notification types.
 */
export async function notifyNewIssue(
  payload: NotificationPayload,
  userId: string
): Promise<void> {
  const rules = await prisma.notificationRule.findMany({
    where: {
      userId,
      enabled: true,
      OR: [{ projectId: payload.projectId }, { projectId: null }],
    },
  });

  for (const rule of rules) {
    try {
      if (rule.type === "email") {
        await sendEmailNotification(rule.target, payload);
      } else if (rule.type === "webhook") {
        await sendWebhookNotification(rule.target, payload);
      }
    } catch (error) {
      console.error(
        `Failed to send ${rule.type} notification to ${rule.target}:`,
        error
      );
    }
  }
}

async function sendEmailNotification(
  email: string,
  payload: NotificationPayload
): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } =
    process.env;
  if (!SMTP_HOST || !SMTP_FROM) return;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || "587", 10),
    secure: SMTP_PORT === "465",
    auth:
      SMTP_USER && SMTP_PASS
        ? { user: SMTP_USER, pass: SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: SMTP_FROM,
    to: email,
    subject: `[Frentry] New issue in ${payload.projectName}: ${payload.issueTitle}`,
    text: [
      `A new issue was detected in project "${payload.projectName}":`,
      "",
      payload.issueTitle,
      "",
      `View: ${process.env.NEXT_PUBLIC_APP_URL}/projects/${payload.projectId}/issues/${payload.issueId}`,
    ].join("\n"),
  });
}

async function sendWebhookNotification(
  url: string,
  payload: NotificationPayload
): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "new_issue",
      issue: {
        id: payload.issueId,
        title: payload.issueTitle,
      },
      project: {
        id: payload.projectId,
        name: payload.projectName,
      },
      url: `${process.env.NEXT_PUBLIC_APP_URL}/projects/${payload.projectId}/issues/${payload.issueId}`,
    }),
  });
}
