import { ActionTreeModel, subTreeNodeSize } from "../../../shared/action/ActionTreeModel";
import { passComplexityGate } from "../../../shared/definitions/other/EditorComplexity";
import { lastElement } from "../../../shared/helper/generalHelpers";
import { localSettingsStore } from "../../stores/LocalSettingsStore";
import { doScaleNumber, onScreenActionPositions } from "./actionEditorHelpers";
import { ActionTreeZoomAndPosition } from "./ActionTreeZoomAndPosition";

export class ActionSubTreeFocus {

    private zoomAndPosition: Map<string, ActionTreeZoomAndPosition> = new Map();
    private cachedTree: ActionTreeModel[];

    public getZoomAndPosition(rootTree: ActionTreeModel) {
        return this.zoomAndPosition.get(rootTree.$modelId);
    }

    public setCachedTree(cachedTree: ActionTreeModel[]) {
        this.cachedTree = cachedTree;
    }

    public focusedActionSubTreeHierarchy(rootTree: ActionTreeModel, zoom: number, x: number, y: number, canvasWidth: number, canvasHeight: number): ActionTreeModel[] {
        if (!this.zoomAndPosition.has(rootTree.$modelId))
            this.zoomAndPosition.set(rootTree.$modelId, new ActionTreeZoomAndPosition());

        const currentTreeZoomAndPosition = this.getZoomAndPosition(rootTree);
        if (this.cachedTree && this.cachedTree[0] === rootTree
            && currentTreeZoomAndPosition.zoom === zoom
            && currentTreeZoomAndPosition.x === x
            && currentTreeZoomAndPosition.y === y
            && currentTreeZoomAndPosition.canvasWidth === canvasWidth
            && currentTreeZoomAndPosition.canvasHeight === canvasHeight)
            return this.cachedTree;

        currentTreeZoomAndPosition.zoom = zoom;
        currentTreeZoomAndPosition.x = x;
        currentTreeZoomAndPosition.y = y;
        currentTreeZoomAndPosition.canvasWidth = canvasWidth;
        currentTreeZoomAndPosition.canvasHeight = canvasHeight;

        this.cachedTree = this.calculateFocusedActionSubTreeHierarchy(zoom, x, y, canvasWidth, canvasHeight, [rootTree]);
        return this.cachedTree;
    }

    private calculateFocusedActionSubTreeHierarchy(zoom: number, x: number, y: number, canvasWidth: number, canvasHeight: number, treeHierarchy: ActionTreeModel[]): ActionTreeModel[] {
        const parentTree = lastElement(treeHierarchy);
        if (!parentTree)
            return null;

        const subtrees = parentTree.subtreeActions;
        if (!subtrees || subtrees.length === 0)
            return treeHierarchy;

        const totalScale = treeHierarchy.reduce((scale, tree) => scale * tree.scale(), 1);

        if (doScaleNumber(zoom, totalScale) * 0.5 > 1) {
            for (const subTreeInFocus of subtrees) {
                if (!passComplexityGate(subTreeInFocus.treePropertiesAction.complexityGate, localSettingsStore.editorComplexity))
                    continue;

                const screenMiddleX = (-x + (canvasWidth / 2)) / zoom;
                const screenY = (-y + (canvasHeight / 2)) / zoom;

                const { x: modelX, y: modelY } = onScreenActionPositions(subTreeInFocus.position, treeHierarchy);

                const subTreeWidth = doScaleNumber(subTreeNodeSize.width, totalScale);
                const subTreeHeight = doScaleNumber(subTreeNodeSize.height, totalScale);

                if (screenMiddleX < modelX + subTreeWidth && screenMiddleX > modelX &&
                    screenY < modelY + subTreeHeight && screenY > modelY) {

                    const newHierarchy = treeHierarchy.slice();
                    newHierarchy.push(subTreeInFocus);
                    return this.calculateFocusedActionSubTreeHierarchy(zoom, x, y, canvasWidth, canvasHeight, newHierarchy);
                }
            }
        }
        return treeHierarchy;
    }

    public clearCachedTree() {
        this.cachedTree = null;
    }
}

export const actionSubTreeFocus = new ActionSubTreeFocus();