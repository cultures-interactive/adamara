import { Rectangle } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";
import { BoundsUpdateMode } from "../map/sorting/MapElementContainer";
import { CullingShouldNotRejectEarly } from "./cullingConfigurationInterfaces/CullingShouldNotRejectEarly";
import { SkipCullingUntilFirstRenderContainer } from "./SkipCullingUntilFirstRenderContainer";

/**
 * This class is a Container with one special feature: It doesn't automatically update
 * its localBounds, hence making calls to getLocalBounds() much faster.
 * 
 * Any time the local bounds have changed, make sure to call updateStaticLocalBounds().
 */
export abstract class StaticLocalBoundsContainer extends SkipCullingUntilFirstRenderContainer implements CullingShouldNotRejectEarly {
    private staticLocalBounds = new Rectangle();

    /**
     * Will be set to `true` by updateStaticLocalBounds() if the object is too big too use early
     * rejection culling by position. Should not be set from anywhere else.
     * 
     * (This is getting called once per tile per frame by the culling functionality - and it actually
     * shows up on the profiler as up to 1.6% when it is a getter. So now it is just a direct field
     * in the hope that it speeds things up. Please don't take this as an example though. We still
     * normally use getters/setters.)
     */
    public cullingShouldNotRejectEarly: boolean;

    public constructor() {
        super(BoundsUpdateMode.UpdateFromGetLocalBoundsWhenDirty);

        this.updateStaticLocalBounds = this.updateStaticLocalBounds.bind(this);
    }

    protected updateStaticLocalBounds() {
        super.getLocalBounds(this.staticLocalBounds);

        const { cullingEarlyRejectionPaddingX, cullingEarlyRejectionPaddingY } = gameConstants;
        this.cullingShouldNotRejectEarly = (
            (this.staticLocalBounds.left <= -cullingEarlyRejectionPaddingX) ||
            (this.staticLocalBounds.right >= cullingEarlyRejectionPaddingX) ||
            (this.staticLocalBounds.top <= -cullingEarlyRejectionPaddingY) ||
            (this.staticLocalBounds.bottom >= cullingEarlyRejectionPaddingY)
        );

        this.setMapElementContainerBoundsDirty();
    }

    public getLocalBounds(rect?: Rectangle, skipChildrenUpdate?: boolean): Rectangle {
        if (rect) {
            rect.copyFrom(this.staticLocalBounds);
        }

        return rect || this.staticLocalBounds;
    }
}