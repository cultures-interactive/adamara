import React from 'react';
import { observer } from "mobx-react-lite";
import { DebugStartActionModel } from "../../../../shared/action/ActionModel";
import { BooleanActionDetail } from "./components/BooleanActionDetail";
import { undoableSetDebugStartNodeOp } from '../../../stores/undo/operation/ActionEditorDebugStartNodeChangeOp';
import { gameStore } from '../../../stores/GameStore';
import { useTranslation } from 'react-i18next';

interface DebugStartActionDetailsProps {
    action: DebugStartActionModel;
}

export const DebugStartActionDetails: React.FunctionComponent<DebugStartActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <>
            <BooleanActionDetail name={t("action_editor.property_debug_start")} checked={gameStore.debugStartNodeModelId === action?.$modelId} toggle={() => undoableSetDebugStartNodeOp(action)} />
            <BooleanActionDetail name={t("action_editor.property_debug_initialize")} checked={action.initialize} toggle={action.toggleInitialize.bind(action)} />
        </>
    );
});