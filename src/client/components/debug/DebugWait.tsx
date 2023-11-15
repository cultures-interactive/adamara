import React from 'react';
import { undoableDebugWait } from '../../stores/undo/operation/DebugWaitOp';

interface DebugLineProps {
    lineLabel: string;
    failExecute: boolean;
    failUndo: boolean;
    failRedo: boolean;
}

const DebugLine: React.FunctionComponent<DebugLineProps> = ({ lineLabel, failExecute, failUndo, failRedo }) => {
    return (
        <tr>
            <td>
                {lineLabel}
            </td>
            <td>
                {/*
                <button onClick={() => undoableDebugWait(2, true, failExecute, failUndo, failRedo)}>2s blocking</button>
                <button onClick={() => undoableDebugWait(5, true, failExecute, failUndo, failRedo)}>5s blocking</button>
                */}
                <button onClick={() => undoableDebugWait(2, false, failExecute, failUndo, failRedo)}>2s non-blocking</button>
                <button onClick={() => undoableDebugWait(5, false, failExecute, failUndo, failRedo)}>5s non-blocking</button>
            </td>
        </tr>
    );
};

export const DebugWait: React.FunctionComponent = () => {
    return (
        <table>
            <tbody>
                <DebugLine lineLabel="" failExecute={false} failUndo={false} failRedo={false} />
                <DebugLine lineLabel="Fail execute" failExecute={true} failUndo={false} failRedo={false} />
                <DebugLine lineLabel="Fail undo" failExecute={false} failUndo={true} failRedo={false} />
                <DebugLine lineLabel="Fail redo" failExecute={false} failUndo={false} failRedo={true} />
            </tbody>
        </table>
    );
};
