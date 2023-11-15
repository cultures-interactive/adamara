/**
 * Maps tileImageIdentification (consisting of tileId, usage and assetVersion)
 * created by tileImageIdentificationToKey to thumbnail filenames.
 */
export interface ThumbnailCatalogue {
    [tileImageIdentification: string]: string;
}