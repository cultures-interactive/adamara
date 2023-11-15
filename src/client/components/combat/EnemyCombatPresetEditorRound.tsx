import React, { useState } from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinusCircle, faSearchPlus } from '@fortawesome/free-solid-svg-icons';
import { GesturePatternPreview } from './GesturePatternPreview';
import { EnemyCombatPresetModel } from '../../../shared/combat/EnemyCombatPresetModel';
import { EnemyCombatPresetRoundModel } from '../../../shared/combat/EnemyCombatPresetRoundModel';
import { CombatPhaseLength } from '../../../shared/combat/CombatPhaseLength';
import { EnemyCombatPresetEditorRoundGesturePatternSelection } from './EnemyCombatPresetEditorRoundGesturePatternSelection';
import { undoableClearShowEnemyCombatPresetGesturePatternSelection, undoableSetShowEnemyCombatPresetGesturePatternSelection } from '../../stores/undo/operation/CombatSetShowEnemyCombatPresetGesturePatternSelectionOp';
import { combatEditorStore } from '../../stores/CombatEditorStore';
import { combatStore } from '../../stores/CombatStore';

const Container = styled.div`
    /*border: 1px solid lightgray;*/
    margin: 1em 0.5em;
    padding: 0.5em;
    box-shadow: 0 0 0.5em 0 #555;
`;

const FlexLeftRightContainer = styled.div`
    display: flex;
    justify-content: space-between;
`;

const NameContainer = styled.div`
    flex-shrink: 0;
`;

const GesturePatternContainer = styled.div`
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    
    margin-left: 2em;
    margin-bottom: 0.5em;
    padding: 0 0.25em;
    max-width: 440px;
    min-height: calc(56.25px + 1em);

    & > * {
        margin: 0.5em 0.25em;
    }
`;

const NoGesturesSelected = styled.div`
    user-select: none;
    color: red;
`;

const EditGesturePatternsButton = styled.button`
    margin: 0.5em 0.25em;
    height: 56.25px;
`;

interface Props {
    round: EnemyCombatPresetRoundModel;
    enemyCombatPreset: EnemyCombatPresetModel;
    roundIndex: number;
}

export const EnemyCombatPresetEditorRound: React.FunctionComponent<Props> = observer(({ round, enemyCombatPreset, roundIndex }) => {
    const { t } = useTranslation();
    const sortedGesturePatterns = combatStore.config.gesturePatterns.filter(pattern => round.hasPlayerDefensePatternId(pattern.$modelId));

    return (
        <Container>
            <FlexLeftRightContainer>
                <NameContainer>
                    {t("editor.combat_enemy_combat_preset_round", { round: roundIndex + 1 })}
                    &nbsp;
                    <button onClick={() => enemyCombatPreset.removeRound(roundIndex)}><FontAwesomeIcon icon={faMinusCircle} /></button>
                </NameContainer>
                <GesturePatternContainer onClick={() => undoableSetShowEnemyCombatPresetGesturePatternSelection(round)}>
                    {
                        sortedGesturePatterns.map(pattern => (
                            <GesturePatternPreview
                                key={pattern.$modelId}
                                gesturePattern={pattern}
                                width={100}
                            />
                        ))
                    }
                    {(sortedGesturePatterns.length === 0) && <NoGesturesSelected>{t("editor.combat_enemy_combat_preset_round_no_gestures_selected")}</NoGesturesSelected>}
                </GesturePatternContainer>
                <EditGesturePatternsButton onClick={() => undoableSetShowEnemyCombatPresetGesturePatternSelection(round)}><FontAwesomeIcon icon={faSearchPlus} /></EditGesturePatternsButton>
                {(combatEditorStore.showEnemyCombatPresetGesturePatternSelectionRoundModelId === round.$modelId) && <EnemyCombatPresetEditorRoundGesturePatternSelection round={round} closePopup={undoableClearShowEnemyCombatPresetGesturePatternSelection} />}
            </FlexLeftRightContainer>
            <FlexLeftRightContainer>
                <select value={round.playerAttackPhaseLength} onChange={e => round.setPlayerAttackPhaseLength(+e.target.value)}>
                    <option value={CombatPhaseLength.Short}>{t("editor.combat_enemy_combat_preset_round_short_attack_phase")}</option>
                    <option value={CombatPhaseLength.Long}>{t("editor.combat_enemy_combat_preset_round_long_attack_phase")}</option>
                </select>
                <select value={round.playerDefensePhaseLength} onChange={e => round.setPlayerDefensePhaseLength(+e.target.value)}>
                    <option value={CombatPhaseLength.Short}>{t("editor.combat_enemy_combat_preset_round_short_defense_phase")}</option>
                    <option value={CombatPhaseLength.Long}>{t("editor.combat_enemy_combat_preset_round_long_defense_phase")}</option>
                </select>
            </FlexLeftRightContainer>
        </Container>
    );
});
