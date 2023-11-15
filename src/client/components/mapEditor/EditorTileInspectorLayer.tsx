import React from "react";
import { useTranslation } from "react-i18next";
import { TileDataModel } from "../../../shared/game/TileDataModel";
import styled, { CSSProperties } from "styled-components";
import { ListItem } from "../menu/ListItem";
import { BiDownArrow, BiUpArrow } from "react-icons/bi";
import { AiFillDelete } from "react-icons/ai";
import { UiConstants } from "../../data/UiConstants";
import { executableUndoableMapEditorSetTileInteractionTriggerStatus } from "../../stores/undo/operation/MapEditorSetTileInteractionTriggerData";
import { observer } from "mobx-react-lite";
import { conflictResolutionOriginStep, tileMaxOffsetXY, tileOffsetAndSizeStep } from "../../../shared/data/mapElementSorting";
import { FloatInputField } from "../shared/FloatInputField";
import { undoableMapEditorResetTileConflictResolutionOriginOverride, undoableMapEditorResetTileOffsetOverride, undoableMapEditorSetAdditionalTileOffsetX, undoableMapEditorSetAdditionalTileOffsetY, undoableMapEditorSetAdditionalTileOffsetZ, undoableMapEditorSetTileConflictResolutionFlatZIndex, undoableMapEditorSetTileConflictResolutionOriginOverride } from "../../stores/undo/operation/MapEditorSetTileConflictResolutionValue";
import { clamp } from "curve-interpolator";
import { MapEditorStore } from "../../stores/MapEditorStore";
import { IntInputField } from "../shared/IntInputField";
import { GrClear } from "react-icons/gr";
import { getTileLayerType } from "../../../shared/data/layerConstants";
import { TileLayerType } from "../../../shared/resources/TileLayerType";
import { MathE } from "../../../shared/helper/MathExtension";
import { sharedStore } from "../../stores/SharedStore";

interface EditorTileInspectorLayerProperties {
    mapEditorStore: MapEditorStore;
    tileData: TileDataModel;
    index?: number;
    swapUp: (tileData: TileDataModel) => void;
    swapDown: (tileData: TileDataModel) => void;
    delete: (tileData: TileDataModel) => void;
    showOffsetOverride?: boolean;
    disabledOffsetOverrideX?: boolean;
    disabledOffsetOverrideY?: boolean;
    disabledOffsetOverrideZ?: boolean;
    showConflictResolutionOriginEditor?: boolean;
    showConflictResolutionZIndexEditor?: boolean;
}

const LayerContainer = styled(ListItem)`
    cursor: default;
`;

const Line = styled.div`
    display: flex;
`;

const LayerTypeInfo = styled.span`
    margin-right: 6px;
`;

const ChangeDetails = styled.div`
    margin-left: 20px;
`;

const ButtonContainer = styled.span`
    margin-left: auto;
`;

const TileAssetId = styled.span`
    max-width: 170px;
    display: inline-block;
    overflow-x: clip;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

interface IndicatorStyle {
    isSet: boolean;
}

const BackgroundIndicator = styled.div<IndicatorStyle>`
    display: flex;
    width: 14px;
    background: ${props => props.isSet ? '#7e7e7e' : 'unset'};
    height: 14px;
    border: 1px;
    border-color: black;
    border-style: solid;
    align-items: center;
    justify-content: center;
    margin-top: 1px;
`;

const ForegroundIndicator = styled.div<IndicatorStyle>`
    width: 65%;
    background: ${props => props.isSet ? '#0e0d0d' : 'white'};
    height: 65%;
    border: 1px;
    border-color: black;
    border-style: solid;
`;

export const LayerEditButton = styled.button`
    border: none;
    cursor: pointer;
    background: none;
    width: 20px;
    &:hover {
        color: ${() => UiConstants.COLOR_DARK_BUTTON_HOVER};
    }
    &:active {
        color: ${() => UiConstants.COLOR_SELECTION_HIGHLIGHT};
    }
`;

const SwapDownButton = styled(LayerEditButton)`
    margin-right: 20px;
`;

const ClearButton = styled(LayerEditButton)`
    vertical-align: text-top;
`;

const InteractionTriggerSection = styled.div`
    margin-top: 5px;
`;

export const LayerDeleteButton = styled(LayerEditButton)`
    color: red;
    &:hover {
        color: darkred;
    }
`;

const overrideStyle: CSSProperties = {
};

const nonOverrideStyle: CSSProperties = {
    color: "#AAA"
};

const offsetPrecision = 100;
const adjustOffsetPrecision = (value: number) => MathE.adjustPrecision(value, offsetPrecision);

export const EditorTileInspectorLayer: React.FunctionComponent<EditorTileInspectorLayerProperties> = observer((properties) => {
    const { t } = useTranslation();
    const { tileData, mapEditorStore } = properties;
    const { currentMapStore } = mapEditorStore;

    if (!tileData) {
        return (
            <LayerContainer>
                <Line>
                    <LayerTypeInfo>
                        <BackgroundIndicator isSet={false}>
                            <ForegroundIndicator isSet={false} />
                        </BackgroundIndicator>
                    </LayerTypeInfo>
                    <TileAssetId>{t("editor.empty")}</TileAssetId>
                </Line>
            </LayerContainer>
        );
    }

    const { layer } = tileData.position;
    const { hasConflictResolutionOriginOverride } = tileData;

    const isDecoration = getTileLayerType(layer) === TileLayerType.Decoration;

    const tileAsset = sharedStore.getTileAsset(tileData.tileAssetId);

    const conflictResolutionOrigin = hasConflictResolutionOriginOverride
        ? tileData.conflictResolutionOriginOverride
        : tileAsset?.conflictResolutionOrigin;

    return (
        <LayerContainer>
            <Line>
                <LayerTypeInfo>
                    <BackgroundIndicator isSet={sharedStore.getTileAsset(tileData.tileAssetId)?.imageAssets[0] !== null}>
                        <ForegroundIndicator isSet={sharedStore.getTileAsset(tileData.tileAssetId)?.imageAssets[2] !== null} />
                    </BackgroundIndicator>
                </LayerTypeInfo>

                <TileAssetId>{tileData.tileAssetId}</TileAssetId>

                <ButtonContainer>
                    {properties.swapDown &&
                        <SwapDownButton onClick={() => { properties.swapDown(tileData); }}>
                            <BiDownArrow />
                        </SwapDownButton>
                    }
                    {properties.swapUp &&
                        <LayerEditButton onClick={() => { properties.swapUp(tileData); }}>
                            <BiUpArrow />
                        </LayerEditButton>
                    }

                    <LayerDeleteButton onClick={() => { properties.delete(tileData); }}><AiFillDelete /></LayerDeleteButton>
                </ButtonContainer>
            </Line>

            <Line>
                <ChangeDetails>
                    {properties.showOffsetOverride && (
                        <span>
                            <FloatInputField
                                style={{ width: "3.5em", ...((tileData.additionalOffsetX !== 0) ? overrideStyle : nonOverrideStyle) }}
                                value={adjustOffsetPrecision(tileData.additionalOffsetX + tileAsset?.offsetX)}
                                onlyPositive={true}
                                step={tileOffsetAndSizeStep}
                                min={0}
                                max={tileMaxOffsetXY}
                                onChange={value => undoableMapEditorSetAdditionalTileOffsetX(currentMapStore, tileData, clamp(adjustOffsetPrecision(value), 0, tileMaxOffsetXY) - tileAsset?.offsetX)}
                            />
                            <FloatInputField
                                style={{ width: "3.5em", ...((tileData.additionalOffsetY !== 0) ? overrideStyle : nonOverrideStyle) }}
                                value={adjustOffsetPrecision(tileData.additionalOffsetY + tileAsset?.offsetY)}
                                onlyPositive={true}
                                step={tileOffsetAndSizeStep}
                                min={0}
                                max={tileMaxOffsetXY}
                                onChange={value => undoableMapEditorSetAdditionalTileOffsetY(currentMapStore, tileData, clamp(adjustOffsetPrecision(value), 0, tileMaxOffsetXY) - tileAsset?.offsetY)}
                            />
                            <FloatInputField
                                style={{ width: "3.5em", ...((tileData.additionalOffsetZ !== 0) ? overrideStyle : nonOverrideStyle) }}
                                value={adjustOffsetPrecision(tileData.additionalOffsetZ + tileAsset?.internalOffsetZ)}
                                onlyPositive={true}
                                step={tileOffsetAndSizeStep}
                                min={0}
                                onChange={value => undoableMapEditorSetAdditionalTileOffsetZ(currentMapStore, tileData, Math.max(adjustOffsetPrecision(value), 0) - tileAsset?.internalOffsetZ)}
                            />
                            <ClearButton><GrClear onClick={() => undoableMapEditorResetTileOffsetOverride(currentMapStore, tileData)} /></ClearButton>
                        </span>
                    )}

                    {properties.showConflictResolutionOriginEditor && (
                        <span>
                            <FloatInputField
                                style={{ width: "3.5em", ...(hasConflictResolutionOriginOverride ? overrideStyle : nonOverrideStyle) }}
                                value={conflictResolutionOrigin}
                                onlyPositive={true}
                                step={conflictResolutionOriginStep}
                                onChange={value => undoableMapEditorSetTileConflictResolutionOriginOverride(currentMapStore, tileData, clamp(value, 0, 1))}
                                onMouseEnter={() => properties.mapEditorStore.setHoveredConflictResolutionOriginTileData(tileData)}
                                onMouseLeave={() => properties.mapEditorStore.setHoveredConflictResolutionOriginTileData(null)}
                            />
                            <ClearButton><GrClear onClick={() => undoableMapEditorResetTileConflictResolutionOriginOverride(currentMapStore, tileData)} /></ClearButton>
                        </span>
                    )}

                    {properties.showConflictResolutionZIndexEditor && (
                        <span>
                            <IntInputField
                                style={{ width: "2.95em" }}
                                value={tileData.conflictResolutionFlatZIndex}
                                onChange={value => undoableMapEditorSetTileConflictResolutionFlatZIndex(currentMapStore, tileData, value)}
                            />
                        </span>
                    )}

                    {isDecoration && (
                        <InteractionTriggerSection>
                            <label>
                                <input type="checkbox" checked={tileData.isInteractionTrigger} onChange={() => executableUndoableMapEditorSetTileInteractionTriggerStatus(currentMapStore, tileData, !tileData.isInteractionTrigger)} />&nbsp;
                                {t("editor.element_is_interaction_trigger")}
                            </label>
                        </InteractionTriggerSection>
                    )}
                </ChangeDetails>
            </Line>
        </LayerContainer>
    );
});
