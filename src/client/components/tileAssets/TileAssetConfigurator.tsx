import React, { Fragment, useState } from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { TileAssetModel, TileImageUsage, allTileImageUsages, availableImageUsagesForLayerType, TileVisibility, tileVisibilities } from '../../../shared/resources/TileAssetModel';
import { tileOffsetAndSizeStep, conflictResolutionOriginStep } from '../../../shared/data/mapElementSorting';
import { faCog, faDownload, faExclamationCircle, faMinusCircle, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { editorClient } from '../../communication/EditorClient';
import { useTranslation } from 'react-i18next';
import { gameConstants } from '../../data/gameConstants';
import { ImagePropertiesModel } from '../../../shared/resources/ImagePropertiesModel';
import { PlaneTransitModel } from '../../../shared/resources/PlaneTransitModel';
import { IntInputField } from '../shared/IntInputField';
import { FloatInputField } from '../shared/FloatInputField';
import { undoableSelectTileAsset } from '../../stores/undo/operation/SetPlacementSelectionOp';
import { Direction } from "../../../shared/resources/DirectionHelper";
import { PixelPositionModel } from '../../../shared/resources/PixelPositionModel';
import { clamp } from 'curve-interpolator';
import { TileLayerType } from '../../../shared/resources/TileLayerType';
import { sharedStore } from '../../stores/SharedStore';
import { tileAssetEditorStore } from '../../stores/TileAssetEditorStore';
import { tileImageStore } from '../../stores/TileImageStore';
import { errorStore } from '../../stores/ErrorStore';
import { gameStore } from '../../stores/GameStore';

const Container = styled.table`
    background: white;
    border: 1px solid darkgray;
    padding: 3px;
    margin: 3px;
`;

const Button = styled.button`
    min-width: 32px;
    min-height: 24px;
`;

const DeleteButton = styled(Button)`
    color: #DD0000;
`;

const ErrorDiv = styled.div`
    color: #DD0000;
`;

const FileUploadButton = styled.input`
  overflow: hidden;
  width: 93px;  
`;

interface CoordinateInputProps {
    disabled: boolean;
    positionProps: PixelPositionModel;
    yCoordinate: boolean;
    changeAssetDetail?: () => void;
}

const CoordinateInput: React.FunctionComponent<CoordinateInputProps> = observer(({ disabled, positionProps, yCoordinate, changeAssetDetail }) => {
    const setCoordinate = (value: number) => {
        if (yCoordinate) {
            positionProps.setY(value);
        } else {
            positionProps.setX(value);
        }
        if (changeAssetDetail)
            changeAssetDetail();
    };

    const value = positionProps ? yCoordinate ? positionProps.y : positionProps.x : 0;

    return (
        <IntInputField disabled={disabled} value={value} onChange={setCoordinate} />
    );
});

const VisibilityInputWrapper = styled.span`
    input[type="radio"] {
        opacity: 0;
        position: fixed;
        width: 0;
    }

    &.ShowAlways {
        label {
            border-color: #4c4;
            color: #4c4;
        }

        input[type="radio"]:checked + label {
            color: white;
            background-color: #4c4;
        }
    }

    &.ComplexOnly {
        label {
            border-color: #ff8800;
            color: #ff8800;
        }

        input[type="radio"]:checked + label {
            color: white;
            background-color: #ff8800;
        }
    }

    &.ProductionOnly {
        label {
            border-color: orangered;
            color: orangered;
        }

        input[type="radio"]:checked + label {
            color: white;
            background-color: orangered;
        }
    }

    label {
        display: inline-block;
        background-color: white;
        margin: 1px;
        padding: 2px;
        border: 1px solid #444;
    }

    input[type="radio"]:focus + label {
        border-color: black;
    }
`;

async function download(id: string, tileImageUsage: TileImageUsage) {
    const url = tileImageStore.downloadUrl(id, tileImageUsage);

    const a = document.createElement("a");
    //document.body.appendChild(a);
    //a.style.display = "none";
    a.href = url;
    a.download = id + "_" + TileImageUsage[tileImageUsage] + ".png";
    a.click();
}

interface TileOrGroupConfigurationProps {
    id: string;
}

const TileConfiguration: React.FunctionComponent<TileOrGroupConfigurationProps> = observer(({ id }) => {
    const { t } = useTranslation();

    const currentTile = sharedStore.getTileAsset(id);
    const displayId = id;

    const anyAssetStillLoading = allTileImageUsages.some(usage => tileImageStore.isLoading(id, usage));

    const setLocalizedName = (value: string) => {
        currentTile.localizedName.set(gameStore.languageKey, value);
        changeAssetDetail();
    };

    const setTags = (value: string[]) => {
        currentTile.setTags(value);
        changeAssetDetail();
    };

    const setVisibilityInEditor = (value: TileVisibility) => {
        console.log(value);
        currentTile.setVisibilityInEditor(value);
        changeAssetDetail();
    };

    const setFrames = (imageProperties: ImagePropertiesModel, value: number) => {
        imageProperties.setFrames(value);
        changeAssetDetail();
    };

    const setAnimationDuration = (imageProperties: ImagePropertiesModel, value: number) => {
        imageProperties.setAnimationDuration(value);
        changeAssetDetail();
    };

    const setLayer = (layerIdx: number) => {
        currentTile.setLayerType(layerIdx == 0 ? TileLayerType.Ground : TileLayerType.Decoration);

        if (currentTile.layerType === TileLayerType.Ground) {
            currentTile.size.applyCeil();
            currentTile.resetOffset();
        } else {
            currentTile.setImageProperties(null, TileImageUsage.WaterMaskForeground);
            currentTile.setImageProperties(null, TileImageUsage.Foreground);
            currentTile.setImageProperties(null, TileImageUsage.WaterMaskForeground);
        }

        changeAssetDetail();
    };

    const setTransitHeightDifference = (value: number) => {
        currentTile.planeTransit.setHeightDifference(value);
        changeAssetDetail();
    };

    const setTargetXOffset = (value: number) => {
        currentTile.planeTransit.setTargetXOffset(value);
        changeAssetDetail();
    };

    const setTargetYOffset = (value: number) => {
        currentTile.planeTransit.setTargetYOffset(value);
        changeAssetDetail();
    };

    const setPlaneTransit = (direction: number) => {
        if (direction >= 0) {
            if (currentTile.planeTransit) {
                currentTile.planeTransit.setDirection(direction);
            } else {
                currentTile.setPlaneTransit(new PlaneTransitModel({ direction }));
            }
        } else {
            currentTile.setPlaneTransit(null);
        }
        changeAssetDetail();
    };

    const setDefaultGroundHeight = (value: number) => {
        currentTile.setDefaultGroundHeight(value);
        changeAssetDetail();
    };

    const deleteAsset = () => {
        sharedStore.deleteTileAsset(id);
        editorClient.deleteTileAsset(id);
    };

    const changeAssetDetail = () => {
        editorClient.updateTileAsset(currentTile, null, null, null, null);
    };

    const changeAssetImage = async (fileInput: HTMLInputElement, tileImageUsage: TileImageUsage) => {
        try {
            const file = fileInput.files[0];
            if (!file)
                return;

            await tileImageStore.provideTileAssetFromLocalFilesystem(currentTile.id, tileImageUsage, file);
            fileInput.value = null;
        } catch (e) {
            errorStore.addErrorFromErrorObject(e);
        }
    };

    const deleteAssetImage = async (tileImageUsage: TileImageUsage) => {
        await tileImageStore.provideTileAssetFromLocalFilesystem(currentTile.id, tileImageUsage, null);
    };

    return (
        <Container>
            <tbody>
                <tr>
                    <td>{t("editor.tile_asset_id")}</td>
                    <td>
                        <input disabled={true} type="text" value={displayId} />
                        &nbsp;
                        <DeleteButton onClick={deleteAsset}><FontAwesomeIcon icon={faMinusCircle} /> {t("editor.tile_asset_delete")}</DeleteButton>
                        &nbsp;
                        <button onClick={() => undoableSelectTileAsset(tileAssetEditorStore, null)}>{t("editor.deselect")}</button>
                    </td>
                </tr>
                <tr>
                    <td>{t("editor.translated_name")}</td>
                    <td>
                        <input
                            type="text"
                            value={currentTile.localizedName.get(gameStore.languageKey, false)}
                            placeholder={currentTile.localizedName.get(gameStore.languageKey, true)}
                            onChange={({ target }) => setLocalizedName(target.value)}
                        />
                    </td>
                </tr>
                <tr>
                    <td>{t("editor.tile_asset_tags")}</td>
                    <td>
                        <input type="text" value={currentTile.tags.join(" ")} onChange={({ target }) => setTags(target.value.split(" "))} />
                    </td>
                </tr>
                <tr>
                    <td>{t("editor.tile_asset_visibility_in_editor")}</td>
                    <td>
                        {tileVisibilities.map(visibility => (
                            <VisibilityInputWrapper key={visibility} className={TileVisibility[visibility]}>
                                <input
                                    type="radio"
                                    id={"visibility" + visibility}
                                    value={visibility}
                                    checked={currentTile.visibilityInEditor === visibility}
                                    onChange={() => setVisibilityInEditor(visibility)}
                                />
                                <label htmlFor={"visibility" + visibility}>{t("editor.tile_asset_visibility_" + TileVisibility[visibility])}</label>
                            </VisibilityInputWrapper>
                        ))}
                    </td>
                </tr>
                <tr>
                    <td>{t("editor.tile_asset_layer_type")}</td>
                    <td>
                        <select value={currentTile.layerType} onChange={({ target }) => setLayer(parseInt(target.value))}>
                            <option key={0} value={0}>{t("editor.tile_asset_layer_type_ground")}</option>
                            <option key={1} value={1}>{t("editor.tile_asset_layer_type_decoration")}</option>
                        </select>
                    </td>
                </tr>
                {allTileImageUsages.filter(tileImageUsage => availableImageUsagesForLayerType.get(currentTile.layerType).indexOf(tileImageUsage) >= 0).map(tileImageUsage => {
                    const key = TileImageUsage[tileImageUsage];
                    const imageProperties = currentTile.imageProperties(tileImageUsage);
                    const canBeAdjusted = imageProperties && (tileImageUsage !== TileImageUsage.WaterMask) && (tileImageUsage !== TileImageUsage.WaterMaskForeground);
                    const hasFailed = imageProperties && tileImageStore.hasFailed(id, tileImageUsage);
                    return (
                        <tr key={key}>
                            <td>{t("editor.tile_asset_image_usage_" + TileLayerType[currentTile.layerType] + "_" + key)}</td>
                            <td>
                                <Button disabled={!imageProperties || anyAssetStillLoading} onClick={() => download(currentTile.id, tileImageUsage)}>{imageProperties ? <FontAwesomeIcon icon={faDownload} /> : <Fragment>&nbsp;</Fragment>}</Button>
                                &nbsp;
                                <DeleteButton disabled={!imageProperties || anyAssetStillLoading} onClick={() => deleteAssetImage(tileImageUsage)}>{imageProperties ? <FontAwesomeIcon icon={faMinusCircle} /> : <Fragment>&nbsp;</Fragment>}</DeleteButton>
                                &nbsp;
                                <FileUploadButton disabled={anyAssetStillLoading} key={currentTile.$modelId} type="file" accept="image/png" onChange={({ target }) => changeAssetImage(target, tileImageUsage)} />
                                &nbsp;
                                {canBeAdjusted && <>
                                    x <CoordinateInput disabled={anyAssetStillLoading} positionProps={imageProperties.positionOnTile} yCoordinate={false} changeAssetDetail={changeAssetDetail} />
                                    &nbsp;
                                    y <CoordinateInput disabled={anyAssetStillLoading} positionProps={imageProperties.positionOnTile} yCoordinate={true} changeAssetDetail={changeAssetDetail} />
                                    &nbsp;
                                    frames <IntInputField disabled={anyAssetStillLoading} value={imageProperties?.frames} onlyPositive={true} onChange={value => setFrames(imageProperties, value)} />
                                    &nbsp;
                                    sec <FloatInputField disabled={anyAssetStillLoading} value={imageProperties?.animationDuration} onChange={value => setAnimationDuration(imageProperties, value)} />
                                </>}
                                {hasFailed && <ErrorDiv><FontAwesomeIcon icon={faExclamationCircle} /> {t("editor.error_image_lost_please_reupload")}</ErrorDiv>}
                            </td>
                        </tr>
                    );
                })}
                <tr>
                    <td>{t("editor.tile_asset_blocked_directions")}</td>
                    <td>
                        <label><input type="checkbox" checked={tileAssetEditorStore.editBlockedDirections} onChange={() => tileAssetEditorStore.toggleEditBlockedDirections()} /> {t("editor.edit_blocked_directions")}</label> &nbsp;&nbsp;
                    </td>
                </tr>
                {(currentTile.layerType === TileLayerType.Ground) && (
                    <Fragment>
                        <tr>
                            <td>{t("editor.tile_asset_plane_transit")}</td>
                            <td>
                                {t("editor.tile_asset_plane_transit_in_direction")}&nbsp;
                                <select value={currentTile.planeTransit ? currentTile.planeTransit.direction : -1} onChange={({ target }) => setPlaneTransit(parseInt(target.value))}>
                                    <option key={-1} value={-1} />
                                    <option key={0} value={Direction.North}>{t("editor.tile_asset_north")}</option>
                                    <option key={1} value={Direction.West}>{t("editor.tile_asset_west")}</option>
                                </select>
                                &nbsp;{t("editor.tile_asset_plane_transit_target")}:
                                &nbsp;{t("editor.tile_asset_plane_transit_target_offset_x")} <IntInputField disabled={currentTile.planeTransit == null} value={currentTile.planeTransit?.targetXOffset} onChange={value => setTargetXOffset(value)} />
                                &nbsp;{t("editor.tile_asset_plane_transit_target_offset_y")} <IntInputField disabled={currentTile.planeTransit == null} value={currentTile.planeTransit?.targetYOffset} onChange={value => setTargetYOffset(value)} />
                                &nbsp;{t("editor.tile_asset_plane_transit_target_offset_height")} <IntInputField disabled={currentTile.planeTransit == null} value={currentTile.planeTransit?.heightDifference} onChange={value => setTransitHeightDifference(value)} />
                            </td>
                        </tr>
                        <tr>
                            <td>{t("editor.tile_asset_plane")}</td>
                            <td>
                                <select
                                    disabled={!!currentTile.planeTransit}
                                    value={"" + (currentTile.isHeightFlexible ? null : currentTile.defaultGroundHeight)}
                                    onChange={e => setDefaultGroundHeight((e.target.value === "") ? null : parseInt(e.target.value))}
                                >
                                    <option value={""}>{t("editor.tile_asset_default_ground_height_is_flexible")}</option>
                                    {gameConstants.planes.map(idx =>
                                        <option key={idx} value={idx}>{idx + 1}</option>
                                    )}
                                </select>
                            </td>
                        </tr>
                    </Fragment>
                )}
                {currentTile.layerType === TileLayerType.Decoration && (
                    <>
                        <tr>
                            <td>{t("editor.tile_asset_offset")}</td>
                            <td>
                                x <FloatInputField value={currentTile.offsetX} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { currentTile.setOffsetX(value); changeAssetDetail(); }} />
                                &nbsp;
                                y <FloatInputField value={currentTile.offsetY} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { currentTile.setOffsetY(value); changeAssetDetail(); }} />
                                &nbsp;
                                z <FloatInputField value={currentTile.internalOffsetZ} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { currentTile.setInternalOffsetZ(value); changeAssetDetail(); }} />
                            </td>
                        </tr>
                        <tr>
                            <td>{t("editor.tile_asset_size")}</td>
                            <td>
                                x <FloatInputField value={currentTile.size.x} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { currentTile.setSizeX(value); changeAssetDetail(); }} />
                                &nbsp;
                                y <FloatInputField value={currentTile.size.y} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { currentTile.setSizeY(value); changeAssetDetail(); }} />
                                &nbsp;
                                z <FloatInputField value={currentTile.size.z} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { currentTile.setSizeZ(value); changeAssetDetail(); }} />
                            </td>
                        </tr>
                    </>
                )}
                {currentTile.layerType === TileLayerType.Ground && (
                    <tr>
                        <td>{t("editor.tile_asset_size")}</td>
                        <td>
                            x <IntInputField value={currentTile.size.x} onlyPositive={true} onChange={value => { currentTile.setSizeX(value); changeAssetDetail(); }} />
                            &nbsp;
                            y <IntInputField value={currentTile.size.y} onlyPositive={true} onChange={value => { currentTile.setSizeY(value); changeAssetDetail(); }} />
                            &nbsp;
                            z <FloatInputField value={currentTile.size.z} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { currentTile.setSizeZ(value); changeAssetDetail(); }} />
                        </td>
                    </tr>
                )}
                {!currentTile.size.isFlat && (
                    <tr>
                        <td>{t("editor.tile_asset_conflict_resolution_origin")}</td>
                        <td
                            onMouseEnter={() => tileAssetEditorStore.setHoveringConflictResolutionOrigin(true)}
                            onMouseLeave={() => tileAssetEditorStore.setHoveringConflictResolutionOrigin(false)}
                        >
                            <FloatInputField value={currentTile.conflictResolutionOrigin} onlyPositive={true} step={tileOffsetAndSizeStep} onChange={value => { currentTile.setConflictResolutionOrigin(clamp(value, 0, 1)); changeAssetDetail(); }} />
                            &nbsp;
                            {t("editor.tile_asset_conflict_resolution_origin_back")}
                            &nbsp;
                            <input type="range" min="0" max="1" step={conflictResolutionOriginStep} value={currentTile.conflictResolutionOrigin} onChange={e => { currentTile.setConflictResolutionOrigin(+e.target.value); changeAssetDetail(); }} />
                            &nbsp;
                            {t("editor.tile_asset_conflict_resolution_origin_front")}
                        </td>
                    </tr>
                )}
                {anyAssetStillLoading && (
                    <tr>
                        <td></td>
                        <td>
                            <FontAwesomeIcon icon={faCog} spin={true} />&nbsp;
                            {t("editor.loading_please_wait")}
                        </td>
                    </tr>
                )}
            </tbody>
        </Container>
    );
});

export const TileAssetConfigurator: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();
    const [newAssetId, setNewAssetId] = useState("");

    const { selectedTileAssetId } = tileAssetEditorStore.placementSelection;

    const createNewTileAsset = () => {
        const layerType = tileAssetEditorStore.currentLayerType;
        const newTileAsset = new TileAssetModel({ id: newAssetId, layerType });

        sharedStore.addTileAsset(newTileAsset);
        undoableSelectTileAsset(tileAssetEditorStore, newAssetId);
        editorClient.updateTileAsset(newTileAsset, null, null, null, null);

        setNewAssetId("");
    };

    return (
        <div>
            <Container>
                <tbody>
                    <tr>
                        <td>
                            <input type="text" value={newAssetId} onChange={({ target }) => setNewAssetId(tileImageStore.uniqueAssetId("", target.value))} />
                            &nbsp;
                            <button disabled={newAssetId === ""} onClick={createNewTileAsset}><FontAwesomeIcon icon={faPlus} /> {t("editor.tile_asset_create")}</button>
                        </td>
                    </tr>
                </tbody>
            </Container>
            {selectedTileAssetId == null || <TileConfiguration id={selectedTileAssetId} />}
        </div>

    );
});