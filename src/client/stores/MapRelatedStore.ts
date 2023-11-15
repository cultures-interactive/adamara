import { TilePosition } from "../../shared/definitions/other/TilePosition";
import { DynamicMapElementInterface } from "../../shared/game/dynamicMapElements/DynamicMapElement";
import { TileDataInterface } from "../../shared/game/TileDataModel";
import { TileAssetModel } from "../../shared/resources/TileAssetModel";
import { TileLayerType } from "../../shared/resources/TileLayerType";
import { gameStore } from "./GameStore";
import { MapState } from "./MapState";
import { sharedStore } from "./SharedStore";

export enum OtherPlacementElement {
    AreaTrigger = 1, // enum must start with 1 (to not be falsy)
    MapMarker,
    StartMarker,
    DebugStartMarker
}

export interface PlacementSelection {
    readonly selectedTileAssetId?: string;
    readonly selectedCharacterId?: number;
    readonly selectedAnimationName?: string;
    readonly selectedOtherElement?: OtherPlacementElement;
    readonly areaTriggerId?: string;
    // When you add a field here, also add it to doesPlacementSelectionLooslyEqual and isPlacementSelectionEmpty below
}

export function doesPlacementSelectionLooselyEqual(a: PlacementSelection, b: PlacementSelection) {
    if (!a || !b)
        throw new Error("PlacementSelection should never be null");

    return (a.selectedTileAssetId == b.selectedTileAssetId) &&
        (a.selectedCharacterId == b.selectedCharacterId) &&
        (a.selectedAnimationName == b.selectedAnimationName) &&
        (a.selectedOtherElement == b.selectedOtherElement) &&
        (a.areaTriggerId == b.areaTriggerId);
}

export function isPlacementSelectionEmpty(placementSelection: PlacementSelection) {
    return !placementSelection.selectedTileAssetId &&
        !placementSelection.selectedCharacterId &&
        !placementSelection.selectedAnimationName &&
        !placementSelection.selectedOtherElement;

    // areaTriggerId is not needed here (because they are only active when selectedOtherElement is not empty)
}

export enum SearchFilterCategory {
    TileAsset,
    NPC,
    Animation
}

export enum TagType {
    Tag = "Tag",
    All = "All",
    NoTag = "NoTag"
}

export type TagSelection = {
    type: TagType.All | TagType.NoTag;
} | {
    type: TagType.Tag;
    tag?: string;
};

export function doTagSelectionsMatch(a: TagSelection, b: TagSelection) {
    if (a === b)
        return true;

    if ((a === null) || (b === null))
        return false;

    if (a.type !== b.type)
        return false;

    if ((a.type !== TagType.Tag) || (b.type !== TagType.Tag))
        return true;

    return a.tag === b.tag;
}

export function doesAnyTagMatchTagSelection(tagSelection: TagSelection, tags: string[]) {
    if (!tagSelection)
        return true;

    switch (tagSelection.type) {
        case TagType.All:
            return true;

        case TagType.NoTag:
            return tags.length === 0;

        case TagType.Tag:
            return tags.includes(tagSelection.tag);

        default:
            throw new Error("Not implemented");
    }
}

export interface TagInfo {
    type: TagType;
    tag?: string;
    count: number;
}

export function getTags(tileAssets: TileAssetModel[]) {
    const tagInfoByTag = new Map<string, TagInfo>();

    const all: TagInfo = { type: TagType.All, count: 0 };
    const noTags: TagInfo = { type: TagType.NoTag, count: 0 };

    for (const asset of tileAssets) {
        all.count++;
        const tags = asset.tags.filter(tag => tag.length > 0);
        if (tags.length > 0) {
            for (const tag of tags) {
                let tagInfo = tagInfoByTag.get(tag);
                if (!tagInfo) {
                    tagInfo = { type: TagType.Tag, tag, count: 0 };
                    tagInfoByTag.set(tag, tagInfo);
                }
                tagInfo.count++;
            }
        } else {
            noTags.count++;
        }
    }

    const tags = [...tagInfoByTag.values()];
    if (noTags.count > 0) {
        tags.push(noTags);
    }

    tags.sort((a, b) => {
        if (a.count !== b.count)
            return b.count - a.count;

        if (!a.tag && !b.tag)
            return 0;

        if (!a.tag)
            return 1;

        if (!b.tag)
            return -1;

        return a.tag.localeCompare(b.tag, gameStore.languageKey);
    });

    tags.unshift(all);

    return tags;
}

export function mapRelatedStoreGetTags(mapRelatedStore: MapRelatedStore, includeMainTags: TagSelection[], excludeMainTags: TagSelection[]) {
    const { currentLayerType, selectedPlane, complexityShowHeightPlanes, doesComplexityAllowTileAsset } = mapRelatedStore;
    const tileAssets = sharedStore.getFilteredTileAssets(currentLayerType, selectedPlane, complexityShowHeightPlanes, includeMainTags, excludeMainTags, null, doesComplexityAllowTileAsset);
    return getTags(tileAssets);
}

export function mapRelatedStoreGetFilteredTileAssets(mapRelatedStore: MapRelatedStore, includeSearch: boolean, includeMainTags: TagSelection[], excludeMainTags: TagSelection[]) {
    const { currentLayerType, selectedPlane, tileAssetTagFilter, complexityShowHeightPlanes, doesComplexityAllowTileAsset } = mapRelatedStore;
    const tileAssetSearchFilter = mapRelatedStore.getSearchFilter(SearchFilterCategory.TileAsset);

    const searchTags = [...(includeMainTags || []), tileAssetTagFilter].filter(tag => tag !== null);

    return sharedStore.getFilteredTileAssets(currentLayerType, selectedPlane, complexityShowHeightPlanes, searchTags, excludeMainTags, includeSearch ? tileAssetSearchFilter : undefined, doesComplexityAllowTileAsset)
        .sort((a, b) => a.localizedName.get(gameStore.languageKey, true).localeCompare(b.localizedName.get(gameStore.languageKey, true), gameStore.languageKey));
}

export interface MapRelatedStore {
    placementSelection: PlacementSelection;
    selectedTool: any;
    selectedLayer: number;
    selectedPlane: number;

    currentLayerType: TileLayerType;
    tileAssetTagFilter: TagSelection;

    mapState: MapState;

    showGamePreview: boolean;
    ignoreHeightPlanes: boolean;

    complexityShowLayerMinusOne: boolean;
    complexityShowHeightPlanes: boolean;

    selectedTilePosition: TilePosition;
    highlightedElements: Set<DynamicMapElementInterface<any>>;
    highlightedTiles: Set<TileDataInterface>;
    showEmptyAreaTriggersAndNPCsEvenIfNotHighlighted: boolean;

    setPlane: (plane: number) => void;
    setTileAssetTagFilter: (filter: TagSelection) => void;
    setSelectedLayer: (layer: number) => void;

    setTool: (tool: any) => void;
    setPlacementSelection: (selection: PlacementSelection) => void;
    clearTileSelectionIfMatches: (id: string) => void;

    setSearchFilter: (category: SearchFilterCategory, filter: string) => void;
    getSearchFilter: (category: SearchFilterCategory) => string;

    toggleGamePreview(): void;

    doesComplexityAllowTileAsset: (tileAsset: TileAssetModel) => boolean;

    filteredTileAssets: TileAssetModel[];
    filteredTileAssetsWithoutSearch: TileAssetModel[];
    tags: TagInfo[];

    // Configuration values
    readonly allowMultiSelection: boolean;
    readonly allowToggleSelection: boolean;
    readonly isAssetSelectionEnabled: boolean;
}
