import { Connection, ElementId, OnConnectFunc } from 'react-flow-renderer';
import { actionEditorStore } from '../../../stores/ActionEditorStore';
import { ValidConnectionFunc } from './handleUtilsAndTypes';

export interface ClickConnectionData {
    nodeId: ElementId;
    handleId: ElementId;
    isTarget: boolean;
}

export function handleClickConnect(
    handleId: ElementId | null,
    nodeId: ElementId,
    onConnect: OnConnectFunc,
    isTarget: boolean,
    isValidConnection: ValidConnectionFunc
): void {
    const { clickConnectionData } = actionEditorStore;

    if (clickConnectionData) {
        if (isTarget !== clickConnectionData.isTarget) {
            const connection: Connection = isTarget
                ? {
                    source: clickConnectionData.nodeId,
                    sourceHandle: clickConnectionData.handleId,
                    target: nodeId,
                    targetHandle: handleId,
                }
                : {
                    source: nodeId,
                    sourceHandle: handleId,
                    target: clickConnectionData.nodeId,
                    targetHandle: clickConnectionData.handleId,
                };

            if (isValidConnection) {
                onConnect(connection);
                return;
            }
        } else if ((nodeId === clickConnectionData.nodeId) && (handleId === clickConnectionData.handleId)) {
            actionEditorStore.clearClickActions();
            return;
        }
    }

    actionEditorStore.setClickConnectionData({ nodeId, handleId, isTarget });
}