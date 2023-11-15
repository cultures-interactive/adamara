import React from 'react';
import { ConnectionLineComponent, getBezierPath, useStoreState } from 'react-flow-renderer';

export const ActionConnectionLine: ConnectionLineComponent = ({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }) => {
    const edgePath = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    const [, , zoom] = useStoreState((state) => state.transform);
    const width = 2 / zoom;

    return (
        <g>
            <path
                fill="none"
                stroke="#222"
                strokeWidth={width}
                d={edgePath}
            />
        </g>
    );
};