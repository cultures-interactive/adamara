import { Container, Rectangle } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";
import { featureSwitchConstants } from "../../../data/featureSwitchConstants";
import { rectanglesIntersect, toLocalRectangle } from "../../../helper/pixiHelpers";
import { ApplicationReference } from "../ApplicationReference";
import { CullingShouldNotRejectEarly } from "./cullingConfigurationInterfaces/CullingShouldNotRejectEarly";
import { SkipCullingBeforeFirstRender } from "./cullingConfigurationInterfaces/SkipCullingBeforeFirstRender";
import { SkipCulling } from "./cullingConfigurationInterfaces/SkipCulling";

const debugOutput = false;

export class Culling {
    //private objects = new Array<DisplayObject>();

    public constructor(
        private appRef: ApplicationReference,
        private contentContainer: Container
    ) {
        this.appRef.required.renderer.on("prerender", this.onPrerender, this);
        //this.contentContainer.on("childAdded", this.onContainerChildAdded, this);
        //this.contentContainer.on("childRemoved", this.onContainerChildRemoved, this);
    }

    public destroy() {
        this.appRef.required.renderer.off("prerender", this.onPrerender, this);
        //this.contentContainer.off("childAdded", this.onContainerChildAdded, this);
        //this.contentContainer.off("childRemoved", this.onContainerChildRemoved, this);
    }

    private onPrerender() {
        const objects = this.contentContainer.children;
        const total = objects.length;
        let visible = 0;
        let earlyRejection = 0;
        let cannotEarlyReject = 0;
        let skipped = 0;
        let positionCheck = 0;
        let boundingBoxCheck = 0;

        const globalScreen = this.appRef.required.renderer.screen;
        const localScreenInContentContainer = toLocalRectangle(this.contentContainer, globalScreen);
        const { cullingEarlyRejectionPaddingX, cullingEarlyRejectionPaddingY } = gameConstants;
        const localEarlyRejectionSafezone = localScreenInContentContainer.clone().pad(cullingEarlyRejectionPaddingX, cullingEarlyRejectionPaddingY);

        const childBounds = new Rectangle();
        for (const object of objects) {
            /* Simple (and faster than using getBounds()) code to check the local bounds with localScreenInContentContainer.
             * We are assuming here that our objects in this.contentContainer never directly have themselves:
             * - local rotation
             * - local scale
             * - local pivot/anchor
             * 
             * (Children of our objects can have any of those.)
             * 
             * If this ever isn't true, it would probably be good to put our more complicated objects into
             * a separate array via onContainerChildAdded, and then use the following code on those objects:
             * 
             * child.getBounds(false, childBounds);
             * child.visible = rectanglesIntersect(globalScreen, childBounds);
            */

            if ((featureSwitchConstants.skipCullingUntilFirstRender && (object as unknown as SkipCullingBeforeFirstRender).skipCullingBeforeFirstRender) ||
                (object as unknown as SkipCulling).skipCulling) {
                skipped++;
                continue;
            }

            const { x, y } = object.transform.position;
            const { cullingShouldNotRejectEarly } = object as unknown as CullingShouldNotRejectEarly;

            if (cullingShouldNotRejectEarly) {
                cannotEarlyReject++;
            }

            // Position on screen? There's a really high chance it's visible and we don't need to check the bounding box.
            if (localScreenInContentContainer.contains(x, y)) {
                object.visible = true;
                positionCheck++;
            }
            // If our object's position is too far off, reject it without checking its bounds.
            //
            // If this ever goes wrong, consider either
            // a) setting cullingShouldNotRejectEarly for that type of object or
            // b) making the rejection padding bigger (costly if it gets much bigger) or
            // b) not using localEarlyRejectionThreshold for that kind of object (costly if there are a lot of this kind of object)
            //    by putting it in a different array as described in the comment above.
            else if (cullingShouldNotRejectEarly || localEarlyRejectionSafezone.contains(x, y)) {
                object.getLocalBounds(childBounds);

                childBounds.x += x;
                childBounds.y += y;
                object.visible = rectanglesIntersect(localScreenInContentContainer, childBounds);
                boundingBoxCheck++;
            } else {
                object.visible = false;
                earlyRejection++;
            }

            if (object.visible) {
                visible++;
            }
        }

        if (debugOutput) {
            console.log(`Visible: ${visible}/${total} = ${Math.round(visible / total * 100)}%\nVisible because of position check: ${positionCheck}/${total} = ${Math.round(positionCheck / total * 100)}%\nEarlyRejection: ${earlyRejection}/${total} = ${Math.round(earlyRejection / total * 100)}%\nBounding box check: ${boundingBoxCheck}/${total} = ${Math.round(boundingBoxCheck / total * 100)}%\nCannot early reject: ${cannotEarlyReject}/${total} = ${Math.round(cannotEarlyReject / total * 100)}%\nSkipped culling: ${skipped}/${total} = ${Math.round(skipped / total * 100)}%`);
        }
    }

    /*
    private onContainerChildAdded(child: DisplayObject) {
        this.objects.push(child);
    }

    private onContainerChildRemoved(child: DisplayObject) {
        this.objects.splice(this.objects.indexOf(child), 1);
    }
    */
}