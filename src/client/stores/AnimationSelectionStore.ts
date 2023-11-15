import { makeAutoObservable, runInAction } from "mobx";
import { Spine } from '@pixi-spine/all-4.1';
import { animationLoader } from "../helper/AnimationLoader";
import { AnimationAssetModel } from "../../shared/resources/AnimationAssetModel";
import { AnimationSkinCombinator } from "../canvas/shared/animation/AnimationSkinCombinator";
import { setSkinTint } from "../canvas/game/character/characterAnimationHelper";
import { hexToColor } from "../helper/pixiHelpers";
import { errorStore } from "./ErrorStore";

export class AnimationSelectionStore {

    public static readonly DefaultAnimationState = "idleEast";
    public static readonly DefaultAnimationSkin = "skin-base";

    public selectedAnimation: SelectableAnimation = null;
    public currentlyLoadingAnimation: string = null;

    public selectedAnimationState: string = null;
    public selectedSkinClass: string;

    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public async setSelectedAnimation(animationAssetModel: AnimationAssetModel) {
        if (!animationAssetModel) {
            this.setLoadingState(null);
            this.applySelectableAnimation(null, null);
            return;
        }
        if (this.currentlyLoadingAnimation == animationAssetModel.name || animationAssetModel == this.selectedAnimation?.animation) return;
        try {
            this.setLoadingState(animationAssetModel.name);
            this.applySelectableAnimation(null, null);
            const spineAnimation = await animationLoader.loadSpine(animationAssetModel.id);
            // avoid race conditions..
            if (this.currentlyLoadingAnimation == animationAssetModel.name) {
                // ... apply the latest call.
                runInAction(() => {
                    this.setLoadingState(null);
                    this.applySelectableAnimation(spineAnimation, animationAssetModel);
                    this.setSelectedState(AnimationSelectionStore.DefaultAnimationState);
                });
            } else {
                // ... destroy outdated calls.
                spineAnimation.destroy();
            }
        } catch (e) {
            errorStore.addErrorFromErrorObject(e);
            this.applySelectableAnimation(animationLoader.createEmptySpine(), animationAssetModel);
            this.setLoadingState(null);
        }
    }

    private setLoadingState(animationName: string) {
        runInAction(() => { this.currentlyLoadingAnimation = animationName; });
    }

    private applySelectableAnimation(spine: Spine, animation: AnimationAssetModel) {
        runInAction(() => {
            if (spine && animation) {
                this.selectedAnimation = {
                    spine: spine,
                    animation: animation
                };
            } else {
                this.selectedAnimation = null;
            }
        });
    }

    public setSelectedState(animationStateName: string, loop = true) {
        if (this.hasAnimationSelected && animationStateName && this.selectedAnimation.spine.state?.hasAnimation(animationStateName)) {
            this.selectedAnimationState = animationStateName;
            this.selectedAnimation.spine.state.setAnimation(0, animationStateName, loop);
            this.selectedAnimation.spine.state.timeScale = 1;
        } else {
            this.selectedAnimationState = null;
        }
    }

    public setSelectedSkinClass(className: string) {
        this.selectedSkinClass = className;
    }

    public setSkinTint(colorHex: string) {
        if (this.selectedAnimation?.spine) {
            setSkinTint(this.selectedAnimation.spine, hexToColor(colorHex));
        }
    }

    public get hasAnimationSelected() {
        return this.selectedAnimation && this.selectedAnimation.spine && this.selectedAnimation.spine.spineData;
    }

    public setSkinSelection(skinNames: string[]) {
        const skinCombinator = new AnimationSkinCombinator(this.selectedAnimation?.spine?.spineData?.skins);
        skinCombinator.addAll(skinNames);
        skinCombinator.applyTo(this.selectedAnimation?.spine?.skeleton);
    }
}

export interface SelectableAnimation {
    spine: Spine;
    animation: AnimationAssetModel;
}

export const animationEditorStore = new AnimationSelectionStore();