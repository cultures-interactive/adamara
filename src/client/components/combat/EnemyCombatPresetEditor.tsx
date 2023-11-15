import React from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusCircle } from '@fortawesome/free-solid-svg-icons';
import { EnemyCombatPresetModel } from '../../../shared/combat/EnemyCombatPresetModel';
import { undoableCombatConfigurationDeleteEnemyCombatPreset } from '../../stores/undo/operation/CombatConfigurationSubmitChangesOp';
import { EnemyCombatPresetEditorRound } from './EnemyCombatPresetEditorRound';
import { gameStore } from '../../stores/GameStore';

const AddRoundContainer = styled.div`
    margin: 1em 0;
`;

const AddRoundContainerButton = styled.button`
    width: 100%;
`;

const DeleteButtonContainer = styled.div`
    display: flex;
    justify-content: flex-end;

    button {
        color: red;
    }
`;

interface Props {
    enemyCombatPreset: EnemyCombatPresetModel;
}

export const EnemyCombatPresetEditor: React.FunctionComponent<Props> = observer(({ enemyCombatPreset }) => {
    const { t } = useTranslation();

    const { languageKey } = gameStore;

    return (
        <div key={enemyCombatPreset.$modelId}>
            <div>
                {t("editor.translated_name")}:&nbsp;
                <input
                    value={enemyCombatPreset.name.get(languageKey, false)}
                    placeholder={enemyCombatPreset.name.get(languageKey, true)}
                    onChange={e => enemyCombatPreset.name.set(languageKey, e.target.value)}
                />
            </div>
            {
                enemyCombatPreset.rounds.map((round, index) => (
                    <EnemyCombatPresetEditorRound
                        key={round.$modelId}
                        round={round}
                        enemyCombatPreset={enemyCombatPreset}
                        roundIndex={index}
                    />
                ))
            }
            <AddRoundContainer>
                <AddRoundContainerButton onClick={() => enemyCombatPreset.addRound()}>{t("editor.combat_enemy_combat_preset_add_round")}</AddRoundContainerButton>
            </AddRoundContainer>
            <hr />
            <DeleteButtonContainer>
                <button onClick={() => undoableCombatConfigurationDeleteEnemyCombatPreset(enemyCombatPreset)}><FontAwesomeIcon icon={faMinusCircle} /> {t("editor.combat_enemy_combat_preset_delete")}</button>
            </DeleteButtonContainer>
        </div>
    );
});
