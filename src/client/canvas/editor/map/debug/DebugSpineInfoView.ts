import { Container, Graphics, Rectangle, Text, TextStyle } from "pixi.js";
import { Spine } from "@pixi-spine/all-4.1";
import { CoordinateOriginGraphic } from "../../../shared/debug/CoordinateOriginGraphic";

/**
 * Can be used to draw information about a {@link Spine} animation like boundaries and origin.
 */
export class DebugSpineInfoView extends Container {

    private worldTextStyle = new TextStyle({
        align: "left",
        fontSize: 12,
        fill: ["white"],
        fontFamily: "Courier New",
        strokeThickness: 3
    });

    public constructor(private spine: Spine, private showOriginText = true, private showBounds = true, private showOriginIndicator = true) {
        super();
        this.update(this.spine);
    }

    public update(spine: Spine) {
        this.removeChildren();
        this.spine = spine;

        if (!this.spine)
            return;

        const bounds = this.spine.getBounds();
        this.createBoundsInfo(bounds);
        this.createOriginInfo();
    }

    private createBoundsInfo(bounds: Rectangle) {
        if (!this.showBounds) return;
        const boundsGraphics = new Graphics();
        boundsGraphics.lineStyle(1, 0xFFFFFF);
        boundsGraphics.moveTo(bounds.x, bounds.y);
        boundsGraphics.lineTo(bounds.x + bounds.width, bounds.y);
        boundsGraphics.lineTo(bounds.x + bounds.width, bounds.y + bounds.height);
        boundsGraphics.lineTo(bounds.x, bounds.y + bounds.height);
        boundsGraphics.lineTo(bounds.x, bounds.y);
        boundsGraphics.closePath();
        this.addChild(boundsGraphics);
    }

    private createOriginInfo() {
        if (this.showOriginText) {
            const infoText = new Text("origin \nx: " + Math.round(this.spine.x) + "\ny: " + Math.round(this.spine.y), this.worldTextStyle);
            infoText.setTransform(this.spine.x + 4, this.spine.y);
            this.addChild(infoText);
        }
        if (this.showOriginIndicator) {
            const origin = new CoordinateOriginGraphic(10, 0, 0xFFFFFF, 0xFFFFFF);
            origin.setTransform(this.spine.x, this.spine.y);
            this.addChild(origin);
        }
    }
}