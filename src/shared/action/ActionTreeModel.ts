import { clone, getParent, model, Model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";
import { ActionModel, ActionScope, ReceiveQuestActionModel, SetTagActionModel, SetVariableActionModel, TreeParamterActionModel, TreeEnterActionModel, TreeExitActionModel, TreePropertiesActionModel, ReceiveTaskActionModel, CalculateVariableActionModel, InteractionTriggerActionModel, PlayAnimationActionModel, MovePlayerActionModel, CopyAwarenessIntoVariableActionModel, LocationTriggerActionModel, AbortQuestActionModel, FinishQuestActionModel, FinishTaskActionModel, AbortTaskActionModel } from "./ActionModel";
import { ActionPositionModel } from "./ActionPositionModel";
import { ActionTreeColors } from "../data/ActionTreeColors";
import { SelectableExitModel } from "./SelectableExitModel";
import { EditorComplexity } from "../definitions/other/EditorComplexity";
import { computed, makeObservable, observable } from "mobx";
import { TranslateableEntityData } from "../translation/TranslationDataTypes";
import { QuestIdValueModel } from "./ValueModel";
import { MapElementReferenceModel } from "./MapElementReferenceModel";

export const subTreeNodeSize = {
    width: 200,
    height: 120
};

export enum ActionTreeType {
    SubTree,
    MainGameRoot,
    TemplateRoot,
    ModuleRoot
}

export interface TreeAccess {
    getSubTreesForActionTree: (actionTree: ActionTreeModel) => ActionTreeModel[];
    getTreeById: (modelId: string) => ActionTreeModel;
}

@model("actions/ActionTreeModel")
export class ActionTreeModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    nonSubTreeActions: prop<ActionModel[]>(() => [
        new TreePropertiesActionModel({}),
        new TreeEnterActionModel({ position: new ActionPositionModel({ y: 40 }) }),
        new TreeExitActionModel({ position: new ActionPositionModel({ x: 200 / 0.6, y: 40 }) })
    ]),
    type: prop<ActionTreeType>(ActionTreeType.SubTree).withSetter(),
    parentModelId: prop<string>(null).withSetter(),
    startAtAct: prop<number>(null).withSetter()
}) implements ActionModel {

    public onInit() {
        makeObservable(this, {
            treeAccess: observable
        });
    }

    public temporaryParentModelId: string;

    public get activeParentModelId() {
        return this.temporaryParentModelId || this.parentModelId;
    }

    public static createEmptyPrototype() {
        const prototype = new ActionTreeModel({});
        prototype.treeAccess = {
            getSubTreesForActionTree: () => [],
            getTreeById: () => null
        };
        return prototype;
    }

    public treeAccess: TreeAccess = {
        getSubTreesForActionTree: () => { throw Error("Please set getSubTreesForActionTreeCallback for this ActionTreeModel before accessing allActions or subTreeActions."); },
        getTreeById: () => { throw Error("Please set getTreeById for this ActionTreeModel before using it."); }
    };

    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(_rootActionTrees: ActionTreeModel[], _t: (key: string) => string, languageKey: string) {
        return this.treePropertiesAction?.localizedName.get(languageKey);
    }

    public exits(): SelectableExitModel[] {
        return this.exitActions.map(a => a.subTreeExit);
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return this.exitActions.map(a => a.name.get(languageKey));
    }

    public title() {
        return "action_editor.node_subtree";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.ACTION_TREE;
    }

    public readonly deactivationGroupId = "";
    public setDeactivationGroupId(_value: string) {
        throw new Error("Cannot set deactivationGroupId on ActionTreeModel");
    }

    public left() {
        return this.enterActions.reduce((a, b) => a.position.x < b.position.x ? a : b).position.x;
    }

    public right() {
        return this.exitActions.reduce((a, b) => a.position.x > b.position.x ? a : b).position.x;
    }

    public scale() {
        return subTreeNodeSize.width / (this.right() - this.left());
    }

    public getChildActionById(id: string) {
        const result = this.getNonSubtreeChildActionById(id);
        if (result)
            return result;

        return this.getChildSubTreeActionById(id);
    }

    public getNonSubtreeChildActionById(id: string) {
        return this.nonSubTreeActions.find(a => a.$modelId === id);
    }

    public getChildSubTreeActionById(id: string) {
        return this.subtreeActions.find(a => a.$modelId === id);
    }

    public isChildAction(action: ActionModel) {
        return this.nonSubTreeActions.includes(action) || this.subtreeActions.some(actionTree => actionTree === action);
    }

    public searchActionRecursive(id: string): ActionModel {
        const action = this.getChildActionById(id);
        if (action)
            return action;

        for (const subTree of this.subtreeActions) {
            const action = subTree.searchActionRecursive(id);
            if (action)
                return action;
        }

        return null;
    }

    @computed
    public get parentTree() {
        if (this.activeParentModelId) {
            return this.treeAccess.getTreeById(this.activeParentModelId);
        }

        return null;
    }

    /**
     * Returns the subtree path that leads to the assigned action.
     * @param action The action to find the path to.
     */
    public findHierarchy(action: ActionModel) {
        let currentAction = action;
        let currentParent = getTreeParent(action);
        const path = [];
        while (currentParent) {
            path.push(currentParent);
            currentAction = currentParent;
            currentParent = getTreeParent(currentAction);
        }
        return path.reverse();
    }

    @computed
    public get allActions() {
        return [...this.nonSubTreeActions, ...this.subtreeActions];
    }

    @computed
    public get treePropertiesAction() {
        return this.nonSubTreeActions.find(a => a instanceof TreePropertiesActionModel) as TreePropertiesActionModel;
    }

    @computed
    public get enterActions() {
        return this.nonSubTreeActions
            .filter(a => a instanceof TreeEnterActionModel)
            .sort((a, b) => a.position.y - b.position.y) as TreeEnterActionModel[];
    }

    @computed
    public get exitActions() {
        return this.nonSubTreeActions
            .filter(a => a instanceof TreeExitActionModel)
            .sort((a, b) => a.position.y - b.position.y) as TreeExitActionModel[];
    }

    @computed
    public get subtreeActions(): ActionTreeModel[] {
        return this.treeAccess.getSubTreesForActionTree(this);
    }

    @computed
    public get receiveQuestActions() {
        return this.nonSubTreeActions.filter(a => a instanceof ReceiveQuestActionModel) as ReceiveQuestActionModel[];
    }

    @computed
    public get receiveTaskActions() {
        return this.nonSubTreeActions.filter(a => a instanceof ReceiveTaskActionModel) as ReceiveTaskActionModel[];
    }

    @computed
    public get setTagActions() {
        return this.nonSubTreeActions.filter(a => a instanceof SetTagActionModel) as SetTagActionModel[];
    }

    @computed
    public get setVariableActions() {
        return this.nonSubTreeActions.filter(a => a instanceof SetVariableActionModel) as SetVariableActionModel[];
    }

    @computed
    public get calculateVariableActions() {
        return this.nonSubTreeActions.filter(a => a instanceof CalculateVariableActionModel) as CalculateVariableActionModel[];
    }

    @computed
    public get interactionTriggerActions() {
        return this.nonSubTreeActions.filter(a => a instanceof InteractionTriggerActionModel) as InteractionTriggerActionModel[];
    }

    @computed
    public get locationTriggerActions() {
        return this.nonSubTreeActions.filter(a => a instanceof LocationTriggerActionModel) as LocationTriggerActionModel[];
    }

    @computed
    public get copyAwarenessIntoVariableActions() {
        return this.nonSubTreeActions.filter(a => a instanceof CopyAwarenessIntoVariableActionModel) as CopyAwarenessIntoVariableActionModel[];
    }

    @computed
    private get unsortedTreeParameterActions() {
        return this.nonSubTreeActions.filter(a => a instanceof TreeParamterActionModel) as TreeParamterActionModel[];
    }

    public treeParameterActions(type?: string) {
        let treeParameterActions = this.unsortedTreeParameterActions;

        if (type !== undefined) {
            treeParameterActions = treeParameterActions.filter(a => a.value.$modelType === type);
        }

        // Sort by position of parameter nodes
        return treeParameterActions.sort((a, b) => (a.position.x - b.position.x) + (a.position.y - b.position.y)) as TreeParamterActionModel[];
    }

    /**
    * Returns allQuests Array with all quests in scope of given action tree,
    * searching up the tree hierarchy recursively for all quests defined in StartQuest nodes
    *
    * @param rootActionTree: Tree to search for quests
    * @param allQuests: Array that the found quests will be added to
    */
    public quests(rootActionTree: ActionTreeModel, allQuests: ReceiveQuestActionModel[] = []) {
        this.receiveQuestActions
            .filter(a => !a.global)
            .forEach(a => allQuests.push(a as ReceiveQuestActionModel));

        // If we reached a module root, return the quests we have collected so far
        if (this.type === ActionTreeType.ModuleRoot)
            return allQuests;

        if (this != rootActionTree) {
            const parentTree = getTreeParent(this);
            parentTree.quests(rootActionTree, allQuests); // Recurse with tree parent
        } else {
            rootActionTree.globalQuests(allQuests);
        }

        return allQuests;
    }

    public questForId(id: string): ReceiveQuestActionModel {
        return this.allQuests().find(a => a.$modelId === id);
    }

    private globalQuests(allQuests: ReceiveQuestActionModel[]) {
        this.receiveQuestActions
            .filter(a => a.global)
            .forEach(a => allQuests.push(a));

        this.subtreeActions.forEach(sub => sub.globalQuests(allQuests));
        return allQuests;
    }

    private allQuests(allQuests: ReceiveQuestActionModel[] = []) {
        this.receiveQuestActions.forEach(a => allQuests.push(a));
        this.subtreeActions.forEach(sub => sub.allQuests(allQuests));
        return allQuests;
    }

    public tasks(questId: string, allTasks: ReceiveTaskActionModel[] = []) {
        if (!questId)
            return allTasks;

        this.receiveTaskActions
            .filter(a => a.questId === questId)
            .forEach(a => allTasks.push(a));

        this.subtreeActions.forEach(sub => sub.tasks(questId, allTasks));
        return allTasks;
    }

    public taskForId(id: string): ReceiveTaskActionModel {
        return this.allTasks().find(a => a.$modelId === id);
    }

    private allTasks(allTasks: ReceiveTaskActionModel[] = []) {
        this.receiveTaskActions.forEach(a => allTasks.push(a));
        this.subtreeActions.forEach(sub => sub.allTasks(allTasks));
        return allTasks;
    }

    public globalTags(allTags: Set<string> = new Set()) {
        this.setTagActions.forEach(a => allTags.add(a.tag));
        this.subtreeActions.forEach(sub => sub.globalTags(allTags));
        return allTags;
    }

    public variableNames(scope: ActionScope, allVariableNames: Set<string> = new Set()) {
        allVariableNames.add("");

        this.setVariableActions
            .filter(a => a.scope === scope)
            .forEach(a => allVariableNames.add(a.name));

        this.calculateVariableActions
            .filter(a => a.scope === scope)
            .forEach(a => allVariableNames.add(a.variableResult));

        if (scope === ActionScope.Global) {
            this.copyAwarenessIntoVariableActions.forEach(c => allVariableNames.add(c.name));
            this.subtreeActions.forEach(sub => sub.variableNames(scope, allVariableNames));
        }

        return allVariableNames;
    }

    public variableValues(name: string, scope: ActionScope, all: Set<string> = new Set()) {
        all.add("");

        this.setVariableActions
            .filter(a => a.scope === scope && a.name === name)
            .forEach(a => all.add(a.value));

        if (scope === ActionScope.Global) {
            this.subtreeActions.forEach(sub => sub.variableValues(name, scope, all));
        }

        return all;
    }

    public scopedName(name: string, scope: ActionScope, treeScopeContext: ActionModel) {
        if (scope === ActionScope.Global)
            return name;

        return getTreeParent(treeScopeContext).$modelId + "_" + name;
    }

    @modelAction
    public removeNonSubtreeAction(action: ActionModel) {
        if (action instanceof ActionTreeModel)
            throw Error("Cannot remove ActionTreeModel with removeNonSubtreeAction");

        const actionIndex = this.nonSubTreeActions.indexOf(action);
        if (actionIndex === -1)
            throw Error("removeNonSubtreeAction(): Action not found");

        if (action instanceof TreePropertiesActionModel) {
            return; // The properties node cannot be deleted
        }
        if (action instanceof TreeEnterActionModel && this.enterActions.length === 1) {
            return; // We need at least one entry to compute the tree scale
        }
        if (action instanceof TreeExitActionModel && this.exitActions.length === 1) {
            return; // We need at least one exit to compute the tree scale
        }

        this.nonSubTreeActions.splice(actionIndex, 1);
    }

    @modelAction
    public addNonSubtreeAction(action: ActionModel) {
        if (action instanceof ActionTreeModel)
            throw Error("Cannot add ActionTreeModel with addNonSubtreeAction");

        this.nonSubTreeActions.push(action);
    }

    @modelAction
    public resetPositionAndCleanParameters() {
        this.position.setX(0);
        this.position.setY(0);
        this.treeParameterActions().forEach(p => p.value.clean());
    }

    @modelAction
    public cloneWithNewIds(newType: ActionTreeType) {
        const allNewTrees = new Array<ActionTreeModel>();
        const copy = this.recursivelyCreateClones(newType, allNewTrees);

        const originalToCopyActionIdsMap = ActionTreeModel.generateActionIdsInCopyMap(this, copy);
        copy.fixActionIdsInCopy(originalToCopyActionIdsMap);

        copy.exitActions.forEach(exitAction => {
            exitAction.subTreeExit.setNextActions([]);
        });

        return { copy, allNewTrees };
    }

    private recursivelyCreateClones(newType: ActionTreeType, allNewTrees: ActionTreeModel[]): ActionTreeModel {
        const copy = clone(this);
        copy.setParentModelId(null);
        copy.setType(newType);
        copy.treeAccess.getSubTreesForActionTree = (parent) => allNewTrees.filter(child => child.activeParentModelId === parent.$modelId);
        allNewTrees.push(copy);

        const subtreeCloneResults = this.subtreeActions.map(subtree => subtree.recursivelyCreateClones(ActionTreeType.SubTree, allNewTrees));
        for (const subtreeClone of subtreeCloneResults) {
            subtreeClone.setParentModelId(copy.$modelId);
        }

        return copy;
    }

    private static generateActionIdsInCopyMap(original: ActionTreeModel, copy: ActionTreeModel, originalToCopyActionIdsMap = new Map<string, string>()) {
        original.allActions.forEach((originalAction, index) => {
            const copiedAction = copy.allActions[index];
            originalToCopyActionIdsMap.set(originalAction.$modelId, copiedAction.$modelId);

            if (copiedAction instanceof ActionTreeModel) {
                ActionTreeModel.generateActionIdsInCopyMap(originalAction as ActionTreeModel, copiedAction, originalToCopyActionIdsMap);
            }
        });

        return originalToCopyActionIdsMap;
    }

    private fixActionIdsInCopy(originalToCopyActionIdsMap: Map<string, string>) {
        this.allActions.forEach(copiedAction => {
            copiedAction.exits().forEach(copiedExit => {
                copiedExit.setNextActions(copiedExit.nextActions.map(next => originalToCopyActionIdsMap.get(next)));
            });

            if ((copiedAction instanceof FinishQuestActionModel) ||
                (copiedAction instanceof AbortQuestActionModel) ||
                (copiedAction instanceof ReceiveTaskActionModel) ||
                (copiedAction instanceof FinishTaskActionModel) ||
                (copiedAction instanceof AbortTaskActionModel)) {
                if (originalToCopyActionIdsMap.has(copiedAction.questId)) {
                    copiedAction.setQuestId(originalToCopyActionIdsMap.get(copiedAction.questId));
                }
            }

            if ((copiedAction instanceof FinishTaskActionModel) ||
                (copiedAction instanceof AbortTaskActionModel)) {
                if (originalToCopyActionIdsMap.has(copiedAction.taskId)) {
                    copiedAction.setTaskId(originalToCopyActionIdsMap.get(copiedAction.taskId));
                }
            }
        });

        this.subtreeActions.forEach(subtree => {
            subtree.unsortedTreeParameterActions.forEach(treeParameterAction => {
                if (treeParameterAction.value instanceof QuestIdValueModel) {
                    if (originalToCopyActionIdsMap.has(treeParameterAction.value.value)) {
                        treeParameterAction.value.setValue(originalToCopyActionIdsMap.get(treeParameterAction.value.value));
                    }
                }
            });

            subtree.fixActionIdsInCopy(originalToCopyActionIdsMap);
        });
    }

    /**
     * Returns true if the data for this action is complete.
     */
    @computed
    public get isDataComplete(): boolean {
        if (!this.areActionsValid) return false;
        return this.areParametersSet;
    }

    /**
     * Returns true if all containing actions are valid.
     */
    @computed
    private get areActionsValid(): boolean {
        return this.allActions.every(action => action.isDataComplete);
    }

    /**
     * Returns true if all {@link TreeParamterActionModel} are set.
     */
    @computed
    private get areParametersSet(): boolean {
        return this.treeParameterActions().every(parameter => parameter.allowBlankValue || parameter.isValueSet());
    }
}

export type ActionTreeSnapshot = SnapshotOutOf<ActionTreeModel>;

/**
 * Returns the directly enclosing ActionTreeModel of the actionModel.
 * 
 * - ActionTreeModel <--  this will be the return value for *any* of the following child elements as `actionModel`
 *   - ActionTreeModel
 *   - ActionModel
 *   - ActionModel
 * 
 * Note that ActionTreeModels are ActionModels too.
 */
export function getTreeParent(actionModel: ActionModel) {
    // If actionModel is an ActionTreeModel, we use ActionTreeModel.parentTree to get to the parent.
    // (Since that relationship is not a part of the mobx-keystone parent-child tree hierarchy we cannot use getParent().)
    if (actionModel instanceof ActionTreeModel) {
        return actionModel.parentTree;
    }

    // Any other actionModel is a hierarchical child of an ActionTreeModel, or more specifically, a direct child of the
    // array ActionTreeModel.nonSubTreeActions.
    // If we call getParent() once, it returns that array; and if we call it again, it will return the ActionTreeModel.
    return getParent(getParent(actionModel)) as ActionTreeModel;
}

/**
 * If element is an ActionModel: Returns its directly enclosing ActionTreeModel.
 * If element is not an ActionModel: First go to the enclosing ActionModel, then return its directily enclosing ActionTreeModel.
 * Returns the directly enclosing ActionTreeModel of the actionModel.
 * 
 * - ActionTreeModel <--  this will be the return value for *any* of the following child elements as `element`
 *   - ActionTreeModel
 *     - AnimationElementValueModel
 *       - AnimationElementReferenceModel
 *   - ActionModel
 *     - AnimationElementReferenceModel
 * 
 * Note that ActionTreeModels are ActionModels too.
 */
export function getTreeParentOfClosestActionModel(element: any, skipTreeParameterActionModel: boolean) {
    return getTreeParent(getClosestActionModel(element, skipTreeParameterActionModel));
}

/**
 * If element is an ActionModel: Just return it.
 * If element is not an ActionModel: Return its enclosing ActionModel.
 * 
 * Note that ActionTreeModels are ActionModels too.
*/
function getClosestActionModel(element: any, skipTreeParameterActionModel: boolean) {
    while (true) {
        if ((element as ActionModel).isActionModel && (!skipTreeParameterActionModel || !(element instanceof TreeParamterActionModel))) {
            return element as ActionModel;
        }

        element = getParent(element);
        if (!element) {
            throw new Error("Couldn't find an ActionModel that is the parent of element in the hierachy.");
        }
    }
}