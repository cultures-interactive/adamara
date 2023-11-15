import React from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { UiConstants } from "../../../data/UiConstants";
import { gameStore, TaskMarkerColorPosition } from "../../../stores/GameStore";
import { gameCanvasSize } from "../../../data/gameConstants";

const Container = styled.div`
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    overflow: hidden;
    pointer-events: none;
`;

const TaskMarkerSvg = styled.svg`
    position: absolute;
    width: 654px;
    height: 654px;
    z-index: ${UiConstants.Z_INDEX_TASK_MARKERS};
`;

const taskMarkerHalfWidth = 16;
const taskMarkerHalfHeight = 27;

const minX = taskMarkerHalfWidth / 2;
const minY = taskMarkerHalfHeight / 1.2;
const maxX = gameCanvasSize.width - taskMarkerHalfWidth / 2;
const maxY = gameCanvasSize.height + taskMarkerHalfHeight / 4;

const centerX = (minX + maxX) / 2;
const centerY = (minY + maxY) / 2;

const centerMaxDistanceX = maxX - centerX;
const centerMaxDistanceY = maxY - centerY;

interface TaskMarkerProps {
    info: TaskMarkerColorPosition;
}

const TaskMarker: React.FunctionComponent<TaskMarkerProps> = observer(({ info }) => {
    const { mapOffsetX, mapOffsetY, mapScale } = gameStore;
    let x = info.x * mapScale + mapOffsetX;
    let y = info.y * mapScale + mapOffsetY;
    const color = info.color;

    // If the marker is not fully on the screen...
    if ((x < minX) || (x > maxX) || (y < minY) || (y > maxY)) {
        let dx = x - centerX;
        let dy = y - centerY;

        // ...reposition it so that it is, but keep the direction (instead of just clamping it)
        if (Math.abs(dx / centerMaxDistanceX) >= Math.abs(dy / centerMaxDistanceY)) {
            const newDX = Math.sign(dx) * centerMaxDistanceX;
            dy *= newDX / dx;
            dx = newDX;
        } else {
            const newDY = Math.sign(dy) * centerMaxDistanceY;
            dx *= newDY / dy;
            dy = newDY;
        }

        x = centerX + dx;
        y = centerY + dy;
    }

    return (
        <TaskMarkerSvg
            viewBox="0 0 5000 5000"
            style={{
                transform: `translate(${x - 16}px, ${y - 27}px)`
            }}
        >
            <rect
                x="60"
                y="40"
                width="100"
                height="100"
                fill="white"
            />
            <path
                d="M116.044,0c-52.469,0-95,42.531-95,95c0,52.469,95,137.088,95,137.088s95-84.619,95-137.088
	        C211.044,42.531,168.513,0,116.044,0z M116.044,138.01c-25.232,0-45.697-20.463-45.697-45.697c0-25.234,20.465-45.697,45.697-45.697
	        c25.234,0,45.697,20.463,45.697,45.697C161.741,117.547,141.278,138.01,116.044,138.01z"
                fill={color}
            />
        </TaskMarkerSvg>
    );
});

export const TaskMarkers: React.FunctionComponent = observer(() => {
    const { taskMarkers } = gameStore;

    return (
        <Container>
            {taskMarkers.map((info, i) => <TaskMarker key={i} info={info} />)}
        </Container>
    );
});