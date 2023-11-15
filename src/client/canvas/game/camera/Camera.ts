import { Container, Point } from "pixi.js";

/**
 * A basic camera.
 */
export class Camera {

    /**
     * Creates a new instance.
     * @param x The world x position of the camera.
     * @param y The world y position of the camera.
     * @param zoom The zoom of the camera.
     */
    public constructor(protected x: number = 0, protected y: number = 0, protected zoom: number = 0) { }

    public getX() {
        return this.x;
    }

    public getY() {
        return this.y;
    }

    public getZoom() {
        return this.zoom;
    }


    public setX(x: number) {
        this.x = x;
    }

    public setY(y: number) {
        this.y = y;
    }

    public setZoom(zoom: number) {
        this.zoom = zoom;
    }

    public onTick() { }

    public set(x: number, y: number, zoom: number): Camera {
        this.setX(x);
        this.setY(y);
        this.setZoom(zoom);
        return this;
    }

    public setPosition(position: Point): Camera {
        this.setX(position.x);
        this.setY(position.y);
        return this;
    }

    public copyPosition(): Point {
        return new Point(this.x, this.y);
    }

    /**
     * Applies this camera to the assigned container.
     * @param container The container to use the camera for.
     */
    public applyTo(container: Container) {
        if (!container) {
            console.warn("Trying to apply a camera to an undefined container.");
            return;
        }
        container.position.set(this.getX(), this.getY());
        const zoom = this.getZoom();
        container.scale.set(zoom, zoom);
    }

}