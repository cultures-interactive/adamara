import React from 'react';
import { observer } from "mobx-react-lite";
import { AnimationElementReferenceModel } from "../../../../../shared/action/MapElementReferenceModel";
import { useTranslation } from 'react-i18next';
import { MapElementSelector, MapSelectorElementsGetter } from '../../selector/MapElementSelector';
import { formatTreeParameter } from "../../../../../shared/helper/actionTreeHelper";
import { editorMapStore, MapStatus } from '../../../../stores/EditorMapStore';
import { sharedStore } from '../../../../stores/SharedStore';
import { AnimationElementValueModel } from '../../../../../shared/action/ValueModel';
import styled from 'styled-components';
import { getTreeParentOfClosestActionModel } from '../../../../../shared/action/ActionTreeModel';
import { ElementIconType, ElementParameter } from '../../../editor/ElementIcons';
import { getImageForElement } from '../../../../helper/mapElementIconHelper';
import { ElementGroup, ElementLabel } from './BaseElements';

const InfoContainer = styled.div`
    margin: 4px;
    font-size: small;
    max-width: 250px;
`;

interface AnimationElementSelectionDetailProps {
    name: string;
    selectedAnimationElement: AnimationElementReferenceModel;
    animationElementSetter: (value: AnimationElementReferenceModel) => void;
    requiredAnimationNames: string[];
    allowBlankValue?: boolean;
}

export const AnimationElementWithAnimationRestrictionsSelectionDetail: React.FunctionComponent<AnimationElementSelectionDetailProps> = observer(({
    name, selectedAnimationElement, animationElementSetter, requiredAnimationNames, allowBlankValue
}) => {
    const { t } = useTranslation();

    const parentTree = getTreeParentOfClosestActionModel(selectedAnimationElement, true);
    const animationElementTreeParameters = parentTree.treeParameterActions("actions/AnimationElementValueModel");
    const fittingParameters = animationElementTreeParameters
        .filter(parameter => {
            const valueInstance = parameter.value as AnimationElementValueModel;
            return valueInstance.hasRequiredAnimationNames && fitsAnimationRequirements(requiredAnimationNames, valueInstance.requiredAnimationNames);
        })
        .map(parameter => formatTreeParameter(parameter.name));

    const getElements: MapSelectorElementsGetter = (mapId: number) => {
        if (mapId === 0) {
            return {
                mapStatus: MapStatus.Loaded,
                mapName: undefined,
                elements: fittingParameters.map(parameter => ({
                    id: parameter,
                    label: parameter,
                    icon: <ElementParameter key={parameter} />
                }))
            };
        }

        const { map, mapStatus } = editorMapStore.getOrLoadMapWithMetaData(mapId, true);
        const animationElements = map ? map.animationElements : [];
        const fittingAnimations = animationElements.filter(element => {
            const animation = sharedStore.getAnimationByName(element.animationName);
            return animation && fitsAnimationRequirements(requiredAnimationNames, animation.animationNames);
        });

        return {
            mapStatus,
            mapName: map?.properties.name,
            elements: fittingAnimations.map(a => ({
                id: a.$modelId,
                label: a.label === "" ? a.animationName : a.label + ` (${a.animationName})`,
                image: getImageForElement(a)
            }))
        };
    };

    return (
        <ElementGroup>
            <ElementLabel>{name}</ElementLabel>
            <InfoContainer>({t("action_editor.property_required_animation_sequences")}: {requiredAnimationNames.join(", ")})</InfoContainer>
            <MapElementSelector
                selectedElement={selectedAnimationElement}
                elementSetter={animationElementSetter}
                elementsGetter={getElements}
                allowBlankValue={allowBlankValue}
            />
        </ElementGroup>
    );
});

function fitsAnimationRequirements(requiredAnimations: string[], hasAnimation: string[]) {
    return requiredAnimations.every(requiredAnimation => hasAnimation.some(animation => animation === requiredAnimation));
}