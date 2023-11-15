import React from "react";
import { observer } from "mobx-react-lite";
import { BooleanActionDetail } from "./components/BooleanActionDetail";
import { SetPlayerInputActionModel } from "../../../../shared/action/ActionModel";
import { useTranslation } from "react-i18next";

interface Props {
    action: SetPlayerInputActionModel;
}

export const SetPlayerInputActionDetail: React.FunctionComponent<Props> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <>
            <BooleanActionDetail name={t("action_editor.node_set_ui_visible")} checked={action.uiVisible} toggle={() => action.setUiVisible(!action.uiVisible)} />
            <BooleanActionDetail name={t("action_editor.node_set_movement_enabled")} checked={action.movementEnabled} toggle={() => action.setMovementEnabled(!action.movementEnabled)} />
        </>
    );
});