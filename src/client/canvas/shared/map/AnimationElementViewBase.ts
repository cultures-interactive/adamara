import { Spine } from "@pixi-spine/all-4.1";
import { DynamicMapElementAnimationElementInterface } from "../../../../shared/game/dynamicMapElements/DynamicMapElementAnimationElementModel";
import { ReadonlyPosition } from "../../../../shared/game/PositionModel";
import { gameConstants } from "../../../data/gameConstants";
import { animationLoader } from "../../../helper/AnimationLoader";
import { repeatCallUntilSuccess } from "../../../helper/asyncHelpers";
import { createOrUpdateBoxFromAnimationData } from "../../../helper/mapElementSortingHelper";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";
import { errorStore } from "../../../stores/ErrorStore";
import { sharedStore } from "../../../stores/SharedStore";
import { SkipCullingUntilFirstRenderContainer } from "../optimization/SkipCullingUntilFirstRenderContainer";
import { BoundsUpdateMode } from "./sorting/MapElementContainer";

export abstract class AnimationElementViewBase extends SkipCullingUntilFirstRenderContainer {
    protected animationElementData: DynamicMapElementAnimationElementInterface;

    protected spine: Spine;

    private _loadingPromise: Promise<void>;

    protected baseRefreshMethods = [
        this.refreshPosition,
        this.refreshStartAnimation,
        this.refreshSpineAnimation,
        this.refreshScale,
        this.refreshTint,
        this.updateBox
    ];

    public constructor(
        data: DynamicMapElementAnimationElementInterface,
        private repeatLoadingUntilSuccess: boolean,
        private repeatLoadingUntilSuccessCancelled: () => boolean
    ) {
        super(BoundsUpdateMode.UpdateFromBox);

        this.animationElementData = data;
    }

    public get $modelId() {
        return this.animationElementData.$modelId;
    }

    public get loadingPromise() {
        return this._loadingPromise;
    }

    private refreshPosition() {
        const { x, y } = this.animationElementData.position;
        this.x = tileToWorldPositionX(x, y);
        this.y = tileToWorldPositionY(x, y);

        this.updateBox();
    }

    private refreshScale() {
        const animation = sharedStore.getAnimationByName(this.animationElementData.animationName);
        if (!animation)
            return;

        const { scale } = animation;
        if (this.spine) {
            this.spine.scale.set(scale, scale);
        }
    }

    public get tilePosition() {
        return this.animationElementData.position;
    }

    public setPosition(newPosition: ReadonlyPosition) {
        const { x, y } = newPosition;
        this.x = tileToWorldPositionX(x, y);
        this.y = tileToWorldPositionY(x, y);
        this.animationElementData.position = newPosition;

        this.updateBox();
    }

    protected updateBox() {
        const animation = sharedStore.getAnimationByName(this.animationElementData.animationName);
        this.setBox(createOrUpdateBoxFromAnimationData(this.box, this.animationElementData.position, animation));
    }

    private refreshSpineAnimation() {
        if (!sharedStore.animationsInitialized)
            return;

        // Destroy previous animation, if there is any
        if (this.spine) {
            this.spine.destroy({
                children: true,
                texture: false,
                baseTexture: false
            });
            this.spine = null;
        }

        let initialLoadingPromise: Promise<Spine>;

        const load = () => animationLoader.getSpineFromAnimationName(this.animationElementData.animationName);

        if (this.repeatLoadingUntilSuccess) {
            initialLoadingPromise = repeatCallUntilSuccess(
                load,
                this.repeatLoadingUntilSuccessCancelled,
                errorStore.addErrorFromErrorObject
            );
        } else {
            initialLoadingPromise = load();
        }

        this._loadingPromise = initialLoadingPromise
            .then(spine => {
                spine.position.set(gameConstants.tileWidth / 2, gameConstants.tileHeight / 2); // to tile center
                this.addChildAt(spine, 0);
                this.spine = spine;

                this.refreshPartOfLoop();

                // Since this is called inside asynchronous code, the contents of refreshStartAnimation() are NOT
                // called as a reaction. That's good, because we don't want to call refreshSpineAnimation() every
                // time the animationElementData.startAnimationName changes. refreshStartAnimation() has its own
                // reaction for later when the spine animation is loaded.
                this.refreshStartAnimation();
                this.refreshScale();

                this.onAnimationLoaded();
            })
            .catch(errorStore.addErrorFromErrorObject);
    }

    private refreshStartAnimation() {
        const { startAnimationName, startAnimationLoops } = this.animationElementData;
        if (!startAnimationName) {
            this.spine?.state.setEmptyAnimation(0);
            return;
        }

        this.playAnimation(startAnimationName, startAnimationLoops, false);
    }

    public playAnimation(name: string, loop: boolean, restartIfAlreadyPlaying: boolean) {
        try {
            if (this.spine && (restartIfAlreadyPlaying || !this.isAlreadyAnimating(name, loop))) {
                this.spine.state.setAnimation(0, name, loop);

                const animation = this.spine.spineData.findAnimation(name);
                return animation ? animation.duration : 0;
            }
        } catch (e) {
            errorStore.addErrorFromErrorObject(e);
        }

        return 0;
    }

    private isAlreadyAnimating(name: string, loop: boolean) {
        const track = this.spine?.state.tracks[0];
        return track && (track.animation.name === name) && (track.loop === loop);
    }

    protected onAnimationLoaded() {
    }

    protected refreshTint() {
    }
}
