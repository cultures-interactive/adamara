import { TileImageUsage } from "../resources/TileAssetModel";

export const routeConstants = {
    tileAssetAtlasImage: "/tileAssetAtlasImage",
    tileThumbnails: "/tileThumbnails",
    atlasTileSourceImages: (tileAssetId: string, usage: TileImageUsage, version: string) => `/api/resources/tileAssetImage/${encodeURIComponent(tileAssetId)}/${usage}/${version}`
};

export function getThumbnailUrl(filename: string) {
    if (!filename)
        return null;

    return routeConstants.tileThumbnails + "/" + filename;
}