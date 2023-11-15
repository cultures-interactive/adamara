import React from 'react';
import { EnemyCombatPresetEditorPopup } from '../combat/EnemyCombatPresetEditorPopup';
import { GesturePatternEditorPopup } from '../combat/GesturePatternEditorPopup';

export const EditorPopupWindows: React.FunctionComponent = () => {
    return (
        <>
            <EnemyCombatPresetEditorPopup />
            <GesturePatternEditorPopup />
        </>
    );
};
