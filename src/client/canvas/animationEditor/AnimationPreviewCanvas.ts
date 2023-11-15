import { Spine } from "@pixi-spine/all-4.1";
import { autorun, IReactionDisposer } from "mobx";
import { getSnapshot } from "mobx-keystone";
import { Container } from "pixi.js";
import { Handle } from "react-flow-renderer";
import { makeChanges } from "../../../shared/helper/mobXHelpers";
import { AnimationAssetModel, AnimationType } from "../../../shared/resources/AnimationAssetModel";
import { editorClient } from "../../communication/EditorClient";
import { gameConstants } from "../../data/gameConstants";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../helper/pixiHelpers";
import { errorStore } from "../../stores/ErrorStore";
import { localSettingsStore } from "../../stores/LocalSettingsStore";
import { AnimationEditorChangeGroup, groupUndoableAnimationEditorChanges } from "../../stores/undo/operation/AnimationEditorSubmitChangesOp";
import { DebugSpineInfoView } from "../editor/map/debug/DebugSpineInfoView";
import { TileHighlight } from "../editor/map/TileHighlight";
import { SizeAndHandleManager } from "../editor/tileAssetViewer/SizeAndOffsetHandleManager";
import { AppContext, PixiApp } from "../shared/PixiApp";

interface HotReloadData {
    parent: HTMLElement;
    width: number;
    height: number;
    spine: Spine;
    animationData: AnimationAssetModel;
}

const defaultDistanceFromBottom = 20;
const defaultScaleMap = 1.6;

export class AnimationPreviewCanvas extends PixiApp {
    private spine: Spine;
    private animationData: AnimationAssetModel;
    private zoomScale = 1;

    private spineContainer: Container;

    private debugView: DebugSpineInfoView;
    private tile: TileHighlight;
    private sizeIndicator: TileHighlight;
    private sizeHandleManager: SizeAndHandleManager<AnimationAssetModel>;

    private tileRelatedUI = new Array<Container>();

    private animationDataReaction: IReactionDisposer;

    private _editMode: boolean = false;

    public constructor(width: number, height: number) {
        super("AnimationPreviewCanvas", AppContext.AnimationPreview, { width, height });

        const { stage } = this.app;

        stage.position.x = width / 2;

        this.tile = new TileHighlight(2, 0xFFFFFF, 0x333333);
        this.tile.x = -gameConstants.tileWidth / 2;
        this.tile.y = -gameConstants.tileHeight / 2;
        stage.addChild(this.tile);
        this.tileRelatedUI.push(this.tile);

        this.spineContainer = new Container();
        stage.addChild(this.spineContainer);

        this.sizeIndicator = new TileHighlight(2, 0xFFFFFF, undefined, 0.6, 0, { width: 2, color: 0xFFFFFF, alpha: 0.6 }, 0.2);
        this.sizeIndicator.pivot.x = gameConstants.tileWidth / 2;
        this.sizeIndicator.pivot.y = gameConstants.tileHeight / 2;
        stage.addChild(this.sizeIndicator);
        this.tileRelatedUI.push(this.sizeIndicator);

        const handleContainer = new Container();
        handleContainer.x = -gameConstants.tileWidth / 2;
        handleContainer.y = -gameConstants.tileHeight / 2;
        stage.addChild(handleContainer);
        this.tileRelatedUI.push(handleContainer);

        this.sizeHandleManager = new SizeAndHandleManager<AnimationAssetModel>(
            handleContainer,
            handle => {
                handleContainer.addChild(handle.handleView);
                this.tileRelatedUI.push(handle.handleView);
            },
            (animationAsset, changeExecuter) => {
                groupUndoableAnimationEditorChanges(AnimationEditorChangeGroup.UnspecificGroupedNodeChanges, changeExecuter);
            },
            () => { return false; }
        );

        this.debugView = new DebugSpineInfoView(null, false, false, true);
        stage.addChild(this.debugView);

        this.refreshTileRelatedUI();

        this.reactionDisposers.addAutorun(this.refreshShowDebugInfo.bind(this));
    }

    public dispose(): void {
        // Remove Spine element so that the attached spine element doesn't get destroyed on pixiApp.dispose()
        // TODO The Spine element should get destroyed somewhere later though.
        this.spineContainer.removeChildren();
        this.spine = null;

        if (this.animationDataReaction) {
            this.animationDataReaction();
            this.animationDataReaction = null;
        }

        super.dispose();
    }

    public updateAnimation(spine: Spine, animationData: AnimationAssetModel) {
        if ((this.spine === spine) && (this.animationData === animationData))
            return;

        if (this.spine) {
            this.spineContainer.removeChildren();
        }

        if (this.animationDataReaction) {
            this.animationDataReaction();
            this.animationDataReaction = null;
        }

        this.spine = spine;
        this.animationData = animationData;

        this.refreshTileRelatedUI();

        if (this.spine) {
            this.spineContainer.addChild(spine);
            this.debugView.update(this.spine);
        }

        if (this.animationData) {
            this.animationDataReaction = autorun(this.refreshAnimationData.bind(this));
        }
    }

    private refreshAnimationData() {
        this.refreshZoom();
        this.refreshTileRelatedUI();

        const { size, internalOffsetZ, offsetX, offsetY, scale } = this.animationData;
        this.sizeIndicator.setAll(size.x, size.y, size.z, internalOffsetZ, true);

        const x = tileToWorldPositionX(offsetX, offsetY);
        const y = tileToWorldPositionY(offsetX, offsetY);
        this.sizeIndicator.position.set(x, y);

        this.sizeHandleManager.target = this.animationData;

        this.spine.scale.set(scale, scale);
    }

    private refreshTileRelatedUI() {
        const showTile = this.animationData && !this.animationData.isType(AnimationType.None) && !this.animationData.isType(AnimationType.Cutscene) && this.editMode;
        for (const object of this.tileRelatedUI) {
            object.visible = showTile;
        }
    }

    public updateZoom(scale: number) {
        this.zoomScale = scale;
        this.refreshZoom();
    }

    private refreshZoom() {
        if (!this.animationData)
            return;

        /*
        const bounds = this.spine.getLocalBounds();
        const offset = calcOriginToCenterOffset(bounds);
        this.spine.setTransform(offset.x * value, offset.y * value, value, value);
        */

        let scale = this.zoomScale;

        if (this.animationData.isType(AnimationType.None) || this.animationData.isType(AnimationType.Cutscene)) {
            this.app.stage.position.y = this.app.renderer.height / 2;
        } else {
            const baseScale = scale;
            scale *= defaultScaleMap;
            this.app.stage.position.y = this.app.renderer.height - (defaultDistanceFromBottom + gameConstants.tileHeight / 2) * scale - Math.max(0, this.app.renderer.height * (1 - baseScale) / 3);
        }

        this.app.stage.scale.set(scale, scale);
    }

    private refreshShowDebugInfo() {
        this.debugView.visible = localSettingsStore.showDebugInfo;
    }

    public get editMode() {
        return this._editMode;
    }

    public set editMode(value: boolean) {
        if (this._editMode === value)
            return;

        this._editMode = value;

        this.refreshTileRelatedUI();
    }

    public fillHotReloadData(data: HotReloadData) {
        data.parent = this.parentElement;
        data.width = this.app.renderer.width;
        data.height = this.app.renderer.height;
        data.spine = this.spine;
        data.animationData = this.animationData;
    }

    public integrateHotReloadData(data: HotReloadData) {
        this.attach(data.parent);
        this.updateAnimation(data.spine, data.animationData);
    }
}

let animationPreviewCanvas: AnimationPreviewCanvas;

export function createAnimationPreviewCanvas(width: number, height: number) {
    if (animationPreviewCanvas)
        return;

    animationPreviewCanvas = new AnimationPreviewCanvas(width, height);
}

export function getAnimationPreviewCanvas() {
    return animationPreviewCanvas;
}

export function disposeAnimationPreviewCanvas() {
    if (animationPreviewCanvas) {
        animationPreviewCanvas.dispose();
        animationPreviewCanvas = null;
    }
}

if (module.hot) {
    const data = module.hot.data as HotReloadData;
    if (data && data.parent) {
        createAnimationPreviewCanvas(data.width, data.height);
        animationPreviewCanvas.integrateHotReloadData(data);
    }

    module.hot.dispose(data => {
        if (animationPreviewCanvas) {
            animationPreviewCanvas.fillHotReloadData(data);
            disposeAnimationPreviewCanvas();
        }
    });
}
