import { model, Model, modelAction, objectMap, prop } from "mobx-keystone";
import { getSharedCurrentLanguageKey } from "../data/dataAccess";
import { fallbackLanguages } from "../data/languages";
import { Gender } from "../definitions/other/Gender";
import { isBlank } from "../helper/generalHelpers";

@model("game/TranslatedString")
export class TranslatedString extends Model({
    text: prop(() => objectMap<string>()),
    comment: prop<string>("").withSetter()
}) {
    /**
     * Gets the translation for the supplied language key.
     * @param languageKey
     * @param useFallbackLanguages
     * If false: returns the translation, or an empty string if it doesn't exist.
     * If true, returns the first version that exists:
     * - languageKey + languageKeyPostfix
     * - fallbackLanguageKey + languageKeyPostfix, returned in the format "[en: Fallback value]"
     * @param languageKeyPostfix
     * @returns
     */
    public get(languageKey: string, useFallbackLanguages: boolean = true, languageKeyPostfix: string = "") {
        const value = this.text.get(languageKey + languageKeyPostfix);

        if (!value && useFallbackLanguages) {
            for (const fallbackLanguage of fallbackLanguages) {
                if (languageKey === fallbackLanguage)
                    continue;

                const fallbackValue = this.text.get(fallbackLanguage + languageKeyPostfix);
                if (fallbackValue) {
                    return `[${fallbackLanguage}: ${fallbackValue}]`;
                }
            }
        }

        return value || "";
    }

    /**
     * Gets a gendered translation for the languageKey.
     * @param languageKey
     * @param gender
     * @param useFallbackGenderAndLanguages
     * If false: returns the gendered version, or an empty string if it doesn't exist.
     * If true, returns the first version that exists:
     * - languageKey + gender postfix
     * - languageKey (without gender postfix)
     * - fallbackLanguageKey (without gender postfix), returned in the format "[en: Fallback value]"
     * - an empty string
     * @returns
     */
    public getForGender(languageKey: string, gender: Gender, useFallbackGenderAndLanguages: boolean) {
        const exactMatchValue = this.text.get(languageKey + gender);
        if (exactMatchValue || !useFallbackGenderAndLanguages)
            return exactMatchValue || "";

        return this.get(languageKey, useFallbackGenderAndLanguages);
    }

    public isCurrentLanguageEmpty() {
        const currentLanguageKey = getSharedCurrentLanguageKey();
        return this.isLanguageEmpty(currentLanguageKey);
    }

    public isLanguageEmpty(languageKey: string) {
        return isBlank(this.text.get(languageKey));
    }

    @modelAction
    public set(languageKey: string, value: string) {
        this.text.set(languageKey, value);
    }

    @modelAction
    public setForGender(languageKey: string, gender: Gender, value: string) {
        this.text.set(languageKey + gender, value);
    }
}
