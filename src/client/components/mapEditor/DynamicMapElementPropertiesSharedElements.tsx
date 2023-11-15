import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AiFillDelete, AiOutlineScissor } from 'react-icons/ai';
import styled from 'styled-components';
import { DynamicMapElementModel } from '../../../shared/game/dynamicMapElements/DynamicMapElement';
import { getDynamicMapElementName } from '../../helper/displayHelpers';
import { getIconForElementPartOfText } from '../../helper/mapElementIconHelper';
import { MapEditorStore } from '../../stores/MapEditorStore';
import { undoableMapEditorDynamicMapElementCut } from '../../stores/undo/operation/MapEditorDynamicMapElementCut';
import { DynamicMapElementChangeGroup, groupUndoableMapEditorDynamicMapElementChanges } from '../../stores/undo/operation/MapEditorSubmitCurrentMapDynamicMapElementsChangesOp';
import { MenuCard } from '../menu/MenuCard';
import { MenuCardLabel } from '../menu/MenuCardLabel';
import { LayerDeleteButton, LayerEditButton } from './EditorTileInspectorLayer';

const TitleBar = styled.div`
    display: flex;
`;

const TitleName = styled(MenuCardLabel)`
    flex-grow: 1;
`;

const Buttons = styled.div`
    flex-shrink: 0;
`;

export const Input = styled.input`
    width: 100%;
`;

const WarningMessage = styled.span`
    color: red;
`;

interface ElementWithLabel {
    label: string;
}

interface LabelInputProps {
    element: ElementWithLabel;
    allElements: ElementWithLabel[];
    alreadyUsedWarningLabelKey: string;
    onChange: (value: string) => void;
}

export const LabelInput: React.FunctionComponent<LabelInputProps> = observer(({ element, allElements, alreadyUsedWarningLabelKey, onChange }) => {
    const { t } = useTranslation();

    const { label } = element;
    const labelAlreadyUsed = label && allElements.some(otherElement => (otherElement != element) && (otherElement.label === label));

    return (
        <>
            <tr>
                <td>{t("editor.element_label")}:</td>
                <td><Input type="text" value={element.label} onChange={({ target }) => onChange(target.value)} /></td>
            </tr>

            {/* Using the ternary operator here is necessary to suppress a validateDOMNesting error message: https://stackoverflow.com/a/53519842 */}
            {labelAlreadyUsed ? (
                <tr>
                    <td></td>
                    <td><WarningMessage>{t(alreadyUsedWarningLabelKey)}</WarningMessage></td>
                </tr>
            ) : null}
        </>
    );
});

const IconContainer = styled.div`
    width: 24px;
    flex-grow: 0;
    flex-shrink: 0;
`;

interface ElementTitleDisplayProps {
    element: any;
    elementTypeKey: string;
    name: string;
}

export const ElementTitleDisplay: React.FunctionComponent<ElementTitleDisplayProps> = observer(({
    element, elementTypeKey, name
}) => {
    const { t } = useTranslation();


    return (
        <TitleName>
            <IconContainer>{getIconForElementPartOfText(element)}</IconContainer>
            <div>{t(elementTypeKey)}<br />{name}</div>
        </TitleName>
    );
});

interface DynamicMapElementPropertiesEditorTemplateProps {
    element: DynamicMapElementModel<any>;
    elementTypeKey: string;
    mapEditorStore: MapEditorStore;
}

export const DynamicMapElementPropertiesEditorTemplate: React.FunctionComponent<DynamicMapElementPropertiesEditorTemplateProps> = observer(({
    element, elementTypeKey, mapEditorStore, children
}) => {
    const isCut = element.$modelId === mapEditorStore.cutDynamicMapElementModelId;

    const deleteElement = () => {
        groupUndoableMapEditorDynamicMapElementChanges(DynamicMapElementChangeGroup.Delete, () => {
            mapEditorStore.currentMapStore.currentMap.removeDynamicMapElement(element);
        });
    };

    const name = getDynamicMapElementName(element, false);

    return (
        <MenuCard>
            <TitleBar>
                <ElementTitleDisplay
                    element={element}
                    elementTypeKey={elementTypeKey}
                    name={name}
                />
                <Buttons>
                    <LayerEditButton disabled={isCut} onClick={() => undoableMapEditorDynamicMapElementCut(element, mapEditorStore)}><AiOutlineScissor /></LayerEditButton>
                    <LayerDeleteButton onClick={deleteElement}><AiFillDelete /></LayerDeleteButton>
                </Buttons>
            </TitleBar>
            {children}
        </MenuCard>
    );
});