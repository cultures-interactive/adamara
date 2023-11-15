import { Connection, SetConnectionId, XYPosition, ConnectionMode, ElementId } from "react-flow-renderer";

// This is directly taken from react-flow:9.7.4 from various files.
//
// Changes:
// - checkElementBelowIsValid
//   - Changed the "event" parameter from MouseEvent to a more narrow signature so it can take a Touch too
//   - Changed the TODO comment so it doesn't pop up in the TODO list in the IDE anymore

export type ValidConnectionFunc = (connection: Connection) => boolean;
export type SetSourceIdFunc = (params: SetConnectionId) => void;
export type SetPosition = (pos: XYPosition) => void;

type Result = {
    elementBelow: Element | null;
    isValid: boolean;
    connection: Connection;
    isHoveringHandle: boolean;
};

// checks if element below mouse is a handle and returns connection in form of an object { source: 123, target: 312 }
export function checkElementBelowIsValid(
    event: { clientX: number; clientY: number; },
    connectionMode: ConnectionMode,
    isTarget: boolean,
    nodeId: ElementId,
    handleId: ElementId | null,
    isValidConnection: ValidConnectionFunc,
    doc: Document | ShadowRoot
) {
    // TO-DO [from react-flow]: why does this throw an error? elementFromPoint should be available for ShadowRoot too
    const elementBelow = doc.elementFromPoint(event.clientX, event.clientY);
    const elementBelowIsTarget = elementBelow?.classList.contains('target') || false;
    const elementBelowIsSource = elementBelow?.classList.contains('source') || false;

    const result: Result = {
        elementBelow,
        isValid: false,
        connection: { source: null, target: null, sourceHandle: null, targetHandle: null },
        isHoveringHandle: false,
    };

    if (elementBelow && (elementBelowIsTarget || elementBelowIsSource)) {
        result.isHoveringHandle = true;

        // in strict mode we don't allow target to target or source to source connections
        const isValid =
            connectionMode === ConnectionMode.Strict
                ? (isTarget && elementBelowIsSource) || (!isTarget && elementBelowIsTarget)
                : true;

        if (isValid) {
            const elementBelowNodeId = elementBelow.getAttribute('data-nodeid');
            const elementBelowHandleId = elementBelow.getAttribute('data-handleid');
            const connection: Connection = isTarget
                ? {
                    source: elementBelowNodeId,
                    sourceHandle: elementBelowHandleId,
                    target: nodeId,
                    targetHandle: handleId,
                }
                : {
                    source: nodeId,
                    sourceHandle: handleId,
                    target: elementBelowNodeId,
                    targetHandle: elementBelowHandleId,
                };

            result.connection = connection;
            result.isValid = isValidConnection(connection);
        }
    }

    return result;
}

export function resetRecentHandle(hoveredHandle: Element): void {
    hoveredHandle?.classList.remove('react-flow__handle-valid');
    hoveredHandle?.classList.remove('react-flow__handle-connecting');
}

export const getHostForElement = (element: HTMLElement): Document | ShadowRoot =>
    (element.getRootNode?.() as Document | ShadowRoot) || window?.document;
