import { makeAutoObservable, observable } from "mobx";
import { MapState } from "./MapState";
import { TileDataInterface, TileDataModel } from "../../shared/game/TileDataModel";
import { doesPlacementSelectionLooselyEqual, PlacementSelection, SearchFilterCategory, TagInfo, TagSelection, MapRelatedStore, mapRelatedStoreGetFilteredTileAssets, mapRelatedStoreGetTags } from "./MapRelatedStore";
import { doesTilePositionEqual, TilePosition } from "../../shared/definitions/other/TilePosition";
import { getTileOffsetX, getTileOffsetY, getTileSizeZOffset } from "../helper/mapElementSortingHelper";
import { getTileLayerType, groundLayerIndex, groundMinus1LayerIndex, layerConstants } from "../../shared/data/layerConstants";
import { TileLayerType } from "../../shared/resources/TileLayerType";
import { gameStore } from "./GameStore";
import { CurrentMapStore } from "./CurrentMapStore";
import { sharedStore } from "./SharedStore";
import { arrayEquals, getAllStringEnumValues } from "../../shared/helper/generalHelpers";
import { TileAssetModel, TileVisibility } from "../../shared/resources/TileAssetModel";
import { editorStore } from "./EditorStore";
import { userStore } from "./UserStore";
import { DynamicMapElementInterface, DynamicMapElementModel } from "../../shared/game/dynamicMapElements/DynamicMapElement";
import { DynamicMapElementAreaTriggerModel } from "../../shared/game/dynamicMapElements/DynamicMapElementAreaTriggerModel";
import { DynamicMapElementNPCModel } from "../../shared/game/dynamicMapElements/DynamicMapElementNPCModel";
import { gameConstants } from "../data/gameConstants";

export enum EditorToolType {
    PlaceAsset,
    SingleSelect
}

export interface PlacementSelectorCategory {
    name: string;
    component: React.FunctionComponent;
    includeTileCategories?: TagSelection[];
    excludeTileCategories?: TagSelection[];
}

export enum MapEditorComplexity {
    Simple = "Simple",
    Complex = "Complex"
}

export const mapEditorComplexities = getAllStringEnumValues<MapEditorComplexity>(MapEditorComplexity);

export class MapEditorStore implements MapRelatedStore {
    public readonly currentMapStore;

    // note this must match the i18n entries
    public static readonly ToolTypeToName: Map<EditorToolType, string> = new Map([
        [EditorToolType.PlaceAsset, "PlaceAsset"],
        [EditorToolType.SingleSelect, "SingleSelection"],
    ]);

    public selectedTool = EditorToolType.SingleSelect;
    public selectedCategory: PlacementSelectorCategory;
    public selectedLayer: number = null;
    public selectedPlane: number = 0;

    // Scope: PlaceAsset
    public placementSelection: PlacementSelection = {};
    public tileAssetTagFilter: TagSelection = null;

    private searchFilter: Map<SearchFilterCategory, string> = observable.map();

    public selectedTilePosition: TilePosition;  // Scope: SingleSelect

    public showGamePreview = false;

    public onlyShowEnemyCharacters = false;

    public readonly mapState = new MapState();
    public readonly allowMultiSelection: boolean = false;
    public readonly allowToggleSelection: boolean = false;

    public selectableDynamicMapElements: Array<string> = [];
    public showEmptyAreaTriggersAndNPCsEvenIfNotHighlighted: boolean = false;

    public cutDynamicMapElementModelId: string;

    public hoveredConflictResolutionOriginTileData: TileDataModel;

    public mapEditorComplexity = MapEditorComplexity.Complex;

    public highlightedElements: Set<DynamicMapElementInterface<any>>;
    public highlightedTiles: Set<TileDataInterface>;

    public canvasWidth: number;
    public canvasHeight: number;

    public selectorMapEditorOpenCounter = 0;

    public constructor(
        public readonly ignoreHeightPlanes: boolean,
        mapUsedForGame: boolean
    ) {
        makeAutoObservable(this, {}, { autoBind: true });

        this.currentMapStore = new CurrentMapStore(mapUsedForGame);
    }

    public get effectiveSelectedLayer() {
        return this.complexityUseLayers ? this.selectedLayer : null;
    }

    public get currentLayerType(): TileLayerType {
        return getTileLayerType(this.effectiveSelectedLayer);
    }

    public get selectedAsset() {
        if (this.placementSelection.selectedTileAssetId === null) return null;
        return sharedStore.getTileAsset(this.placementSelection.selectedTileAssetId);
    }

    public get hasSelectedTile() {
        return !!this.selectedTilePosition;
    }

    public get selectedTileDataWithXYOverlap(): TileDataModel[] {
        const { x, y, plane } = this.selectedTilePosition;

        if (this.ignoreHeightPlanes)
            return this.currentMapStore.currentMap.getTilesWithXYOverlap(x, y, sharedStore.getTileAsset);

        return this.currentMapStore.currentMap.getTilesOnPlaneWithXYOverlap(x, y, plane, sharedStore.getTileAsset);
    }

    public get selectedOverlappingGroundTilesFromDifferentLayer(): TileDataModel[] {
        return this.currentMapStore.currentMap.tiles.filter(tileData => (
            isOverlappingGroundTileOnDifferentLayer(tileData, this.selectedTilePosition)
        ));
    }

    public get selectedTileDataForOriginLineDisplay(): TileDataModel[] {
        const { x, y, plane } = this.selectedTilePosition;
        return this.currentMapStore.currentMap.tiles.filter(tileData => (
            (
                ((getTileLayerType(tileData.position.layer) == TileLayerType.Decoration) && tileData.isOnPlaneAndOverlappingXY(x, y, plane, sharedStore.getTileAsset)) ||
                isOverlappingGroundTileOnDifferentLayer(tileData, this.selectedTilePosition)
            ) && !sharedStore.getTileAsset(tileData.tileAssetId)?.size.isFlat
        ));
    }

    public get selectedGroundTileDataWithGapsDirectOnly() {
        const groundTileData: TileDataModel[] = [];

        for (let i = 0; i < layerConstants.numberOfGroundLayers; i++) {
            groundTileData.push(null);
        }

        this.selectedTileDataWithXYOverlap.forEach(tileData => {
            const { layer } = tileData.position;
            if (getTileLayerType(layer) === TileLayerType.Ground) {
                groundTileData[layer * -1] = tileData;
            }
        });

        return groundTileData;
    }

    private get selectedDecorationTileData() {
        return this.selectedTileDataWithXYOverlap
            .filter(tileData => getTileLayerType(tileData.position.layer) === TileLayerType.Decoration);
    }

    public get selectedDecorationTileDataNonFlat() {
        return this.selectedDecorationTileData.filter(tileData => !sharedStore.getTileAsset(tileData.tileAssetId)?.size.isFlat);
    }

    public get selectedDecorationTileDataFlatX() {
        return this.selectedDecorationTileData.filter(tileData => sharedStore.getTileAsset(tileData.tileAssetId)?.size.isFlatX);
    }

    public get selectedDecorationTileDataFlatY() {
        return this.selectedDecorationTileData.filter(tileData => sharedStore.getTileAsset(tileData.tileAssetId)?.size.isFlatY);
    }

    public get selectedDecorationTileDataFlatZ() {
        return this.selectedDecorationTileData.filter(tileData => sharedStore.getTileAsset(tileData.tileAssetId)?.size.isFlatZ);
    }

    public get selectedDynamicMapElements(): DynamicMapElementModel<any>[] {
        if (!this.hasSelectedTile)
            return [];

        const { x, y, plane } = this.selectedTilePosition;
        let elements: DynamicMapElementModel<any>[] = [];
        if (this.ignoreHeightPlanes)
            elements = this.currentMapStore.currentMap.getAllDynamicMapElementsAtPositionXY(x, y);
        else
            elements = this.currentMapStore.currentMap.getAllDynamicMapElementsAtPositionXYPlane(x, y, plane);

        if (this.highlightedElements) {
            elements = elements.filter(element =>
                this.highlightedElements.has(element) ||
                (this.showEmptyAreaTriggersAndNPCsEvenIfNotHighlighted && (
                    (element instanceof DynamicMapElementAreaTriggerModel) ||
                    (element instanceof DynamicMapElementNPCModel) // might have (or get) a sensor trigger
                ))
            );
        }

        return elements;
    }

    public isDynamicMapElementSelected(modelId: string) {
        return this.selectedDynamicMapElements.some(element => element.$modelId == modelId);
    }

    public get selectedInteractionTriggerTiles() {
        if (!this.hasSelectedTile)
            return [];

        let tiles = this.selectedTileDataWithXYOverlap.filter(tileData => tileData.isInteractionTrigger);

        if (this.highlightedTiles) {
            tiles = tiles.filter(tile => this.highlightedTiles.has(tile));
        }

        return tiles;
    }

    public get selectedDebugStartMarker() {
        if (this.highlightedElements)
            return null;

        if (!gameStore.debugStartMarker)
            return null;

        const { x, y, plane } = gameStore.debugStartMarker.position;
        const { x: tileX, y: tileY, plane: tilePlane } = this.selectedTilePosition;

        if (x !== tileX || y !== tileY || plane !== tilePlane)
            return null;

        return gameStore.debugStartMarker;
    }

    public prepareActionMapViewer(newSelectableDynamicMapElements: Array<string>, showEmptyAreaTriggersAndNPCsEvenIfNotHighlighted: boolean) {
        if (!arrayEquals(this.selectableDynamicMapElements, newSelectableDynamicMapElements)) {
            this.selectableDynamicMapElements = newSelectableDynamicMapElements;
        }

        this.showEmptyAreaTriggersAndNPCsEvenIfNotHighlighted = showEmptyAreaTriggersAndNPCsEvenIfNotHighlighted;
    }

    public clearTileSelectionIfMatches(id: string) {
        if (this.placementSelection.selectedTileAssetId === id) {
            this.clearPlacementSelection();
        }
    }

    public setPlacementSelection(selection: PlacementSelection) {
        if (!selection)
            selection = {};

        if (doesPlacementSelectionLooselyEqual(this.placementSelection, selection))
            return;

        this.placementSelection = selection;
    }

    public clearPlacementSelection() {
        this.setPlacementSelection(null);
    }

    public setTool(tool: EditorToolType) {
        this.selectedTool = tool;
    }

    public setPlacementSelectorCategory(category: PlacementSelectorCategory) {
        this.selectedCategory = category;
    }

    public setPlane(plane: number) {
        this.selectedPlane = plane;
        if (this.selectedAsset && (!this.selectedAsset.isMadeForPlane(plane))) {
            this.clearPlacementSelection();
        }
    }

    public getHeightPlaneForNewAsset(x: number, y: number) {
        if (!this.ignoreHeightPlanes)
            return this.selectedPlane;

        const tiles = this.currentMapStore.currentMap.getTilesWithXYOverlap(x, y, sharedStore.getTileAsset);

        // Are there any tiles on this position already? If not, use lowest plane.
        if (tiles.length == 0)
            return gameConstants.minPlane;

        // There are tiles. Find the tile with the heightest plane and use that plane to place the new asset on.
        const tilePlanes = tiles.map(tile => tile.position.plane);
        return Math.max(...tilePlanes);
    }

    public setTileAssetTagFilter(tag: TagSelection) {
        this.tileAssetTagFilter = tag;
    }

    public setSearchFilter(category: SearchFilterCategory, filter: string) {
        this.searchFilter.set(category, filter);
    }

    public getSearchFilter(category: SearchFilterCategory) {
        return this.searchFilter.get(category) || "";
    }

    public setSelectedTilePosition(tilePosition: TilePosition) {
        this.selectedTilePosition = tilePosition;
    }

    public isSelectedTilePosition(tilePosition: TilePosition) {
        if (!this.selectedTilePosition && !tilePosition)
            return true;

        if (!this.selectedTilePosition)
            return false;

        return doesTilePositionEqual(this.selectedTilePosition, tilePosition);
    }

    public get isAssetSelectionEnabled(): boolean {
        return this.selectedTool == EditorToolType.PlaceAsset;
    }

    public setSelectedLayer(value: number) {
        this.selectedLayer = value;
    }

    public toggleGamePreview() {
        this.showGamePreview = !this.showGamePreview;
    }

    public setCutDynamicMapElementModelId(modelId: string) {
        this.cutDynamicMapElementModelId = modelId;
    }

    public get cutDynamicMapElement() {
        if (!this.setCutDynamicMapElementModelId)
            return null;

        return this.currentMapStore.currentMap?.getDynamicMapElementByModelId(this.cutDynamicMapElementModelId);
    }

    public get hasCutDynamicMapElement() {
        return !!this.cutDynamicMapElement;
    }

    public get showConflictResolutionOriginLines() {
        return this.hoveredConflictResolutionOriginTileData;
    }

    public setHoveredConflictResolutionOriginTileData(value: TileDataModel) {
        this.hoveredConflictResolutionOriginTileData = value;
    }

    public toggleOnlyShowEnemyCharacters() {
        this.onlyShowEnemyCharacters = !this.onlyShowEnemyCharacters;
    }

    public setMapEditorComplexity(value: MapEditorComplexity) {
        this.mapEditorComplexity = value;

        if (!this.complexityShowHeightPlanes && (this.selectedPlane > 0)) {
            this.setPlane(0);
        }

        if (!this.complexityShowLayerMinusOne && (this.selectedLayer === groundMinus1LayerIndex)) {
            this.setSelectedLayer(groundLayerIndex);
        }
    }

    private get isComplex() {
        return this.mapEditorComplexity === MapEditorComplexity.Complex;
    }

    public get complexityShowHeightPlanes() {
        return this.isComplex;
    }

    public get complexityShowLayerMinusOne() {
        return userStore.mayAccessProductionEditorComplexityFeatures;
    }

    public get complexityShowDebugStartMarker() {
        return this.isComplex;
    }

    public get complexityUseLayers() {
        return userStore.mayAccessProductionEditorComplexityFeatures;
    }

    public get complexityUseTileConflictResolution() {
        return this.isComplex;
    }

    public doesComplexityAllowTileAsset(tileAsset: TileAssetModel) {
        if (editorStore.isMainGameEditor)
            return true;

        const { visibilityInEditor } = tileAsset;
        switch (visibilityInEditor) {
            case TileVisibility.ProductionOnly:
                return false;

            case TileVisibility.ComplexOnly:
                return this.isComplex;

            case TileVisibility.ShowAlways:
                return true;

            default:
                throw new Error("Not implemented: " + visibilityInEditor);
        }
    }

    public get filteredTileAssets(): TileAssetModel[] {
        return mapRelatedStoreGetFilteredTileAssets(this, true, this.selectedCategory?.includeTileCategories, this.selectedCategory?.excludeTileCategories);
    }

    public get filteredTileAssetsWithoutSearch(): TileAssetModel[] {
        return mapRelatedStoreGetFilteredTileAssets(this, false, this.selectedCategory?.includeTileCategories, this.selectedCategory?.excludeTileCategories);
    }

    public get tags(): TagInfo[] {
        return mapRelatedStoreGetTags(this, this.selectedCategory?.includeTileCategories, this.selectedCategory?.excludeTileCategories);
    }

    public setHighlightedElements(elements: Set<DynamicMapElementInterface<any>>) {
        this.highlightedElements = elements;
    }

    public setHighlightedTiles(tiles: Set<TileDataInterface>) {
        this.highlightedTiles = tiles;
    }

    public setCanvasSize(width: number, height: number) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    public increaseActionMapEditorOpenCounter() {
        this.selectorMapEditorOpenCounter++;
    }
}

function isOverlappingGroundTileOnDifferentLayer(tileData: TileDataInterface, position: TilePosition) {
    if (tileData.position.plane === position.plane)
        return false;

    if (getTileLayerType(tileData.position.layer) !== TileLayerType.Ground)
        return false;

    const tileAsset = sharedStore.getTileAsset(tileData.tileAssetId);
    if (!tileAsset)
        return false;

    const { offsetZComputed } = tileAsset;
    const { x, y, plane } = tileData.position;

    const offsetX = getTileOffsetX(tileData, tileAsset);
    const offsetY = getTileOffsetY(tileData, tileAsset);
    const sizeZOffset = getTileSizeZOffset(tileData);

    // Normalize title box
    const { x: sizeX, y: sizeY } = tileAsset.size;
    const sizeZ = tileAsset.size.z + sizeZOffset;

    const tileXMin = x + plane;
    const tileXMax = Math.ceil(tileXMin + sizeX + offsetX);
    const tileYMin = y + plane;
    const tileYMax = Math.ceil(tileYMin + sizeY + offsetY);
    const tileZMin = plane + offsetZComputed;
    const tileZMax = Math.ceil(tileZMin + sizeZ);

    // Normalize search position
    const positionX = position.x + position.plane;
    const positionY = position.y + position.plane;
    const positionZ = position.plane;

    return (
        (tileXMin <= positionX) && (positionX < tileXMax) &&
        (tileYMin <= positionY) && (positionY < tileYMax) &&
        (tileZMin <= positionZ) && (positionZ <= tileZMax)
    );
}

export const mainMapEditorStore = new MapEditorStore(false, true);
export const selectorMapEditorStore = new MapEditorStore(true, false);

export const mapEditorStores = [
    mainMapEditorStore,
    selectorMapEditorStore
];