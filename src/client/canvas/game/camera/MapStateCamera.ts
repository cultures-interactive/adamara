import { Camera } from "./Camera";
import { MapState } from "../../../stores/MapState";

/**
 * A basic camera that uses a {@link MapState} for its properties.
 */
export class MapStateCamera extends Camera {

    /**
     * Creates a new instance.
     * @param mapState The map state to use.
     */
    public constructor(private mapState: MapState) {
        super(mapState.currentMapCenterX, mapState.currentMapCenterY, mapState.currentMapZoom);
    }

    public getX(): number {
        return this.mapState.currentMapCenterX;
    }

    public getY = (): number => this.mapState.currentMapCenterY;

    public getZoom = (): number => this.mapState.currentMapZoom;

    public setX = (x: number) => {
        this.mapState.setMapCenter(x, this.getX(), this.getZoom());
    };

    public setY = (y: number) => {
        this.mapState.setMapCenter(this.getX(), y, this.getZoom());
    };

    public setZoom = (zoom: number) => {
        this.mapState.setMapCenter(this.getX(), this.getY(), zoom);
    };

    public onTick = () => {};
}