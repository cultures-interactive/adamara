import React from 'react';
import { observer } from "mobx-react-lite";
import { undoableCombatConfigurationCreateAndSelectEnemyCombatPreset } from '../../stores/undo/operation/CombatConfigurationSubmitChangesOp';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faPlus } from '@fortawesome/free-solid-svg-icons';
import { undoableSelectEnemyCombatPreset } from '../../stores/undo/operation/CombatEnemyCombatPresetSelectionOp';
import { combatStore } from '../../stores/CombatStore';
import { gameStore } from '../../stores/GameStore';
import { editorStore } from '../../stores/EditorStore';

interface Props {
    currentModelId: string;
    setModelId: (modelId: string) => void;
}

export const EnemyCombatPresetSelector: React.FunctionComponent<Props> = observer(({ currentModelId, setModelId }) => {
    if (!combatStore.config)
        return null;

    return (
        <div>
            <select value={currentModelId} onChange={e => setModelId(e.target.value)}>
                <option></option>
                {combatStore.config.enemyCombatPresets.map(preset => (
                    <option key={preset.$modelId} value={preset.$modelId}>{preset.name.get(gameStore.languageKey, true)}</option>
                ))}
            </select>
            {editorStore.isMainGameEditor && (
                <>
                    <button disabled={!combatStore.config.findEnemyCombatPreset(currentModelId)} onClick={() => undoableSelectEnemyCombatPreset(currentModelId)}><FontAwesomeIcon icon={faEdit} /></button>
                    <button onClick={() => undoableCombatConfigurationCreateAndSelectEnemyCombatPreset()}><FontAwesomeIcon icon={faPlus} /></button>
                </>
            )}
        </div>
    );
});