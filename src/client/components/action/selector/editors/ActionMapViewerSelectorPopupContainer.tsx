import React, { CSSProperties, RefObject, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { selectorMapEditorStore } from "../../../../stores/MapEditorStore";
import styled from "styled-components";
import { MenuCard } from "../../../menu/MenuCard";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../../helper/pixiHelpers";

const Container = styled(MenuCard)`
    position: fixed;
    transform: translate(-100%, -50%);
    display: flex;
    flex-direction: column;
    max-height: 440px;
    gap: 5px;
    box-shadow: 2px 4px 8px 0 rgba(0,0,0,0.35);
`;

interface Props {
    canvasContainerRef: RefObject<HTMLDivElement>;
}

export const ActionMapViewerSelectorPopupContainer: React.FunctionComponent<Props> = observer(({ canvasContainerRef, children }) => {
    if (!selectorMapEditorStore.hasSelectedTile)
        return null;

    const { selectedTilePosition, mapState: { currentMapCenterX, currentMapCenterY, currentMapZoom } } = selectorMapEditorStore;

    const tileX = selectedTilePosition.x;
    const tileY = selectedTilePosition.y;

    const updatePosition = () => {
        const canvasContainer = canvasContainerRef.current;
        if (!canvasContainer)
            return null;

        const canvasRect = canvasContainer.getBoundingClientRect();

        const style: CSSProperties = {
            left: canvasRect.x + currentMapCenterX + tileToWorldPositionX(tileX, tileY, false) * currentMapZoom,
            top: canvasRect.y + currentMapCenterY + tileToWorldPositionY(tileX, tileY, true) * currentMapZoom
        };

        return style;
    };

    const [style, setStyle] = useState(updatePosition);

    useEffect(() => {
        setStyle(updatePosition());
    }, [canvasContainerRef.current, tileX, tileY, currentMapCenterX, currentMapCenterY, currentMapZoom]);

    if (!style)
        return null;

    return (
        <Container style={style}>
            {children}
        </Container>
    );
});