import { computed } from "mobx";
import { Model, model, prop, SnapshotOutOf } from "mobx-keystone";
import { MakeshiftTranslationSystemCategoryDataModel } from "./MakeshiftTranslationSystemCategoryDataModel";
import { TranslateableEntityData } from "./TranslationDataTypes";

@model('translation/MakeshiftTranslationSystemData')
export class MakeshiftTranslationSystemDataModel extends Model({
    tileTags: prop(() => new MakeshiftTranslationSystemCategoryDataModel({})),
    actionEditorTemplateTags: prop(() => new MakeshiftTranslationSystemCategoryDataModel({})),
    characterSkinVariantClasses: prop(() => new MakeshiftTranslationSystemCategoryDataModel({})),
    characterSkinVariantOptions: prop(() => new MakeshiftTranslationSystemCategoryDataModel({}))
}) {
    @computed
    public get totalCount() {
        return this.tileTags.count +
            this.actionEditorTemplateTags.count +
            this.characterSkinVariantClasses.count +
            this.characterSkinVariantOptions.count;
    }

    public translatableEntityDataArray(): TranslateableEntityData[] {
        return [
            this.tileTags.translatableEntityData("Tile Category"),
            this.actionEditorTemplateTags.translatableEntityData("Action Editor Template Category"),
            this.characterSkinVariantClasses.translatableEntityData("Character Configuration Class"),
            this.characterSkinVariantOptions.translatableEntityData("Character Configuration Option")
        ];
    }
}

export type MakeshiftTranslationSystemDataSnapshot = SnapshotOutOf<MakeshiftTranslationSystemDataModel>;