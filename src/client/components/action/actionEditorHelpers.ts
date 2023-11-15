import { CSSProperties } from "react";
import { Position, ArrowHeadType, Edge, Node } from "react-flow-renderer";
import { ActionModel, TreeEnterActionModel, TreeExitActionModel } from "../../../shared/action/ActionModel";
import { ActionPositionModel } from "../../../shared/action/ActionPositionModel";
import { ActionTreeModel, getTreeParent, subTreeNodeSize } from "../../../shared/action/ActionTreeModel";
import { lastElement } from "../../../shared/helper/generalHelpers";
import { UiConstants } from "../../data/UiConstants";
import { actionEdgeId } from "../../helper/reactHelpers";
import { actionEditorStore } from "../../stores/ActionEditorStore";

export const doScale = (value: number, scale: number) => {
    return actionEditorStore.actionEditorUpscaleFactor * (value * scale) + "px";
};

export const doScaleNumber = (value: number, scale: number) => {
    return actionEditorStore.actionEditorUpscaleFactor * (value * scale);
};

export const reverseScaleNumber = (value: number, scale: number) => {
    return value / actionEditorStore.actionEditorUpscaleFactor / scale;
};

export class NodeData {
    public constructor(public action: ActionModel, public scale: number) { }
}

export interface ActionEdgeData {
    fromAction: ActionModel;
    toAction: ActionModel;
    scale: number;
}

export const hierarchyScale = (treeHierarchy: ActionTreeModel[]) => {
    if (!treeHierarchy)
        return 1;

    return treeHierarchy.reduce((scale, tree) => scale * tree.scale(), 1);
};

export const onScreenActionPositions = (position: ActionPositionModel, treeHierarchy: ActionTreeModel[]) => {
    let x = 0;
    let y = 0;

    let subTreeScale = 1;
    for (let i = 0; i < treeHierarchy.length; i++) {
        const parent = i === 0 ? null : treeHierarchy[i - 1];
        const subTreeAction = treeHierarchy[i];
        subTreeScale *= parent ? parent.scale() : 1;
        x += (subTreeAction.position.x - (parent ? parent.left() : 0)) * subTreeScale;
        y += subTreeAction.position.y * subTreeScale;
    }

    const scale = hierarchyScale(treeHierarchy);
    const xDelta = treeHierarchy.length > 0 ? lastElement(treeHierarchy).left() : 0;

    x += scale * (position.x - xDelta);
    y += scale * position.y;

    x *= actionEditorStore.actionEditorUpscaleFactor;
    y *= actionEditorStore.actionEditorUpscaleFactor;

    return { x, y };
};

export const actionAsNode = (action: ActionModel, treeHierarchy: ActionTreeModel[]) => {
    const { x, y } = onScreenActionPositions(action.position, treeHierarchy);

    const { currentActionTreeHierarchy } = actionEditorStore;
    const actionTree = lastElement(currentActionTreeHierarchy);
    const inFocusedSubTree = lastElement(treeHierarchy) === actionTree;

    const style: CSSProperties = {};
    if (!inFocusedSubTree) {
        style.zIndex = UiConstants.Z_INDEX_ACTION_EDITOR_NODE_UNFOCUSED;
        style.pointerEvents = "none";
    }

    if (action instanceof ActionTreeModel) {
        style.cursor = "unset";
    }

    return {
        id: action.$modelId,
        data: new NodeData(action, hierarchyScale(treeHierarchy)),
        position: { x, y },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
        type: 'ActionNode',
        draggable: inFocusedSubTree,
        selectable: inFocusedSubTree,
        style,
        dragHandle: ".dragHandle"
    } as Node;
};

export const exitAsEdge = (from: ActionModel, exitIndex: number, to: ActionModel, treeHierarchy: ActionTreeModel[]) => {
    if (!from || !to)
        return null;

    const { currentActionTreeHierarchy } = actionEditorStore;
    const actionTree = lastElement(currentActionTreeHierarchy);
    const inFocusedSubTree = lastElement(treeHierarchy) === actionTree;

    let toNode = to;
    let entryIndex = 0;

    if (to instanceof TreeEnterActionModel) {
        // Instead of pointing to the 'enter node', we point at the entry of the containing tree
        const containingTree = getTreeParent(to);
        toNode = containingTree;
        entryIndex = containingTree.enterActions.indexOf(to);
    }

    return {
        id: actionEdgeId(from.$modelId, exitIndex, to.$modelId),
        data: {
            fromAction: from,
            toAction: to,
            scale: hierarchyScale(treeHierarchy)
        } as ActionEdgeData,
        source: from.$modelId,
        sourceHandle: "f" + exitIndex,
        targetHandle: "f" + entryIndex,
        target: toNode.$modelId,
        arrowHeadType: ArrowHeadType.ArrowClosed,
        type: 'ActionEdge',
        draggable: inFocusedSubTree,
        selectable: inFocusedSubTree
    } as Edge;
};

export const alignEntriesOnLeft = (action: ActionModel, tree: ActionTreeModel) => {
    if (action instanceof TreeEnterActionModel) {
        tree.enterActions
            .filter(a => a != action)
            .forEach(a => { setActionPositionAligned(a, tree, action.position.x, a.position.y); });
    }
};

export const alignExitsOnRight = (action: ActionModel, tree: ActionTreeModel) => {
    if (action instanceof TreeExitActionModel) {
        tree.exitActions
            .filter(a => a != action)
            .forEach(a => { setActionPositionAligned(a, tree, action.position.x, a.position.y); });
    }
};

export const setActionPositionAligned = (action: ActionModel, tree: ActionTreeModel, newX: number, newY: number) => {
    // should all node types have a fixed size? If yes we could use it here...
    const nodeWidth = action instanceof ActionTreeModel ? subTreeNodeSize.width : subTreeNodeSize.width / 2;
    const nodeHeight = action instanceof ActionTreeModel ? subTreeNodeSize.height : subTreeNodeSize.height / 2;

    if (action instanceof TreeEnterActionModel) {
        const mostLeftPosition = tree.allActions.filter(a => !(a instanceof TreeEnterActionModel)).reduce((a, b) => a.position.x < b.position.x ? a : b).position.x;
        if (newX > mostLeftPosition) {
            newX = mostLeftPosition;
        }
    } else if (action instanceof TreeExitActionModel) {
        const mostRightPosition = tree.allActions.filter(a => !(a instanceof TreeExitActionModel)).reduce((a, b) => a.position.x > b.position.x ? a : b).position.x;
        if (newX < mostRightPosition + nodeWidth) {
            newX = mostRightPosition + nodeWidth;
        }
    } else {
        if (newX < tree.left()) {
            newX = tree.left();
        }
        if (newX + nodeWidth > tree.right()) {
            newX = tree.right() - nodeWidth;
        }
    }

    newY = Math.max(0, newY);

    const treeScale = tree.scale();
    if (newY > (subTreeNodeSize.height / treeScale) - nodeHeight) {
        newY = subTreeNodeSize.height / treeScale - nodeHeight;
    }
    action.position.set(newX, newY);
};

export const configureNewActionInstance = (treeHierarchy: ActionTreeModel[], newAction: ActionModel, screenX: number, screenY: number) => {
    const subTreeHierarchy = treeHierarchy.slice();
    const tree = subTreeHierarchy.pop();
    const { x: subTreeX, y: subTreeY } = onScreenActionPositions(lastElement(treeHierarchy).position, subTreeHierarchy);

    const scale = treeHierarchy.reduce((scale, tree) => scale * tree.scale(), 1);
    const xDelta = treeHierarchy.length > 0 ? lastElement(treeHierarchy).left() : 0;
    const actionX = reverseScaleNumber(screenX - subTreeX, scale) + xDelta;
    const actionY = reverseScaleNumber(screenY - subTreeY, scale);

    setActionPositionAligned(newAction, tree, actionX, actionY);
};

interface GetBezierPathParamsEx {
    sourceX: number;
    sourceY: number;
    sourcePosition?: Position;
    targetX: number;
    targetY: number;
    targetPosition?: Position;
    curvature?: number;
}

interface GetControlWithCurvatureParams {
    pos: Position;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    c: number;
}

function calculateControlOffset(distance: number, curvature: number): number {
    if (distance >= 0) {
        return 0.5 * distance;
    }

    return curvature * 25 * Math.sqrt(-distance);
}

function getControlWithCurvature({ pos, x1, y1, x2, y2, c }: GetControlWithCurvatureParams): [number, number] {
    switch (pos) {
        case Position.Left:
            return [x1 - calculateControlOffset(x1 - x2, c), y1];
        case Position.Right:
            return [x1 + calculateControlOffset(x2 - x1, c), y1];
        case Position.Top:
            return [x1, y1 - calculateControlOffset(y1 - y2, c)];
        case Position.Bottom:
            return [x1, y1 + calculateControlOffset(y2 - y1, c)];
    }
}

export function getBezierEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceControlX,
    sourceControlY,
    targetControlX,
    targetControlY,
}: {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourceControlX: number;
    sourceControlY: number;
    targetControlX: number;
    targetControlY: number;
}): [number, number, number, number] {
    // cubic bezier t=0.5 mid point, not the actual mid point, but easy to calculate
    // https://stackoverflow.com/questions/67516101/how-to-find-distance-mid-point-of-bezier-curve
    const centerX = sourceX * 0.125 + sourceControlX * 0.375 + targetControlX * 0.375 + targetX * 0.125;
    const centerY = sourceY * 0.125 + sourceControlY * 0.375 + targetControlY * 0.375 + targetY * 0.125;
    const offsetX = Math.abs(centerX - sourceX);
    const offsetY = Math.abs(centerY - sourceY);

    return [centerX, centerY, offsetX, offsetY];
}

export function getBezierPathEx({
    sourceX,
    sourceY,
    sourcePosition = Position.Bottom,
    targetX,
    targetY,
    targetPosition = Position.Top,
    curvature = 0.25,
}: GetBezierPathParamsEx): [path: string, labelX: number, labelY: number, offsetX: number, offsetY: number] {
    const [sourceControlX, sourceControlY] = getControlWithCurvature({
        pos: sourcePosition,
        x1: sourceX,
        y1: sourceY,
        x2: targetX,
        y2: targetY,
        c: curvature,
    });
    const [targetControlX, targetControlY] = getControlWithCurvature({
        pos: targetPosition,
        x1: targetX,
        y1: targetY,
        x2: sourceX,
        y2: sourceY,
        c: curvature,
    });
    const [labelX, labelY, offsetX, offsetY] = getBezierEdgeCenter({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourceControlX,
        sourceControlY,
        targetControlX,
        targetControlY,
    });

    return [
        `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
        labelX,
        labelY,
        offsetX,
        offsetY,
    ];
}