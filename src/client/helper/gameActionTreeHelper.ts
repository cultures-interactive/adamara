import { TFunction } from "i18next";
import { ActionModel, StartDialogueActionModel, ShowTextActionModel, ReceiveQuestActionModel, FinishQuestActionModel, AbortQuestActionModel, ReceiveTaskActionModel, FinishTaskActionModel, AbortTaskActionModel, ReceiveItemActionModel, LooseItemActionModel, ItemSelectionMode } from "../../shared/action/ActionModel";
import { TranslatedString } from "../../shared/game/TranslatedString";
import { NPCReferenceModel } from "../../shared/action/NPCReferenceModel";
import { resolvePotentialNPCTreeParameter } from "./treeParameterHelpers";
import { getCharacterNameForCurrentLanguage } from "./displayHelpers";
import { ActionTreeModel } from "../../shared/action/ActionTreeModel";
import { gameStore } from "../stores/GameStore";
import { itemStore } from "../stores/ItemStore";

export interface ActionExtraInformation {
    itemId?: string; // Used for ReceiveItemActionModel
    itemsIds?: string[]; // Used for LooseItemActionModel
}

/**
 * Legacy implementation to get text from the assigned action model.
 * @param action The action model.
 * @param t Translation method.
 */
export function getTextOfAction(action: ActionModel, extraInformation: ActionExtraInformation, t: TFunction) {
    let translatedString: TranslatedString;
    if (action instanceof StartDialogueActionModel) {
        translatedString = action.text;
    } else if (action instanceof ShowTextActionModel) {
        translatedString = action.text;
    } else if (action instanceof ReceiveQuestActionModel) {
        translatedString = action.description;
    } else if (action instanceof FinishQuestActionModel) {
        translatedString = action.text;
    } else if (action instanceof AbortQuestActionModel) {
        translatedString = action.text;
    } else if (action instanceof ReceiveTaskActionModel) {
        translatedString = action.description;
    } else if (action instanceof FinishTaskActionModel) {
        translatedString = action.text;
    } else if (action instanceof AbortTaskActionModel) {
        translatedString = action.text;
    } else if (action instanceof ReceiveItemActionModel) {
        if (!extraInformation.itemId)
            throw new Error("getTextOfAction for ReceiveItemActionModel needs extraInformation.itemId to be set.");

        translatedString = itemStore.getItem(extraInformation.itemId)?.name;
        if (!translatedString)
            return t("action_editor.item_not_found");
    } else if (action instanceof LooseItemActionModel) {
        if (!extraInformation.itemsIds)
            throw new Error("getTextOfAction for LooseItemActionModel needs extraInformation.itemIds to be set.");

        return extraInformation.itemsIds
            .map(itemId => itemStore.getItem(itemId)?.name?.getForGender(gameStore.languageKey, gameStore.playerGender, true))
            .join(", ");
    } else {
        // TODO: This is prototype UI, eventually the description text will only be used in the editor.
        return action.shortDescription([gameStore.gameEngine.rootActionTree], t, gameStore.languageKey, null);
    }

    return translatedString.getForGender(gameStore.languageKey, gameStore.playerGender, true);
}

/**
 * Legacy implementation to get the NPC name of the assigned Action...
 * @param dialog The Action.
 * @param rootActionTree The root tree.
 * @param t Translation method.
 */
export function findDialogSpeaker(dialog: ActionModel, rootActionTree: ActionTreeModel, t: TFunction): string {
    if (dialog instanceof StartDialogueActionModel) {
        if (dialog.speaker instanceof NPCReferenceModel) {
            const npcReference = resolvePotentialNPCTreeParameter(dialog.speaker, dialog, rootActionTree);
            if (npcReference.npcId === "-1")
                return "";

            return getCharacterNameForCurrentLanguage(+npcReference.npcId);
        } else if (typeof (dialog.speaker) === "string") {
            return `[Noch nicht als Character gesetzt] ${dialog.speaker}: `;
        } else {
            console.log(dialog, dialog.speaker);
            throw new Error("Not implemented");
        }
    } else {
        // Prototype UI - eventually title() should only be used for nodes in the action editor
        return t(dialog.title());
    }
}