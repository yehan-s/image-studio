"use client";

import { BaseBoxShapeUtil, HTMLContainer, type RecordProps, T, type TLShape } from "tldraw";

export const CANVAS_GENERATION_PLACEHOLDER_TYPE = "canvas-generation-placeholder" as const;

export type CanvasGenerationPlaceholderStatus = "loading" | "failed" | "draft";

interface CanvasGenerationPlaceholderProps {
  w: number;
  h: number;
  targetLabel: string;
  status: CanvasGenerationPlaceholderStatus;
  error: string;
  taskId: string;
  outputIndex: number;
}

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    [CANVAS_GENERATION_PLACEHOLDER_TYPE]: CanvasGenerationPlaceholderProps;
  }
}

export type CanvasGenerationPlaceholderShape = TLShape<typeof CANVAS_GENERATION_PLACEHOLDER_TYPE>;

function conciseError(message: string): string {
  const trimmed = message.trim() || "生成失败";
  return trimmed.length > 54 ? `${trimmed.slice(0, 54)}...` : trimmed;
}

function CanvasGenerationPlaceholder({ shape }: { shape: CanvasGenerationPlaceholderShape }) {
  const failed = shape.props.status === "failed";
  const draft = shape.props.status === "draft";
  return (
    <HTMLContainer
      className={failed ? "canvas-generation-placeholder failed" : draft ? "canvas-generation-placeholder draft" : "canvas-generation-placeholder loading"}
      data-status={shape.props.status}
      style={{ width: shape.props.w, height: shape.props.h }}
    >
      <div className="canvas-generation-placeholder-inner">
        <div className={failed ? "canvas-generation-placeholder-mark failed" : draft ? "canvas-generation-placeholder-mark draft" : "canvas-generation-placeholder-mark"} aria-hidden="true" />
        <strong>{failed ? "生成失败" : draft ? "结果位置" : "正在生成"}</strong>
        <span>{shape.props.targetLabel}</span>
        <small>{failed ? conciseError(shape.props.error) : draft ? "提交任务后，生成结果会落在这里" : "结果会自动替换这个占位图"}</small>
      </div>
    </HTMLContainer>
  );
}

export class CanvasGenerationPlaceholderShapeUtil extends BaseBoxShapeUtil<CanvasGenerationPlaceholderShape> {
  static override type = CANVAS_GENERATION_PLACEHOLDER_TYPE;

  static override props: RecordProps<CanvasGenerationPlaceholderShape> = {
    w: T.number,
    h: T.number,
    targetLabel: T.string,
    status: T.literalEnum("loading", "failed", "draft"),
    error: T.string,
    taskId: T.string,
    outputIndex: T.number,
  };

  override canBind(): boolean {
    return false;
  }

  override canResize(): boolean {
    return false;
  }

  override isAspectRatioLocked(): boolean {
    return true;
  }

  override getDefaultProps(): CanvasGenerationPlaceholderShape["props"] {
    return {
      w: 260,
      h: 260,
      targetLabel: "auto",
      status: "loading",
      error: "",
      taskId: "",
      outputIndex: 0,
    };
  }

  override component(shape: CanvasGenerationPlaceholderShape) {
    return <CanvasGenerationPlaceholder shape={shape} />;
  }

  override indicator(shape: CanvasGenerationPlaceholderShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={12} ry={12} />;
  }
}
