"use client";

import { BaseBoxShapeUtil, HTMLContainer, type RecordProps, T, type TLShape } from "tldraw";
import { canvasConnectorSides, type CanvasConnectorSide } from "./connector-model";

export const CANVAS_WORKFLOW_NODE_TYPE = "canvas-workflow-node" as const;
export const CANVAS_FLOW_CONNECTOR_TYPE = "canvas-flow-connector" as const;

export type CanvasWorkflowNodeStatus = "draft" | "running" | "succeeded" | "failed" | "canceled";

interface CanvasWorkflowNodeProps {
  w: number;
  h: number;
  title: string;
  modeLabel: string;
  sizeLabel: string;
  prompt: string;
  referenceCount: number;
  outputCount: number;
  status: CanvasWorkflowNodeStatus;
  taskId: string;
  error: string;
  mode?: "text_to_image" | "image_to_image";
  sizeOption?: string;
  quantity?: number;
  parentTaskIds?: string[];
}

interface CanvasFlowConnectorProps {
  w: number;
  h: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  tone: "reference" | "output" | "draft";
  fromShapeId?: string;
  toShapeId?: string;
  fromSide?: CanvasConnectorSide;
  toSide?: CanvasConnectorSide;
  fromBias?: number;
  toBias?: number;
}

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    [CANVAS_WORKFLOW_NODE_TYPE]: CanvasWorkflowNodeProps;
    [CANVAS_FLOW_CONNECTOR_TYPE]: CanvasFlowConnectorProps;
  }
}

export type CanvasWorkflowNodeShape = TLShape<typeof CANVAS_WORKFLOW_NODE_TYPE>;
export type CanvasFlowConnectorShape = TLShape<typeof CANVAS_FLOW_CONNECTOR_TYPE>;

const statusLabels: Record<CanvasWorkflowNodeStatus, string> = {
  draft: "示例流程",
  running: "生成中",
  succeeded: "已完成",
  failed: "失败",
  canceled: "已停止",
};

function concise(value: string, limit: number): string {
  const trimmed = value.trim();
  if (!trimmed) return "未填写 Prompt";
  return trimmed.length > limit ? `${trimmed.slice(0, limit)}...` : trimmed;
}

function CanvasWorkflowNode({ shape }: { shape: CanvasWorkflowNodeShape }) {
  const props = shape.props;
  return (
    <HTMLContainer className={`canvas-workflow-node ${props.status}`} style={{ width: props.w, height: props.h }}>
      <div className="canvas-workflow-node-head">
        <span>{props.modeLabel}</span>
        <strong>{statusLabels[props.status]}</strong>
      </div>
      <h3>{props.title}</h3>
      <p>{concise(props.prompt, 135)}</p>
      <div className="canvas-workflow-node-meta">
        <span>参考图 {props.referenceCount}</span>
        <span>结果 {props.outputCount}</span>
        <span>{props.sizeLabel}</span>
        {props.parentTaskIds?.length ? <span>分支 {props.parentTaskIds.length}</span> : null}
      </div>
      {props.error ? (
        <small>{concise(props.error, 88)}</small>
      ) : (
        <small>选中本节点会把右侧结果作为下一步输入；只用单张图时直接选中那张结果。</small>
      )}
    </HTMLContainer>
  );
}

function CanvasFlowConnector({ shape }: { shape: CanvasFlowConnectorShape }) {
  const props = shape.props;
  return (
    <HTMLContainer className={`canvas-flow-connector ${props.tone}`} style={{ width: props.w, height: props.h }}>
      <svg viewBox={`0 0 ${props.w} ${props.h}`} role="presentation" aria-hidden="true">
        <defs>
          <marker id={`arrow-${shape.id}`} markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4">
            <path d="M0,0 L8,4 L0,8 Z" />
          </marker>
        </defs>
        <path d={`M ${props.x1} ${props.y1} C ${(props.x1 + props.x2) / 2} ${props.y1}, ${(props.x1 + props.x2) / 2} ${props.y2}, ${props.x2} ${props.y2}`} markerEnd={`url(#arrow-${shape.id})`} />
      </svg>
      {props.label ? <span>{props.label}</span> : null}
    </HTMLContainer>
  );
}

export class CanvasWorkflowNodeShapeUtil extends BaseBoxShapeUtil<CanvasWorkflowNodeShape> {
  static override type = CANVAS_WORKFLOW_NODE_TYPE;

  static override props: RecordProps<CanvasWorkflowNodeShape> = {
    w: T.number,
    h: T.number,
    title: T.string,
    modeLabel: T.string,
    sizeLabel: T.string,
    prompt: T.string,
    referenceCount: T.number,
    outputCount: T.number,
    status: T.literalEnum("draft", "running", "succeeded", "failed", "canceled"),
    taskId: T.string,
    error: T.string,
    mode: T.literalEnum("text_to_image", "image_to_image").optional(),
    sizeOption: T.string.optional(),
    quantity: T.number.optional(),
    parentTaskIds: T.arrayOf(T.string).optional(),
  };

  override canBind(): boolean {
    return false;
  }

  override getDefaultProps(): CanvasWorkflowNodeShape["props"] {
    return {
      w: 360,
      h: 224,
      title: "生成任务",
      modeLabel: "文生图",
      sizeLabel: "不限制",
      prompt: "",
      referenceCount: 0,
      outputCount: 1,
      status: "draft",
      taskId: "",
      error: "",
      mode: undefined,
      sizeOption: undefined,
      quantity: undefined,
      parentTaskIds: undefined,
    };
  }

  override component(shape: CanvasWorkflowNodeShape) {
    return <CanvasWorkflowNode shape={shape} />;
  }

  override indicator(shape: CanvasWorkflowNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />;
  }
}

export class CanvasFlowConnectorShapeUtil extends BaseBoxShapeUtil<CanvasFlowConnectorShape> {
  static override type = CANVAS_FLOW_CONNECTOR_TYPE;

  static override props: RecordProps<CanvasFlowConnectorShape> = {
    w: T.number,
    h: T.number,
    x1: T.number,
    y1: T.number,
    x2: T.number,
    y2: T.number,
    label: T.string,
    tone: T.literalEnum("reference", "output", "draft"),
    fromShapeId: T.string.optional(),
    toShapeId: T.string.optional(),
    fromSide: T.literalEnum(...canvasConnectorSides).optional(),
    toSide: T.literalEnum(...canvasConnectorSides).optional(),
    fromBias: T.number.optional(),
    toBias: T.number.optional(),
  };

  override canBind(): boolean {
    return false;
  }

  override hideSelectionBoundsBg(): boolean {
    return true;
  }

  override hideSelectionBoundsFg(): boolean {
    return true;
  }

  override getDefaultProps(): CanvasFlowConnectorShape["props"] {
    return {
      w: 160,
      h: 48,
      x1: 8,
      y1: 24,
      x2: 152,
      y2: 24,
      label: "",
      tone: "output",
      fromShapeId: undefined,
      toShapeId: undefined,
      fromSide: undefined,
      toSide: undefined,
      fromBias: undefined,
      toBias: undefined,
    };
  }

  override component(shape: CanvasFlowConnectorShape) {
    return <CanvasFlowConnector shape={shape} />;
  }

  override indicator() {
    return null;
  }
}
