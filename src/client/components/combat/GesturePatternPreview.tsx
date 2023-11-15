import React from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { Gesture, GesturePatternModel } from '../../../shared/combat/gestures/GesturePatternModel';
import { LineGestureModel } from '../../../shared/combat/gestures/LineGestureModel';
import { CircleGestureModel } from '../../../shared/combat/gestures/CircleGestureModel';
import { gameCanvasSize } from "../../data/gameConstants";
import { gesturePatternViewOffset, screenToPatternCoordinatesFactor } from '../../stores/CombatStore';

const SvgWithoutBaseline = styled.svg`
    vertical-align: top;
`;

interface GesturePreviewProps {
    gesture: Gesture;
    offsetX: number;
    offsetY: number;
    scale: number;
}

export const GesturePreview: React.FunctionComponent<GesturePreviewProps> = observer(({ gesture, offsetX, offsetY, scale }) => {
    const gestureScale = scale * screenToPatternCoordinatesFactor;

    if (gesture instanceof LineGestureModel) {
        return (
            <line
                x1={offsetX + gesture.from.x * gestureScale}
                y1={offsetY + gesture.from.y * gestureScale}
                x2={offsetX + gesture.to.x * gestureScale}
                y2={offsetY + gesture.to.y * gestureScale}
                stroke="black"
                strokeWidth={2}
            />
        );
    }

    if (gesture instanceof CircleGestureModel) {
        return (
            <circle
                cx={offsetX + gesture.center.x * gestureScale}
                cy={offsetY + gesture.center.y * gestureScale}
                r={gesture.radius * gestureScale}
                stroke="black"
                strokeWidth={2}
                fill="none"
            />
        );
    }

    throw new Error("Not implemented");
});

interface Props {
    gesturePattern: GesturePatternModel;
    width: number;
}

export const GesturePatternPreview: React.FunctionComponent<Props> = observer(({ gesturePattern, width }) => {
    if (!gesturePattern)
        return null;

    const scale = width / gameCanvasSize.width;
    const height = gameCanvasSize.height * scale;

    const offsetX = scale * gesturePatternViewOffset.x;
    const offsetY = scale * gesturePatternViewOffset.y;

    return (
        <SvgWithoutBaseline width={width} height={height}>
            <rect
                width={width}
                height={height}
                stroke="black"
                strokeWidth={2}
                fill="white"
            />
            {/*
            <rect
                x={offsetX}
                y={offsetY}
                width={width - offsetX * 2}
                height={height - offsetY * 2}
                fill="white"
            />
            */}
            {gesturePattern.gestures.map((gesture) => (
                <GesturePreview
                    key={gesture.$modelId}
                    gesture={gesture}
                    offsetX={offsetX}
                    offsetY={offsetY}
                    scale={scale}
                />
            ))}
        </SvgWithoutBaseline>
    );
});
