import { computed } from "mobx";
import { Model, model, modelAction, objectMap, prop, SnapshotOutOf } from "mobx-keystone";
import { TranslatedString } from "../game/TranslatedString";
import { wrapIterator } from "../helper/IterableIteratorWrapper";
import { TranslatableEntity, TranslateableEntityData } from "./TranslationDataTypes";

@model('translation/MakeshiftTranslationSystemCategoryDataModel')
export class MakeshiftTranslationSystemCategoryDataModel extends Model({
    translations: prop(() => objectMap<TranslatedString>())
}) {
    @computed
    public get count() {
        return this.translations.size;
    }

    @modelAction
    public add(languageKey: string, keyAndInitialValue: string) {
        const translatedString = new TranslatedString({});
        translatedString.set(languageKey, keyAndInitialValue);
        this.translations.set(keyAndInitialValue, translatedString);
    }

    @modelAction
    public delete(key: string) {
        this.translations.delete(key);
    }

    public has(key: string) {
        return this.translations.has(key);
    }

    public getTranslation(languageKey: string, tileTagName: string) {
        return this.translations.get(tileTagName)?.get(languageKey, true) ?? tileTagName;
    }

    public translatableEntityData(label: string): TranslateableEntityData {
        return {
            entity: this,
            label,
            translateableStrings: wrapIterator(this.translations.values()).map(
                translatedString => ({ label: "Label", translatedString })
            )
        } as TranslateableEntityData;
    }
}

export type MakeshiftTranslationSystemCategoryDataSnapshot = SnapshotOutOf<MakeshiftTranslationSystemCategoryDataModel>;