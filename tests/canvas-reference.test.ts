import { describe, expect, test } from "bun:test";
import type { TLShapeId } from "tldraw";
import {
  canvasReferenceLabel,
  decodeCanvasImageAltText,
  decodeCanvasImageUrl,
  encodeCanvasImageAltText,
  extractCanvasTaskIdFromShape,
  finalizeCanvasReferences,
  type SortableCanvasImageReference,
} from "../components/canvas/reference-model";

function shapeId(value: string): TLShapeId {
  return value as TLShapeId;
}

function reference(input: Partial<SortableCanvasImageReference> & { imageId: string }): SortableCanvasImageReference {
  return {
    shapeId: shapeId(`shape:${input.imageId}`),
    imageId: input.imageId,
    kind: input.kind ?? "generated",
    origin: input.origin ?? "selected_image",
    taskId: input.taskId ?? "task_1",
    name: input.name ?? input.imageId,
    url: input.url ?? `/api/files/${input.imageId}.png`,
    width: input.width ?? 1024,
    height: input.height ?? 1024,
    sortX: input.sortX ?? 0,
    sortY: input.sortY ?? 0,
  };
}

describe("canvas reference model", () => {
  test("extracts task ids from selected workflow nodes and ignores draft placeholders", () => {
    expect(
      extractCanvasTaskIdFromShape(
        { type: "canvas-workflow-node", props: { taskId: "task_done" } },
        ["canvas-workflow-node", "canvas-generation-placeholder"],
      ),
    ).toBe("task_done");
    expect(
      extractCanvasTaskIdFromShape(
        { type: "canvas-generation-placeholder", props: { taskId: "pending" } },
        ["canvas-workflow-node", "canvas-generation-placeholder"],
      ),
    ).toBe(null);
    expect(
      extractCanvasTaskIdFromShape(
        { type: "image", props: { taskId: "task_done" } },
        ["canvas-workflow-node", "canvas-generation-placeholder"],
      ),
    ).toBe(null);
  });

  test("sorts, deduplicates, and labels workflow output references", () => {
    const finalized = finalizeCanvasReferences(
      [
        reference({ imageId: "img_b", sortX: 20, sortY: 10 }),
        reference({ imageId: "img_a", origin: "workflow_output", sortX: 5, sortY: 10 }),
        reference({ imageId: "img_a", origin: "workflow_output", sortX: 7, sortY: 10 }),
      ],
      4,
    );

    expect(finalized.map((item) => item.imageId).join(",")).toBe("img_a,img_b");
    expect(canvasReferenceLabel(finalized[0])).toBe("节点结果");
  });

  test("restores canvas image identity from shape alt text and storage URLs", () => {
    const altText = encodeCanvasImageAltText("蓝色小鸟", {
      imageId: "img_abc",
      kind: "generated",
      taskId: "task_abc",
      prompt: "蓝色小鸟",
    });

    expect(decodeCanvasImageAltText(altText)?.imageId).toBe("img_abc");
    expect(decodeCanvasImageUrl("/api/files/2026/05/05/task_abc/img_abc.png")?.taskId).toBe("task_abc");
    expect(decodeCanvasImageUrl("/api/files/source/2026/05/05/src_abc.webp")?.kind).toBe("source");
  });
});
