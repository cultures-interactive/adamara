import { TranslatedError } from "../../../../shared/definitions/errors/TranslatedError";
import { FlowTransform, OnLoadParams } from "react-flow-renderer";
import { ActionTreeModel, getTreeParent } from "../../../../shared/action/ActionTreeModel";
import { actionEditorStore } from "../../ActionEditorStore";
import { sharedStore } from "../../SharedStore";
import { actionSubTreeFocus } from "../../../components/action/ActionSubTreeFocus";
import { ActionModel } from "../../../../shared/action/ActionModel";

let reactFlowInstance: OnLoadParams;

export function undoRedoUpdateReactFlowInstance(newReactFlowInstance: OnLoadParams) {
    reactFlowInstance = newReactFlowInstance;
}

export function getCurrentReactFlowInstanceTransform(): FlowTransform {
    const object = reactFlowInstance.toObject();
    return {
        x: object.position[0],
        y: object.position[1],
        zoom: object.zoom
    };
}

export function getCurrentlySelectedHierarchyIds() {
    return actionEditorStore.currentActionTreeHierarchy.map(node => node.$modelId);
}

export function selectHierarchyFromIds(hierarchyIds: string[]) {
    // If the hierarchy is still the same, we don't need to reselect
    const { currentActionTreeHierarchy } = actionEditorStore;
    if ((currentActionTreeHierarchy.length === hierarchyIds.length) &&
        (currentActionTreeHierarchy.every((element, i) => element.$modelId === hierarchyIds[i]))) {
        return false;
    }

    let currentNode = sharedStore.actionTreesById.get(hierarchyIds[0]);
    if (currentNode) { // if currentNode == null (not found), the tree was deleted
        let nextIndex = 1;
        const hierarchy: ActionTreeModel[] = [currentNode];

        while (nextIndex < hierarchyIds.length) {
            currentNode = currentNode.getChildSubTreeActionById(hierarchyIds[nextIndex]);
            if (!currentNode)
                throw new TranslatedError("editor.error_action_does_not_exist");

            hierarchy.push(currentNode);
            nextIndex++;
        }

        actionEditorStore.setSelectedActionTreeHierarchy(hierarchy);
        actionSubTreeFocus.setCachedTree(hierarchy);
        return true;
    }

    return false;
}

export function restoreReactFlowTransform(transform: FlowTransform) {
    if (!transform)
        return;

    reactFlowInstance.setTransform(transform);

    const zoomAndPosition = actionSubTreeFocus.getZoomAndPosition(actionEditorStore.currentRootActionTree);
    if (zoomAndPosition) {
        zoomAndPosition.x = transform.x;
        zoomAndPosition.y = transform.y;
        zoomAndPosition.zoom = transform.zoom;
    }
}

export function actionTreeSetSelection(actionModelId: string, hierarchyIds: string[], transform: FlowTransform) {
    selectHierarchyFromIds(hierarchyIds);
    if (actionModelId) {
        restoreReactFlowTransform(transform);
        const action = actionEditorStore.currentRootActionTree.searchActionRecursive(actionModelId);
        if (!action)
            throw new TranslatedError("editor.error_action_does_not_exist");

        actionEditorStore.setSelectedAction(action, transform, hierarchyIds);
    } else {
        restoreReactFlowTransform(transform);
        actionEditorStore.setSelectedAction(null, transform, hierarchyIds);
    }
}

export function getEdgeTarget(from: ActionModel, to: string) {
    const fromParent = getTreeParent(from);

    const elementOnSameLevel = fromParent.getNonSubtreeChildActionById(to);
    if (elementOnSameLevel)
        return elementOnSameLevel;

    for (const subtree of fromParent.subtreeActions) {
        for (const enterAction of subtree.enterActions) {
            if (enterAction.$modelId === to)
                return enterAction;
        }
    }

    return null;
}
