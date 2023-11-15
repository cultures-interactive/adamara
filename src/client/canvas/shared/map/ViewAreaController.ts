import { ViewArea } from "../../game/character/ViewArea";
import { Container } from "pixi.js";
import { ViewAreaTriggerModel } from "../../../../shared/game/ViewAreaTriggerModel";
import EventEmitter from "eventemitter3";

export interface ViewAreaControllerEvents {
    viewAreaTriggerEnter: [triggerName: string];
    viewAreaTriggerLeave: [triggerName: string];
}

/**
 * A controller that contains {@link ViewArea}s.
 * It can trigger the events {@see EventViewAreaTriggerEnter} and {@see EventViewAreaTriggerLeave}.
 * Call {@link checkViewIntersections} to check for intersections.
 */
export class ViewAreaController {

    public static readonly EventViewAreaTriggerEnter = "EventViewAreaTriggerEnter";
    public static readonly EventViewAreaTriggerLeave = "EventViewAreaTriggerLeave";

    public viewAreas = new Array<ViewArea>();
    private overlayContainer: Container;
    private visible = false;

    public events = new EventEmitter<ViewAreaControllerEvents>();

    /**
     * Initializes all containing {@link ViewArea}s.
     * Should be called if the assigned {@link ViewAreaTriggerModel}s changed.
     * @param viewAreaTriggers The triggers to initialize from.
     */
    public init(viewAreaTriggers: ViewAreaTriggerModel[]) {
        this.clearContainer();
        this.viewAreas = new Array<ViewArea>();
        viewAreaTriggers.forEach(trigger => {
            const area = ViewArea.fromModel(trigger);
            this.viewAreas.push(area);
        });
        this.fillContainer();
    }

    /**
     * Updates the position and rotation of the containing {@link ViewArea}s.
     * @param worldX The x world position.
     * @param worldY The y world position.
     * @param rotation The rotation in radiant.
     */
    public updateTransform(worldX: number, worldY: number, rotation: number) {
        this.viewAreas.forEach(area => {
            area.update(worldX, worldY, rotation);
            if (this.visible) area.draw();
        });
    }

    /**
     * Checks intersections of the assigned world coordinates to all containing {@link ViewArea}s.
     * Emits the corresponding events: {@see ViewAreaController.EventViewAreaTriggerEnter} and {@see ViewAreaController.EventViewAreaTriggerLeave}
     * @param worldX The world x coordinate to check for intersection.
     * @param worldY The world y coordinate to check for intersection.
     */
    public checkViewIntersections(worldX: number, worldY: number) {
        for (let i = 0; i < this.viewAreas.length; i++) {
            const area = this.viewAreas[i];
            const indexBefore = area.getIntersectingPolygonIndex();
            const wasIntersecting = area.isIntersecting();
            const isIntersectionNow = area.checkIntersection(worldX, worldY);
            const indexAfter = area.getIntersectingPolygonIndex();
            if (!wasIntersecting && isIntersectionNow) {
                this.events.emit("viewAreaTriggerEnter", area.triggerName);
                this.updateGraphics();
            }
            if (wasIntersecting && !isIntersectionNow) {
                this.events.emit("viewAreaTriggerLeave", area.triggerName);
                this.updateGraphics();
            }
            if (indexBefore != indexAfter) {
                this.updateGraphics(); // just for correct visualization
            }
        }
    }

    /**
     * Shows the containing {@link ViewArea}s and updates them.
     */
    public showGraphics() {
        if (this.visible)
            return;

        this.visible = true;
        this.updateGraphics();
    }

    /**
     * Hides the containing {@link ViewArea}s and updates them.
     */
    public hideGraphics() {
        if (!this.visible)
            return;

        this.visible = false;
        this.viewAreas.forEach(area => { area.clear(); });
    }

    /**
     * Updates the containing {@link ViewArea}s.
     */
    public updateGraphics() {
        if (!this.visible)
            return;

        this.viewAreas.forEach(area => {
            area.draw();
        });
    }

    /**
     * Removes the containing {@link ViewArea}s from the {@link Container} and destroys them.
     */
    public destroy() {
        // Destroy all viewAreas. They will automatically be removed from their parent container.
        for (const viewArea of this.viewAreas) {
            viewArea.destroy({
                children: true
            });
        }
        this.viewAreas = [];
    }

    /**
     * Sets the {@link Container} to add the {@link ViewArea}s to.
     * @param container The container.
     */
    public setOverlayContainer(container: Container) {
        if (!container) return;
        this.clearContainer();
        this.overlayContainer = container;
        this.fillContainer();
    }

    private clearContainer() {
        if (!this.overlayContainer) return;
        this.viewAreas.forEach(area => this.overlayContainer.removeChild(area));
    }

    private fillContainer() {
        if (!this.overlayContainer) return;
        this.viewAreas.forEach(area => this.overlayContainer.addChild(area));
    }

}