import { observer } from 'mobx-react-lite';
import React, { MouseEvent, useEffect } from 'react';
import { Position, NodeProps, useUpdateNodeInternals, useZoomPanHelper } from 'react-flow-renderer';
import { useTranslation } from 'react-i18next';
import styled, { css, CSSProperties } from 'styled-components';
import { StartDialogueActionModel, TreeEnterActionModel, TreeParamterActionModel, TreePropertiesActionModel, DebugStartActionModel } from '../../../shared/action/ActionModel';
import { ActionTreeModel, subTreeNodeSize } from '../../../shared/action/ActionTreeModel';
import { doScale, doScaleNumber, NodeData } from './actionEditorHelpers';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { BsZoomIn } from 'react-icons/bs';
import { SelectableExitModel } from '../../../shared/action/SelectableExitModel';
import { UiConstants } from '../../data/UiConstants';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { Gender } from '../../../shared/definitions/other/Gender';
import { ActionNodeDescription, ActionNodeHeader } from "./ActionNodeHeader";
import { ActionNodeHandle } from './handle/ActionNodeHandle';
import { AiOutlineDrag } from 'react-icons/ai';
import { undoableActionEditorSelectAction } from '../../stores/undo/operation/ActionEditorSelectActionOp';
import { passComplexityGate } from '../../../shared/definitions/other/EditorComplexity';
import { actionEditorStore } from '../../stores/ActionEditorStore';
import { gameStore } from '../../stores/GameStore';
import { localSettingsStore } from '../../stores/LocalSettingsStore';
import { getActionShortDescriptionForActionEditor } from '../../helper/actionEditorHelpers';
import { actionNodeIcon } from './actionNodeData';

// Make all FA solid icons available so that they can be individually configured for sub-tree (template) nodes
library.add(fas);

interface ScaleProps {
    scale: number;
}

interface ActionNodeStyles {
    scale: number;
    selected: boolean;
    color: string;
    invalid?: boolean;
    greyedOut?: boolean;
}

interface ActionNodeParameterContentStyles {
    scale: number;
    align: string;
    conditionSet?: boolean;
}

const ActionNodeContent = styled.div<ActionNodeStyles>`
    outline: ${props => props.invalid ? css`0.15em solid red` : undefined};
    background-color: ${props => props.greyedOut ? props.color + "55" : props.color};
    /*opacity: ${props => props.greyedOut ? 0.6 : undefined};*/
    border: ${props => doScale(1, props.scale)} solid ${props => props.color};
    box-sizing: border-box;
    white-space: nowrap;
    font-size: ${props => doScale(11, props.scale)};
    padding-top: ${props => doScale(5, props.scale)};
    padding-bottom: ${props => doScale(5, props.scale)};
    padding-left: ${props => doScale(5, props.scale)};
    border-radius: ${props => doScale(4, props.scale)};
    box-shadow: 0 ${props => doScale(4, props.scale)} ${props => doScale(8, props.scale)} 0 rgba(0,0,0,0.2);
    /*filter: drop-shadow(0em 0.2em 0.3em rgba(0,0,0,0.2));*/

    button {
        background-color: ${props => props.color ? props.color : 'unset'};
    }
`;

const TreeActionNodeContent = styled(ActionNodeContent)`
    width: ${props => doScale(subTreeNodeSize.width, props.scale)};
    min-height: ${props => doScale(subTreeNodeSize.height, props.scale)};
    padding-left: 0px;
`;

const TreeActionNodeEntries = styled.div<ScaleProps>`
    padding-right: ${props => doScale(30, props.scale)};
`;

const TreeActionNodeExits = styled.div<ScaleProps>`
    padding-left: ${props => doScale(60, props.scale)};
`;

const TreeActionNodeParameters = styled.div<ScaleProps>`
    padding-left: ${props => doScale(30, props.scale)};
`;

const Button = styled.button`
    position: absolute;
    top: -2.7em;
    width: 2.7em;
    height: 2.7em;
    outline: none;
    border: none;
    border-radius: 100em 100em 0em 0em;
    border-bottom: 0.04em solid rgba(0,0,0,10%);
`;

const FocusButton = styled(Button)`
    right: 3.6em;
    cursor: pointer;
`;

const DragHandle = styled(Button)`
    right: 0.3em;
    cursor: grab;
`;

const ActionNodeParameterLabel = styled.div<ActionNodeParameterContentStyles>`
    background: ${props => props.conditionSet ? '#8f5252' : 'rgba(255, 255, 255, 0.5)'};
    color: #444;
    text-align: ${props => props.align};
    display: inline-block;
    width: 100%;

    margin-bottom: ${props => doScale(0.23, props.scale)};
    height: ${props => doScale(13, props.scale)};
    max-width: ${props => doScale(140, props.scale)};
    overflow: hidden;
    text-overflow: ellipsis;
    padding-left: ${props => doScale(2, props.scale)};
    padding-right: ${props => doScale(2, props.scale)};
    border-top-left-radius: ${props => (props.align == 'right') ? doScale(100, props.scale) : '0'};
    border-bottom-left-radius: ${props => (props.align == 'right') ? doScale(100, props.scale) : '0'};
    border-top-right-radius: ${props => (props.align == 'left') ? doScale(100, props.scale) : '0'};
    border-bottom-right-radius: ${props => (props.align == 'left') ? doScale(100, props.scale) : '0'};
`;

const IconBubble = styled.div<ActionNodeStyles>`
    position: absolute;
    background-color: ${props => props.color ? props.color : 'white'};
    /*
    border-color: ${props => props.greyedOut ? UiConstants.COLOR_DISABLED : (props.selected ? UiConstants.COLOR_SELECTION_HIGHLIGHT : 'black')};
    border-width: ${props => doScale(1, props.scale)};
    border-style: solid;
    */
    border-radius: 50% 50% 0px 50%;
    width: ${props => doScale(20, props.scale)};
    height: ${props => doScale(20, props.scale)};
    display: flex;
    justify-content: center;
    align-items: center;
    transform: translate(-${props => doScale(17, props.scale)}, -${props => doScale(18, props.scale)});
`;

const SubTreeIconBubble = styled(IconBubble)`
    transform: translate(-${props => doScale(14, props.scale)}, -${props => doScale(18, props.scale)});
`;

const selectMargin = 6;
const SelectionBorder = styled.div<ScaleProps>`
    position: absolute;
    width: calc(100% + ${props => doScale(selectMargin * 2, props.scale)});
    height: calc(100% + ${props => doScale(selectMargin * 2, props.scale)});
    border-color: ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
    border-style: dashed;
    border-width: ${props => doScale(2, props.scale)};
    margin-top: -${props => doScale(selectMargin, props.scale)};
    margin-left: -${props => doScale(selectMargin, props.scale)};
    pointer-events: none;
    border-radius: ${props => doScale(4, props.scale)};
`;

const ActiveNodeBorder = styled(SelectionBorder)`
    border-color: ${UiConstants.COLOR_ACTIVE};
`;

export const ActionNode: React.FunctionComponent<NodeProps<NodeData>> = observer(({ data, xPos, yPos }) => {
    const { t } = useTranslation();
    const { languageKey } = gameStore;
    const { currentRootActionTree, currentActionSubTreeModelId, currentActionTreeHierarchy, currentAction, currentActionSubTree } = actionEditorStore;
    const { action, scale } = data;

    const nodeId = data.action.$modelId;

    const bounds = {
        x: xPos,
        y: yPos,
        width: doScaleNumber(subTreeNodeSize.width, scale),
        height: doScaleNumber(subTreeNodeSize.height, scale)
    };

    const { actionTreeValidationEnabled } = localSettingsStore;

    const exits = action.exits();
    const exitLabels = action.exitLabels(t, gameStore.languageKey);
    const description = getActionShortDescriptionForActionEditor(action, t);

    const subTree = action instanceof ActionTreeModel ? action as ActionTreeModel : null;
    const subTreeName = subTree && action != currentRootActionTree ? subTree?.treePropertiesAction?.localizedName.get(gameStore.languageKey) : "";
    const subTreeProps = subTree?.treePropertiesAction;
    const subTreeEntries = subTree?.enterActions;

    const isNodeWithoutEntry = action instanceof TreeEnterActionModel || action instanceof TreePropertiesActionModel || action instanceof TreeParamterActionModel || action instanceof DebugStartActionModel;
    const isDialogueWithAnswers = action instanceof StartDialogueActionModel && action.answers.length > 0;
    const isSelected = currentAction === action;
    const isRootNode = action.$modelId == currentRootActionTree?.$modelId;
    const markAsInvalid = actionTreeValidationEnabled && actionEditorStore.shouldMarkAsInvalid(action);

    const isSubTreeInFocus = () => {
        return currentActionSubTreeModelId === action.$modelId;
    };

    const isSubTreeInHierarchy = () => {
        return currentActionTreeHierarchy.includes(subTree);
    };

    const markAsDisconnected = actionTreeValidationEnabled && !isSubTreeInHierarchy() && actionEditorStore.shouldMarkAsDisconnected(data.action, currentActionSubTree);

    const subTreeBackgroundColor = (forIcon: boolean = false) => {
        const definedColor = subTreeProps?.color;
        if (isSubTreeInFocus()) {
            return definedColor && forIcon ? definedColor : 'white'; // When Subtree is in focus
        }

        for (const aNode of currentActionTreeHierarchy) {
            if (aNode.$modelId === action.$modelId) {
                return '#cccccc';   // When Subtree is part of hierarchy but not in focus
            }
        }

        return definedColor ? definedColor : subTree.nodeColor(); // When Subtree is not part of the hierarchy
    };
    const updateNodeInternals = useUpdateNodeInternals();

    useEffect(() => {
        updateNodeInternals(action.$modelId);
    }, [exits.length]);

    const color = subTree ? subTreeBackgroundColor() : action.nodeColor();

    const createHandleStyle = (position: Position, markAsDisconnected: boolean, yPos: number = 24): CSSProperties => {
        const handleSize = doScale(13, scale);
        const handlerPosX = doScale(14.25, scale);
        const handlerPosY = doScale(yPos, scale);
        //const borderRadius = doScale(4, scale);
        const borderRadius = "100%";
        const style: CSSProperties = {
            top: handlerPosY,
            width: handleSize,
            height: handleSize,
            border: doScale(1, scale) + " solid " + color,
            borderRadius: 0,
            backgroundColor: color
        };
        if (position === Position.Left) {
            style.left = "-" + handlerPosX;
            style.borderBottomLeftRadius = borderRadius;
            style.borderTopLeftRadius = borderRadius;
        }
        if (position === Position.Right) {
            style.right = "-" + handlerPosX;
            style.borderBottomRightRadius = borderRadius;
            style.borderTopRightRadius = borderRadius;
        }

        if (markAsDisconnected) {
            style.backgroundColor = "white";
        }
        return style;
    };

    const calcHandleYPosition = (handleIndex: number): number => {
        return handleIndex * 15.942 + 48.48;
    };

    const exitHasCondition = (exit: SelectableExitModel) => {
        return exit.hideCondition && (exit.hideCondition.variableName !== "");
    };

    const zoomPanHelper = useZoomPanHelper();

    const focus = (e: MouseEvent) => {
        e.stopPropagation();
        zoomPanHelper.fitBounds(bounds, 0.2);
    };

    const onClickOnTreeActionNode = () => {
        undoableActionEditorSelectAction(action);
    };

    return (
        <>
            {isSelected && <SelectionBorder scale={scale} />}
            {action.$modelId === gameStore.debugStartNodeModelId && <ActiveNodeBorder scale={scale} />}
            {
                // == ACTION TREE MODEL ==
                subTree && (
                    <>
                        <TreeActionNodeContent
                            greyedOut={markAsDisconnected}
                            scale={scale}
                            selected={isSelected}
                            invalid={markAsInvalid}
                            color={color}
                            onClick={onClickOnTreeActionNode}
                        >
                            {!isSubTreeInHierarchy() && (
                                <>
                                    {subTreeProps && passComplexityGate(subTreeProps.complexityGate, localSettingsStore.editorComplexity) && (
                                        <FocusButton
                                            onClickCapture={focus}
                                        >
                                            <BsZoomIn size={"1.5em"} />
                                        </FocusButton>
                                    )}
                                    <DragHandle
                                        className="dragHandle"
                                    >
                                        <AiOutlineDrag size={"1.5em"} />
                                    </DragHandle>
                                </>
                            )}
                            {
                                !isRootNode && (
                                    <SubTreeIconBubble
                                        scale={scale}
                                        color={color}
                                        greyedOut={markAsDisconnected}
                                        selected={isSelected}
                                    >
                                        <FontAwesomeIcon icon={subTreeProps?.icon ? subTreeProps.icon as any : "align-justify"} />
                                    </SubTreeIconBubble>
                                )
                            }

                            {
                                !isSubTreeInHierarchy() && (
                                    <div>
                                        <ActionNodeHeader
                                            title={subTreeName}
                                            scale={scale}
                                        />
                                        <TreeActionNodeEntries scale={scale}>
                                            {
                                                subTree.enterActions.map((entry, index) =>
                                                    <div key={index}>
                                                        <ActionNodeParameterLabel
                                                            scale={scale}
                                                            align={"left"}
                                                        >
                                                            {entry.name.get(languageKey)}
                                                        </ActionNodeParameterLabel>
                                                    </div>
                                                )
                                            }
                                        </TreeActionNodeEntries>

                                        <TreeActionNodeExits scale={scale}>
                                            {
                                                subTree.exits().map((_, index) =>
                                                    <div key={index}>
                                                        <ActionNodeParameterLabel
                                                            scale={scale}
                                                            align={"right"}
                                                        >
                                                            {exitLabels[index]}
                                                        </ActionNodeParameterLabel>
                                                    </div>
                                                )
                                            }
                                        </TreeActionNodeExits>

                                        <TreeActionNodeParameters scale={scale}>
                                            {
                                                subTree.treeParameterActions().filter(p => p.showOnNode).map((p, index) =>
                                                    <div key={index}>
                                                        <ActionNodeParameterLabel
                                                            scale={scale}
                                                            align={"center"}
                                                        >
                                                            {p.name} = {p.value.get(languageKey, Gender.Neutral)}
                                                        </ActionNodeParameterLabel>
                                                    </div>
                                                )
                                            }
                                        </TreeActionNodeParameters>

                                        <ActionNodeDescription
                                            scale={scale}
                                            description={subTree.treePropertiesAction?.description.get(languageKey)}
                                        />
                                    </div>
                                )
                            }
                        </TreeActionNodeContent>
                        {
                            // enter sockets
                            !isRootNode && subTreeEntries.map((enterModel, index) =>
                                <ActionNodeHandle
                                    key={index}
                                    type="target"
                                    id={"f" + index}
                                    position={Position.Left}
                                    style={createHandleStyle(Position.Left, actionTreeValidationEnabled && !actionEditorStore.isInputSocketConnected(enterModel, currentActionSubTree.allActions), calcHandleYPosition(index))}
                                    nodeId={nodeId}
                                />
                            )
                        }
                        {
                            // exit sockets
                            !isRootNode && subTree.exits().map((exitModel, index) => (
                                <ActionNodeHandle
                                    key={index}
                                    type="source"
                                    id={"f" + index}
                                    position={Position.Right}
                                    style={createHandleStyle(Position.Right, actionTreeValidationEnabled && !exitModel.hasNextActions(), calcHandleYPosition(subTreeEntries.length + index))}
                                    nodeId={nodeId}
                                />
                            ))
                        }
                    </>
                )
            }

            {
                // == ACTION MODEL ==
                !subTree && (
                    <ActionNodeContent
                        greyedOut={markAsDisconnected}
                        scale={scale} selected={isSelected}
                        invalid={markAsInvalid}
                        color={color}
                        className="dragHandle"
                    >
                        {
                            actionNodeIcon(action) && (
                                <IconBubble
                                    scale={scale}
                                    color={color}
                                    selected={isSelected}
                                    greyedOut={markAsDisconnected}
                                >
                                    {actionNodeIcon(action)}
                                </IconBubble>
                            )
                        }
                        <ActionNodeHeader
                            title={t(action.title())}
                            description={description}
                            scale={scale}
                        />
                        {
                            !isNodeWithoutEntry && (
                                <ActionNodeHandle
                                    type="target"
                                    position={Position.Left}
                                    id="f"
                                    style={createHandleStyle(Position.Left, actionTreeValidationEnabled && !actionEditorStore.isInputSocketConnected(action, currentActionSubTree.allActions))}
                                    nodeId={nodeId}
                                />
                            )
                        }
                        {
                            (exits.length == 1 && !isDialogueWithAnswers) && (
                                <ActionNodeHandle
                                    type="source"
                                    id={"f0"}
                                    position={Position.Right}
                                    style={createHandleStyle(Position.Right, actionTreeValidationEnabled && !exits[0].hasNextActions())}
                                    nodeId={nodeId}
                                />
                            )
                        }
                        {
                            (exits.length > 1 || isDialogueWithAnswers) && (
                                <>
                                    {
                                        exits.map((exit, index) => (
                                            <div key={index}>
                                                {
                                                    exitLabels && (
                                                        <ActionNodeParameterLabel
                                                            scale={scale}
                                                            align={"right"}
                                                        >
                                                            {exitLabels[index]}
                                                        </ActionNodeParameterLabel>
                                                    )
                                                }
                                                {
                                                    !exitLabels && (
                                                        <ActionNodeParameterLabel
                                                            conditionSet={exitHasCondition(exit)}
                                                            scale={scale}
                                                            align={"right"}
                                                        >
                                                            {exit.value.get(languageKey)}
                                                        </ActionNodeParameterLabel>
                                                    )
                                                }
                                                <ActionNodeHandle
                                                    key={index}
                                                    type="source"
                                                    id={"f" + index}
                                                    position={Position.Right}
                                                    style={createHandleStyle(Position.Right, actionTreeValidationEnabled && !exit.hasNextActions(), calcHandleYPosition(index))}
                                                    nodeId={nodeId}
                                                />
                                            </div>
                                        ))
                                    }
                                </>
                            )
                        }
                    </ActionNodeContent>
                )
            }
        </>
    );
});