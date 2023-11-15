import { TileDataModel } from "../game/TileDataModel";

export const findNearestNeighborLayerUpwards = (
    tileData: TileDataModel[],
    numberOfLayers: number,
    layer: number
) => findNearestNeighborLayer(tileData, numberOfLayers, layer, true);

export const findNearestNeighborLayerDownwards = (
    tileData: TileDataModel[],
    numberOfLayers: number,
    layer: number
) => findNearestNeighborLayer(tileData, numberOfLayers, layer, false);

const findNearestNeighborLayer = (
    tileData: TileDataModel[],
    numberOfLayers: number,
    layer: number,
    upward: boolean
) => {
    const searchLimit = upward ? numberOfLayers - layer : layer - 1;
    let otherTileData: TileDataModel = null;
    for (let i = 1; i <= searchLimit; i++) {
        otherTileData = findTileDataByLayer(tileData, upward ? layer + i : layer - i);
        if (otherTileData) {
            break;
        }
    }
    return otherTileData;
};

export const findTileDataByLayer = (tileDataArray: TileDataModel[], layer: number): TileDataModel => {
    for (const tileData of tileDataArray) {
        if (tileData.position.layer === layer) return tileData;
    }
    return null;
};
