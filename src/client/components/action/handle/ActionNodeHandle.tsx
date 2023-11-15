import { observer } from 'mobx-react-lite';
import React, { CSSProperties, TouchEvent, useCallback } from 'react';
import { Connection, ElementId, Handle, HandleType, Position, useStoreActions, useStoreState } from 'react-flow-renderer';
import styled, { css, keyframes } from 'styled-components';
import { UiConstants } from '../../../data/UiConstants';
import { actionEditorStore } from '../../../stores/ActionEditorStore';
import { handleClickConnect } from './handleClickConnect';
import { handleTouchDragConnectStart } from './handleTouchDragConnectStart';
import { SetSourceIdFunc, SetPosition } from './handleUtilsAndTypes';

const pulse = keyframes`
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }

  100% {
    opacity: 1;
  }
`;

interface StyledHandleProps {
    $isClickConnectionSource: boolean;
    $isPotentialClickConnectionTarget: boolean;
}

const StyledHandle = styled(Handle) <StyledHandleProps>`
    ${(props) => (props.$isClickConnectionSource && css`background-color: ${UiConstants.COLOR_CLICK_CONNECT_SELECTION};`)}
    ${(props) => (props.$isPotentialClickConnectionTarget) && css`animation: ${pulse} 1s linear infinite;`}
    ${(props) => (props.$isPotentialClickConnectionTarget && css`background-color: ${UiConstants.COLOR_CLICK_CONNECT_TARGET};`)}
`;

interface Props {
    nodeId: ElementId;
    type: HandleType;
    id: string;
    position: Position;
    style: CSSProperties;
}

export const ActionNodeHandle: React.FunctionComponent<Props> = observer(({
    nodeId,
    id,
    type,
    style,
    ...rest
}) => {
    const isValidConnection = () => true;

    //const nodeId = useContext(NodeIdContext) as ElementId;
    const setPosition = useStoreActions((actions) => actions.setConnectionPosition);
    const setConnectionNodeId = useStoreActions((actions) => actions.setConnectionNodeId);
    const onConnectAction = useStoreState((state) => state.onConnect);
    const onConnectStart = useStoreState((state) => state.onConnectStart);
    const onConnectStop = useStoreState((state) => state.onConnectStop);
    const onConnectEnd = useStoreState((state) => state.onConnectEnd);
    const connectionMode = useStoreState((state) => state.connectionMode);
    const handleId = id || null;
    const isTarget = type === 'target';

    const onConnectExtended = useCallback(
        (params: Connection) => {
            onConnectAction?.(params);
        },
        [onConnectAction]
    );

    const onTouchStart = useCallback(
        (event: TouchEvent) => {
            handleTouchDragConnectStart(
                event,
                handleId,
                nodeId,
                setConnectionNodeId as unknown as SetSourceIdFunc,
                setPosition as unknown as SetPosition,
                onConnectExtended,
                isTarget,
                isValidConnection,
                connectionMode,
                undefined,
                undefined,
                onConnectStart,
                onConnectStop,
                onConnectEnd
            );
        },
        [
            handleId,
            nodeId,
            setConnectionNodeId,
            setPosition,
            onConnectExtended,
            isTarget,
            isValidConnection,
            connectionMode,
            onConnectStart,
            onConnectStop,
            onConnectEnd,
        ]
    );

    const onClick = useCallback(
        () => {
            handleClickConnect(
                handleId,
                nodeId,
                onConnectExtended,
                isTarget,
                isValidConnection
            );
        },
        [
            handleId,
            nodeId,
            onConnectExtended,
            isTarget,
            isValidConnection
        ]
    );

    let isClickConnectionSource = false;
    let isPotentialClickConnectionTarget = false;

    const { clickConnectionData } = actionEditorStore;
    if (clickConnectionData) {
        if ((isTarget !== clickConnectionData.isTarget)) {
            isPotentialClickConnectionTarget = true;
        }
        else if ((nodeId === clickConnectionData.nodeId) && (handleId === clickConnectionData.handleId)) {
            isClickConnectionSource = true;
        }
    }

    return (
        <StyledHandle
            id={id}
            type={type}
            style={style}
            {...rest}
            onTouchStart={onTouchStart}
            onClick={onClick}
            $isClickConnectionSource={isClickConnectionSource}
            $isPotentialClickConnectionTarget={isPotentialClickConnectionTarget}
        />
    );
});