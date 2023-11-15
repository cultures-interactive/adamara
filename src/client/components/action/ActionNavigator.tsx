import React, { DragEvent } from 'react';
import styled, { css } from 'styled-components';
import { observer } from "mobx-react-lite";
import { ActionModel, TreeEnterActionModel, TreeExitActionModel, TreeParamterActionModel } from '../../../shared/action/ActionModel';
import { useTranslation } from 'react-i18next';
import { ActionTreeModel, ActionTreeType } from '../../../shared/action/ActionTreeModel';
import { BsBoxArrowInUpRight } from 'react-icons/bs';
import { ListItem } from '../menu/ListItem';
import { undoableActionEditorSelectActionTreeHierachy } from '../../stores/undo/operation/ActionEditorSelectActionTreeHierarchy';
import { actionEditorStore, allTemplatesCategory, basicActionsCategory } from '../../stores/ActionEditorStore';
import { undoableActionEditorSelectCategory } from '../../stores/undo/operation/ActionEditorSelectCategoryOp';
import { EditorComplexity, passComplexityGate } from '../../../shared/definitions/other/EditorComplexity';
import { UiConstants } from "../../data/UiConstants";
import { localSettingsStore } from '../../stores/LocalSettingsStore';
import { sharedStore } from '../../stores/SharedStore';
import { compareColorOrder } from '../../../shared/data/ActionTreeColors';
import { actionModelPrototypes, actionNodeIcon } from './actionNodeData';
import { gameStore } from '../../stores/GameStore';
import { translationStore } from '../../stores/TranslationStore';

const selectedTemplateColor = "#fbec5d";

const BorderContainer = styled.div`
    border: 1px solid darkgray;
    margin: 4px;
    background-color: white;
    border-radius: ${UiConstants.BORDER_RADIUS};
`;

const ScrollContainer = styled.div`
    background: white;
    padding: 3px;
    margin: 3px;
    align-self: baseline;
    min-width: 160px;
    overflow-y: scroll;
    max-height: 235px;
    height: calc(100% - 5px);
`;

const Row = styled.div`
    display: flex;
    flex-direction: row;
    padding-right: 20px;
`;

const DraggableAction = styled.div<{ color?: string; selected: boolean; }>`
    background-color: ${props => props.color ? props.color : 'unset'};
    display: inline-block;
    border-radius: ${UiConstants.BORDER_RADIUS};
    margin: 4px;
    padding: 4px;
    box-shadow: 0 2px 4px 0 rgba(0,0,0,0.2);
    ${({ selected }) => selected && css`outline: 2px black dashed;`}
`;

const ActionContent = styled.div`
    display: flex;
    flex-direction: row;
`;

const IconContainer = styled.div`
    margin-right: 4px;
`;

function compareTemplateOrder(a: ActionTreeModel, b: ActionTreeModel) {
    const aProperties = a.treePropertiesAction;
    const bProperties = b.treePropertiesAction;

    if (aProperties.color !== bProperties.color)
        return aProperties.color.localeCompare(bProperties.color);

    return aProperties.localizedName.get(gameStore.languageKey).localeCompare(bProperties.localizedName.get(gameStore.languageKey));
}

export const ActionNavigator: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    const { actionTreeTemplates } = sharedStore;
    const { currentActionSubTree, currentRootActionTree, currentCategory } = actionEditorStore;
    const { editorComplexity, isProductionEditor } = localSettingsStore;

    const onDragStartAction = (event: DragEvent, actionType: string) => {
        event.dataTransfer.setData('application/newAction', actionType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const onDragStartTemplate = (event: DragEvent, actionType: string) => {
        event.dataTransfer.setData('application/newTemplateInstance', actionType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const openTemplate = (actionTree: ActionTreeModel) => {
        undoableActionEditorSelectActionTreeHierachy([actionTree.$modelId]);
    };

    const compareActionOrder = (a: ActionModel, b: ActionModel) => {
        const aColor = a.nodeColor();
        const bColor = b.nodeColor();
        if (aColor != bColor)
            return compareColorOrder(aColor, bColor);

        return t(a.title()).localeCompare(t(b.title()));
    };

    const availableActionTreeTemplates = actionTreeTemplates.filter(t => passComplexityGate(t.treePropertiesAction.minimumComplexity, editorComplexity));
    const availableActionModelPrototypes = actionModelPrototypes.filter(a => passComplexityGate(a.minimumComplexity, editorComplexity));

    const categories = [
        { key: basicActionsCategory, label: t(basicActionsCategory) },
        { key: allTemplatesCategory, label: t(allTemplatesCategory) },
        ...Array.from(new Set(availableActionTreeTemplates.map(t => t.treePropertiesAction.tags).flat())).map(tag => (
            { key: tag, label: translationStore.makeshiftTranslationSystemData.actionEditorTemplateTags.getTranslation(gameStore.languageKey, tag) }
        ))
    ];

    if (!passComplexityGate(EditorComplexity.Workshop2, editorComplexity)) {
        categories.shift();
    }

    const actionsInCategory = currentCategory !== basicActionsCategory ? [] : availableActionModelPrototypes.filter(
        a => (
            (!(a instanceof TreeParamterActionModel) && !(a instanceof TreeEnterActionModel) && !(a instanceof TreeExitActionModel)) ||
            (currentActionSubTree.type === ActionTreeType.SubTree) ||
            (currentActionSubTree.type === ActionTreeType.TemplateRoot)
        )
    ).sort(compareActionOrder);

    const templatesInCategory = availableActionTreeTemplates.filter(
        a => (currentCategory === allTemplatesCategory) || a.treePropertiesAction.tags.includes(currentCategory)
    ).sort(compareTemplateOrder);

    return (
        <Row>
            <BorderContainer>
                <ScrollContainer>
                    {
                        categories.map(category => (
                            <ListItem
                                key={category.key}
                                className={category.key === currentCategory ? "selected" : ""}
                                onClick={() => undoableActionEditorSelectCategory(category.key)}
                            >
                                {category.label}
                            </ListItem>
                        ))
                    }
                </ScrollContainer>
            </BorderContainer>
            <BorderContainer>
                <ScrollContainer>
                    {actionsInCategory.map(actionModel => (
                        <DraggableAction
                            key={actionModel.$modelId}
                            color={actionModel.nodeColor()}
                            onDragStart={(event) => onDragStartAction(event, actionModel.$modelId)}
                            draggable
                            onClick={() => actionEditorStore.setOrToggleClickPlacementActionModelId(actionModel.$modelId)}
                            selected={actionEditorStore.clickPlacementActionModelId === actionModel.$modelId}
                        >
                            <ActionContent>
                                <IconContainer>{actionNodeIcon(actionModel)}</IconContainer>
                                {t(actionModel.title())}
                            </ActionContent>
                        </DraggableAction>
                    ))}
                    {templatesInCategory.map(actionTree => (
                        <DraggableAction
                            key={actionTree.$modelId}
                            color={
                                actionTree === currentRootActionTree
                                    ? selectedTemplateColor
                                    : actionTree.treePropertiesAction?.color
                                        ? actionTree.treePropertiesAction.color
                                        : actionTree.nodeColor()
                            }
                            onDragStart={(event) => onDragStartTemplate(event, actionTree.$modelId)}
                            draggable
                            onClick={() => actionEditorStore.setOrToggleClickPlacementActionTreeModelId(actionTree.$modelId)}
                            selected={actionEditorStore.clickPlacementActionTreeModelId === actionTree.$modelId}
                        >
                            {actionTree.treePropertiesAction.localizedName.get(gameStore.languageKey)}
                            {isProductionEditor && (
                                <BsBoxArrowInUpRight onClick={e => {
                                    e.stopPropagation();
                                    openTemplate(actionTree);
                                }} />)
                            }
                        </DraggableAction>
                    ))}
                </ScrollContainer>
            </BorderContainer>
        </Row>
    );
});
