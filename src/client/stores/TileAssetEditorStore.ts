import { doesPlacementSelectionLooselyEqual, PlacementSelection, SearchFilterCategory, TagInfo, TagSelection, MapRelatedStore, mapRelatedStoreGetFilteredTileAssets, mapRelatedStoreGetTags } from "./MapRelatedStore";
import { MapState } from "./MapState";
import { makeAutoObservable, observable } from "mobx";
import { getTileLayerType } from "../../shared/data/layerConstants";
import { TileLayerType } from "../../shared/resources/TileLayerType";
import { TileAssetModel, TileVisibility } from "../../shared/resources/TileAssetModel";
import { TilePosition } from "../../shared/definitions/other/TilePosition";
import { DynamicMapElementInterface } from "../../shared/game/dynamicMapElements/DynamicMapElement";
import { TileDataInterface } from "../../shared/game/TileDataModel";

export class TileAssetEditorStore implements MapRelatedStore {
    public placementSelection: PlacementSelection = {};
    public readonly selectedTool: any; // Not used in AssetEditor
    public selectedLayer: number = null;
    public selectedPlane: number = 0; // Not used in AssetEditor
    public tileAssetTagFilter: TagSelection = null;

    private searchFilter: Map<SearchFilterCategory, string> = observable.map();

    public showGamePreview = false;

    public readonly mapState = new MapState();
    public readonly allowMultiSelection: boolean = true;
    public readonly allowToggleSelection: boolean = true;

    public isHoveringConflictResolutionOrigin: boolean;

    public editBlockedDirections: boolean;

    public readonly complexityShowLayerMinusOne = true;
    public readonly complexityShowHeightPlanes = true;

    public onlyShowVisibility: TileVisibility = null;

    public readonly selectedTilePosition: TilePosition = null;
    public readonly highlightedElements: Set<DynamicMapElementInterface<any>> = null;
    public readonly highlightedTiles: Set<TileDataInterface> = null;
    public readonly showEmptyAreaTriggersAndNPCsEvenIfNotHighlighted = false;

    public readonly ignoreHeightPlanes = false;

    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public get isAssetSelectionEnabled(): boolean {
        return true;
    }

    public setPlane(plane: number) { } // Not used in AssetEditor

    public setTool(tool: any) { } // Not used in AssetEditor

    public setPlacementSelection(selection: PlacementSelection) {
        if (!selection)
            selection = {};

        if (doesPlacementSelectionLooselyEqual(this.placementSelection, selection))
            return;

        this.placementSelection = selection;
        this.editBlockedDirections = false;
    }

    public clearTileSelectionIfMatches(id: string) {
        const { selectedTileAssetId } = this.placementSelection;
        if (selectedTileAssetId === id) {
            this.setPlacementSelection({});
        }
    }

    public get currentLayerType(): TileLayerType {
        return getTileLayerType(this.selectedLayer);
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

    public setSelectedLayer(layer: number): void {
        this.selectedLayer = layer;
    }

    public toggleGamePreview() {
        this.showGamePreview = !this.showGamePreview;
    }

    public setHoveringConflictResolutionOrigin(value: boolean) {
        this.isHoveringConflictResolutionOrigin = value;
    }

    public toggleEditBlockedDirections(): void {
        this.editBlockedDirections = !this.editBlockedDirections;
    }

    public setOnlyShowVisibility(value: TileVisibility) {
        this.onlyShowVisibility = value;
    }

    public doesComplexityAllowTileAsset(tileAsset: TileAssetModel) {
        return (this.onlyShowVisibility == null) || tileAsset.visibilityInEditor === this.onlyShowVisibility;
    }

    public get filteredTileAssets(): TileAssetModel[] {
        return mapRelatedStoreGetFilteredTileAssets(this, true, [], []);
    }

    public get filteredTileAssetsWithoutSearch(): TileAssetModel[] {
        return mapRelatedStoreGetFilteredTileAssets(this, false, [], []);
    }

    public get tags(): TagInfo[] {
        return mapRelatedStoreGetTags(this, [], []);
    }
}

export const tileAssetEditorStore = new TileAssetEditorStore();