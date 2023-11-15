import React from "react";
import { MenuCard } from "../menu/MenuCard";
import { MenuCardLabel } from "../menu/MenuCardLabel";
import { useTranslation } from "react-i18next";
import { MenuCardSubLabel } from "../menu/MenuCardSubLabel";
import { EditorTileInspectorLayer } from "./EditorTileInspectorLayer";
import { MapEditorStore } from "../../stores/MapEditorStore";
import { getChangeableTileDataSnapshot, getEmptyChangeableTileDataSnapshot, TileDataModel } from "../../../shared/game/TileDataModel";
import { getChangesToClearTilesToMakeWayForGroundTile, TileAssetChange, undoableMapEditorRemoveTiles, undoableMapEditorSwapTileLayers } from "../../stores/undo/operation/MapEditorSetTilesOp";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

const SectionContainer = styled.div`
    overflow: auto;
    border-radius: ${UiConstants.BORDER_RADIUS};
    border: solid 1px #888888;
`;

interface EditorTileInspectorProperties {
    mapEditorStore: MapEditorStore;
}

export const EditorTileInspector: React.FunctionComponent<EditorTileInspectorProperties> = observer(({ mapEditorStore }) => {
    const { t } = useTranslation();

    const groundTileData = mapEditorStore.selectedGroundTileDataWithGapsDirectOnly;
    const decorationTileDataNonFlat = mapEditorStore.selectedDecorationTileDataNonFlat;
    const decorationTileDataFlatX = mapEditorStore.selectedDecorationTileDataFlatX;
    const decorationTileDataFlatY = mapEditorStore.selectedDecorationTileDataFlatY;
    const decorationTileDataFlatZ = mapEditorStore.selectedDecorationTileDataFlatZ;
    const overlappingGroundTilesFromDifferentLayer = mapEditorStore.selectedOverlappingGroundTilesFromDifferentLayer;

    const moveGroundLayer = (tileData: TileDataModel, newLayer: number) => {
        const { x, y, plane, layer: currentLayer } = tileData.position;
        const changes = new Array<TileAssetChange>();

        // Clear current tile
        changes.push({
            position: { x, y, layer: currentLayer },
            newData: getEmptyChangeableTileDataSnapshot()
        });

        // Move tile to new layer
        changes.push({
            position: { x, y, layer: newLayer },
            newData: getChangeableTileDataSnapshot(tileData)
        });

        // Clear all tiles that would be in the way of this new ground tile
        changes.push(...getChangesToClearTilesToMakeWayForGroundTile(mapEditorStore.currentMapStore, tileData.tileAssetId, x, y, plane, newLayer));

        undoableMapEditorSwapTileLayers(mapEditorStore.currentMapStore, plane, changes);
    };

    const deleteLayer = (tileData: TileDataModel) => {
        const tileAssetToChange: TileAssetChange[] = [{
            position: tileData.position,
            newData: getEmptyChangeableTileDataSnapshot()
        }];
        undoableMapEditorRemoveTiles(mapEditorStore.currentMapStore, tileData.position.plane, tileAssetToChange);
    };

    const { complexityShowLayerMinusOne, complexityUseTileConflictResolution, selectedTilePosition } = mapEditorStore;
    const { x, y, plane } = selectedTilePosition;

    return (
        <MenuCard>
            <MenuCardLabel>{t("editor.tile_selected")}</MenuCardLabel>
            {t("editor.position")} {`x: ${x} y: ${y} height: ${plane}`}
            {mapEditorStore.currentMapStore.isUserAllowedToEditCurrentMap && <>
                {decorationTileDataNonFlat.length > 0 && (
                    <>
                        {/* Non-Flat Decoration Layers */}
                        <MenuCardSubLabel>{t("editor.tile_inspector_decoration_non_flat")}:</MenuCardSubLabel>
                        <SectionContainer>
                            {decorationTileDataNonFlat.map((tileData, index) => (
                                tileData && (
                                    <EditorTileInspectorLayer
                                        mapEditorStore={mapEditorStore}
                                        key={index}
                                        tileData={tileData}
                                        swapUp={null}
                                        swapDown={null}
                                        delete={deleteLayer}
                                        showConflictResolutionOriginEditor={complexityUseTileConflictResolution}
                                        showConflictResolutionZIndexEditor={false}
                                        showOffsetOverride={true}
                                    />
                                )
                            ))}
                        </SectionContainer>
                    </>
                )}
                {decorationTileDataFlatX.length > 0 && (
                    <>
                        {/* Flat X Decoration Layers */}
                        <MenuCardSubLabel>{t("editor.tile_inspector_decoration_flat_x")}:</MenuCardSubLabel>
                        <SectionContainer>
                            {decorationTileDataFlatX.map((tileData, index) => (
                                tileData && (
                                    <EditorTileInspectorLayer
                                        mapEditorStore={mapEditorStore}
                                        key={index}
                                        tileData={tileData}
                                        swapUp={null}
                                        swapDown={null}
                                        delete={deleteLayer}
                                        showConflictResolutionOriginEditor={false}
                                        showConflictResolutionZIndexEditor={complexityUseTileConflictResolution}
                                        showOffsetOverride={true}
                                    />
                                )
                            ))}
                        </SectionContainer>
                    </>
                )}
                {decorationTileDataFlatY.length > 0 && (
                    <>
                        {/* Flat Y Decoration Layers */}
                        <MenuCardSubLabel>{t("editor.tile_inspector_decoration_flat_y")}:</MenuCardSubLabel>
                        <SectionContainer>
                            {decorationTileDataFlatY.map((tileData, index) => (
                                tileData && (
                                    <EditorTileInspectorLayer
                                        mapEditorStore={mapEditorStore}
                                        key={index}
                                        tileData={tileData}
                                        swapUp={null}
                                        swapDown={null}
                                        delete={deleteLayer}
                                        showConflictResolutionOriginEditor={false}
                                        showConflictResolutionZIndexEditor={complexityUseTileConflictResolution}
                                        showOffsetOverride={true}
                                    />
                                )
                            ))}
                        </SectionContainer>
                    </>
                )}
                {decorationTileDataFlatZ.length > 0 && (
                    <>
                        {/* Flat Z Decoration Layers */}
                        <MenuCardSubLabel>{t("editor.tile_inspector_decoration_flat_z")}:</MenuCardSubLabel>
                        <SectionContainer>
                            {decorationTileDataFlatZ.map((tileData, index) => (
                                tileData && (
                                    <EditorTileInspectorLayer
                                        mapEditorStore={mapEditorStore}
                                        key={index}
                                        tileData={tileData}
                                        swapUp={null}
                                        swapDown={null}
                                        delete={deleteLayer}
                                        showConflictResolutionOriginEditor={false}
                                        showConflictResolutionZIndexEditor={complexityUseTileConflictResolution}
                                        showOffsetOverride={true}
                                    />
                                )
                            ))}
                        </SectionContainer>
                    </>
                )}
                {groundTileData.some(tileData => tileData != null) && (
                    <>
                        {/* Ground Layers */}
                        <MenuCardSubLabel>{t("editor.tile_inspector_ground")}:</MenuCardSubLabel>
                        <SectionContainer>
                            {groundTileData.map((tileData, index) => (
                                (tileData || complexityShowLayerMinusOne) && (
                                    <EditorTileInspectorLayer
                                        mapEditorStore={mapEditorStore}
                                        key={index}
                                        index={index}
                                        tileData={tileData != null ? tileData : null}
                                        swapDown={((index === 0) && complexityShowLayerMinusOne) ? () => moveGroundLayer(tileData, tileData.position.layer - 1) : null}
                                        swapUp={((index === 1) && complexityShowLayerMinusOne) ? () => moveGroundLayer(tileData, tileData.position.layer + 1) : null}
                                        delete={deleteLayer}
                                        showConflictResolutionOriginEditor={false}
                                        showConflictResolutionZIndexEditor={false}
                                    />
                                )
                            ))}
                        </SectionContainer>
                    </>
                )}
                {overlappingGroundTilesFromDifferentLayer.some(tileData => tileData != null) && (
                    <>
                        {/* Overlapping Ground Layers */}
                        <MenuCardSubLabel>{t("editor.tile_inspector_ground_overlapping")}:</MenuCardSubLabel>
                        <SectionContainer>
                            {overlappingGroundTilesFromDifferentLayer.map((tileData, index) => (
                                <EditorTileInspectorLayer
                                    mapEditorStore={mapEditorStore}
                                    key={index}
                                    index={index}
                                    tileData={tileData != null ? tileData : null}
                                    swapUp={null}
                                    swapDown={null}
                                    delete={deleteLayer}
                                    showConflictResolutionOriginEditor={true}
                                    showConflictResolutionZIndexEditor={false}
                                />
                            ))}
                        </SectionContainer>
                    </>
                )}
            </>}
        </MenuCard>
    );
});