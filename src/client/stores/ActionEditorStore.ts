import { computed, makeAutoObservable } from "mobx";
import { FlowTransform } from "react-flow-renderer";
import { ActionModel, TreeExitActionModel, TreeParamterActionModel, TreePropertiesActionModel } from "../../shared/action/ActionModel";
import { ActionTreeModel, ActionTreeType, getTreeParent, subTreeNodeSize } from "../../shared/action/ActionTreeModel";
import { arrayEquals, isBlank, lastElement } from "../../shared/helper/generalHelpers";
import { PatchTracker } from "../communication/editorClient/PatchTracker";
import { ClickConnectionData } from "../components/action/handle/handleClickConnect";
import { actionSubTreeFocus } from "../components/action/ActionSubTreeFocus";
import { ZoomPanHelperFunctions } from "react-flow-renderer/dist/types";
import { onScreenActionPositions, hierarchyScale, doScaleNumber } from "../components/action/actionEditorHelpers";
import { sharedStore } from "./SharedStore";
import { TFunction } from "i18next";
import { createIdToActionMap } from "../../shared/helper/actionTreeHelper";
import { AugmentedPatch } from "../../shared/helper/mobXHelpers";
import { getParent } from "mobx-keystone";
import { editorStore } from "./EditorStore";
import { getActionShortDescriptionForActionEditor } from "../helper/actionEditorHelpers";

export const basicActionsCategory = "action_editor.tree_basic_actions";
export const allTemplatesCategory = "action_editor.tree_all_templates";

export class ActionEditorStore {
    public constructor() {
        makeAutoObservable(this, {
            idToActionMap: computed({ keepAlive: true }) // Keep the idToActionMap computed getter cached even if not actively observed
        }, { autoBind: true });
    }

    public runningActionTreeOperation: boolean;
    public currentActionTreeHierarchy: ActionTreeModel[];
    public currentAction: ActionModel;
    public currentActionSelectionTransformForUndo: FlowTransform;
    public currentActionSelectionHierarchyIdsForUndo: string[];
    public currentActionParentPatchTracker = new PatchTracker(() => false);
    public currentCategory: string = basicActionsCategory;

    public clickConnectionData: ClickConnectionData;

    public clickPlacementActionModelId: string;
    public clickPlacementActionTreeModelId: string;

    public mapElementSelectorLatestSelectedMap: number = 0;

    public get actionEditorUpscaleFactor() {
        // Use higher number, because sometimes small numbers that are only scaled up later do not work in CSS layout (e.g. for border-width)
        return this.currentRootActionTree?.type === ActionTreeType.MainGameRoot
            ? 10000 // MainGameRoot: top level a bit wonky, but can zoom deeper
            : 1000; // Templates/Workshops: top level almost perfect, but cannot go inside many trees
    }

    public get currentActionSubTree() {
        return lastElement(this.currentActionTreeHierarchy);
    }

    public get currentRootActionTree(): ActionTreeModel {
        return this.currentActionTreeHierarchy[0];
    }

    public get currentActionSubTreeModelId() {
        return this.currentActionSubTree.$modelId;
    }

    public setSelectedActionTreeHierarchy(hierarchy: ActionTreeModel[]) {
        if (this.currentActionTreeHierarchy === undefined) {
            this.currentActionTreeHierarchy = [];
        }

        if (arrayEquals(this.currentActionTreeHierarchy, hierarchy))
            return;

        // We always expect at least one element in the hierarchy.
        // If nothing was selected (which could be a template), we set it to the root of the module or main game root.
        if (!hierarchy || !hierarchy[0] || hierarchy.length === 0) {
            hierarchy = [editorStore.isModuleEditor ? sharedStore.actionTreesById.get(editorStore.sessionModule.actiontreeId) : sharedStore.mainGameRootActionTree];
        }

        this.currentActionTreeHierarchy = hierarchy;
    }

    public get treeFocussedForWorkshop() {
        return this.currentRootActionTree?.type === ActionTreeType.ModuleRoot;
    }

    public onActionTreeRemoved(actionTree: ActionTreeModel) {
        if (this.currentAction && (this.currentAction === actionTree || actionTree.nonSubTreeActions.includes(this.currentAction))) {
            this.deselectSelectedAction();
        }

        // Was part of the current hierarchy deleted?
        const deletedHierarchyIndex = this.currentActionTreeHierarchy.findIndex(e => e.$modelId === actionTree.$modelId);
        if (deletedHierarchyIndex !== -1) {
            // Clear the cached tree (because it still points to deleted elements)
            actionSubTreeFocus.clearCachedTree();

            // Reselect the part of the tree that is still valid
            const validHierarchy = this.currentActionTreeHierarchy.slice(0, deletedHierarchyIndex);
            this.setSelectedActionTreeHierarchy(validHierarchy);
        }
    }

    public setRunningActionTreeOperation(value: boolean) {
        this.runningActionTreeOperation = value;
    }

    public deselectSelectedAction() {
        this.setSelectedAction(null, null, null);
    }

    public setSelectedAction(action: ActionModel, currentlySelectedTransformForUndo: FlowTransform, currentlySelectedHierachyIdsForUndo: string[]) {
        this.currentActionParentPatchTracker.stopTracking();

        this.currentAction = action;
        this.currentActionSelectionTransformForUndo = currentlySelectedTransformForUndo;
        this.currentActionSelectionHierarchyIdsForUndo = currentlySelectedHierachyIdsForUndo;

        if (this.currentAction) {
            const parentTree = getParent(this.currentAction) as ActionTreeModel;
            if (parentTree) {
                this.currentActionParentPatchTracker.startTracking(parentTree, this.onCurrentActionParentTreeChange);
            }
        }
    }

    private onCurrentActionParentTreeChange(patch: AugmentedPatch, inversePatch: AugmentedPatch) {
        if (!this.currentAction)
            return;

        if ((patch.op === "remove") && (inversePatch.op === "add")) {
            const removedModelId = inversePatch.value?.$modelId;
            // Was the currently selected action deleted?
            if (this.currentAction.$modelId === removedModelId) {
                this.deselectSelectedAction();
            }
        }
    }

    public setSelectedCategory(category: string) {
        this.currentCategory = category;
    }

    /**
     * Searches a path from the assigned parent node to the assigned child node.
     * Tracks the walked path in the assigned array. Tracks visited nodes to avoid cyclic traveling.
     * Returns true if a path was found. Note: Does not walk out of this {@link ActionTreeModel}s.
     * @param startNode The node to start the search from. (Must be a parent if the node to search.)
     * @param searchNode The note to find the path to. (Must be a child of the start nod.)
     * @param path The tracked path to the node.
     * @param alreadyVisited The visited nodes to avoid cyclic traveling.
     * @param currentSearchDepth The current recursion search depth.
     */
    public findNodePath(startNode: ActionModel, searchNode: ActionModel, path: ActionModel[] = [], alreadyVisited: Record<string, boolean> = {}, currentSearchDepth = 0): boolean {
        if (!startNode || !searchNode)
            return false;

        if (startNode.$modelId == searchNode.$modelId)
            return true;

        if (alreadyVisited[startNode.$modelId] == true)
            return false;

        currentSearchDepth++;
        if (currentSearchDepth > 100000) {
            console.warn("Maximum search depth reached while searching " + searchNode.$modelId);
            return false;
        }

        alreadyVisited[startNode.$modelId] = true;

        let exits = startNode.exits();
        if (startNode instanceof TreeExitActionModel) {
            // special case: actions of this class do not use their 'exits' but their 'subTreeExit'
            exits = [startNode.subTreeExit];
        }

        for (let e = 0; e < exits.length; e++) {
            for (let a = 0; a < exits[e].nextActions.length; a++) {
                const nextActionId = exits[e].nextActions[a];
                const action = this.idToActionMap.get(nextActionId);
                if (this.findNodePath(action, searchNode, path, alreadyVisited, currentSearchDepth)) {
                    path.splice(0, 0, action);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Returns true if the assigned node is a child of the assigned {@link ActionTreeModel}
     * and is connected to a {@link TreeEnterActionModel} node of the {@link ActionTreeModel}.
     * @param actionToCheck The node to check.
     * @param actionTree The tree to search in.
     */
    public isConnectedChild(actionToCheck: ActionModel, actionTree: ActionTreeModel): boolean {
        if (!actionTree)
            return false;

        if (!actionTree.isChildAction(actionToCheck))
            return false;

        const allEnterActions = actionTree.enterActions;
        for (let i = 0; i < allEnterActions.length; i++) {
            const enterAction = allEnterActions[i];
            if (actionToCheck instanceof ActionTreeModel) {
                // special case for action tree: check all enter actions of the target action
                const actionTreeToCheck = actionToCheck as ActionTreeModel;
                const childEnterActions = actionTreeToCheck.enterActions;
                for (let c = 0; c < childEnterActions.length; c++) {
                    if (this.findNodePath(enterAction, childEnterActions[c]))
                        return true;
                }
            } else {
                if (this.findNodePath(enterAction, actionToCheck))
                    return true;
            }
        }

        return false;
    }

    /**
     * Returns true if the assigned {@link ActionModel} should be marked as 'unconnected'.
     * @param action The action to check.
     * @param parent The parent tree of this action.
     */
    public shouldMarkAsDisconnected(action: ActionModel, parent: ActionTreeModel): boolean {
        if (action instanceof TreePropertiesActionModel || action instanceof TreeParamterActionModel)
            return false;

        // do not mark the root tree
        if (this.currentRootActionTree?.$modelId == action?.$modelId)
            return false;

        return !this.isConnectedChild(action, parent);
    }

    /**
     * Returns true if the input socket of the assigned {@link ActionModel} has a connection.
     * Searches for connections from the assigned models.
     * @param actionToCheck The action to check.
     * @param actionsToSearchIn The models to search connections.
     */
    public isInputSocketConnected(actionToCheck: ActionModel, actionsToSearchIn: ActionModel[]): boolean {
        if (!actionToCheck || !actionsToSearchIn)
            return false;

        return actionsToSearchIn.some(model => model.exits().some(exit => exit.nextActions.some(next => next == actionToCheck.$modelId)));
    }

    /**
     * Returns true if the assigned {@link ActionModel} should be marked as 'invalid'.
     * @param action The action to check.
     */
    public shouldMarkAsInvalid(action: ActionModel): boolean {
        // do not mark the root tree
        if (this.currentRootActionTree?.$modelId == action?.$modelId)
            return false;

        return !action.isDataComplete;
    }

    /**
     * Logs debug information of the assigned {@link ActionModel}.
     * @param action The action model to log information.
     */
    public debugLogInformation(action: ActionModel) {
        const rootEnterAction = this.currentRootActionTree.enterActions[0];
        console.log(this.currentRootActionTree.enterActions);
        const parent = getTreeParent(action);
        console.log("█ Parent ActionTreeModel [" + parent.$modelId + "]");
        console.log("┗━● This " + action.$modelType + " [" + action.$modelId + "]");
        for (let exitIndex = 0; exitIndex < action.exits().length; exitIndex++) {
            const exit = action.exits()[exitIndex];
            const lastExit = exitIndex == (action.exits().length - 1);
            let prefix = lastExit ? "  ┗━" : "  ┝━";
            console.log(prefix + "● SelectableExitModel [" + exit.$modelId + "]");
            for (let actionIndex = 0; actionIndex < exit.nextActions.length; actionIndex++) {
                const actionId = exit.nextActions[actionIndex];
                const lastAction = actionIndex == (exit.nextActions.length - 1);
                prefix = lastExit ? "   " : "  ┃";
                prefix += lastAction ? " ┗━" : " ┝━";
                console.log(prefix + "● Connected to ActionModel [" + actionId + "]");
            }
        }
        if (!(action instanceof ActionTreeModel)) {
            const pathOut: ActionModel[] = [];
            this.findNodePath(rootEnterAction, action, pathOut);
            console.log("Path to root entry [" + rootEnterAction.$modelId + "]", pathOut);
        } else {
            console.log("Check the entry actions of this tree to find a path to the root entry");
        }
    }

    /**
     * Uses the assigned {@link ZoomPanHelperFunctions} to jump to the assigned action.
     * @param action The action to jump to.
     * @param zoomPanHelper The helper to use.
     */
    public jumpToAction(action: ActionModel, zoomPanHelper: ZoomPanHelperFunctions) {
        if (!action || !zoomPanHelper)
            return;

        const subtreePath = this.currentRootActionTree.findHierarchy(action);
        const { x, y } = onScreenActionPositions(action.position, subtreePath);
        const scale = hierarchyScale(subtreePath);
        const bounds = {
            x: x,
            y: y,
            width: doScaleNumber(subTreeNodeSize.width, scale),
            height: doScaleNumber(subTreeNodeSize.height, scale)
        };
        zoomPanHelper.fitBounds(bounds, 3);
    }


    public setClickConnectionData(value: ClickConnectionData) {
        this.clearClickActions();
        this.clickConnectionData = value;
    }

    public setOrToggleClickPlacementActionModelId(value: string) {
        if (this.clickPlacementActionModelId === value) {
            this.clearClickActions();
            return;
        }

        this.clearClickActions();
        this.clickPlacementActionModelId = value;
        this.clickPlacementActionTreeModelId = null;
    }

    public setOrToggleClickPlacementActionTreeModelId(value: string) {
        if (this.clickPlacementActionTreeModelId === value) {
            this.clearClickActions();
            return;
        }

        this.clearClickActions();
        this.clickPlacementActionModelId = null;
        this.clickPlacementActionTreeModelId = value;
    }

    public clearClickActions() {
        this.clickConnectionData = null;
        this.clickPlacementActionModelId = null;
        this.clickPlacementActionTreeModelId = null;
    }

    public get idToActionMap(): Map<string, ActionModel> {
        return createIdToActionMap(this.currentRootActionTree);
    }

    public searchActionNodes(searchString: string, t: TFunction): Array<ActionModel> {
        if (isBlank(searchString))
            return [];

        searchString = searchString.toLocaleLowerCase();

        const returnValue: ActionModel[] = [];

        this.idToActionMap.forEach((action: ActionModel, id: string) => {
            if (id.toLocaleLowerCase().includes(searchString)
                || t(action.title()).toLocaleLowerCase().includes(searchString)
                || getActionShortDescriptionForActionEditor(action, t).toLocaleLowerCase().includes(searchString)) {
                returnValue.push(action);
            }
        });

        return returnValue;
    }

    public setMapElementSelectorLatestSelectedMap(value: number) {
        this.mapElementSelectorLatestSelectedMap = value;
    }
}

export const actionEditorStore = new ActionEditorStore();