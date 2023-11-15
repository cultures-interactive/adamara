import React, { CSSProperties, ReactElement, useLayoutEffect, useRef } from 'react';
import styled from 'styled-components';
import { observer } from "mobx-react-lite";
import { gameConstants } from '../../data/gameConstants';
import { numberToCSSColor } from '../../helper/reactHelpers';
import { mainCategoryTags, TileAssetModel, TileImageUsage } from '../../../shared/resources/TileAssetModel';
import { ImagePropertiesModel } from '../../../shared/resources/ImagePropertiesModel';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { undoableSelectTileAsset } from '../../stores/undo/operation/SetPlacementSelectionOp';
import { undoableSetTileLayer } from '../../stores/undo/operation/SetTileLayerOp';
import { undoableSetPlane } from '../../stores/undo/operation/SetPlaneOp';
import { undoableSetTileAssetTagFilter } from '../../stores/undo/operation/SetTileAssetTagFilterOp';
import { UiConstants } from "../../data/UiConstants";
import { doTagSelectionsMatch, isPlacementSelectionEmpty, SearchFilterCategory, TagType, MapRelatedStore } from "../../stores/MapRelatedStore";
import { LoadingBar } from '../shared/LoadingBar';
import { undoableClearTileAssetSearchFilter, undoableSetTileAssetSearchFilter } from '../../stores/undo/operation/SetTileAssetSearchFilter';
import { MdClear } from 'react-icons/md';
import { firstDecorationLayerIndex, groundLayerIndex, groundMinus1LayerIndex } from '../../../shared/data/layerConstants';
import { loadingAnimationUrl } from '../../canvas/loader/StaticAssetLoader';
import { tileImageStore } from '../../stores/TileImageStore';
import { editorStore } from '../../stores/EditorStore';
import { sharedStore } from '../../stores/SharedStore';
import { ListItemNoWrapping } from '../menu/ListItem';
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid } from 'react-window';
import { gameStore } from '../../stores/GameStore';
import { translationStore } from '../../stores/TranslationStore';

const LoadingLineContainer = styled.div`
    text-align: center;
    margin-top: 0.4em;
    margin-bottom: 0.1em;
`;

const Container = styled.div`
    /*
    border-radius: ${UiConstants.BORDER_RADIUS};
    border: solid 1px #888888;
    */
    height: 100%;
`;

export const ScrollContainer = styled(Container)`
    overflow-x: hidden;
    overflow-y: auto;
`;

export const ContainerUnderHeadline = styled(Container)`
    border-top: solid 1px #888888;
    height: calc(100% - 32px);
`;

export const ScrollContainerUnderHeadline = styled(ScrollContainer)`
    border-top: solid 1px #888888;
    height: calc(100% - 32px);
`;

export const PlacementSelectorHeadline = styled.div`
    height: 32px;
`;

const scaleDown = 0.3;

function imageScale(bg: ImagePropertiesModel, fg: ImagePropertiesModel) {
    const { tileWidth, tileHeight } = gameConstants;

    const w1 = bg ? bg.frameWidth() : 0;
    const w2 = fg ? fg.frameWidth() : 0;
    const h1 = bg ? bg.size.height : 0;
    const h2 = fg ? fg.size.height : 0;

    const width = Math.max(w1, w2);
    const height = Math.max(h1, h2);

    const scaleX = tileWidth / width;
    const scaleY = tileHeight / height;

    return Math.min(scaleX, scaleY) * scaleDown;
}

function getImageScaledWidth(imageUrl: string, bg: ImagePropertiesModel, fg: ImagePropertiesModel) {
    if (!imageUrl.startsWith("url(\"blob:"))
        return null;

    const w1 = bg ? bg.frameWidth() : 0;
    const w2 = fg ? fg.frameWidth() : 0;
    const width = Math.max(w1, w2);

    const f1 = bg ? bg.frames : 1;
    const f2 = fg ? fg.frames : 1;
    return width * Math.max(f1, f2) * imageScale(bg, fg);
}

function getAssetUrls(tileAssetId: string, bg: ImagePropertiesModel, fg: ImagePropertiesModel) {
    let result = "";
    if (fg) {
        result += `url("${tileImageStore.thumbnailUrl(tileAssetId, TileImageUsage.Foreground) || loadingAnimationUrl}")`;
    }
    if (bg && fg) {
        result += ", ";
    }
    if (bg) {
        result += `url("${tileImageStore.thumbnailUrl(tileAssetId, TileImageUsage.Background) || loadingAnimationUrl}")`;
    }
    return result;
}

/*
function atlasPositions(bg: ImagePropertiesModel, fg: ImagePropertiesModel) {
    // jj: test this properly once we use atlases again (atm positionInAtlas is always '0,0')
    let result = "";

    const scale = imageScale(bg, fg);

    if (bg && fg) {
        const deltaBgX = bg.positionOnTile.x - fg.positionOnTile.x;
        const deltaBgY = bg.positionOnTile.y - fg.positionOnTile.y;
        const deltaFgX = fg.positionOnTile.x - bg.positionOnTile.x;
        const deltaFgY = fg.positionOnTile.y - bg.positionOnTile.y;

        const bgX = deltaBgX > deltaFgX ? bg.positionOnTile.x - fg.positionOnTile.x : 0;
        const bgY = deltaBgY > deltaFgY ? bg.positionOnTile.y - fg.positionOnTile.y : 0;
        const fgX = deltaFgX > deltaBgX ? fg.positionOnTile.x - bg.positionOnTile.x : 0;
        const fgY = deltaFgY > deltaBgY ? fg.positionOnTile.y - bg.positionOnTile.y : 0;

        result += `${scale * (fgX - fg.positionInAtlas.x)}px ${scale * (fgY - fg.positionInAtlas.y)}px, ${scale * (bgX - bg.positionInAtlas.x)}px ${scale * (bgY - bg.positionInAtlas.y)}px`;
    } else {
        if (bg) {
            result += `${scale * -bg.positionInAtlas.x}px ${scale * -bg.positionInAtlas.y}px`;
        } else {
            result += `${scale * -fg.positionInAtlas.x}px ${scale * -fg.positionInAtlas.y}px`;
        }
    }
    return result;
}
*/

interface PlacementButtonStyleProps {
    imageUrl: string;
    imageScaledWidth: number;
    backgroundColor?: string;
}

const PlacementButtonStyle = styled.button.attrs<PlacementButtonStyleProps, any>((props: PlacementButtonStyleProps) => {
    if (!props.imageUrl) {
        return {
            style: {
                backgroundColor: props.backgroundColor || "white"
            }
        };
    }

    return {
        style: {
            backgroundImage: props.imageUrl,
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: props.imageScaledWidth && (props.imageScaledWidth + "px"),
            backgroundColor: props.backgroundColor
        }
    };
})`
    width: ${gameConstants.tileWidth * scaleDown + 4}px;
    height: ${gameConstants.tileHeight * scaleDown + 4}px;
    padding: 0;
    box-sizing: content-box;
    cursor: pointer;
    border: 1px solid black;
    margin: 4px;
    border-radius: ${UiConstants.BORDER_RADIUS};
    &:hover {
        background-color: ${UiConstants.COLOR_HOVER};
    }
    &.selected {
        border: 4px solid ${UiConstants.COLOR_SELECTION_HIGHLIGHT};
        margin: 1px;
    }
    &.highlighted {
        border: 4px solid ${UiConstants.COLOR_DISABLED_SELECTION_HIGHLIGHT};
        margin: 1px;
    }
`;

const TileContainer = styled.div`
    position: relative;
    float: left;
    width: ${gameConstants.tileWidth * scaleDown + 4 + 8}px;
    height: ${gameConstants.tileHeight * scaleDown + 26}px;
    margin: 4px 0px;
    font-size: x-small;
    text-align: center;
    cursor: pointer;
    &:hover {
        background-color: ${UiConstants.COLOR_HOVER};
    }
    border-radius: ${UiConstants.BORDER_RADIUS};
`;

interface PlacementSelectionItemProps {
    label: string;
    imageUrl?: string;
    imageScaledWidth?: number;
    icon?: ReactElement;
    backgroundColor?: string;
    isSelected: boolean;
    isAssetPlacementActive: boolean;
    onClick: () => void;
    style?: CSSProperties;
}

export const PlacementSelectionItem: React.FunctionComponent<PlacementSelectionItemProps> = observer(({
    label, imageUrl, icon, imageScaledWidth, backgroundColor, isSelected, isAssetPlacementActive, onClick, style, children
}) => {
    let className = "";
    if (!isAssetPlacementActive && isSelected) className = "highlighted";
    if (isAssetPlacementActive && isSelected) className = "selected";

    return (
        <TileContainer style={style} onClick={onClick}>
            <PlacementButtonStyle
                imageUrl={imageUrl}
                imageScaledWidth={imageScaledWidth}
                backgroundColor={backgroundColor}
                className={className}
            >
                {icon}
            </PlacementButtonStyle>
            <PlacementSelectionItemLabel>
                {label}
            </PlacementSelectionItemLabel>
            {children}
        </TileContainer>
    );
});

interface TilePlacementButtonProps {
    tileAsset: TileAssetModel;
    mapRelatedStore: MapRelatedStore;
    backgroundColor?: string;
    style?: CSSProperties;
}

const PlacementSelectionItemLabel = styled.div`
    overflow: hidden;
`;

/**
 * A button to select a tile or group asset. Shows the assert as a small preview.
 */
const TileAssetPlacementButton: React.FunctionComponent<TilePlacementButtonProps> = observer(({
    tileAsset, mapRelatedStore, backgroundColor, style
}) => {
    const localizedName = tileAsset?.localizedName.get(gameStore.languageKey);
    const tileAssetId = tileAsset?.id;
    const bgAsset = tileAsset?.imageProperties(TileImageUsage.Background);
    const fgAsset = tileAsset?.imageProperties(TileImageUsage.Foreground);
    const isSelected = tileAsset
        ? mapRelatedStore.placementSelection.selectedTileAssetId === tileAsset.id
        : isPlacementSelectionEmpty(mapRelatedStore.placementSelection);

    const imageUrl = (bgAsset || fgAsset) && getAssetUrls(tileAssetId, bgAsset, fgAsset);
    const isLoading = tileImageStore.isLoading(tileAssetId, TileImageUsage.Background) || tileImageStore.isLoading(tileAssetId, TileImageUsage.Foreground);
    const imageScaledWidth = (imageUrl && !isLoading) ? getImageScaledWidth(imageUrl, bgAsset, fgAsset) : undefined;

    return (
        <PlacementSelectionItem
            label={localizedName}
            imageUrl={imageUrl}
            imageScaledWidth={imageScaledWidth}
            isSelected={isSelected}
            backgroundColor={!tileAssetId ? numberToCSSColor(gameConstants.waterColor) : backgroundColor}
            isAssetPlacementActive={mapRelatedStore.isAssetSelectionEnabled}
            onClick={() => {
                undoableSelectTileAsset(mapRelatedStore, tileAssetId);
            }}
            style={style}
        >
        </PlacementSelectionItem>
    );
});

export const PlacementSelectorLoadingBar: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    if (sharedStore.allTileAssetsLoaded)
        return null;

    return (
        <LoadingLineContainer>
            <LoadingBar
                label={t("editor.loading_please_wait")}
                percentage100={editorStore.tileImageLoadingPercentageInt100}
            />
        </LoadingLineContainer>
    );
});

interface SharedMapRelatedStoreProps {
    mapRelatedStore: MapRelatedStore;
}

export const PlacementSelectorLayerSelection: React.FunctionComponent<SharedMapRelatedStoreProps> = observer(({ mapRelatedStore }) => {
    const { t } = useTranslation();
    const { selectedLayer } = mapRelatedStore;

    return (
        <>
            {t("editor.tile_asset_layer")}:&nbsp;
            <select
                value={(selectedLayer == null) ? "" : selectedLayer}
                onChange={e => undoableSetTileLayer(mapRelatedStore, e.target.value === "" ? null : parseInt(e.target.value))}
            >
                <option value={""}></option>
                {mapRelatedStore.complexityShowLayerMinusOne && (
                    <option value={groundMinus1LayerIndex}>{t("editor.tile_asset_layer_type_ground")} -1</option>
                )}
                <option value={groundLayerIndex}>{t("editor.tile_asset_layer_type_ground")}</option>
                <option value={firstDecorationLayerIndex}>{t("editor.tile_asset_layer_type_decoration")}</option>
            </select>
        </>
    );
});

interface PlacementSelectorTagSelectionProps {
    mapRelatedStore: MapRelatedStore;
    skipMainCategories: boolean;
}

export const TileCategoryMenu: React.FunctionComponent<PlacementSelectorTagSelectionProps> = observer(({
    mapRelatedStore, skipMainCategories
}) => {
    const { t } = useTranslation();

    const selectedTag = mapRelatedStore.tileAssetTagFilter || { type: TagType.All };
    const sortedTags = mapRelatedStore.tags;

    const { languageKey } = gameStore;

    return (
        <ScrollContainer>
            {
                sortedTags
                    .filter(tagInfo => !skipMainCategories || !mainCategoryTags.some(mainCategoryTag => tagInfo.tag === mainCategoryTag))
                    .map(tagInfo => (
                        <ListItemNoWrapping
                            key={tagInfo.type + tagInfo.tag}
                            className={doTagSelectionsMatch(tagInfo, selectedTag) ? "selected" : ""}
                            onClick={() => undoableSetTileAssetTagFilter(mapRelatedStore, tagInfo)}
                        >
                            {
                                (tagInfo.type === TagType.Tag)
                                    ? translationStore.makeshiftTranslationSystemData.tileTags.getTranslation(languageKey, tagInfo.tag)
                                    : t("editor.tile_asset_tag_" + tagInfo.type)
                            } ({tagInfo.count})
                        </ListItemNoWrapping>
                    ))
            }
        </ScrollContainer>
    );
});

const SearchInput = styled.input`
    width: 120px;
`;

const SearchInputClearButton = styled.button`
    width: 24.39px;
    height: 24.39px;
    overflow: hidden;
    border: 1px solid grey;
    background: none;
    position: relative;
    left: 3px;
    top: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding-right: 4px;
    margin-right: 3px;

    svg {
        flex-shrink: 0;
    }
`;

type PlacementSelectorTileAssetSearch = SharedMapRelatedStoreProps & {
    category: SearchFilterCategory;
};

export const PlacementSelectorAssetSearch: React.FunctionComponent<PlacementSelectorTileAssetSearch> = observer(({ mapRelatedStore, category }) => {
    const { t } = useTranslation();

    return (
        <>
            {t("editor.tile_asset_search")}:&nbsp;
            <SearchInput
                value={mapRelatedStore.getSearchFilter(category)}
                onChange={e => undoableSetTileAssetSearchFilter(mapRelatedStore, category, e.target.value)}
            />
            <SearchInputClearButton onClick={() => undoableClearTileAssetSearchFilter(mapRelatedStore, category)}><MdClear /></SearchInputClearButton>
        </>
    );
});

export const PlacementSelectorPlaneSelection: React.FunctionComponent<SharedMapRelatedStoreProps> = observer(({ mapRelatedStore }) => {
    const { t } = useTranslation();
    const { selectedPlane } = mapRelatedStore;
    const { planes, minPlane, maxPlane } = gameConstants;

    return (
        <>
            {t("editor.tile_asset_plane")}:&nbsp;
            <select value={selectedPlane} onChange={e => undoableSetPlane(mapRelatedStore, parseInt(e.target.value))}>
                {planes.map(idx =>
                    <option key={idx} value={idx}>{idx + 1}</option>
                )}
            </select>
            <button disabled={selectedPlane <= minPlane} onClick={() => undoableSetPlane(mapRelatedStore, selectedPlane - 1)}><FontAwesomeIcon icon={faMinus} /></button>
            <button disabled={selectedPlane >= maxPlane} onClick={() => undoableSetPlane(mapRelatedStore, selectedPlane + 1)}><FontAwesomeIcon icon={faPlus} /></button>
        </>
    );
});

export const PlacementSelectorGamePreviewCheckmark: React.FunctionComponent<SharedMapRelatedStoreProps> = observer(({ mapRelatedStore }) => {
    const { t } = useTranslation();

    return (
        <label>
            <input type="checkbox" checked={mapRelatedStore.showGamePreview} onChange={mapRelatedStore.toggleGamePreview} />
            &nbsp;{t("editor.show_game_preview")}
        </label>
    );
});

interface TileAssetPlacementButtonsProps {
    mapRelatedStore: MapRelatedStore;
    tileAssets: TileAssetModel[];
    showEmpty: boolean;
}

export const TileAssetPlacementButtons: React.FunctionComponent<TileAssetPlacementButtonsProps> = observer(({
    mapRelatedStore, tileAssets, showEmpty
}) => {
    const gridRef = useRef<FixedSizeGrid>();

    useLayoutEffect(() => {
        if (gridRef.current) {
            gridRef.current.scrollTo({ scrollLeft: 0, scrollTop: 0 });
        }
    }, [gridRef.current, tileAssets]);

    const offset = showEmpty ? 1 : 0;

    const tileAssetsLength = tileAssets.length;
    const elementCount = tileAssetsLength + offset;

    return (
        <>
            <AutoSizer>
                {({ width, height }) => {
                    const elementWidth = 89;
                    const elementHeight = 80;
                    const scrollBarWidth = 25;
                    const columnCount = Math.floor((width - scrollBarWidth) / elementWidth);
                    const rowCount = Math.ceil(elementCount / columnCount);
                    return (
                        <FixedSizeGrid
                            width={width}
                            height={height}
                            columnWidth={elementWidth}
                            rowHeight={elementHeight}
                            columnCount={columnCount}
                            rowCount={rowCount}
                            ref={gridRef}
                        >
                            {({ style, columnIndex, rowIndex }) => {
                                const elementIndex = rowIndex * columnCount + columnIndex - offset;
                                if (elementIndex >= tileAssetsLength)
                                    return null;

                                const tileAsset = (elementIndex >= 0) ? tileAssets[elementIndex] : null;

                                return (
                                    <TileAssetPlacementButton
                                        tileAsset={tileAsset}
                                        mapRelatedStore={mapRelatedStore}
                                        style={style}
                                    />
                                );
                            }}
                        </FixedSizeGrid>
                    );
                }}
            </AutoSizer>
        </>
    );
});
