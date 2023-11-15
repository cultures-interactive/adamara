import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { DynamicMapElementMapMarkerModel } from '../../../shared/game/dynamicMapElements/DynamicMapElementMapMarkerModel';
import { DynamicMapElementPropertiesEditorTemplate, LabelInput } from './DynamicMapElementPropertiesSharedElements';
import { getDynamicMapElementName } from '../../helper/displayHelpers';
import { MapEditorStore } from '../../stores/MapEditorStore';

interface Props {
    element: DynamicMapElementMapMarkerModel;
    mapEditorStore: MapEditorStore;
}

export const DynamicMapElementMapMarkerPropertiesEditor: React.FunctionComponent<Props> = observer(({ element, mapEditorStore }) => {
    const { t } = useTranslation();

    return (
        <DynamicMapElementPropertiesEditorTemplate
            element={element}
            mapEditorStore={mapEditorStore}
            elementTypeKey={/*t*/"editor.editor_display_type_map_marker"}
        >
            <table>
                <tbody>
                    <LabelInput
                        element={element}
                        allElements={mapEditorStore.currentMapStore.currentMap.mapMarkers}
                        alreadyUsedWarningLabelKey={/*t*/"editor.warning_map_marker_label_already_used"}
                        onChange={value => element.setLabel(value)}
                    />
                </tbody>
            </table>
        </DynamicMapElementPropertiesEditorTemplate>
    );
});