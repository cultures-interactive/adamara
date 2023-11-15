import { ActionModel } from "../action/ActionModel";
import { EnemyCombatPresetModel } from "../combat/EnemyCombatPresetModel";
import { ItemModel } from "../game/ItemModel";
import { TranslatedString } from "../game/TranslatedString";
import { AnimationAssetModel } from "../resources/AnimationAssetModel";
import { CharacterConfigurationModel } from "../resources/CharacterConfigurationModel";
import { TileAssetModel } from "../resources/TileAssetModel";
import { MakeshiftTranslationSystemCategoryDataModel } from "./MakeshiftTranslationSystemCategoryDataModel";

export interface TranslatableString {
    label: string;
    translatedString: TranslatedString;
}

export type TranslatableEntity = ActionModel | EnemyCombatPresetModel | ItemModel | CharacterConfigurationModel | TileAssetModel | AnimationAssetModel | MakeshiftTranslationSystemCategoryDataModel;

export interface TranslateableEntityData {
    entity: TranslatableEntity;
    label: string;
    translateableStrings: Array<TranslatableString>;
}
