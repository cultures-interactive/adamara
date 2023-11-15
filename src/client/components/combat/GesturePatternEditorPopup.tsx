import React from 'react';
import { observer } from "mobx-react-lite";
import { Popup, PopupHeadline } from '../shared/Popup';
import { undoableDeselectGesturePattern } from '../../stores/undo/operation/CombatGesturePatternSelectionOp';
import { GesturePatternEditor } from './GesturePatternEditor';
import { UiConstants } from '../../data/UiConstants';
import { useTranslation } from 'react-i18next';
import { combatEditorStore } from '../../stores/CombatEditorStore';

export const GesturePatternEditorPopup: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { selectedGesturePattern } = combatEditorStore;
    if (!selectedGesturePattern)
        return null;

    return (
        <Popup
            closePopup={undoableDeselectGesturePattern}
            zIndex={UiConstants.Z_INDEX_COMBAT_GESTURE_PATTERN_EDITOR_POPUP}
            windowStyle={{
                minWidth: "800px"
            }}
        >
            <PopupHeadline>{t("editor.combat_configuration_gesture_pattern")}</PopupHeadline>
            <GesturePatternEditor gesturePattern={selectedGesturePattern} isGlobalPattern={true} />
        </Popup>
    );
});
