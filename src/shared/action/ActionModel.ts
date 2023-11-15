import { model, Model, modelAction, prop } from "mobx-keystone";
import { TranslatedString } from "../game/TranslatedString";
import { ActionPositionModel } from "./ActionPositionModel";
import { ActionTreeModel } from "./ActionTreeModel";
import { ConditionModel, ConditionType } from "./ConditionModel";
import { AnimationElementReferenceModel, MapElementReferenceModel } from "./MapElementReferenceModel";
import { SelectableExitModel } from "./SelectableExitModel";
import { AnimationPropertiesValueModel, TranslatedStringValueModel, ValueModel } from "./ValueModel";
import { ActionTreeColors } from "../data/ActionTreeColors";
import { NPCReferenceModel } from "./NPCReferenceModel";
import { CharacterConfigurationModel } from "../resources/CharacterConfigurationModel";
import { InteractionTriggerIconType } from "../game/InteractionTriggerIconType";
import { isActionTreeParameter, isValidActionNumberValue } from "../helper/actionTreeHelper";
import { isBlank } from "../helper/generalHelpers";
import { EditorComplexity } from "../definitions/other/EditorComplexity";
import { CutSceneTextModel } from "./CutSceneTextModel";
import { ParsedPath } from "path";
import { computed } from "mobx";
import { TranslateableEntityData, TranslatableString } from "../translation/TranslationDataTypes";

export enum ActionScope {
    Tree,
    Global
}

export const playStyles = [
    "Undecided",
    "Spy",
    "Fighter"
];

export const factions = [
    "LandSeeker",
    "WaterStayer"
];

export const reputationAmounts = [
    "Reasonable",
    "Small",
    "Large",
];

export interface ActionModel {
    $modelType: string;
    $modelId: string;

    isActionModel: true;

    exits(): SelectableExitModel[]; // Flow: which action to 'execute' next?

    position: ActionPositionModel;  // Action editor layout (has no influence on game)
    title(): string;                // Returns a translation key to display a node title in the action editor
    nodeColor(): string;            // Color of the node in the action editor
    shortDescription(rootActionTrees: ActionTreeModel[], t: (key: string) => string, languageKey: string, getCharacter: (id: number) => CharacterConfigurationModel): string; // String to be displayed in the nodes in the action editor
    exitLabels(t: (key: string) => string, languageKey: string): string[];         // Labels to label the exits in the action editor (may be null if no labels are needed for a certain type of node)
    comment: string;                // Some comment about the node by the developers (has no influence on game)
    setComment(v: string): void;

    deactivationGroupId: string;
    setDeactivationGroupId(v: string): void;

    translatableEntityData(): TranslateableEntityData;

    minimumComplexity: number;         // Minimum complexity level the editor has to be set to for this node to be available in editor

    isDataComplete: boolean;
}

@model("actions/LocationTriggerActionModel")
export class LocationTriggerActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    mapElement: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter(),
    checkOnActivation: prop<boolean>(false),
    stopPlayerPath: prop<boolean>(false),
    triggerOnEnter: prop<boolean>(true).withSetter(),
    enterArea: prop<SelectableExitModel>(() => new SelectableExitModel({})),
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop2;

    public get exitTrigger() {
        return this.enterArea;
    }

    @modelAction
    public toggleCheckOnActivation() {
        this.checkOnActivation = !this.checkOnActivation;
    }

    @modelAction
    public toggleStopPlayerPath() {
        this.stopPlayerPath = !this.stopPlayerPath;
    }

    public shortDescription(_: ActionTreeModel[], t: (key: string) => string) {
        return t(this.triggerOnEnter ? "content.answer_enter" : "content.answer_leave") + ": " + this.mapElement.elementId + " (" + this.mapElement.mapId + ")";
    }

    public exits() {
        return [this.exitTrigger];
    }

    public exitLabels() {
        return [this.triggerOnEnter ? "content.answer_enter" : "content.answer_leave"];
    }

    public title() {
        return "action_editor.node_trigger_location";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.LOCATION_TRIGGER;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.mapElement.isComplete();
    }
}

@model("actions/InteractionTriggerActionModel")
export class InteractionTriggerActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    iconType: prop<InteractionTriggerIconType>(InteractionTriggerIconType.Interact).withSetter(),
    triggerElement: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter(),
    triggeredActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop2;

    public shortDescription() {
        return this.triggerElement.mapId ? " (" + this.triggerElement.mapId + ")" : "";
    }

    public exits() {
        return [this.triggeredActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_trigger_interaction";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.INTERACTION_TRIGGER;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.triggerElement.isComplete();
    }
}

@model("actions/ConditionTriggerActionModel")
export class ConditionTriggerActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    condition: prop<ConditionModel>(() => new ConditionModel({})),
    triggeredActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(_: ActionTreeModel[], t: (key: string) => string) {
        return t(this.condition.displayString());
    }

    public exits() {
        return [this.triggeredActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_trigger_condition";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.CONDITION_TRIGGER;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.condition.isDataComplete;
    }
}

@model("actions/TreeEnterActionModel")
export class TreeEnterActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    name: prop<TranslatedString>(() => new TranslatedString({})),
    enterActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(rootActionTrees: ActionTreeModel[], t: (key: string) => string, languageKey: string) {
        return this.name.get(languageKey);
    }

    public exits() {
        return [this.enterActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_entry";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Tree Entry",
            translateableStrings: [{ label: "Label", translatedString: this.name }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.TREE_ENTER;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }
}

@model("actions/TreeExitActionModel")
export class TreeExitActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    name: prop<TranslatedString>(() => new TranslatedString({})),
    subTreeExit: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(rootActionTrees: ActionTreeModel[], t: (key: string) => string, languageKey: string) {
        return this.name.get(languageKey);
    }

    public exits() {
        return new Array<SelectableExitModel>();
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_exit";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Tree Exit",
            translateableStrings: [{ label: "Label", translatedString: this.name }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.TREE_EXIT;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }
}

@model("actions/StartDialogueActionModel")
export class StartDialogueActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    text: prop(() => new TranslatedString({})),
    speaker: prop<NPCReferenceModel>(() => new NPCReferenceModel({})).withSetter(),
    defaultExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    answers: prop<SelectableExitModel[]>(() => []).withSetter()
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    @modelAction
    public addAnswer() {
        const newAnswer = new SelectableExitModel(
            (this.answers.length === 0)
                ? { nextActions: [...this.defaultExit.nextActions] }
                : {}
        );
        this.answers.push(newAnswer);
        return newAnswer;
    }

    @modelAction
    public removeAnswer(index: number) {
        if (this.answers.length === 1) {
            this.defaultExit.nextActions = [...this.answers[0].nextActions];
        }
        this.answers.splice(index, 1);
    }

    public shortDescription(_: ActionTreeModel[], t: (key: string) => string, languageKey: string, getCharacter: (id: number) => CharacterConfigurationModel) {
        if (!this.speaker.npcId || this.speaker.npcId === "" || this.speaker.npcId === "-1") {
            return this.text.get(languageKey);
        }
        const character = getCharacter(+this.speaker.npcId);
        const speaker = character ? character.localizedName.get(languageKey) : this.speaker.npcId;
        return speaker + ": " + this.text.get(languageKey);
    }

    public exits() {
        if (this.answers.length === 0) {
            return [this.defaultExit];
        }
        return this.answers;
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_dialogue";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Dialogue",
            translateableStrings: [
                { label: "Text", translatedString: this.text },
                ...this.answers.map((answer, index) => ({ label: `Answer ${index + 1}`, translatedString: answer.value }))
            ]
        };
    }

    public nodeColor() {
        return ActionTreeColors.START_DIALOGUE;
    }

    @computed
    public get isDataComplete(): boolean {
        return !this.text?.isCurrentLanguageEmpty();
    }
}

@model("actions/SetVariableActionModel")
export class SetVariableActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    name: prop<string>("").withSetter(),
    scope: prop<ActionScope>(ActionScope.Tree).withSetter(),
    value: prop<string>("").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        return this.name + " = " + this.value;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_set_variable";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.SET_VARIABLE;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.name) && !isBlank(this.value);
    }
}

@model("actions/CopyAwarenessIntoVariableActionModel")
export class CopyAwarenessIntoVariableActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    name: prop<string>("").withSetter(),
    scope: prop<ActionScope>(ActionScope.Global),
    value: prop<string>("").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        return this.name + " = " + this.value;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_copy_awareness_into_variable";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.SET_VARIABLE;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.name && this.name.length > 0;
    }
}

@model("actions/SetTagActionModel")
export class SetTagActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    tag: prop<string>("").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return this.tag;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_set_tag";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.SET_TAG;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.tag);
    }
}

@model("actions/SetPlayStyleActionModel")
export class SetPlayStyleActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    playStyle: prop<string>("").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(_: ActionTreeModel[], t: (key: string) => string) {
        return (playStyles.includes(this.playStyle) ? t("content.play_style_" + this.playStyle) : this.playStyle);
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_set_play_style";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.SET_PLAYSTYLE;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.playStyle);
    }
}

@model("actions/ReceiveReputationActionModel")
export class ReceiveReputationActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    fraction: prop<string>(factions[0]).withSetter(),
    amount: prop<string>(reputationAmounts[0]).withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(_: ActionTreeModel[], t: (key: string) => string) {
        return (factions.includes(this.fraction) ? t("content.faction_" + this.fraction) : this.fraction) + " (" + t("content.reputation_amount_" + this.amount) + ")";
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_ok")];
    }

    public title() {
        return "action_editor.node_reputation_receive";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.RECEIVE_REPUTATION;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.fraction);
    }
}

@model("actions/ReceiveAwarenessActionModel")
export class ReceiveAwarenessActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    amount: prop<string>("0").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "+" + this.amount;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_ok")];
    }

    public title() {
        return "action_editor.node_awareness_receive";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.RECEIVE_AWARENESS;
    }

    @computed
    public get isDataComplete(): boolean {
        return isValidActionNumberValue(this.amount);
    }
}

@model("actions/ReceiveItemActionModel")
export class ReceiveItemActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    itemId: prop<string>("").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop2;

    public shortDescription() {
        return this.itemId;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_ok")];
    }

    public title() {
        return "action_editor.node_item_receive";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.RECEIVE_ITEM;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.itemId);
    }
}


export enum ItemSelectionMode {
    Item,
    // ItemWithOneTag mode has the same effect as when the 'ItemWithMultipleTags' or 'ItemWithOneOfMultipleTags'
    // is used with one tag ony. This mode still exists in addition to offer a single tag selection list in the UI.
    ItemWithOneTag,
    ItemWithMultipleTags,
    ItemWithOneOfMultipleTags
}

@model("actions/LooseItemActionModel")
export class LooseItemActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    selectionMode: prop<ItemSelectionMode>(ItemSelectionMode.Item).withSetter(),
    itemId: prop<string>("").withSetter(), // kept the name 'itemId', but this can also be a 'tag' or a 'list of tags'
    allItems: prop<boolean>(false).withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop2;

    public shortDescription() {
        return this.itemId;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_ok")];
    }

    public title() {
        return "action_editor.node_item_lose";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.LOOSE_ITEM;
    }

    /**
     * 'itemId' property is interpreted as a list of item tags in a 'tag' selection mode.
     */
    public itemTags() {
        return this.selectionMode !== ItemSelectionMode.Item ? this.itemId.split(" ") : [];
    }

    /**
     * Toggle if the player looses all the items that are selected if multipe items are selected by Tag(s)?
     */
    @modelAction
    public toggleAllItems() {
        this.allItems = !this.allItems;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.itemId);
    }
}

@model("actions/UseItemTriggerActionModel")
export class UseItemTriggerActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    itemId: prop<string>("").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {

    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public exitLabels(): string[] {
        return [];
    }

    public exits(): SelectableExitModel[] {
        return [this.nextActions];
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.itemId);
    }

    public shortDescription() {
        return this.itemId;
    }

    public title(): string {
        return "action_editor.node_item_use";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.USE_ITEM_TRIGGER;
    }

    /**
     * Searches in the assigned array of nodes for {@link UseItemTriggerActionModel} nodes with the assigned item id.
     * @param nodes The nodes to search in.
     * @param itemId The item id to search for.
     */
    public static findByItemId(nodes: Array<ActionModel>, itemId: string): Array<UseItemTriggerActionModel> {
        if (!nodes) return [];
        return nodes.filter(node => {
            const triggerNode = node as UseItemTriggerActionModel;
            return (triggerNode && triggerNode.itemId == itemId);
        }) as Array<UseItemTriggerActionModel>;
    }
}

@model("actions/ReceiveQuestTaskActionModel")
export class ReceiveQuestActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    questId: prop<string>("").withSetter(), // Short 'id' for quest selection lists (to uniquily identify a quest, the $modelId is used)
    description: prop(() => new TranslatedString({})),
    global: prop<boolean>(false), // This is used for visibility in quest selection lists in the editor. In the game, each Quest is unique (identified by the modelId of the ReceiveQuestTaskActionModel).
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop2;

    public shortDescription(_: ActionTreeModel[], t: (key: string) => string) {
        return this.questId + (this.global ? " (" + t("action_editor.property_scope_global") + ")" : "");
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_ok")];
    }

    public title() {
        return "action_editor.node_quest_start";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Receive Quest",
            translateableStrings: [{ label: "Quest Title", translatedString: this.description }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.RECEIVE_QUEST_TASK;
    }

    @modelAction
    public toggleGlobal() {
        this.global = !this.global;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.questId) && !this.description.isCurrentLanguageEmpty();
    }
}

@model("actions/QuestTaskFinishedActionModel")
export class FinishQuestActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    questId: prop<string>("").withSetter(), // Set to modelId of a ReceiveQuestActionModel
    text: prop(() => new TranslatedString({})),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop2;

    public shortDescription(rootActionTrees: ActionTreeModel[]) {
        for (const actionTree of rootActionTrees) {
            const quest = actionTree.questForId(this.questId);
            if (quest)
                return quest.questId;
        }

        return "";
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_quest_finish";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Finish Quest",
            translateableStrings: [{ label: "Message", translatedString: this.text }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.QUEST_TASK_FINISHED;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.questId) && !this.text.isCurrentLanguageEmpty();
    }
}

@model("actions/AbortQuestActionModel")
export class AbortQuestActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    questId: prop<string>("").withSetter(), // Set to modelId of a ReceiveQuestActionModel
    text: prop(() => new TranslatedString({})),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(rootActionTrees: ActionTreeModel[]) {
        for (const actionTree of rootActionTrees) {
            const quest = actionTree.questForId(this.questId);
            if (quest)
                return quest.questId;
        }

        return "";
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_quest_abort";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Abort Quest",
            translateableStrings: [{ label: "Message", translatedString: this.text }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.ABORT_QUEST;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.questId) && !this.text.isCurrentLanguageEmpty();
    }
}


@model("actions/ReceiveTaskActionModel")
export class ReceiveTaskActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    questId: prop<string>("").withSetter(),
    taskName: prop<string>("").withSetter(), // Short 'id' for task selection lists (to uniquily identify a task the $modelId is used)
    description: prop(() => new TranslatedString({})),
    location: prop<MapElementReferenceModel>().withSetter(), // By default, there is no location
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public isTaskWithLocation() {
        return !!this.location;
    }

    public shortDescription() {
        return this.taskName;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_ok")];
    }

    public title() {
        return this.isTaskWithLocation()
            ? "action_editor.node_task_start_location"
            : "action_editor.node_task_start_default";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Receive Task",
            translateableStrings: [{ label: "Task Title", translatedString: this.description }]
        };
    }

    public nodeColor() {
        return this.isTaskWithLocation()
            ? ActionTreeColors.RECEIVE_TASK_LOCATION
            : ActionTreeColors.RECEIVE_TASK_DEFAULT;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.questId) && !isBlank(this.taskName) && !this.description.isCurrentLanguageEmpty() && (!this.isTaskWithLocation() || this.location.isComplete());
    }
}

@model("actions/FinishTaskActionModel")
export class FinishTaskActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    questId: prop<string>("").withSetter(), // Set to modelId of a ReceiveQuestActionModel
    taskId: prop<string>("").withSetter(),  // Set to modelId of a ReceiveTaskActionModel
    text: prop(() => new TranslatedString({})),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(rootActionTrees: ActionTreeModel[]) {
        for (const actionTree of rootActionTrees) {
            const task = actionTree.taskForId(this.taskId);
            if (task)
                return task.taskName;
        }

        return "";
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_ok")];
    }

    public title() {
        return "action_editor.node_task_finish";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Finish Task",
            translateableStrings: [{ label: "Message", translatedString: this.text }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.FINISH_TASK;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.questId) && !isBlank(this.taskId) && !this.text.isCurrentLanguageEmpty();
    }
}

@model("actions/AbortTaskActionModel")
export class AbortTaskActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    questId: prop<string>("").withSetter(), // Set to modelId of a ReceiveQuestActionModel
    taskId: prop<string>("").withSetter(),  // Set to modelId of a ReceiveTaskActionModel
    text: prop(() => new TranslatedString({})),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(rootActionTrees: ActionTreeModel[]) {
        for (const actionTree of rootActionTrees) {
            const task = actionTree.taskForId(this.taskId);
            if (task)
                return task.taskName;
        }

        return "";
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_task_abort";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Abort Task",
            translateableStrings: [{ label: "Message", translatedString: this.text }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.ABORT_TASK;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.questId) && !isBlank(this.taskId) && !this.text.isCurrentLanguageEmpty();
    }
}

@model("actions/StartFightActionModel")
export class StartFightActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    enemies: prop<MapElementReferenceModel[]>(() => []),
    win: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    loose: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    @modelAction
    public addEnemy(index: number, newEnemy: MapElementReferenceModel) {
        this.enemies.splice(index, 0, newEnemy);
        return newEnemy;
    }

    @modelAction
    public removeEnemy(index: number) {
        this.enemies.splice(index, 1);
    }

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.win, this.loose];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_win"), t("content.answer_lose")];
    }

    public title() {
        return "action_editor.node_fight";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.START_FIGHT;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.enemies.some(e => e.isComplete());
    }
}

@model("actions/TriggerDamageInAreaActionModel")
export class TriggerDamageInAreaActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    mapElement: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter(),
    damage: prop<string>("1").withSetter(),
    delay: prop<string>("1").withSetter(),
    duration: prop<string>("1").withSetter(),
    exitNodeActivated: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    exitStartedTriggering: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    exitDamagedPlayer: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    exitFinishedTriggering: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return this.mapElement.elementId + " (" + this.mapElement.mapId + ")";
    }

    public exits() {
        return [this.exitNodeActivated, this.exitStartedTriggering, this.exitDamagedPlayer, this.exitFinishedTriggering];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.node_activated"), t("content.started_triggering"), t("content.damaged_player"), t("content.finished_triggering")];
    }

    public title() {
        return "action_editor.node_trigger_damage_in_area";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.TRIGGER_DAMAGE_ON_TILE;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.mapElement.isComplete();
    }
}

@model("actions/PlayAnimationModel")
export class PlayAnimationActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    animationElement: prop<AnimationElementReferenceModel>(() => new AnimationElementReferenceModel({})).withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    exitAnimationFinished: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        const { elementLabel, animationName, loop } = this.animationElement;
        return `${elementLabel} ${animationName + loop ? " (Loop)" : ""}`;
    }

    public exits() {
        if (this.animationElement?.loop)
            return [this.nextActions];

        return [this.nextActions, this.exitAnimationFinished];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        if (this.animationElement?.loop)
            return [t("content.answer_started")];

        return [t("content.answer_started"), t("content.answer_finished")];
    }

    public title() {
        return "action_editor.node_play_animation";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.PLAY_ANIMATION;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.animationElement.isComplete();
    }
}

@model("actions/MoveMapElementActionModel")
export class MoveMapElementActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    mapElement: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter(),
    targetMapMarker: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter(),
    teleport: prop<boolean>(false).withSetter(),
    directNextActions: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.directNextActions, this.nextActions];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_started"), t("content.answer_target_reached")];
    }

    public title() {
        return "action_editor.node_move_map_element";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.MOVE_MAP_ELEMENT;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.mapElement.isComplete() && this.targetMapMarker.isComplete() &&
            (this.mapElement.isTreeParameter() || this.targetMapMarker.isTreeParameter() || (this.mapElement.mapId === this.targetMapMarker.mapId));
    }
}

@model("actions/StopMapElementActionModel")
export class StopMapElementActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    mapElement: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter(),
    defaultExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.defaultExit];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_stop_map_element";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.STOP_MAP_ELEMENT;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.mapElement.isComplete();
    }
}


@model("actions/MovePlayerActionModel")
export class MovePlayerActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    targetMapMarker: prop<MapElementReferenceModel>(() => new MapElementReferenceModel({})).withSetter(),
    transitionTime: prop<string>("1").withSetter(), // time in seconds
    teleport: prop<boolean>(false), // should we teleport with transition screen? (instead of actually moving or transporting as fast as possible when switching maps)
    directNextActions: prop<SelectableExitModel>(() => new SelectableExitModel({})), // Executed instantly after this node
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({})) // Executed when the player reached the target
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        return "Map ID: " + this.targetMapMarker.mapId.toString();
    }

    public exits() {
        return [this.directNextActions, this.nextActions];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_started"), t("content.answer_target_reached")];
    }

    public title() {
        return "action_editor.node_load_map";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.LOAD_MAP;
    }

    @modelAction
    public toggleTeleport() {
        this.teleport = !this.teleport;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.targetMapMarker.isComplete();
    }
}

@model("actions/ConditionActionModel")
export class ConditionActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    condition: prop<ConditionModel>(() => new ConditionModel({})),
    conditionTrue: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    conditionFalse: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop3;

    public isPlayStyleCondition() {
        return this.condition.conditionType === ConditionType.PlayStyle
            && this.condition.variableName === playStyles[1]
            && this.condition.value === "1";
    }

    public shortDescription(_: ActionTreeModel[], t: (key: string) => string) {
        return this.isPlayStyleCondition() ? "" : t(this.condition.displayString());
    }

    public exits() {
        return [this.conditionTrue, this.conditionFalse];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return this.isPlayStyleCondition()
            ? [t("content.play_style_Spy"), t("content.play_style_Fighter")]
            : [t("content.answer_true"), t("content.answer_false")];
    }

    public title() {
        return this.isPlayStyleCondition()
            ? "action_editor.node_condition_play_style"
            : "action_editor.node_condition";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return this.isPlayStyleCondition()
            ? ActionTreeColors.CONDITION_PLAYSTYLE
            : ActionTreeColors.CONDITION;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.isPlayStyleCondition() || this.condition.isDataComplete;
    }
}

@model("actions/ModifyPlayerHealthModel")
export class ModifyPlayerHealthModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    amount: prop<string>("0").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "" + this.amount;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_modify_player_health";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.MODIFY_PLAYER_HEALTH;
    }

    @computed
    public get isDataComplete(): boolean {
        return isValidActionNumberValue(this.amount) && (+this.amount != 0);
    }
}


@model("actions/ResetAreaActionModel")
export class ResetAreaActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_reset_area";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.RESET_AREA;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }
}

@model("actions/TossCoinActionModel")
export class TossCoinActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    heads: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    tails: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.heads, this.tails];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_heads"), t("content.answer_tails")];
    }

    public title() {
        return "action_editor.node_toss_coin";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.TOSS_COIN;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }
}

export enum CalculateVariableOperator {
    Plus,
    Minus,
    Multiply,
    Divide
}

export const calculateVariableOperatorLiterals = [
    " + ",
    " - ",
    " * ",
    " / "
];

@model("actions/CalculateVariableActionModel")
export class CalculateVariableActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    variable1: prop<string>("").withSetter(),
    operator: prop<CalculateVariableOperator>(CalculateVariableOperator.Plus).withSetter(),
    variable2: prop<string>("").withSetter(),
    variableResult: prop<string>("").withSetter(),
    scope: prop<ActionScope>(ActionScope.Tree).withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        return this.variable1 + calculateVariableOperatorLiterals[this.operator] + this.variable2 + " = " + this.variableResult;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_calculate_variable";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.CALCULATE_VARIABLE;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.variable1) && !isBlank(this.variable2) && !isBlank(this.variableResult);
    }
}

@model("actions/ShowTextActionModel")
export class ShowTextActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    text: prop(() => new TranslatedString({})),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(_rootActionTrees: ActionTreeModel[], _t: (key: string) => string, languageKey: string) {
        return this.text.get(languageKey);
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_show_text";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Show Text",
            translateableStrings: [{ label: "Text", translatedString: this.text }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.SHOW_TEXT;
    }

    @computed
    public get isDataComplete(): boolean {
        return !this.text?.isCurrentLanguageEmpty();
    }
}

@model("actions/ShowImageActionModel")
export class ShowImageActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    imageId: prop<number>(0).withSetter(),
    imageShown: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    imageClosed: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        return "" + this.imageId;
    }

    public exits() {
        return [this.imageShown, this.imageClosed];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.image_shown"), t("content.image_closed")];
    }

    public title() {
        return "action_editor.node_show_image";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.SHOW_IMAGE;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.imageId > 0;
    }
}

@model("actions/StartTimerActionModel")
export class StartTimerActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    time: prop<string>("0").withSetter(), // time in seconds
    countDown: prop<boolean>(true), // Is the timer a count down or should it count up?
    visible: prop<boolean>(true), // is the timer shown in the ui?
    text: prop(() => new TranslatedString({})), // text to show above the timer
    started: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    finished: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    @modelAction
    public toggleCountDown() {
        this.countDown = !this.countDown;
    }

    @modelAction
    public toggleVisible() {
        this.visible = !this.visible;
    }

    public shortDescription() {
        return "" + this.time;
    }

    public exits() {
        return [this.started, this.finished];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_started"), t("content.answer_finished")];
    }

    public title() {
        return "action_editor.node_start_timer";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Start Timer",
            translateableStrings: [{ label: "Label", translatedString: this.text }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.START_TIMER;
    }

    @computed
    public get isDataComplete(): boolean {
        return isValidActionNumberValue(this.time);
    }
}

@model("actions/StartActActionModel")
export class StartActActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    act: prop<string>("2").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "" + this.act;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return [];
    }

    public title() {
        return "action_editor.node_start_act";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.START_ACT;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }
}

@model("actions/SetReputationStatusActionModel")
export class SetReputationStatusActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    status: prop(() => new TranslatedString({})),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(_rootActionTrees: ActionTreeModel[], _t: (key: string) => string, languageKey: string) {
        return this.status.get(languageKey);
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return [];
    }

    public title() {
        return "action_editor.node_set_reputation_status";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Set Reputation Status",
            translateableStrings: [{ label: "Message", translatedString: this.status }]
        };
    }

    public nodeColor() {
        return ActionTreeColors.SET_REPUTATION_STATUS;
    }

    @computed
    public get isDataComplete(): boolean {
        return !this.status.isCurrentLanguageEmpty();
    }
}

@model("actions/TreeParamterActionModel")
export class TreeParamterActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    name: prop<string>("").withSetter(),
    description: prop(() => new TranslatedString({})),
    tutorial: prop(() => new TranslatedString({})),
    dividingLine: prop<boolean>(false),
    showOnNode: prop<boolean>(false),
    allowBlankValue: prop<boolean>(false),
    value: prop<ValueModel>(() => new TranslatedStringValueModel({})).withSetter()
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription(_: ActionTreeModel[], t: (key: string) => string) {
        return this.name + " (" + t(this.value.title()) + ")";
    }

    public exits() {
        return new Array<SelectableExitModel>();
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_tree_parameter";
    }

    public translatableEntityData(): TranslateableEntityData {
        const additionalTranslatedStrings = new Array<TranslatableString>();

        if (this.value instanceof TranslatedStringValueModel) {
            additionalTranslatedStrings.push({ label: "Text Value", translatedString: this.value.value });
        }

        return {
            entity: this,
            label: "Tree Parameter",
            translateableStrings: [
                { label: "Label", translatedString: this.description },
                { label: "Tutorial", translatedString: this.tutorial },
                ...additionalTranslatedStrings
            ]
        };
    }

    @modelAction
    public toggleDividingLine() {
        this.dividingLine = !this.dividingLine;
    }

    @modelAction
    public toggleShowOnNode() {
        this.showOnNode = !this.showOnNode;
    }

    @modelAction
    public toggleAllowBlankValue() {
        this.allowBlankValue = !this.allowBlankValue;
    }

    public nodeColor() {
        return ActionTreeColors.TREE_PARAMETER;
    }

    @computed
    public get isDataComplete(): boolean {
        return !isBlank(this.name) && !this.description.isCurrentLanguageEmpty();
    }

    public isValueSet(): boolean {
        return this.value.isSet();
    }
}

@model("actions/TreePropertiesActionModel")
export class TreePropertiesActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    minimumComplexity: prop<number>(EditorComplexity.Production).withSetter(),
    localizedName: prop<TranslatedString>(() => new TranslatedString({})),
    tags: prop<string[]>(() => []).withSetter(),
    description: prop(() => new TranslatedString({})),
    tutorial: prop(() => new TranslatedString({})),
    complexityGate: prop<number>(EditorComplexity.Production).withSetter(),
    color: prop<string>("").withSetter(),
    icon: prop<string>("").withSetter(),
    excludeFromTranslations: prop<boolean>(false)
}) implements ActionModel {
    public readonly isActionModel = true;

    public shortDescription(_rootActionTrees: ActionTreeModel[], _t: (key: string) => string, languageKey: string) {
        return this.description.get(languageKey);
    }

    public exits() {
        return new Array<SelectableExitModel>();
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_tree_properties";
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Tree Properties",
            translateableStrings: [
                { label: "Description", translatedString: this.description },
                { label: "Tutorial", translatedString: this.tutorial },
                { label: "Label", translatedString: this.localizedName }
            ]
        };
    }

    public nodeColor() {
        return ActionTreeColors.TREE_PROPERTIES;
    }

    @modelAction
    public toggleExcludeFromTranslations() {
        this.excludeFromTranslations = !this.excludeFromTranslations;
    }

    @computed
    public get isDataComplete(): boolean {
        return !this.localizedName.isCurrentLanguageEmpty();
    }
}

@model("actions/CommentActionModel")
export class CommentActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    color: prop<string>("").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({}))
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop2;

    public shortDescription() {
        return this.comment;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_comment";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return this.color ? this.color : ActionTreeColors.COMMENT;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }
}

@model("actions/DebugStartActionModel")
export class DebugStartActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    initialize: prop<boolean>(false),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({})),
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_debug_start";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.DEBUG_START;
    }

    @modelAction
    public toggleInitialize() {
        this.initialize = !this.initialize;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }
}

@model("actions/SetPlayerInputActionModel")
export class SetPlayerInputActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    uiVisible: prop<boolean>(true).withSetter(),
    movementEnabled: prop<boolean>(true).withSetter()
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_set_input";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.SET_PLAYER_INPUT_ACTION;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }
}

@model("actions/SetCameraActionModel")
export class SetCameraActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    onStartExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    onEndExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    targetZoomFactor: prop<number>(-1).withSetter(),
    returnToMainCamera: prop<boolean>(true).withSetter(),
    targetLocation: prop<MapElementReferenceModel>().withSetter(),
    cameraMovementSpeedFactor: prop<number>(0.5).withSetter(),
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.onStartExit, this.onEndExit];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_started"), t("content.answer_finished")];
    }

    public title() {
        return "action_editor.node_set_camera";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.CAMERA_NODES;
    }

    @computed
    public get isDataComplete(): boolean {
        return !this.targetLocation || this.targetLocation.isComplete();
    }

    public isTargetSet() {
        return this.targetLocation && this.targetLocation.isComplete();
    }
}

@model("actions/ShakeCameraActionModel")
export class ShakeCameraActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    onStartExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    onEndExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    intensity: prop<number>(0.2).withSetter(),
    durationSeconds: prop<number>(0.5).withSetter(),
    fadeOut: prop<boolean>(true).withSetter()
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.onStartExit, this.onEndExit];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_started"), t("content.answer_finished")];
    }

    public title() {
        return "action_editor.node_shake_camera";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.CAMERA_NODES;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }

}

@model("actions/FadeCameraActionModel")
export class FadeCameraActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    onStartExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    onEndExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    fadeIn: prop<boolean>(true).withSetter(),
    withDuration: prop<boolean>(true).withSetter(),
}) implements ActionModel {

    public static readonly FADE_STEP = 0.005;
    public static readonly FADE_INTERVAL_MILLIS = 10;

    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.onStartExit, this.onEndExit];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_started"), t("content.answer_finished")];
    }

    public title() {
        return "action_editor.node_fade_overlay";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.CAMERA_NODES;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }

}

@model("actions/SimpleCutSceneActionModel")
export class SimpleCutSceneActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    onEndExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    onStartExit: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    textItems: prop<CutSceneTextModel[]>(() => null).withSetter(),
    animation: prop<AnimationPropertiesValueModel>(null).withSetter()
}) implements ActionModel {

    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.onStartExit, this.onEndExit];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        return [t("content.answer_started"), t("content.answer_finished")];
    }

    public title() {
        return "action_editor.node_cut_scene";
    }

    public translatableEntityData(): TranslateableEntityData {
        if (!this.textItems || this.textItems.length === 0)
            return null;

        return {
            entity: this,
            label: "Cutscene",
            translateableStrings: this.textItems.map((item, index) => ({ label: `Cutscene Text ${index + 1}`, translatedString: item.text }))
        };
    }

    public nodeColor() {
        return ActionTreeColors.CUTSCENE;
    }

    @computed
    public get isDataComplete(): boolean {
        if ((!this.textItems || this.textItems.length === 0) && !this.animation)
            return false;

        return (!this.textItems || this.textItems.every(item => !item.text.isCurrentLanguageEmpty())) && (!this.animation || this.animation.isSet());
    }

    @modelAction
    public addTextItem() {
        this.textItems.push(new CutSceneTextModel({}));
    }

    @modelAction
    public removeTextItem(index: number) {
        this.textItems.splice(index, 1);
    }
}

@model("actions/SetEmergencyLightingActionModel")
export class SetEmergencyLightingActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    activate: prop<boolean>(true).withSetter()
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return "";
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return "action_editor.node_start_emergency_lighting";
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    public nodeColor() {
        return ActionTreeColors.START_EMERGENCY_LIGHTING;
    }

    @computed
    public get isDataComplete(): boolean {
        return true;
    }

    @modelAction
    public toggleActivate() {
        this.activate = !this.activate;
    }
}

@model("actions/PlaySoundActionModel")
export class PlaySoundActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    exitFinished: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    filePath: prop<ParsedPath>(null).withSetter(),
    treeParameter: prop<string>(null).withSetter(),
    sourcePosition: prop<MapElementReferenceModel>().withSetter(),
    rangeInTiles: prop<number>(3).withSetter(),
    loopWhileInRange: prop<boolean>(false).withSetter()
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Workshop4;

    public shortDescription() {
        return "";
    }

    public exits() {
        if (!this.hasExitFinish()) return [this.nextActions];
        return [this.nextActions, this.exitFinished];
    }

    public exitLabels(t: (key: string) => string, languageKey: string): string[] {
        if (!this.hasExitFinish()) return [t("content.answer_started")];
        return [t("content.answer_started"), t("content.answer_finished")];
    }

    public hasExitFinish(): boolean {
        return (!this.loopWhileInRange || !this.sourcePosition);
    }

    public title() {
        return "action_editor.node_play_sound";
    }

    public nodeColor() {
        return ActionTreeColors.PLAY_ANIMATION;
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.filePath && (!this.sourcePosition || this.sourcePosition.isComplete());
    }
}

@model("actions/DeactivateNodeGroupActionModel")
export class DeactivateNodeGroupActionModel extends Model({
    position: prop<ActionPositionModel>(() => new ActionPositionModel({})),
    comment: prop<string>("").withSetter(),
    deactivationGroupId: prop<string>(() => "").withSetter(),
    nextActions: prop<SelectableExitModel>(() => new SelectableExitModel({})),
    targetDeactivationGroupId: prop<string>(() => "").withSetter(),
}) implements ActionModel {
    public readonly isActionModel = true;
    public readonly minimumComplexity = EditorComplexity.Production;

    public shortDescription() {
        return this.targetDeactivationGroupId;
    }

    public exits() {
        return [this.nextActions];
    }

    public exitLabels(): string[] {
        return null;
    }

    public title() {
        return /*t*/"action_editor.node_deactivate_node_group";
    }

    public nodeColor() {
        return ActionTreeColors.DEACTIVATE_NODE_GROUP;
    }

    public translatableEntityData(): TranslateableEntityData {
        return null;
    }

    @computed
    public get isDataComplete(): boolean {
        return this.targetDeactivationGroupId.length > 0;
    }
}