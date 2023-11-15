import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { DynamicMapElementAreaTriggerModel } from '../../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel';
import { DynamicMapElementPropertiesEditorTemplate, Input } from './DynamicMapElementPropertiesSharedElements';
import { getDynamicMapElementName } from '../../helper/displayHelpers';
import { MapEditorStore } from '../../stores/MapEditorStore';
import { FiCopy } from 'react-icons/fi';
import { undoableMapEditorSelectAreaTriggerWithPrefilledId } from '../../stores/undo/operation/SetPlacementSelectionOp';

interface Props {
    element: DynamicMapElementAreaTriggerModel;
    mapEditorStore: MapEditorStore;
}

export const DynamicMapElementAreaTriggerPropertiesEditor: React.FunctionComponent<Props> = observer(({ element, mapEditorStore }) => {
    const { t } = useTranslation();

    return (
        <DynamicMapElementPropertiesEditorTemplate
            element={element}
            mapEditorStore={mapEditorStore}
            elementTypeKey={/*t*/"editor.editor_display_type_area_trigger"}
        >
            <table>
                <tbody>
                    {!mapEditorStore.currentMapStore.isCurrentMapPartOfTheModule && <tr>
                        <td colSpan={2}>
                            <label>
                                <input type="checkbox" checked={element.isModuleGate} onChange={() => element.setIsModuleGate(!element.isModuleGate)} />&nbsp;
                                {t("editor.element_is_module_gate_area_trigger")}
                            </label>
                        </td>
                    </tr>}
                    <tr>
                        <td>{t("editor.area_trigger_id")}:</td>
                        <td><Input type="text" value={element.id} onChange={({ target }) => element.setId(target.value)} /></td>
                    </tr>
                    <tr>
                        <td colSpan={2}><button onClick={() => undoableMapEditorSelectAreaTriggerWithPrefilledId(element.id, mapEditorStore)}><FiCopy /> {t("editor.extend_area_trigger")}</button></td>
                    </tr>
                </tbody>
            </table>
        </DynamicMapElementPropertiesEditorTemplate>
    );
});