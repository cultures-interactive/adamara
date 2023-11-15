import { InteractionEvent, Point } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";
import { getTouches, isRightButtonPressed, isTwoFingerPan, touchDistance } from "../../../helper/pixiHelpers";
import { MapState } from "../../../stores/MapState";

export class EditorMapScrollController {

    private startDistance: number;
    private prevPoint: Point;
    private scrollCounter = 0;

    public constructor(private mapState: MapState) {
    }

    public reset() {
        this.prevPoint = null;
        this.startDistance = null;
        this.scrollCounter = 0;
    }

    public scroll(e: InteractionEvent): boolean {
        if (isRightButtonPressed(e) || isTwoFingerPan(e)) {
            const { global } = e.data;
            const touches = getTouches(e);

            if (this.prevPoint) {
                let currentX: number;
                let currentY: number;
                if (touches?.length === 2) {
                    const touch0 = touches[0];
                    const touch1 = touches[1];

                    const distanceVariantion = Math.abs(touchDistance(touch0.pageX, touch0.pageY, touch1.pageX, touch1.pageY) - this.startDistance);
                    if (distanceVariantion > gameConstants.map.panDistanceMargin) {
                        return false;
                    }

                    // The fingers that touch0 and touch1 represent might swap, so we take the one with the smallest distance assuming that's the same finger which was moved less
                    if (touchDistance(touch0.pageX, touch0.pageY, this.prevPoint.x, this.prevPoint.y) < touchDistance(touch1.pageX, touch1.pageY, this.prevPoint.x, this.prevPoint.y)) {
                        currentX = touch0.pageX;
                        currentY = touch0.pageY;
                    } else {
                        currentX = touch1.pageX;
                        currentY = touch1.pageY;
                    }

                } else {
                    currentX = global.x;
                    currentY = global.y;
                }

                const deltaX = currentX - this.prevPoint.x;
                const deltaY = currentY - this.prevPoint.y;

                const { currentMapCenterX, currentMapCenterY, currentMapZoom } = this.mapState;
                this.mapState.setMapCenter(currentMapCenterX + deltaX, currentMapCenterY + deltaY, currentMapZoom);
            } else {
                this.prevPoint = new Point();
            }

            if (touches?.length === 2) {
                const touch0 = touches[0];
                const touch1 = touches[1];
                this.prevPoint.set(touch0.pageX, touch0.pageY);
                if (!this.startDistance) {
                    this.startDistance = touchDistance(touch0.pageX, touch0.pageY, touch1.pageX, touch1.pageY);
                }
            } else {
                this.prevPoint.set(global.x, global.y);
            }
            this.scrollCounter++;
            return true;
        } else {
            this.reset();
        }
        return false;
    }

    public didJustScroll() {
        return this.scrollCounter > 10;
    }

}