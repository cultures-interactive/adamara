import { MapElementContainer } from "../../map/sorting/MapElementContainer";
import { SkipCulling } from "./SkipCulling";

export abstract class HideableMapElementContainer extends MapElementContainer implements SkipCulling {
    private _isHidden: boolean = false;

    public get isHidden() {
        return this._isHidden;
    }

    public set isHidden(value: boolean) {
        // When setting that this element is not visible anymore, we are also explictely
        // storing that we hid it in _isHidden and skip the culling while that is the case.
        // If we would only set visible = false, the culling would turn visible back on.

        this._isHidden = value;
        this.visible = !value;
    }

    public get skipCulling() {
        return this._isHidden;
    }
}
