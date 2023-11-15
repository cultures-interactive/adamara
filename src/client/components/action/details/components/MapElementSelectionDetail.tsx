import React from 'react';
import { observer } from "mobx-react-lite";
import { MapElementReferenceModel } from '../../../../../shared/action/MapElementReferenceModel';
import { MapElementSelector, MapSelectorElementsGetter } from '../../selector/MapElementSelector';
import { MapDataModel } from "../../../../../shared/game/MapDataModel";
import { SelectableElement } from "../../../../helper/MapElementFilter";
import { useTranslation } from 'react-i18next';
import { formatTreeParameter } from "../../../../../shared/helper/actionTreeHelper";
import { editorMapStore, MapStatus } from '../../../../stores/EditorMapStore';
import { getTreeParentOfClosestActionModel } from '../../../../../shared/action/ActionTreeModel';
import { TFunction } from 'i18next';
import { getIconForElement, getImageForElement } from '../../../../helper/mapElementIconHelper';
import { ElementIconAreaTrigger, ElementIconType, ElementIconViewAreaTrigger, ElementParameter } from '../../../editor/ElementIcons';
import { ElementGroup, ElementLabel } from './BaseElements';
import { DynamicMapElementAreaTriggerModel } from '../../../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel';
import { ViewAreaTriggerModel } from '../../../../../shared/game/ViewAreaTriggerModel';

interface MapElementSelectionDetailProps {
    name: string;
    selectedElement: MapElementReferenceModel;
    elementSetter: (value: MapElementReferenceModel) => void;
    getSelectableElements: (map: MapDataModel, t: TFunction) => SelectableElement[];
    parameterTypes: string[];
    allowBlankValue?: boolean;
    limitedToMapId?: number;
}

export const MapElementSelectionDetail: React.FunctionComponent<MapElementSelectionDetailProps> = observer(({
    name, selectedElement, elementSetter, getSelectableElements, parameterTypes, allowBlankValue, limitedToMapId
}) => {
    const { t } = useTranslation();

    const parentTree = getTreeParentOfClosestActionModel(selectedElement, true);
    const parameters = parameterTypes.map(parameterType => parentTree.treeParameterActions(parameterType).map(treeParam => formatTreeParameter(treeParam.name))).flat();

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

        if ((limitedToMapId != undefined) && (mapId !== limitedToMapId)) {
            return {
                mapStatus: MapStatus.Loaded,
                mapName: "",
                elements: []
            };
        }

        const { map, mapStatus } = editorMapStore.getOrLoadMapWithMetaData(mapId, true);
        let mapElements = map ? getSelectableElements(map, t) : [];

        const hasAreaTriggerWithId = new Set<string>();
        const hasViewAreaTriggerWithId = new Set<string>();

        for (const mapElement of mapElements) {
            const { id, element } = mapElement;

            if (element instanceof DynamicMapElementAreaTriggerModel) {
                hasAreaTriggerWithId.add(id);
            } else if (element instanceof ViewAreaTriggerModel) {
                hasViewAreaTriggerWithId.add(id);
            }
        }

        // make sure each ID is unique in the list (e.g. Area Triggers can have multiple instances)
        mapElements = Array.from(new Set(mapElements.map(e => e.id))).map(someId => mapElements.find(m => m.id === someId));

        return {
            mapStatus,
            mapName: map?.properties.name,
            elements: mapElements.map(e => ({
                id: e.id,
                label: e.label,
                image: getImageForElement(e.element),
                icon: (hasAreaTriggerWithId.has(e.id) && hasViewAreaTriggerWithId.has(e.id))
                    ? <div><ElementIconAreaTrigger type={ElementIconType.ActionEditorSelector} />&nbsp;<ElementIconViewAreaTrigger /></div>
                    : getIconForElement(e.element)
            }))
        };
    };

    return (
        <ElementGroup>
            {name && <ElementLabel>{name}</ElementLabel>}
            <MapElementSelector
                selectedElement={selectedElement}
                elementSetter={elementSetter}
                elementsGetter={getElements}
                allowBlankValue={allowBlankValue}
                parameterTypes={parameterTypes}
                limitedToMapId={limitedToMapId}
            />
        </ElementGroup>
    );
});