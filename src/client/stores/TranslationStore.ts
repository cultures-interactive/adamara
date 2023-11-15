import { makeAutoObservable, runInAction } from "mobx";
import { getTreeParent } from "../../shared/action/ActionTreeModel";
import { EnemyCombatPresetModel } from "../../shared/combat/EnemyCombatPresetModel";
import { Gender } from "../../shared/definitions/other/Gender";
import { ItemModel } from "../../shared/game/ItemModel";
import { TranslatedString } from "../../shared/game/TranslatedString";
import { AugmentedPatch } from "../../shared/helper/mobXHelpers";
import { AnimationAssetModel, AnimationType } from "../../shared/resources/AnimationAssetModel";
import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { TileAssetModel } from "../../shared/resources/TileAssetModel";
import { MakeshiftTranslationSystemCategoryDataModel } from "../../shared/translation/MakeshiftTranslationSystemCategoryDataModel";
import { MakeshiftTranslationSystemDataModel } from "../../shared/translation/MakeshiftTranslationSystemDataModel";
import { editorClient } from "../communication/EditorClient";
import { PatchTracker } from "../communication/editorClient/PatchTracker";
import { animationLoader } from "../helper/AnimationLoader";
import { TranslationAction, translationActions, TranslationData } from "../helper/translationHelpers";
import { combatStore } from "./CombatStore";
import { errorStore } from "./ErrorStore";
import { getTags } from "./MapRelatedStore";
import { sharedStore } from "./SharedStore";

export class TranslationStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public makeshiftTranslationSystemData: MakeshiftTranslationSystemDataModel;

    public translationData: TranslationData;
    public isImporting: boolean;
    public showingImportingPopup: boolean;
    public importResults: TranslationImportResults;

    private patchTracker = new PatchTracker();

    public setMakeshiftTranslationSystemData(makeshiftTranslationSystemData: MakeshiftTranslationSystemDataModel) {
        if (this.makeshiftTranslationSystemData === makeshiftTranslationSystemData)
            return;

        if (this.makeshiftTranslationSystemData)
            editorClient.stopTrackingMakeshiftTranslationSystemData();

        this.makeshiftTranslationSystemData = makeshiftTranslationSystemData;

        if (this.makeshiftTranslationSystemData)
            editorClient.startTrackingMakeshiftTranslationSystemData();
    }

    public async addMissingMakeshiftTranslationSystemEntries(baseLanguageKey: string) {
        const skinNames = new Set<string>();
        for (const animation of sharedStore.animationAssets.values()) {
            if (animation.isType(AnimationType.BodyType) || animation.isType(AnimationType.NPC)) {
                const animationData = await animationLoader.loadAnimationDataCached(animation.id);
                for (const skin of animationData.skins) {
                    skinNames.add(skin.name);
                }
            }
        }

        runInAction(() => {
            const tileTags = getTags(Array.from(sharedStore.tileAssets.values()))
                .filter(tag => tag.type === "Tag")
                .map(tag => tag.tag)
                .sort((a, b) => a.localeCompare(b, baseLanguageKey));

            for (const tileTag of tileTags) {
                if (!this.makeshiftTranslationSystemData.tileTags.has(tileTag)) {
                    this.makeshiftTranslationSystemData.tileTags.add(baseLanguageKey, tileTag);
                }
            }

            const actionTreeTemplateTags = Array.from(new Set(sharedStore.actionTreeTemplates.map(t => t.treePropertiesAction.tags).flat()));
            for (const actionTreeTemplateTag of actionTreeTemplateTags) {
                if (!this.makeshiftTranslationSystemData.actionEditorTemplateTags.has(actionTreeTemplateTag)) {
                    this.makeshiftTranslationSystemData.actionEditorTemplateTags.add(baseLanguageKey, actionTreeTemplateTag);
                }
            }

            for (const skinName of skinNames) {
                const separatorIndex = skinName.lastIndexOf('/');

                const className = skinName.substring(0, separatorIndex);
                let variantName = skinName.substring(separatorIndex + 1);

                if (variantName.startsWith(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix1)) {
                    variantName = variantName.replace(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix1, "");
                } else if (variantName.startsWith(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix2)) {
                    variantName = variantName.replace(CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix2, "");
                }

                if (!this.makeshiftTranslationSystemData.characterSkinVariantClasses.has(className)) {
                    this.makeshiftTranslationSystemData.characterSkinVariantClasses.add(baseLanguageKey, className);
                }

                if (!this.makeshiftTranslationSystemData.characterSkinVariantOptions.has(variantName)) {
                    this.makeshiftTranslationSystemData.characterSkinVariantOptions.add(baseLanguageKey, variantName);
                }
            }
        });
    }

    public get actionCount() {
        const actionCount = new Map(translationActions.map(action => [action, 0]));
        for (const translation of this.translationData.translations) {
            for (const genderData of translation.translationsByGender.values()) {
                if (genderData.targetLanguageStringChanged) {
                    actionCount.set(genderData.action, actionCount.get(genderData.action) + 1);
                }
            }
        }
        return actionCount;
    }

    public get commitActionCount() {
        let count = 0;
        for (const translation of this.translationData.translations) {
            for (const genderData of translation.translationsByGender.values()) {
                if (genderData.targetLanguageStringChanged && (genderData.action === TranslationAction.Commit)) {
                    count++;
                }
            }
        }
        return count;
    }

    public get mayCommitChanges() {
        return (this.commitActionCount > 0) && !this.isImporting;
    }

    public setTranslationData(translationData: TranslationData) {
        this.translationData = translationData;
    }

    public closeImportingPopup() {
        this.showingImportingPopup = false;
    }

    public async commitChanges() {
        if (this.isImporting)
            throw new Error("Cannot commitChanges while an import is already running");

        try {
            this.isImporting = true;
            this.importResults = new TranslationImportResults();
            this.showingImportingPopup = true;

            let lineCount = 0;
            for (const { translationsByGender } of this.translationData.translations) {
                for (const { action } of translationsByGender.values()) {
                    if (action === TranslationAction.Commit) {
                        lineCount++;
                    }
                }
            }

            this.importResults.totalLineCount = lineCount;

            const { translations, targetLanguageKey } = this.translationData;

            for (let i = 0; i < translations.length; i++) {
                const { entity, translationsByGender, translatedString } = translations[i];

                for (const [gender, translationByGender] of translationsByGender) {
                    const { action, importTargetLanguageString } = translationByGender;

                    if (action !== TranslationAction.Commit)
                        continue;

                    try {
                        if (translatedString.getForGender(targetLanguageKey, gender, false) !== importTargetLanguageString) {
                            if (entity instanceof EnemyCombatPresetModel) {
                                const { patch, inversePatch } = await this.commitTranslationsAndGetPatches(combatStore.config, translatedString, targetLanguageKey, gender, importTargetLanguageString);
                                await editorClient.submitCombatConfigurationChanges([patch], [inversePatch], false);

                            } else if (entity instanceof ItemModel) {
                                const { patch, inversePatch } = await this.commitTranslationsAndGetPatches(entity, translatedString, targetLanguageKey, gender, importTargetLanguageString);
                                await editorClient.submitItemChanges(entity.id, patch, inversePatch);

                            } else if (entity instanceof CharacterConfigurationModel) {
                                const { patch, inversePatch } = await this.commitTranslationsAndGetPatches(entity, translatedString, targetLanguageKey, gender, importTargetLanguageString);
                                await editorClient.submitCharacterConfigurationChanges(entity.id, [patch], [inversePatch]);

                            } else if (entity instanceof TileAssetModel) {
                                await this.commitTranslationsAndGetPatches(entity, translatedString, targetLanguageKey, gender, importTargetLanguageString);
                                await editorClient.updateTileAssetWithPromise(entity, null, null, null, null);

                            } else if (entity instanceof AnimationAssetModel) {
                                const { patch, inversePatch } = await this.commitTranslationsAndGetPatches(entity, translatedString, targetLanguageKey, gender, importTargetLanguageString);
                                await editorClient.submitAnimationChanges(entity.id, [patch], [inversePatch], false);

                            } else if (entity instanceof MakeshiftTranslationSystemCategoryDataModel) {
                                const { patch, inversePatch } = await this.commitTranslationsAndGetPatches(this.makeshiftTranslationSystemData, translatedString, targetLanguageKey, gender, importTargetLanguageString);
                                await editorClient.submitMakeshiftTranslationSystemDataChanges(patch, inversePatch);

                            } else { // entity is any ActionModel
                                const parentTree = getTreeParent(entity);
                                const { patch, inversePatch } = await this.commitTranslationsAndGetPatches(parentTree, translatedString, targetLanguageKey, gender, importTargetLanguageString);
                                await editorClient.submitActionTreeChanges(parentTree.$modelId, [patch], [inversePatch], false);
                            }
                        }

                        runInAction(() => {
                            this.importResults.addSuccessfulLines(1);
                            translationByGender.currentTargetLanguageString = importTargetLanguageString;
                            translationByGender.targetLanguageStringChanged = false;
                        });
                    } catch (e) {
                        this.importResults.addFailedLines(1);
                        errorStore.addErrorFromErrorObject(e);
                    }
                }
            }
        } finally {
            runInAction(() => {
                this.isImporting = false;
            });
        }
    }

    private commitTranslationsAndGetPatches(
        targetObject: any,
        translatedString: TranslatedString,
        targetLanguageKey: string,
        gender: Gender,
        importTargetLanguageString: string
    ) {
        return new Promise<{ patch: AugmentedPatch; inversePatch: AugmentedPatch; }>((resolve, reject) => {
            try {
                let patch: AugmentedPatch = null;
                let inversePatch: AugmentedPatch = null;

                this.patchTracker.startTracking(
                    targetObject,
                    (changePatch, changeInversePatch) => {
                        if (patch !== null) {
                            console.error("Second patch detected when only one was expected", { targetObject, patch, inversePatch, changePatch, changeInversePatch });

                            this.patchTracker.stopTracking();
                            reject(new Error("Second patch detected when only one was expected"));
                        }

                        patch = changePatch;
                        inversePatch = changeInversePatch;
                    }
                );

                translatedString.setForGender(targetLanguageKey, gender, importTargetLanguageString);

                this.patchTracker.stopTracking();
                resolve({ patch, inversePatch });
            } catch (e) {
                this.patchTracker.stopTracking();
                reject(e);
            }
        });
    }
}

class TranslationImportResults {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public totalLineCount = 0;
    public successfulLines = 0;
    public failedLines = 0;

    public get progressPercentage100Floored() {
        return Math.floor(this.totalProcessedLines / this.totalLineCount * 100);
    }

    public get totalProcessedLines() {
        return this.successfulLines + this.failedLines;
    }

    public addSuccessfulLines(count: number) {
        this.successfulLines += count;
    }

    public addFailedLines(count: number) {
        this.failedLines += count;
    }
}

export const translationStore = new TranslationStore();