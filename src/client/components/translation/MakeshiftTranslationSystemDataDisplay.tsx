import React, { useState } from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { LanguageDropdown } from './LanguageDropdown';
import { TranslatedString } from '../../../shared/game/TranslatedString';
import { wrapIterator } from '../../../shared/helper/IterableIteratorWrapper';
import { Heading1Base, Heading2Base } from '../shared/Heading';
import { translationStore } from '../../stores/TranslationStore';
import { ObjectMap } from 'mobx-keystone';
import { gameStore } from '../../stores/GameStore';
import { action } from 'mobx';
import { MakeshiftTranslationSystemCategoryDataModel } from '../../../shared/translation/MakeshiftTranslationSystemCategoryDataModel';
import { errorStore } from '../../stores/ErrorStore';
import { Overlay } from '../shared/PopupComponents';

const Table = styled.table`
    border-collapse: collapse;

    tr {
        border: 1px solid lightgrey;
    }

    th, td {
        padding: 5px 10px;
    }
`;

const TitleRow = styled.tr`
`;

interface MakeshiftTranslationSystemsDisplayProps {
    titleKey: string;
    category: MakeshiftTranslationSystemCategoryDataModel;
}

const MakeshiftTranslationSystemCategoryDisplay: React.FunctionComponent<MakeshiftTranslationSystemsDisplayProps> = observer(({
    titleKey, category
}) => {
    const { t } = useTranslation();

    const removeTranslation = action((id: string) => {
        category.delete(id);
    });

    return (
        <Table>
            <tbody>
                <TitleRow>
                    <td colSpan={3}><Heading2Base>{t(titleKey)}</Heading2Base></td>
                </TitleRow>
                <tr>
                    <td></td>
                    <td>{t("translation.language_" + gameStore.languageKey)}</td>
                    <td></td>
                </tr>
                {wrapIterator(category.translations.entries()).map(([id, translatedString]) => (
                    <tr key={id}>
                        <td>{id}</td>
                        <td>
                            <input
                                type="text"
                                value={translatedString.get(gameStore.languageKey, false)}
                                placeholder={translatedString.get(gameStore.languageKey, true)}
                                onChange={({ target }) => translatedString.set(gameStore.languageKey, target.value)}
                            />
                        </td>
                        <td>
                            <button onClick={() => removeTranslation(id)}>
                                {t("translation.makeshift_translation_system_remove")}
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
});

export const MakeshiftTranslationSystemDataDisplay: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const [baseLanguage, setBaseLanguage] = useState("de");
    const [addingInProgress, setAddingInProgress] = useState(false);

    const {
        tileTags,
        actionEditorTemplateTags,
        characterSkinVariantClasses,
        characterSkinVariantOptions,
        totalCount
    } = translationStore.makeshiftTranslationSystemData;

    const addMissing = async () => {
        try {
            setAddingInProgress(true);
            await translationStore.addMissingMakeshiftTranslationSystemEntries(baseLanguage);
        } catch (e) {
            errorStore.addErrorFromErrorObject(e);
        } finally {
            setAddingInProgress(false);
        }
    };

    return (
        <>
            {addingInProgress && <Overlay />}
            <Heading1Base>{t("translation.makeshift_translation_system")}</Heading1Base>
            <br />
            <div>
                {t("translation.makeshift_translation_system_description", { buttonName: t("translation.makeshift_translation_system_add_missing") })}
            </div>
            <br />
            <div>
                {t("translation.makeshift_translation_system_add_missing_base_language")}:
                &nbsp;
                <LanguageDropdown value={baseLanguage} setValue={setBaseLanguage} />
                &nbsp;
                <button onClick={addMissing}>
                    {t("translation.makeshift_translation_system_add_missing")}
                </button>
            </div>
            <hr />
            <h2>{t("translation.makeshift_translation_system_current_count")}</h2>
            <ul>
                <li>{t("translation.makeshift_translation_system_tile_tags")}: {tileTags.count}</li>
                <li>{t("translation.makeshift_translation_system_action_editor_template_tags")}: {actionEditorTemplateTags.count}</li>
                <li>{t("translation.makeshift_translation_system_character_skin_variant_classes")}: {characterSkinVariantClasses.count}</li>
                <li>{t("translation.makeshift_translation_system_character_skin_variant_names")}: {characterSkinVariantOptions.count}</li>
                <li>{t("translation.makeshift_translation_system_total_count")}: {totalCount}</li>
            </ul>
            <hr />
            <MakeshiftTranslationSystemCategoryDisplay
                titleKey={/*t*/"translation.makeshift_translation_system_tile_tags"}
                category={tileTags}
            />
            <br />
            <MakeshiftTranslationSystemCategoryDisplay
                titleKey={/*t*/"translation.makeshift_translation_system_action_editor_template_tags"}
                category={actionEditorTemplateTags}
            />
            <br />
            <MakeshiftTranslationSystemCategoryDisplay
                titleKey={/*t*/"translation.makeshift_translation_system_character_skin_variant_classes"}
                category={characterSkinVariantClasses}
            />
            <br />
            <MakeshiftTranslationSystemCategoryDisplay
                titleKey={/*t*/"translation.makeshift_translation_system_character_skin_variant_names"}
                category={characterSkinVariantOptions}
            />
        </>
    );
});