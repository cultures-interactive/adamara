import { observer } from 'mobx-react-lite';
import React, { MouseEvent, useEffect, useRef, useState } from 'react';
import { EdgeProps, getEdgeCenter, getMarkerEnd, Position } from 'react-flow-renderer';
import styled from 'styled-components';
import { UiConstants } from '../../data/UiConstants';
import { actionEdgeId } from '../../helper/reactHelpers';
import { ActionEditorChangeGroup, groupUndoableActionEditorChanges } from '../../stores/undo/operation/ActionEditorSubmitChangesOp';
import { ActionEdgeData, doScale, doScaleNumber, getBezierPathEx } from './actionEditorHelpers';
import { RiScissorsCutLine } from "react-icons/ri";
import { actionEditorStore } from '../../stores/ActionEditorStore';
import { localSettingsStore } from '../../stores/LocalSettingsStore';

interface ScaleProps {
    scale: number;
}

const DeleteButton = styled.button<ScaleProps>`
    color: #000000;
    font-size: ${props => doScale(14, props.scale)};
    width: ${props => doScale(18, props.scale)};
    height: ${props => doScale(18, props.scale)};
    border-radius: 100%;
    z-index: ${UiConstants.Z_INDEX_ACTION_EDITOR_EDGE_DELETE_BUTTON};
    pointer-events: all;
    cursor: pointer;
    &:hover {
        color: red;
    }
`;

const onEdgeClick = (event: MouseEvent, id: string) => {
    event.stopPropagation();
    const actionTree = actionEditorStore.currentActionSubTree;

    groupUndoableActionEditorChanges(ActionEditorChangeGroup.DeleteEdge, () => {
        actionTree.allActions.forEach(from => {
            from.exits().forEach((exit, exitIndex) => {
                exit.nextActions.forEach(to => {
                    if (actionEdgeId(from.$modelId, exitIndex, to) === id) {
                        exit.removeNextAction(to);
                    }
                });
            });
        });
    });
};

export const ActionEdge: React.FunctionComponent<EdgeProps<ActionEdgeData>> = observer(({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, data, arrowHeadType, markerEndId }) => {
    const { currentAction } = actionEditorStore;
    const [isHover, setIsHover] = useState(false);
    const scale = data.scale;
    const sourceIsTarget = source === target;
    const curvature = (sourceIsTarget ? 10 : 7) * 0.05 * Math.sqrt(scale * actionEditorStore.actionEditorUpscaleFactor);
    if (sourceIsTarget) {
        const offset = doScaleNumber(6.4, scale);

        sourceX -= offset * 2;
        sourcePosition = Position.Left;

        targetX += offset * 2;
        targetPosition = Position.Right;

        /*
        if (sourceY === targetY) {
            sourceX -= offset;
            sourceY += offset;
            sourcePosition = Position.Bottom;

            //targetX += offset;
            //targetY -= offset;
            //targetPosition = Position.Top;

            targetX += offset * 2;
            targetPosition = Position.Right;
        } else {
            sourceX -= offset * 2;
            sourcePosition = Position.Left;

            targetX += offset * 2;
            targetPosition = Position.Right;
        }
        */
    }
    const edgePath = getBezierPathEx({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature })[0];
    //const edgePath = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    const markerEnd = getMarkerEnd(arrowHeadType, markerEndId);
    const [edgeCenterX, edgeCenterY] = getEdgeCenter({ sourceX, sourceY, targetX, targetY });

    const { actionTreeValidationEnabled } = localSettingsStore;

    const showDetails = currentAction?.$modelId === source || currentAction?.$modelId === target;

    const foreignObjectSize = doScaleNumber(40, scale);
    const foreignObjectStyle: React.CSSProperties = { pointerEvents: 'none' };

    const markAsDisconnected = actionTreeValidationEnabled && actionEditorStore.shouldMarkAsDisconnected(data.fromAction, actionEditorStore.currentActionSubTree);
    const color = "#32CD32";
    style.strokeWidth = doScale(2, scale);
    style.stroke = color;
    style.opacity = markAsDisconnected ? 0.3 : 0.7;

    const styleHover = {
        ...style,
        strokeWidth: doScale(2, scale),
        stroke: UiConstants.COLOR_SELECTION_HIGHLIGHT
    } as React.CSSProperties;

    function onMouseEnterDisconnectButton() {
        setIsHover(true);
    }

    function onMouseLeaveDisconnectButton() {
        setIsHover(false);
    }

    const ref = useRef<SVGPathElement>();

    useEffect(() => {
        if (ref.current?.parentElement) {
            const svg = ref.current.parentElement.parentElement.parentElement;
            const defs = svg.children.item(0);
            const marker = defs.children.item(0);
            const polyline = marker.children.item(0);
            polyline.setAttribute("stroke", color);
            polyline.setAttribute("fill", color);
        }
    }, [ref.current?.parentElement, color]);

    return (
        <>
            <path
                id={id}
                ref={ref}
                style={isHover ? styleHover : style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
                onMouseEnter={onMouseEnterDisconnectButton}
                onMouseLeave={onMouseLeaveDisconnectButton}
            />
            {
                showDetails && (
                    <foreignObject
                        width={foreignObjectSize}
                        height={foreignObjectSize}
                        x={edgeCenterX - foreignObjectSize / 4.5}
                        y={edgeCenterY - foreignObjectSize / 4.5}
                        style={foreignObjectStyle}
                        requiredExtensions="http://www.w3.org/1999/xhtml"
                    >
                        <DeleteButton
                            scale={scale}
                            onClick={(event) => onEdgeClick(event, id)}
                            onMouseEnter={onMouseEnterDisconnectButton}
                            onMouseLeave={onMouseLeaveDisconnectButton}
                        >
                            <RiScissorsCutLine />
                        </DeleteButton>
                    </foreignObject>
                )
            }
        </>
    );
});
