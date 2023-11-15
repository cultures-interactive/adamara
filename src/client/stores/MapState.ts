import { makeAutoObservable } from "mobx";

export class MapState {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public currentMapCenterX: number = 0;
    public currentMapCenterY: number = 0;
    public currentMapZoom: number = 1;

    public setMapCenter(x: number, y: number, zoom?: number) {
        if (zoom === undefined)
            zoom = this.currentMapZoom;

        if (this.currentMapCenterX === x && this.currentMapCenterY === y && this.currentMapZoom === zoom)
            return;

        this.currentMapCenterX = x;
        this.currentMapCenterY = y;
        this.currentMapZoom = zoom;
    }
}