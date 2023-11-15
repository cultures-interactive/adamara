import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { DynamicMapElementNPCModel } from '../../../shared/game/dynamicMapElements/DynamicMapElementNPCModel';
import { DynamicMapElementPropertiesEditorTemplate, LabelInput } from './DynamicMapElementPropertiesSharedElements';
import { getDynamicMapElementName } from '../../helper/displayHelpers';
import { MapEditorStore } from '../../stores/MapEditorStore';
import { NPCSensorTriggersPropertiesEditor } from "./NPCSensorTriggersPropertiesEditor";
import { Direction } from '../../../shared/resources/DirectionHelper';

interface Props {
    element: DynamicMapElementNPCModel;
    mapEditorStore: MapEditorStore;
}

export const DynamicMapElementNPCPropertiesEditor: React.FunctionComponent<Props> = observer(({ element, mapEditorStore }) => {
    const { t } = useTranslation();

    return (
        <DynamicMapElementPropertiesEditorTemplate
            element={element}
            mapEditorStore={mapEditorStore}
            elementTypeKey={/*t*/"editor.editor_display_type_npc"}
        >
            <table>
                <tbody>
                    <tr>
                        <td colSpan={2}>
                            <label>
                                <input type="checkbox" checked={element.isInteractionTrigger} onChange={() => element.setIsInteractionTrigger(!element.isInteractionTrigger)} />&nbsp;
                                {t("editor.element_is_interaction_trigger")}
                            </label>
                        </td>
                    </tr>
                    {element.isInteractionTrigger && !mapEditorStore.currentMapStore.isCurrentMapPartOfTheModule && <tr>
                        <td colSpan={2}>
                            <label>
                                <input type="checkbox" checked={element.isModuleGate} onChange={() => element.setIsModuleGate(!element.isModuleGate)} />&nbsp;
                                {t("editor.element_is_module_gate_interaction_trigger")}
                            </label>
                        </td>
                    </tr>}
                    <LabelInput
                        element={element}
                        allElements={mapEditorStore.currentMapStore.currentMap.npcs}
                        alreadyUsedWarningLabelKey={/*t*/"editor.warning_npc_label_already_used"}
                        onChange={value => element.setLabel(value)}
                    />
                    <tr>
                        <td>{t("editor.element_initial_facing_direction")}:</td>
                        <td>
                            <select value={element.initialFacingDirection} onChange={({ target }) => element.setInitialFacingDirection(+target.value)}>
                                <option value={Direction.East}>🡦 {t("editor.direction_east")}</option>
                                <option value={Direction.South}>🡧 {t("editor.direction_south")}</option>
                                <option value={Direction.West}>🡤 {t("editor.direction_west")}</option>
                                <option value={Direction.North}>🡥 {t("editor.direction_north")}</option>
                            </select>
                        </td>
                    </tr>
                </tbody>
            </table>
            <NPCSensorTriggersPropertiesEditor
                npc={element}
                isCurrentMapPartOfTheModule={mapEditorStore.currentMapStore.isCurrentMapPartOfTheModule}
            />
        </DynamicMapElementPropertiesEditorTemplate>
    );
});