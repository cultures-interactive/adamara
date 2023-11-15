import React from 'react';
import { observer } from "mobx-react-lite";
import { Popup, PopupHeadline } from '../shared/Popup';
import { UiConstants } from '../../data/UiConstants';
import { EnemyCombatPresetEditor } from './EnemyCombatPresetEditor';
import { undoableDeselectEnemyCombatPreset } from '../../stores/undo/operation/CombatEnemyCombatPresetSelectionOp';
import { useTranslation } from 'react-i18next';
import { combatEditorStore } from '../../stores/CombatEditorStore';

export const EnemyCombatPresetEditorPopup: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { selectedEnemyCombatPreset } = combatEditorStore;
    if (!selectedEnemyCombatPreset)
        return null;

    return (
        <Popup
            closePopup={undoableDeselectEnemyCombatPreset}
            zIndex={UiConstants.Z_INDEX_ENEMY_COMBAT_PRESET_EDITOR_POPUP}
            windowStyle={{
                minWidth: "600px"
            }}
        >
            <PopupHeadline>{t("editor.combat_enemy_combat_preset")}</PopupHeadline>
            <EnemyCombatPresetEditor enemyCombatPreset={selectedEnemyCombatPreset} />
        </Popup>
    );
});
