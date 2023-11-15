import React from 'react';
import { observer } from "mobx-react-lite";
import { AnimationElementReferenceModel } from "../../../../../shared/action/MapElementReferenceModel";
import { BooleanActionDetail } from './BooleanActionDetail';
import { useTranslation } from 'react-i18next';
import { MapElementSelector, MapSelectorElementsGetter } from '../../selector/MapElementSelector';
import { formatTreeParameter, parseFormattedTreeParameter } from "../../../../../shared/helper/actionTreeHelper";
import { editorMapStore, MapStatus } from '../../../../stores/EditorMapStore';
import { sharedStore } from '../../../../stores/SharedStore';
import { AnimationElementValueModel } from '../../../../../shared/action/ValueModel';
import { isBlank } from '../../../../../shared/helper/generalHelpers';
import { Dropdown } from '../../../editor/Dropdown';
import { getTreeParentOfClosestActionModel } from '../../../../../shared/action/ActionTreeModel';
import { ElementParameter } from '../../../editor/ElementIcons';
import { getImageForElement } from '../../../../helper/mapElementIconHelper';
import { ElementGroup, ElementLabel } from './BaseElements';

interface AnimationElementSelectionDetailProps {
    name: string;
    selectedAnimationElement: AnimationElementReferenceModel;
    animationElementSetter: (value: AnimationElementReferenceModel) => void;
    allowBlankValue?: boolean;
}

export const AnimationElementSelectionDetail: React.FunctionComponent<AnimationElementSelectionDetailProps> = observer(({
    name, selectedAnimationElement, animationElementSetter, allowBlankValue
}) => {
    const { t } = useTranslation();

    const parentTree = getTreeParentOfClosestActionModel(selectedAnimationElement, true);
    const animationElementTreeParameters = parentTree.treeParameterActions("actions/AnimationElementValueModel");
    const parameters = animationElementTreeParameters.map(a => formatTreeParameter(a.name));

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
        const animationElements = map ? map.animationElements : [];

        return {
            mapStatus,
            mapName: map?.properties.name,
            elements: animationElements.map(a => ({
                id: a.$modelId,
                label: a.label === "" ? a.animationName : a.label + ` (${a.animationName})`,
                image: getImageForElement(a)
            }))
        };
    };

    let animationNames: string[] = null;

    const treeParameterName = parseFormattedTreeParameter(selectedAnimationElement.elementId);
    if (treeParameterName) {
        const treeParameter = animationElementTreeParameters.find(p => p.name === treeParameterName);
        if (treeParameter && (treeParameter.value instanceof AnimationElementValueModel) && treeParameter.value.hasRequiredAnimationNames) {
            animationNames = treeParameter.value.requiredAnimationNames;
        }
    } else {
        const map = editorMapStore.getOrLoadMapWithMetaData(selectedAnimationElement.mapId, true).map;
        const animation = sharedStore.getAnimationByName(map?.animationElements.find(a => a.$modelId === selectedAnimationElement?.elementId)?.animationName);
        if (animation) {
            animationNames = animation.animationNames;
        }
    }

    return (
        <ElementGroup>
            <ElementLabel>{name}</ElementLabel>
            <MapElementSelector
                selectedElement={selectedAnimationElement}
                elementSetter={animationElementSetter}
                elementsGetter={getElements}
                allowBlankValue={allowBlankValue}
            />

            {animationNames && <>
                <br />{t("action_editor.property_animation_name")}<br />
                <Dropdown
                    className={(!allowBlankValue && isBlank(selectedAnimationElement.animationName)) ? "invalid" : ""}
                    value={selectedAnimationElement.animationName}
                    onChange={({ target }) => selectedAnimationElement.setAnimationName(target.value)}
                >
                    <option value={""}></option>
                    {animationNames.map(animation => <option key={animation} value={animation}>{animation}</option>)}
                </Dropdown>

                <BooleanActionDetail name={t("action_editor.property_loop_animation")} checked={selectedAnimationElement.loop} toggle={() => selectedAnimationElement.toggleLoop()} />
            </>}
        </ElementGroup>
    );
});