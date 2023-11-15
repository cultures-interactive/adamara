import { SnapshotOutOfObject } from "mobx-keystone";
import { InteractionTriggerActionModel, LocationTriggerActionModel, TreeParamterActionModel } from "../../shared/action/ActionModel";
import { ActionTreeSnapshot, ActionTreeType } from "../../shared/action/ActionTreeModel";
import { MapElementReferenceModel } from "../../shared/action/MapElementReferenceModel";
import { ModuleSnapshot, PlayableModule } from "../../shared/workshop/ModuleModel";
import { ServerState } from "../data/ServerState";

export function canModuleBePlayedInWorkshops(moduleSnapshot: ModuleSnapshot) {
    if (!moduleSnapshot)
        return false;

    const { readyToPlay, isStandalone, name } = moduleSnapshot;
    return Boolean(readyToPlay && !isStandalone && name);
}

export function createPlayableModule(moduleSnapshot: ModuleSnapshot, serverState: ServerState): PlayableModule {
    const {
        $modelId,
        highlighted,
        name
    } = moduleSnapshot;

    const mayBePlayedInWorkshops = canModuleBePlayedInWorkshops(moduleSnapshot);

    let usedGates = new Array<string>();

    // Only collect used gates if the module can be played in workshops
    if (mayBePlayedInWorkshops) {
        const actionTree = serverState.actionTreesWithMetadata.get(moduleSnapshot.actiontreeId);
        if (!actionTree)
            throw new Error(`Could not find module action tree for module ${moduleSnapshot.name}. This suggests module data is corrupted.`);

        const coreMapIds = new Set(serverState.getIdsOfMapsNotOwnedByAModule());

        const subTreesByParentId = new Map<string, ActionTreeSnapshot[]>();
        serverState.actionTreesWithMetadata.forEach((actionTreeWithMetaData) => {
            const actionTree = actionTreeWithMetaData.actionTreeSnapshot;

            if (actionTree.type === ActionTreeType.SubTree || actionTree.type === ActionTreeType.ModuleRoot) {
                let subTreesForThisParent = subTreesByParentId.get(actionTree.parentModelId);
                if (!subTreesForThisParent) {
                    subTreesForThisParent = [actionTree];
                    subTreesByParentId.set(actionTree.parentModelId, subTreesForThisParent);
                } else {
                    subTreesForThisParent.push(actionTree);
                }
            }
        });

        const usedGatesSet = new Set<string>();

        // Function to collect all used gates in the action tree and subtrees recursively
        const usedGatesInActionTreeAndSubtrees = (tree: ActionTreeSnapshot) => {
            const interactionTriggerActions = tree.nonSubTreeActions.filter(a => a.$modelType === "actions/InteractionTriggerActionModel") as SnapshotOutOfObject<InteractionTriggerActionModel>[];
            interactionTriggerActions
                .filter(a => coreMapIds.has(a.triggerElement.mapId)) // If a interaction trigger on a "core" map referenced from a module tree, it must be a gate
                .forEach(a => usedGatesSet.add(a.triggerElement.elementId));

            const locationTriggerActions = tree.nonSubTreeActions.filter(a => a.$modelType === "actions/LocationTriggerActionModel") as SnapshotOutOfObject<LocationTriggerActionModel>[];
            locationTriggerActions
                .filter(a => coreMapIds.has(a.mapElement.mapId)) // If a location trigger on a "core" map referenced from a module tree, it must be a gate
                .forEach(a => usedGatesSet.add(a.mapElement.elementId));

            const treeParameterActions = tree.nonSubTreeActions.filter(a => a.$modelType === "actions/TreeParamterActionModel") as SnapshotOutOfObject<TreeParamterActionModel>[];
            treeParameterActions
                .filter(a => (a.value.value?.$modelType === "actions/MapElementReferenceModel"))
                .map(a => a.value.value as SnapshotOutOfObject<MapElementReferenceModel>)
                .filter(mapElementReference => coreMapIds.has(mapElementReference.mapId))
                .forEach(mapElementReference => usedGatesSet.add(mapElementReference.elementId));

            // collect subtrees of given tree and recurse into those
            const childrenSubTrees = subTreesByParentId.get(tree.$modelId);
            if (childrenSubTrees)
                childrenSubTrees.forEach(childTree => usedGatesInActionTreeAndSubtrees(childTree));
        };

        usedGatesInActionTreeAndSubtrees(actionTree.actionTreeSnapshot);
        usedGatesSet.delete("");

        usedGates = Array.from(usedGatesSet);
    }

    return {
        $modelId,
        highlighted,
        name,
        mayBePlayedInWorkshops,
        usedGates
    };
}
