import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { MoveMapElementActionModel } from '../../../../shared/action/ActionModel';
import { MapElementSelectionDetail } from './components/MapElementSelectionDetail';
import { MapElementFilter } from "../../../helper/MapElementFilter";
import { BooleanActionDetail } from './components/BooleanActionDetail';
import { ElementGroup, ElementLabel } from './components/BaseElements';

interface MoveMapElementActionDetailsProps {
    action: MoveMapElementActionModel;
}

export const MoveMapElementActionDetails: React.FunctionComponent<MoveMapElementActionDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <>
            <ElementGroup>
                <ElementLabel>
                    <input type="radio" checked={action.teleport} onChange={() => action.setTeleport(true)} />&nbsp;
                    {t("action_editor.property_map__move_teleport")}
                </ElementLabel>
                <ElementLabel>
                    <input type="radio" checked={!action.teleport} onChange={() => action.setTeleport(false)} />&nbsp;
                    {t("action_editor.property_map_move_pathfinding")}
                </ElementLabel>
            </ElementGroup>
            {
                action.teleport && <MapElementSelectionDetail
                    name={t("action_editor.property_map_element_from_teleport")}
                    selectedElement={action.mapElement}
                    elementSetter={action.setMapElement.bind(action)}
                    parameterTypes={["actions/MapMarkerValueModel", "actions/NPCOnMapValueModel", "actions/EnemyOnMapValueModel", "actions/AnimationElementValueModel", "actions/AreaTriggerValueModel"]}
                    getSelectableElements={(map, t) => [
                        ...MapElementFilter.filterMapMarkerLabels(map),
                        ...MapElementFilter.filterNPCLabels(map),
                        ...MapElementFilter.filterAnimationLabels(map),
                        ...MapElementFilter.filterIndividualAreaTriggerLabels(map)]
                    }
                />
            }
            {
                !action.teleport && <MapElementSelectionDetail
                    name={t("action_editor.property_map_element_from_pathfinding")}
                    selectedElement={action.mapElement}
                    elementSetter={action.setMapElement.bind(action)}
                    parameterTypes={["actions/NPCOnMapValueModel", "actions/EnemyOnMapValueModel"]}
                    getSelectableElements={(map, t) => [...MapElementFilter.filterNPCLabels(map)]}
                />
            }
            <MapElementSelectionDetail
                name={t("action_editor.property_map_marker_to")}
                selectedElement={action.targetMapMarker}
                elementSetter={action.setTargetMapMarker.bind(action)}
                parameterTypes={["actions/MapMarkerValueModel"]}
                getSelectableElements={MapElementFilter.filterMapMarkerLabels}
                limitedToMapId={action.mapElement.isMapSet() ? action.mapElement.mapId : undefined}
            />
        </>
    );
});