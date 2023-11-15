import { calcOriginToCenterOffset, calcScaleToFit } from "../../../helper/pixiHelpers";
import { DebugSpineInfoView } from "../../editor/map/debug/DebugSpineInfoView";
import { Spine } from "@pixi-spine/all-4.1";
import { Container } from "pixi.js";
import { AnimationSelectionStore } from "../../../stores/AnimationSelectionStore";
import { Direction } from "../../../../shared/resources/DirectionHelper";
import { SimpleCutSceneActionModel } from "../../../../shared/action/ActionModel";
import { LogEntry } from "../../../stores/LogEntry";
import { gameStore } from "../../../stores/GameStore";
import { localSettingsStore } from "../../../stores/LocalSettingsStore";
import { sharedStore } from "../../../stores/SharedStore";

/**
 * Properties of a cut scene.
 */
export interface SimpleCutSceneProperties {
    sourceActionModelId: string;

    text: string[];
    textContainerAlignmentDirection: Direction[];
    textContainerWidthPercent: number[];
    textStyle: number[];
    enabledTypeAnimation: boolean[];

    animationAssetName: string;
    animationSequenceName: string;
    animationLoop: boolean;
}

/**
 * A controller for cut scenes. Holds cut scene related information.
 * Can be used to observe {@see observeCutSceneAnimation} game store properties to add / remove cut scene elements.
 */
export class CutSceneController {

    private currentCutSceneAnimation: Spine;
    private debugCutSceneAnimationInfoView: DebugSpineInfoView;

    /**
     * Creates a new instance.
     * @param animationCenterX The x center for the cut scene animation in screen coordinates
     * @param animationCenterY The y center for the cut scene animation in screen coordinates
     * @param maxAnimationWidth The maximum width for an animation in pixel count.
     * @param maxAnimationHeight The maximum height for an animation in pixel count.
     * @param animationContainer The container to put the animation in.
     */
    public constructor(private animationCenterX: number, private animationCenterY: number, private maxAnimationWidth: number, private maxAnimationHeight: number, private animationContainer: Container,) {
    }

    /**
     * Can be used as an 'autorun' method to react to cut scene related game store properties.
     */
    public observeCutSceneAnimation() {
        if (!this.animationContainer) return;
        if (!gameStore.cutSceneAnimationStore?.selectedAnimation?.spine) {
            this.clearAnimation();
        }
        if (gameStore.cutSceneAnimationStore?.selectedAnimation?.spine && !this.currentCutSceneAnimation && !gameStore.cutSceneAnimationStore?.currentlyLoadingAnimation) {
            this.addAnimation();
        }
    }

    /**
     * Clears the animation.
     * @private
     */
    private clearAnimation() {
        if (this.currentCutSceneAnimation) {
            this.animationContainer.removeChild(this.currentCutSceneAnimation);
            this.currentCutSceneAnimation.destroy();
        }
        if (this.debugCutSceneAnimationInfoView) this.animationContainer.removeChild(this.debugCutSceneAnimationInfoView);
        this.currentCutSceneAnimation = null;
    }

    /**
     * Adds the animation.
     * @private
     */
    private addAnimation() {
        this.currentCutSceneAnimation = gameStore.cutSceneAnimationStore.selectedAnimation.spine;
        if (this.currentCutSceneAnimation.transform) { // check for transform to avoid a race condition exception
            const animationBoundsRectangle = this.currentCutSceneAnimation.getBounds();
            const centerOffset = calcOriginToCenterOffset(animationBoundsRectangle);

            const scaleFactor = calcScaleToFit(animationBoundsRectangle, this.maxAnimationWidth, this.maxAnimationHeight);

            this.currentCutSceneAnimation.setTransform(
                this.animationCenterX + centerOffset.x * scaleFactor,
                this.animationCenterY + centerOffset.y * scaleFactor,
                scaleFactor,
                scaleFactor);

            this.animationContainer.addChild(this.currentCutSceneAnimation);

            if (localSettingsStore.showDebugInfo) {
                this.debugCutSceneAnimationInfoView = new DebugSpineInfoView(this.currentCutSceneAnimation, false, false, localSettingsStore.showDebugInfo);
                this.animationContainer.addChild(this.debugCutSceneAnimationInfoView);
            }
        }
    }

    /**
     * Starts the cut scene.
     * @param action The cut scene to start.
     */
    public static startCutScene(action: SimpleCutSceneActionModel) {
        if (gameStore.gameEngine.gameState.actionPropertyCurrentCutScene) {
            gameStore.addLog(LogEntry.warnSameActionAlreadyRunning(action));
            return;
        }

        // action data needs to be converted to a non mobx Model (https://github.com/xaviergonz/mobx-keystone/issues/170)
        const props = CutSceneController.toProperties(action, gameStore.languageKey);
        // ui
        gameStore.gameEngine.gameState.setActionPropertyCurrentCutScene(props);
        gameStore.gameEngine.gameState.setActionPropertyCurrentCutSceneTextIndex(0);
        // animation
        if (props.animationAssetName) {
            gameStore.setCutSceneAnimationStore(new AnimationSelectionStore());
            const animationAsset = sharedStore.getAnimationByName(props.animationAssetName);
            gameStore.cutSceneAnimationStore.setSelectedAnimation(animationAsset).then(_ => {
                gameStore.cutSceneAnimationStore.setSelectedState(props.animationSequenceName, props.animationLoop);
            }).catch(e => {
                console.warn("Error loading cut scene animation with name " + props.animationAssetName, e);
            });
        }

        gameStore.gameEngine.executeActions(action.onStartExit, action);
    }

    /**
     * Ends the current cut scene.
     * @param sourceActionId The id of the action that started the cut scene.
     */
    public static endCutScene(sourceActionId: string) {
        if (!sourceActionId) {
            console.warn("Can not end a cut scene with no source action id");
            return;
        }
        // ui
        gameStore.gameEngine.gameState.setActionPropertyCurrentCutScene(null);
        gameStore.gameEngine.gameState.setActionPropertyCurrentCutSceneTextIndex(0);
        // animation
        gameStore.setCutSceneAnimationStore(null);
        // continue in action tree
        const sourceAction = gameStore.gameEngine.getCachedActionNode(sourceActionId) as SimpleCutSceneActionModel;
        if (!sourceAction) {
            console.error("Can not continue after cut scene. Action with the id " + sourceActionId + " not found.");
            return;
        }
        if (sourceAction.exits() && sourceAction.exits().length > 0) {
            gameStore.gameEngine.executeActions(sourceAction.onEndExit, sourceAction);
        }
    }

    /**
     * Creates {@link SimpleCutSceneProperties} out of the assigned action.
     * @param action The action to create the properties from.
     * @param languageKey The lange to translate cut scene text.
     */
    public static toProperties(action: SimpleCutSceneActionModel, languageKey: string): SimpleCutSceneProperties {
        if (!action) return null;
        return {
            sourceActionModelId: action.$modelId,
            text: action.textItems ? action.textItems.map(item => item.textToString(languageKey, gameStore.playerGender)) : [],
            textContainerAlignmentDirection: action.textItems ? action.textItems.map(item => item.textContainerAlignmentDirection) : [],
            textContainerWidthPercent: action.textItems ? action.textItems.map(item => item.textContainerWidthPercent) : [],
            textStyle: action.textItems ? action.textItems.map(item => item.textStyle) : [],
            enabledTypeAnimation: action.textItems ? action.textItems.map(item => item.enabledTypeAnimation) : [],
            animationAssetName: action.animation?.value,
            animationSequenceName: action.animation?.sequence,
            animationLoop: action.animation?.loop
        } as SimpleCutSceneProperties;
    }
}