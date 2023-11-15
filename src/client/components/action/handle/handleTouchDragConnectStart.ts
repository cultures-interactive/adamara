import { TouchEvent as ReactTouchEvent } from 'react';
import { ConnectionMode, ElementId, HandleType, OnConnectEndFunc, OnConnectFunc, OnConnectStartFunc, OnConnectStopFunc } from 'react-flow-renderer';
import { globalActionEditorEvents } from './globalActionEditorEvents';
import { SetSourceIdFunc, SetPosition, checkElementBelowIsValid, getHostForElement, resetRecentHandle, ValidConnectionFunc } from './handleUtilsAndTypes';

// This is mostly taken from react-flow:9.7.4's src\components\Handle\handler.ts
//
// Changes:
// - Renamed onMouseDown to handleTouchDragStart
// - Changed MouseEvent to ReactTouchEvent/TouchEvent respectively
// - Events:
//   - mousemove -> touchmove
//   - mouseup -> touchend
//   - added touchcancel
// - Moved code from mouseup into cleanup so it can be called from touchcancel too
// - Added code to get clientX/clientY from touch events
// - Commented out all event handlers that took MouseEvents (since we don't have one - if they become necessary, we should probably
//   artificially create one as described here: https://developer.mozilla.org/en-US/docs/Web/API/Touch_events#handling_clicks)

export function handleTouchDragConnectStart(
    event: ReactTouchEvent,
    handleId: ElementId | null,
    nodeId: ElementId,
    setConnectionNodeId: SetSourceIdFunc,
    setPosition: SetPosition,
    onConnect: OnConnectFunc,
    isTarget: boolean,
    isValidConnection: ValidConnectionFunc,
    connectionMode: ConnectionMode,
    elementEdgeUpdaterType?: HandleType,
    onEdgeUpdateEnd?: (evt: MouseEvent) => void,
    onConnectStart?: OnConnectStartFunc,
    onConnectStop?: OnConnectStopFunc,
    onConnectEnd?: OnConnectEndFunc
): void {
    const reactFlowNode = (event.target as Element).closest('.react-flow');
    // when react-flow is used inside a shadow root we can't use document
    const doc = getHostForElement(event.target as HTMLElement);

    if (!doc) {
        return;
    }

    if (event.touches.length > 1)
        return;

    const touch = event.changedTouches[0];

    const elementBelow = doc.elementFromPoint(touch.clientX, touch.clientY);
    const elementBelowIsTarget = elementBelow?.classList.contains('target');
    const elementBelowIsSource = elementBelow?.classList.contains('source');

    if (!reactFlowNode || (!elementBelowIsTarget && !elementBelowIsSource && !elementEdgeUpdaterType)) {
        return;
    }

    const handleType = elementEdgeUpdaterType ? elementEdgeUpdaterType : elementBelowIsTarget ? 'target' : 'source';
    const containerBounds = reactFlowNode.getBoundingClientRect();
    let recentHoveredHandle: Element;

    setPosition({
        x: touch.clientX - containerBounds.left,
        y: touch.clientY - containerBounds.top,
    });

    setConnectionNodeId({ connectionNodeId: nodeId, connectionHandleId: handleId, connectionHandleType: handleType });
    //onConnectStart?.(event, { nodeId, handleId, handleType });

    function onTouchMove(event: TouchEvent) {
        const touch = event.changedTouches[0];

        setPosition({
            x: touch.clientX - containerBounds.left,
            y: touch.clientY - containerBounds.top,
        });

        const { connection, elementBelow, isValid, isHoveringHandle } = checkElementBelowIsValid(
            touch,
            connectionMode,
            isTarget,
            nodeId,
            handleId,
            isValidConnection,
            doc
        );

        if (!isHoveringHandle) {
            return resetRecentHandle(recentHoveredHandle);
        }

        const isOwnHandle = connection.source === connection.target;

        if (!isOwnHandle && elementBelow) {
            recentHoveredHandle = elementBelow;
            elementBelow.classList.add('react-flow__handle-connecting');
            elementBelow.classList.toggle('react-flow__handle-valid', isValid);
        }
    }

    function onTouchEnd(event: TouchEvent) {
        const touch = event.changedTouches[0];

        const { connection, isValid } = checkElementBelowIsValid(
            touch,
            connectionMode,
            isTarget,
            nodeId,
            handleId,
            isValidConnection,
            doc
        );

        //onConnectStop?.(event);

        if (isValid) {
            onConnect?.(connection);
        }

        //onConnectEnd?.(event);

        /*
        if (elementEdgeUpdaterType && onEdgeUpdateEnd) {
            onEdgeUpdateEnd(event);
        }
        */

        cleanup();
    }

    function onCancel() {
        //onConnectStop?.(event);
        cleanup();
    }

    function cleanup() {
        resetRecentHandle(recentHoveredHandle);
        setConnectionNodeId({ connectionNodeId: null, connectionHandleId: null, connectionHandleType: null });

        doc.removeEventListener('touchmove', onTouchMove as EventListenerOrEventListenerObject);
        doc.removeEventListener('touchend', onTouchEnd as EventListenerOrEventListenerObject);
        doc.removeEventListener('touchcancel', onCancel as EventListenerOrEventListenerObject);
        doc.removeEventListener('touchstart', onCancel as EventListenerOrEventListenerObject);
        globalActionEditorEvents.removeListener("onMove", onCancel);
    }

    doc.addEventListener('touchmove', onTouchMove as EventListenerOrEventListenerObject);
    doc.addEventListener('touchend', onTouchEnd as EventListenerOrEventListenerObject);
    doc.addEventListener('touchcancel', onCancel as EventListenerOrEventListenerObject);
    doc.addEventListener('touchstart', onCancel as EventListenerOrEventListenerObject);
    globalActionEditorEvents.addListener("onMove", onCancel);
}