export const canvasConnectorSides = ["left", "right", "top", "bottom", "center"] as const;
export const canvasFlowConnectorIsLocked = true;

export type CanvasConnectorSide = (typeof canvasConnectorSides)[number];

export interface CanvasConnectorPoint {
  x: number;
  y: number;
}

export interface CanvasConnectorBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasConnectorGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function connectorAnchor(
  bounds: CanvasConnectorBounds,
  side: CanvasConnectorSide,
  bias = 0.5,
): CanvasConnectorPoint {
  const safeBias = clamp(bias, 0.08, 0.92);
  switch (side) {
    case "left":
      return { x: bounds.x, y: bounds.y + bounds.height * safeBias };
    case "right":
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height * safeBias };
    case "top":
      return { x: bounds.x + bounds.width * safeBias, y: bounds.y };
    case "bottom":
      return { x: bounds.x + bounds.width * safeBias, y: bounds.y + bounds.height };
    case "center":
    default:
      return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  }
}

export function connectorGeometry(
  start: CanvasConnectorPoint,
  end: CanvasConnectorPoint,
  padding = 16,
): CanvasConnectorGeometry {
  const x = Math.min(start.x, end.x) - padding;
  const y = Math.min(start.y, end.y) - padding;
  const width = Math.abs(end.x - start.x) + padding * 2;
  const height = Math.abs(end.y - start.y) + padding * 2;
  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
    x1: start.x - x,
    y1: start.y - y,
    x2: end.x - x,
    y2: end.y - y,
  };
}

export function isSameConnectorGeometry(
  left: CanvasConnectorGeometry,
  right: CanvasConnectorGeometry,
  tolerance = 0.5,
): boolean {
  return (
    nearlyEqual(left.x, right.x, tolerance) &&
    nearlyEqual(left.y, right.y, tolerance) &&
    nearlyEqual(left.width, right.width, tolerance) &&
    nearlyEqual(left.height, right.height, tolerance) &&
    nearlyEqual(left.x1, right.x1, tolerance) &&
    nearlyEqual(left.y1, right.y1, tolerance) &&
    nearlyEqual(left.x2, right.x2, tolerance) &&
    nearlyEqual(left.y2, right.y2, tolerance)
  );
}

export function shouldRefreshConnectorGeometry(
  current: CanvasConnectorGeometry,
  next: CanvasConnectorGeometry,
): boolean {
  return !isSameConnectorGeometry(current, next);
}

function nearlyEqual(left: number, right: number, tolerance: number): boolean {
  return Math.abs(left - right) <= tolerance;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }
  return Math.min(max, Math.max(min, value));
}
