import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { translationActions } from '../../helper/translationHelpers';
import { translationStore } from '../../stores/TranslationStore';

const TranslationStats: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const { translationData } = translationStore;
    const { sourceLanguageKey, targetLanguageKey } = translationData;
    let unchangedTranslations = 0;
    let translationsWithoutConflict = 0;
    let conflictsInSourceLanguage = 0;
    let conflictsInTargetLanguage = 0;
    let translationsForDeletedElements = 0;

    for (const { stillExists, translationsByGender } of translationData.translations) {
        for (const { targetLanguageStringChanged, sourceLanguageStringChanged, currentTargetLanguageString, importTargetLanguageString } of translationsByGender.values()) {
            if (targetLanguageStringChanged) {
                if (stillExists) {
                    if (sourceLanguageStringChanged) {
                        conflictsInSourceLanguage++;
                    }

                    const targetLanguageConflict = targetLanguageStringChanged && Boolean(currentTargetLanguageString);
                    if (targetLanguageConflict) {
                        conflictsInTargetLanguage++;
                    }

                    if (!sourceLanguageStringChanged && !targetLanguageConflict) {
                        translationsWithoutConflict++;
                    }
                } else {
                    translationsForDeletedElements++;
                }
            } else if (importTargetLanguageString) {
                unchangedTranslations++;
            }
        }
    }

    return (
        <>
            <li>{t("translation.stats_new_texts")}: {translationsWithoutConflict + conflictsInSourceLanguage + conflictsInTargetLanguage}</li>
            <ul>
                <li>{t("translation.stats_without_conflict")}: {translationsWithoutConflict}</li>
                <li>{t("translation.stats_conflict_in_source_language", { sourceLanguage: t("translation.language_" + sourceLanguageKey) })}: {conflictsInSourceLanguage}</li>
                <li>{t("translation.stats_conflict_in_target_language")} {t("translation.language_" + targetLanguageKey)}: {conflictsInTargetLanguage}</li>
            </ul>
            <li>{t("translation.stats_filled_but_unchanged_texts")}: {unchangedTranslations}</li>
            <li>{t("translation.stats_translations_for_deleted_entities")}: {translationsForDeletedElements}</li>
            <li>{t("translation.stats_actions")}:</li>
        </>
    );
});

const ActionStats: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const { actionCount } = translationStore;

    return (
        <ul>
            <ul>
                {translationActions.map(action => <li key={action}>{t("translation.action_" + action)}: {actionCount.get(action)}</li>)}
            </ul>
        </ul>
    );
});

export const TranslationDataStatsDisplay: React.FunctionComponent = () => {
    const { t } = useTranslation();

    return (
        <>
            <ul>
                <TranslationStats />
                <ActionStats />
            </ul>
        </>
    );
};