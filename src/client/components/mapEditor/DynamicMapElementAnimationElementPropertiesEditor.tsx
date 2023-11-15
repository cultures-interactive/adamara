import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { DynamicMapElementAnimationElementModel } from '../../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel';
import { DynamicMapElementPropertiesEditorTemplate, LabelInput } from './DynamicMapElementPropertiesSharedElements';
import { getDynamicMapElementName } from '../../helper/displayHelpers';
import { MapEditorStore } from '../../stores/MapEditorStore';
import { sharedStore } from '../../stores/SharedStore';

interface Props {
    element: DynamicMapElementAnimationElementModel;
    mapEditorStore: MapEditorStore;
}

export const DynamicMapElementAnimationElementPropertiesEditor: React.FunctionComponent<Props> = observer(({ element, mapEditorStore }) => {
    const { t } = useTranslation();

    const animation = sharedStore.getAnimationByName(element.animationName);

    return (
        <DynamicMapElementPropertiesEditorTemplate
            element={element}
            mapEditorStore={mapEditorStore}
            elementTypeKey={/*t*/"editor.editor_display_type_animation_element"}
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
                        allElements={mapEditorStore.currentMapStore.currentMap.animationElements}
                        alreadyUsedWarningLabelKey={/*t*/"editor.warning_animation_element_label_already_used"}
                        onChange={value => element.setLabel(value)}
                    />
                    {animation && (
                        <>
                            <tr>
                                <td>{t("editor.animation_element_start_animation")}:</td>
                                <td>
                                    <select value={element.startAnimationName} onChange={({ target }) => element.setStartAnimationName(target.value)}>
                                        <option value=""></option>
                                        {animation.animationNames.map(animationName => <option key={animationName} value={animationName}>{animationName}</option>)}
                                    </select>
                                </td>
                            </tr>
                            {(element.startAnimationName.length > 0) && (
                                <tr>
                                    <td>{t("editor.animation_element_start_animation_loops")}:</td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={element.startAnimationLoops}
                                            onChange={() => element.setStartAnimationLoops(!element.startAnimationLoops)}
                                        />
                                    </td>
                                </tr>
                            )}
                        </>
                    )}
                </tbody>
            </table>
        </DynamicMapElementPropertiesEditorTemplate>
    );
});