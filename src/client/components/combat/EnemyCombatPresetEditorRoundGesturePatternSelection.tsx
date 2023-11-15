import React, { useState } from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';
import { GesturePatternPreview } from './GesturePatternPreview';
import { EnemyCombatPresetRoundModel } from '../../../shared/combat/EnemyCombatPresetRoundModel';
import { undoableCombatConfigurationCreateAndSelectGesturePattern } from '../../stores/undo/operation/CombatConfigurationSubmitChangesOp';
import { Popup } from '../shared/Popup';
import { UiConstants } from '../../data/UiConstants';
import { undoableSelectGesturePattern } from '../../stores/undo/operation/CombatGesturePatternSelectionOp';
import { combatStore } from '../../stores/CombatStore';

const Container = styled.div`
    display: flex;
    flex-wrap: wrap;
    padding: 0 0.25em;

    & > * {
        margin: 0.5em 0.25em;
    }
`;

interface SelectableGesturePatternProps {
    selected: boolean;
}

const SelectableGesturePattern = styled.div<SelectableGesturePatternProps>`
    position: relative;
    border: 4px solid ${props => props.selected ? "blue" : "white"};
`;

const AddGesturePatternButton = styled.button`
    width: 100px;
    height: 56.25px;
`;

const EditGesturePatternButton = styled.button`
    position: absolute;
    right: 0;
    top: 0;
`;

interface Props {
    round: EnemyCombatPresetRoundModel;
    closePopup: () => void;
}

export const EnemyCombatPresetEditorRoundGesturePatternSelection: React.FunctionComponent<Props> = observer(({ round, closePopup }) => {
    const [showEditButtons, setShowEditButtons] = useState(false);

    return (
        <Popup
            closePopup={closePopup}
            zIndex={UiConstants.Z_INDEX_ENEMY_COMBAT_PRESET_EDITOR_GESTURE_SELECTION_POPUP}
            windowStyle={{
                maxWidth: "636px"
            }}
        >
            <Container>
                {
                    combatStore.config.gesturePatterns.map(pattern => (
                        <SelectableGesturePattern
                            key={pattern.$modelId}
                            selected={round.hasPlayerDefensePatternId(pattern.$modelId)}
                            onClick={() => round.togglePlayerDefensePatternId(pattern.$modelId)}
                        >
                            <GesturePatternPreview
                                gesturePattern={pattern}
                                width={100}
                            />
                            {showEditButtons && (
                                <EditGesturePatternButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        undoableSelectGesturePattern(pattern.$modelId);
                                    }}>
                                    <FontAwesomeIcon icon={faEdit} />
                                </EditGesturePatternButton>
                            )}
                        </SelectableGesturePattern>
                    ))
                }
                <SelectableGesturePattern selected={false}>
                    <AddGesturePatternButton onClick={() => undoableCombatConfigurationCreateAndSelectGesturePattern()}><FontAwesomeIcon icon={faPlus} /></AddGesturePatternButton>
                </SelectableGesturePattern>

                <SelectableGesturePattern selected={false}>
                    <label><input type="checkbox" checked={showEditButtons} onChange={() => setShowEditButtons(!showEditButtons)} /> <FontAwesomeIcon icon={faEdit} /></label>
                </SelectableGesturePattern>
            </Container>
        </Popup>
    );
});
