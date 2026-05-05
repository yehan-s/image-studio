import type { TLShapeId } from "tldraw";

export interface CanvasImageReference {
  shapeId: TLShapeId;
  imageId: string;
  kind: "generated" | "source";
  origin: "selected_image" | "workflow_output";
  taskId: string | null;
  name: string;
  url: string;
  width: number;
  height: number;
}

export type SortableCanvasImageReference = CanvasImageReference & {
  sortX: number;
  sortY: number;
};

export interface CanvasImageIdentity {
  imageId: string;
  kind: CanvasImageReference["kind"];
  taskId: string | null;
  prompt: string | null;
}

export function extractCanvasTaskIdFromShape(
  shape: { type: string; props?: unknown },
  supportedTypes: readonly string[],
): string | null {
  if (!supportedTypes.includes(shape.type)) {
    return null;
  }
  const props = shape.props && typeof shape.props === "object" ? (shape.props as Record<string, unknown>) : {};
  const taskId = typeof props.taskId === "string" ? props.taskId : null;
  return taskId && taskId !== "pending" ? taskId : null;
}

export function finalizeCanvasReferences(
  references: SortableCanvasImageReference[],
  maxCount: number,
): CanvasImageReference[] {
  const seen = new Set<string>();
  return references
    .sort((left, right) => (left.sortY === right.sortY ? left.sortX - right.sortX : left.sortY - right.sortY))
    .filter((reference) => {
      if (seen.has(reference.imageId)) {
        return false;
      }
      seen.add(reference.imageId);
      return true;
    })
    .slice(0, maxCount)
    .map((reference) => ({
      shapeId: reference.shapeId,
      imageId: reference.imageId,
      kind: reference.kind,
      origin: reference.origin,
      taskId: reference.taskId,
      name: reference.name,
      url: reference.url,
      width: reference.width,
      height: reference.height,
    }));
}

export function areCanvasReferencesEqual(left: CanvasImageReference[], right: CanvasImageReference[]): boolean {
  return (
    left.length === right.length &&
    left.every((reference, index) => reference.imageId === right[index]?.imageId && reference.origin === right[index]?.origin)
  );
}

export function canvasReferenceLabel(reference: CanvasImageReference): string {
  if (reference.origin === "workflow_output") {
    return "节点结果";
  }
  return reference.kind === "generated" ? "生成图" : "上传图";
}

export function encodeCanvasImageAltText(label: string, identity: CanvasImageIdentity): string {
  return `${label}\n\ncanvas-image:${JSON.stringify(identity)}`;
}

export function decodeCanvasImageAltText(value: unknown): CanvasImageIdentity | null {
  if (typeof value !== "string") {
    return null;
  }
  const marker = "canvas-image:";
  const index = value.lastIndexOf(marker);
  if (index < 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(value.slice(index + marker.length).trim()) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const candidate = parsed as Partial<CanvasImageIdentity>;
    if (!candidate.imageId || (candidate.kind !== "generated" && candidate.kind !== "source")) {
      return null;
    }
    return {
      imageId: candidate.imageId,
      kind: candidate.kind,
      taskId: typeof candidate.taskId === "string" ? candidate.taskId : null,
      prompt: typeof candidate.prompt === "string" ? candidate.prompt : null,
    };
  } catch {
    return null;
  }
}

export function decodeCanvasImageUrl(value: unknown): CanvasImageIdentity | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.split("?")[0] ?? value;
  const parts = normalized.split("/").map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  const fileName = parts.at(-1) ?? "";
  const imageId = fileName.replace(/\.(png|jpe?g|webp)$/i, "");
  if (!imageId) {
    return null;
  }
  if (imageId.startsWith("src_")) {
    return { imageId, kind: "source", taskId: null, prompt: null };
  }
  if (!imageId.startsWith("img_")) {
    return null;
  }
  const taskId = parts.find((part) => part.startsWith("task_")) ?? null;
  return { imageId, kind: "generated", taskId, prompt: null };
}
