import { TFunction } from "i18next";
import { ActionModel } from "../../shared/action/ActionModel";
import { actionEditorStore } from "../stores/ActionEditorStore";
import { gameStore } from "../stores/GameStore";
import { sharedStore } from "../stores/SharedStore";

export function getActionShortDescriptionForActionEditor(action: ActionModel, t: TFunction) {
    return action.shortDescription([actionEditorStore.currentRootActionTree, sharedStore.mainGameRootActionTree], t, gameStore.languageKey, id => sharedStore.characterConfigurations.get(id));
}