import { InteractionEvent, Point } from "pixi.js";
import { gameCanvasSize, gameConstants } from "../../../data/gameConstants";
import { touchDistance, getTouches } from "../../../helper/pixiHelpers";
import { MapState } from "../../../stores/MapState";

export class MapZoomController {
    private currentDistance: number;

    public constructor(
        private minZoom: number,
        private mapState: MapState,
        private mayZoom: () => boolean
    ) {
    }

    public pinch(e: InteractionEvent, local: Point) {
        if (!this.mayZoom())
            return false;

        const touches = getTouches(e);
        if (touches && touches.length === 2) {
            const distance = touchDistance(touches[0].pageX, touches[0].pageY, touches[1].pageX, touches[1].pageY);

            if (this.currentDistance) {
                const delta = this.currentDistance - distance;
                this.zoom(delta * gameConstants.map.pinchZoomSpeed, local);
            }
            this.currentDistance = distance;
            return true;
        }
        return false;
    }

    public reset() {
        this.currentDistance = null;
    }

    public wheelZoom(e: WheelEvent, local: Point) {
        if (!this.mayZoom())
            return;

        this.zoom(e.deltaY * gameConstants.map.wheelZoomSpeed, local);
    }

    public zoom(delta: number, local: Point) {
        if (!this.mayZoom())
            return;

        if (delta === 0)
            return;

        const { maxZoom } = gameConstants.map;
        const currentScale = this.mapState.currentMapZoom;

        const newScale = Math.max(this.minZoom, Math.min(currentScale - delta, maxZoom));
        const scaleDelta = newScale - currentScale;

        let newCenterX: number;
        let newCenterY: number;
        if (local) {
            newCenterX = this.mapState.currentMapCenterX - local.x * scaleDelta;
            newCenterY = this.mapState.currentMapCenterY - local.y * scaleDelta;
        } else {
            newCenterX = gameCanvasSize.width / 2 - ((gameCanvasSize.width / 2 - this.mapState.currentMapCenterX) / currentScale) * newScale;
            newCenterY = gameCanvasSize.height / 2 - ((gameCanvasSize.height / 2 - this.mapState.currentMapCenterY) / currentScale) * newScale;
        }

        this.mapState.setMapCenter(newCenterX, newCenterY, newScale);
    }

}