import React from 'react';
import { observer } from "mobx-react-lite";
import { DynamicMapElementModel } from '../../../shared/game/dynamicMapElements/DynamicMapElement';
import { DynamicMapElementNPCModel } from '../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel';
import { DynamicMapElementNPCPropertiesEditor } from './DynamicMapElementNPCPropertiesEditor';
import { DynamicMapElementAnimationElementModel } from '../../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel';
import { DynamicMapElementAnimationElementPropertiesEditor } from './DynamicMapElementAnimationElementPropertiesEditor';
import { DynamicMapElementAreaTriggerModel } from '../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel';
import { DynamicMapElementAreaTriggerPropertiesEditor } from './DynamicMapElementAreaTriggerPropertiesEditor';
import { DynamicMapElementMapMarkerModel } from '../../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel';
import { DynamicMapElementMapMarkerPropertiesEditor } from './DynamicMapElementMapMarkerPropertiesEditor';
import { MapEditorStore } from '../../stores/MapEditorStore';

interface Props {
    element: DynamicMapElementModel<any>;
    mapEditorStore?: MapEditorStore;
}

export const DynamicMapElementPropertiesEditor: React.FunctionComponent<Props> = observer(({ element, mapEditorStore }) => {
    if (element instanceof DynamicMapElementNPCModel) {
        return <DynamicMapElementNPCPropertiesEditor element={element} mapEditorStore={mapEditorStore} />;
    }

    if (element instanceof DynamicMapElementAnimationElementModel) {
        return <DynamicMapElementAnimationElementPropertiesEditor element={element} mapEditorStore={mapEditorStore} />;
    }

    if (element instanceof DynamicMapElementAreaTriggerModel) {
        return <DynamicMapElementAreaTriggerPropertiesEditor element={element} mapEditorStore={mapEditorStore} />;
    }

    if (element instanceof DynamicMapElementMapMarkerModel) {
        return <DynamicMapElementMapMarkerPropertiesEditor element={element} mapEditorStore={mapEditorStore} />;
    }

    return <div>Unimplemented dynamic map element: {element.$modelType}</div>;
});