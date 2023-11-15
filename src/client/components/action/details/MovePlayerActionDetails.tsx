import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { MovePlayerActionModel } from "../../../../shared/action/ActionModel";
import { NumberActionDetail } from './components/NumberActionDetail';
import { BooleanActionDetail } from './components/BooleanActionDetail';
import { MapElementSelectionDetail } from './components/MapElementSelectionDetail';
import { MapElementFilter } from "../../../helper/MapElementFilter";

interface MovePlayerActionDetailsProps {
    action: MovePlayerActionModel;
}

export const MovePlayerActionDetails: React.FunctionComponent<MovePlayerActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <div>
            <MapElementSelectionDetail name={t("action_editor.property_map_target")}
                selectedElement={action.targetMapMarker}
                elementSetter={action.setTargetMapMarker.bind(action)}
                parameterTypes={["actions/MapMarkerValueModel"]}
                getSelectableElements={MapElementFilter.filterMapMarkerLabels}
            />
            <BooleanActionDetail name={t("action_editor.property_map_teleport_player")} checked={action.teleport} toggle={action.toggleTeleport.bind(action)} />
            {action.teleport && <NumberActionDetail name={t("action_editor.property_map_transition_time")} value={action.transitionTime} valueSetter={action.setTransitionTime.bind(action)} />}
        </div>
    );
});