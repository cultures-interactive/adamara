import { observer } from "mobx-react-lite";
import React from "react";
import { MapElementReferenceModel } from "../../../../../shared/action/MapElementReferenceModel";
import { getInteractionTriggerDataName } from "../../../../helper/displayHelpers";
import { MapElementSelector, MapSelectorElementsGetter } from "../../selector/MapElementSelector";
import { formatTreeParameter } from "../../../../../shared/helper/actionTreeHelper";
import { editorMapStore, MapStatus } from "../../../../stores/EditorMapStore";
import { getTreeParentOfClosestActionModel } from "../../../../../shared/action/ActionTreeModel";
import { InteractionTriggerData } from "../../../../../shared/game/InteractionTriggerData";
import { ElementParameter } from "../../../editor/ElementIcons";
import { getIconForElement, getImageForElement } from "../../../../helper/mapElementIconHelper";
import { editorStore } from "../../../../stores/EditorStore";
import { ElementGroup, ElementLabel } from "./BaseElements";

interface InteractionTriggerSelectionDetailProps {
    name: string;
    selectedInteractionTrigger: MapElementReferenceModel;
    interactionTriggerSetter: (value: MapElementReferenceModel) => void;
    allowBlankValue?: boolean;
}

export const InteractionTriggerSelectionDetail: React.FunctionComponent<InteractionTriggerSelectionDetailProps> = observer(({ name, selectedInteractionTrigger, interactionTriggerSetter, allowBlankValue }) => {
    const parentTree = getTreeParentOfClosestActionModel(selectedInteractionTrigger, true);
    const parameters = parentTree.treeParameterActions("actions/InteractionTriggerValueModel").map(treeParam => formatTreeParameter(treeParam.name));

    const getElements: MapSelectorElementsGetter = (mapId: number) => {
        if (mapId === 0) {
            return {
                mapStatus: MapStatus.Loaded,
                mapName: undefined,
                elements: parameters.map(parameter => ({
                    id: parameter,
                    label: parameter,
                    icon: <ElementParameter key={parameter} />
                }))
            };
        }

        const { map, mapStatus } = editorMapStore.getOrLoadMapWithMetaData(mapId, true);
        let interactionTriggers: InteractionTriggerData[];
        if (map) {
            interactionTriggers = (editorStore.isModuleEditor && (map.moduleOwner !== editorStore.sessionModuleId))
                ? map.interactionGateDataArray
                : map.interactionTriggerDataArray;
        } else {
            interactionTriggers = [];
        }

        return {
            mapStatus,
            mapName: map?.properties.name,
            elements: interactionTriggers.map(t => ({
                id: t.$modelId,
                label: getInteractionTriggerDataName(t),
                image: getImageForElement(t),
                icon: getIconForElement(t)
            }))
        };
    };

    return (
        <ElementGroup>
            {name && <ElementLabel>{name}</ElementLabel>}
            <MapElementSelector
                selectedElement={selectedInteractionTrigger}
                elementSetter={interactionTriggerSetter}
                elementsGetter={getElements}
                allowBlankValue={allowBlankValue}
            />
        </ElementGroup>
    );
});