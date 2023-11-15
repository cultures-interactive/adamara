import { TileImageUsage } from "../../resources/TileAssetModel";
import { AssetVersion } from "../socket.io/socketIODefinitions";

type Dict<T> = {
    [key: string]: T;
};

export interface AtlasData {
    frames: Dict<AtlasFrameData>;
    animations?: Dict<string[]>;
    meta: {
        scale: string;
        image: string;
    };
}

export interface AtlasFrameData {
    frame: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    trimmed?: boolean;
    rotated?: boolean;
    sourceSize?: {
        w: number;
        h: number;
    };
    spriteSourceSize?: {
        x: number;
        y: number;
    };
    pivot?: {
        x: number;
        y: number;
    };
}