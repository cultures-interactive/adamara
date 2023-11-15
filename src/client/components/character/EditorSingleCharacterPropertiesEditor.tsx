import React, { ChangeEvent } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { CharacterEditorStore } from "../../stores/CharacterEditorStore";
import { useTranslation } from "react-i18next";
import { InvalidCriteriaMessage } from "../shared/InvalidCriteriaMessage";
import { Input } from "../shared/Input";
import { wrapIterator } from "../../../shared/helper/IterableIteratorWrapper";
import { EnemyCombatPresetSelector } from "../combat/EnemyCombatPresetSelector";
import { gameStore } from "../../stores/GameStore";
import { sharedStore } from "../../stores/SharedStore";
import { editorStore } from "../../stores/EditorStore";

const CharacterData = styled.div`
    align-self: flex-start;
    flex-grow: 1;
`;

const CharacterField = styled.div`
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;
`;

const InputText = styled(Input)`
    width: 250px;
`;

const InputNumber = styled(Input)`
    width: 70px;
`;

const InfoMessage = styled(InvalidCriteriaMessage)`
    color: white;
`;

export interface Props {
    store: CharacterEditorStore;
}

export const EditorSingleCharacterPropertiesEditor: React.FunctionComponent<Props> = observer(({ store }) => {
    const { t } = useTranslation();
    const { selectedCharacterConfiguration } = store;

    function onTextFieldUpdate(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>, handler: (value: string) => void) {
        handler(e.target.value);
    }

    const { textReferenceId, id } = selectedCharacterConfiguration;

    const textReferenceIdIsDuplicate = (
        (textReferenceId?.length > 0) &&
        wrapIterator(sharedStore.characterConfigurations.values())
            .some(c => (c.id !== id) && (c.textReferenceId === textReferenceId))
    );

    const { languageKey } = gameStore;
    const nameWithoutFallback = selectedCharacterConfiguration.localizedName.get(languageKey, false);

    const nameIsDuplicateForCurrentLanguage = (
        nameWithoutFallback &&
        wrapIterator(sharedStore.characterConfigurations.values())
            .some(c => (c.id !== id) && (c.localizedName.get(languageKey, false) === nameWithoutFallback))
    );

    return (
        <CharacterData>
            <CharacterField>
                {t("editor.translated_name")}
                <InputText
                    type="text"
                    value={selectedCharacterConfiguration.localizedName.get(languageKey, false)}
                    placeholder={selectedCharacterConfiguration.localizedName.get(languageKey, true)}
                    onChange={e => onTextFieldUpdate(e, value => selectedCharacterConfiguration.localizedName.set(languageKey, value))}
                />
                {nameIsDuplicateForCurrentLanguage && (
                    <InfoMessage>
                        {t("editor.character_config_name_duplicate")}
                    </InfoMessage>
                )}
            </CharacterField>
            {editorStore.isMainGameEditor && (
                <CharacterField>
                    {t("editor.text_reference_id")}
                    <InputText
                        type="text"
                        value={selectedCharacterConfiguration.textReferenceId}
                        onChange={e => onTextFieldUpdate(e, value => selectedCharacterConfiguration.setTextReferenceId(value))}
                        className={textReferenceIdIsDuplicate && "invalid"}
                    />
                    <InvalidCriteriaMessage>
                        {textReferenceIdIsDuplicate && t("editor.warning_duplicate_text_reference_id")}
                    </InvalidCriteriaMessage>
                </CharacterField>
            )}
            <CharacterField>
                <label>
                    <Input
                        type="checkbox"
                        checked={selectedCharacterConfiguration.isEnemy}
                        onChange={e => selectedCharacterConfiguration.setIsEnemy(!selectedCharacterConfiguration.isEnemy)}
                    />
                    &nbsp;{t("editor.character_config_is_enemy")}
                </label>
            </CharacterField>
            {selectedCharacterConfiguration.isEnemy && (
                <>
                    <CharacterField>
                        {t("editor.character_config_enemy_health")}
                        <InputNumber
                            type="number"
                            min={0}
                            step={1}
                            value={selectedCharacterConfiguration.enemyHealth}
                            onChange={e => onTextFieldUpdate(e, value => selectedCharacterConfiguration.setEnemyHealth(+value))}
                        />
                    </CharacterField>
                    <CharacterField>
                        {t("editor.character_config_enemy_damage")}
                        <InputNumber
                            type="number"
                            min={0}
                            step={1}
                            value={selectedCharacterConfiguration.enemyDamage}
                            onChange={e => onTextFieldUpdate(e, value => selectedCharacterConfiguration.setEnemyDamage(+value))}
                        />
                    </CharacterField>
                    <CharacterField>
                        {t("editor.character_config_enemy_combat_preset")}
                        <EnemyCombatPresetSelector
                            currentModelId={selectedCharacterConfiguration.enemyCombatPresetModelId}
                            setModelId={value => selectedCharacterConfiguration.setEnemyCombatPresetModelId(value)}
                        />
                    </CharacterField>
                </>
            )}
        </CharacterData>
    );
});
