import { Renderer } from "pixi.js";
import { MapElementContainer } from "../map/sorting/MapElementContainer";
import { SkipCullingBeforeFirstRender } from "./cullingConfigurationInterfaces/SkipCullingBeforeFirstRender";

export abstract class SkipCullingUntilFirstRenderContainer extends MapElementContainer implements SkipCullingBeforeFirstRender {
    public skipCullingBeforeFirstRender = true;

    public render(renderer: Renderer): void {
        super.render(renderer);
        this.skipCullingBeforeFirstRender = false;
    }
}