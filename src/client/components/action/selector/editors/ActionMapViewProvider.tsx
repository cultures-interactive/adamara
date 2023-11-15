import React, { useRef } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { TileInspector } from "../../../mapEditor/TileInspector";
import { selectorMapEditorStore } from "../../../../stores/MapEditorStore";
import { LoadingSpinner } from "../../../shared/LoadingSpinner";
import { useTranslation } from "react-i18next";
import { ActionMapContainer } from "./ActionMapContainer";
import { ActionMapViewerSelectorPopup } from "./ActionMapViewerSelectorPopup";
import { SelectedMapElementsAndSelectElementsProps } from "./ActionMapViewerSelectorButtonFromElement";

const SpinnerContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
`;

export const ActionMapViewProvider: React.FunctionComponent<SelectedMapElementsAndSelectElementsProps> = observer(({
    selectedMapElements,
    selectElement
}) => {
    const { t } = useTranslation();
    const canvasContainerRef = useRef<HTMLDivElement>();

    const { currentMapStore } = selectorMapEditorStore;
    if (currentMapStore.runningMapOperation) {
        return <SpinnerContainer><LoadingSpinner />{t("game.map_loading")}</SpinnerContainer>;
    }

    const { hasCurrentMap } = currentMapStore;
    if (!hasCurrentMap)
        return null;

    return (
        <>
            <div ref={canvasContainerRef} />
            <ActionMapContainer />
            <TileInspector
                mapEditorStore={selectorMapEditorStore}
                hideEditorTileInspector={true}
            />
            <ActionMapViewerSelectorPopup
                selectedMapElements={selectedMapElements}
                selectElement={selectElement}
                canvasContainerRef={canvasContainerRef}
            />
        </>
    );
});