import { ReactElement } from "react";
import { MapStatus } from "../../../stores/EditorMapStore";

export interface ElementOnMap {
    id: string;
    label: string;
    image?: string;
    icon?: ReactElement;
}

export interface SelectedMapElements {
    mapStatus: MapStatus;
    mapName: string;
    elements: ElementOnMap[];
}