import { SourceMapConsumer, type RawSourceMap } from "source-map";
import { prisma } from "./prisma";

interface StackFrame {
  function?: string;
  file: string;
  line: number;
  column: number;
}

interface ResolvedFrame extends StackFrame {
  originalFile?: string;
  originalLine?: number;
  originalColumn?: number;
  originalFunction?: string;
}

/**
 * Resolves a minified stack trace using uploaded source maps.
 */
export async function resolveStackTrace(
  stacktrace: string,
  releaseVersion: string | undefined,
  projectId: string
): Promise<string | null> {
  if (!releaseVersion || !stacktrace) return null;

  const release = await prisma.release.findUnique({
    where: { projectId_version: { projectId, version: releaseVersion } },
    include: { sourceMaps: true },
  });

  if (!release || release.sourceMaps.length === 0) return null;

  const frames = parseStackFrames(stacktrace);
  if (frames.length === 0) return null;

  const resolvedFrames: ResolvedFrame[] = [];

  for (const frame of frames) {
    const sourceMap = release.sourceMaps.find(
      (sm) =>
        frame.file.endsWith(sm.fileName) ||
        sm.fileName.endsWith(frame.file.split("/").pop() || "")
    );

    if (sourceMap) {
      const resolved = await resolveFrame(frame, sourceMap.content);
      resolvedFrames.push(resolved);
    } else {
      resolvedFrames.push(frame);
    }
  }

  return formatResolvedFrames(resolvedFrames);
}

function parseStackFrames(stacktrace: string): StackFrame[] {
  const frames: StackFrame[] = [];
  const lines = stacktrace.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    const atMatch = trimmed.match(
      /at\s+(?:(.+?)\s+)?\(?(.+?):(\d+):(\d+)\)?/
    );
    if (atMatch) {
      frames.push({
        function: atMatch[1] || undefined,
        file: atMatch[2],
        line: parseInt(atMatch[3], 10),
        column: parseInt(atMatch[4], 10),
      });
      continue;
    }

    const directMatch = trimmed.match(/^(.+?)@(.+?):(\d+):(\d+)$/);
    if (directMatch) {
      frames.push({
        function: directMatch[1] || undefined,
        file: directMatch[2],
        line: parseInt(directMatch[3], 10),
        column: parseInt(directMatch[4], 10),
      });
    }
  }

  return frames;
}

async function resolveFrame(
  frame: StackFrame,
  sourceMapContent: string
): Promise<ResolvedFrame> {
  try {
    const rawSourceMap = JSON.parse(sourceMapContent) as RawSourceMap;
    const consumer = await new SourceMapConsumer(rawSourceMap);

    const original = consumer.originalPositionFor({
      line: frame.line,
      column: frame.column,
    });

    consumer.destroy();

    if (original.source) {
      return {
        ...frame,
        originalFile: original.source,
        originalLine: original.line ?? undefined,
        originalColumn: original.column ?? undefined,
        originalFunction: original.name ?? undefined,
      };
    }
  } catch {
    // If source map parsing fails, return the original frame
  }

  return frame;
}

function formatResolvedFrames(frames: ResolvedFrame[]): string {
  return frames
    .map((frame) => {
      if (frame.originalFile) {
        const fn = frame.originalFunction || frame.function || "anonymous";
        return `    at ${fn} (${frame.originalFile}:${frame.originalLine}:${frame.originalColumn})`;
      }
      const fn = frame.function || "anonymous";
      return `    at ${fn} (${frame.file}:${frame.line}:${frame.column})`;
    })
    .join("\n");
}
