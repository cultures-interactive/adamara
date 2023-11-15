import { TileLayerType } from "../resources/TileLayerType";

export const layerConstants = {
    numberOfGroundLayers: 2,
    tileLayerIndexOffset: 1, // to avoid layer index changes, the highest ground layer should have index 0
};

export const firstDecorationLayerIndex = 1;
export const groundLayerIndex = 0;
export const groundMinus1LayerIndex = groundLayerIndex - 1;

export function getTileLayerType(layer: number): TileLayerType {
    if ((layer === null) || (layer === undefined))
        return null;

    return (layer <= groundLayerIndex) ? TileLayerType.Ground : TileLayerType.Decoration;
}