import { describe, expect, test } from "bun:test";
import {
  canvasFlowConnectorIsLocked,
  connectorAnchor,
  connectorGeometry,
  isSameConnectorGeometry,
  shouldRefreshConnectorGeometry,
} from "../components/canvas/connector-model";

describe("canvas connector model", () => {
  test("anchors stay attached to the selected sides of moved blocks", () => {
    const source = { x: 20, y: 40, width: 120, height: 80 };
    const target = { x: 260, y: 70, width: 160, height: 100 };
    const before = connectorGeometry(connectorAnchor(source, "right"), connectorAnchor(target, "left"));
    const movedTarget = { ...target, x: target.x + 90, y: target.y + 30 };
    const after = connectorGeometry(connectorAnchor(source, "right"), connectorAnchor(movedTarget, "left"));

    expect(before.x2 === after.x2).toBe(false);
    expect(before.y2 === after.y2).toBe(false);
    expect(after.x + after.x2).toBe(movedTarget.x);
    expect(after.y + after.y2).toBe(movedTarget.y + movedTarget.height / 2);
  });

  test("bias distributes multiple connectors on one block side", () => {
    const node = { x: 100, y: 100, width: 360, height: 224 };
    const upper = connectorAnchor(node, "left", 0.3);
    const lower = connectorAnchor(node, "left", 0.7);

    expect(upper.x).toBe(lower.x);
    expect(upper.y).toBeLessThan(lower.y);
  });

  test("geometry comparison tolerates sub-pixel jitter", () => {
    expect(
      isSameConnectorGeometry(
        { x: 1, y: 2, width: 100, height: 50, x1: 16, y1: 24, x2: 86, y2: 24 },
        { x: 1.2, y: 2.1, width: 100.3, height: 49.8, x1: 16.1, y1: 24.2, x2: 86.2, y2: 24.1 },
      ),
    ).toBe(true);
  });

  test("flow connector records stay locked and refresh only when geometry changes", () => {
    const geometry = { x: 1, y: 2, width: 100, height: 50, x1: 16, y1: 24, x2: 86, y2: 24 };
    const movedGeometry = { ...geometry, x: 10, x1: 20, x2: 95 };

    expect(canvasFlowConnectorIsLocked).toBe(true);
    expect(shouldRefreshConnectorGeometry(geometry, geometry)).toBe(false);
    expect(shouldRefreshConnectorGeometry(geometry, movedGeometry)).toBe(true);
  });
});
