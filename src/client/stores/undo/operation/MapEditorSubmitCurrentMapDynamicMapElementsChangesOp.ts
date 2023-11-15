import { createChangeGroupStack, createGroupUndoableChangesFunction, mergeGroupedPatchOp, UndoableOperation, UndoableOperationGroupSideEffect } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { editorClient } from "../../../communication/EditorClient";
import { AugmentedPatch } from "../../../../shared/helper/mobXHelpers";
import { copyTilePosition, TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { DynamicMapElementModel } from "../../../../shared/game/dynamicMapElements/DynamicMapElement";
import { EditorToolType, MapEditorStore } from "../../MapEditorStore";
import { CurrentMapStore } from "../../CurrentMapStore";
import { editorMapStore } from "../../EditorMapStore";

export enum DynamicMapElementChangeGroup {
    None,
    Create,
    Delete,
    MoveViaPaste,
    MoveStartMarker
}

const autoMergableGroups = [
    DynamicMapElementChangeGroup.MoveViaPaste,
    DynamicMapElementChangeGroup.MoveStartMarker
];

interface ExecuteAsGroupExtraData {
    mapId: number;
}

const changeGroupStack = createChangeGroupStack<DynamicMapElementChangeGroup, ExecuteAsGroupExtraData>(DynamicMapElementChangeGroup.None);

/**
 * This method groups all changes made inside `executer` and merges them into one undo/redo entry, and labels
 * it appropriately (according to the selected `group`) and executes side effects if necessary.
 *
 * @see {@link createGroupUndoableChangesFunction} for more information.
 *
 * @param group A group denoting the purpose of the grouped changes in executer
 * @param executer The callback that contains all changes that should be grouped
 * @param sideEffects Side effects to be executed after the first patch (initial run) or after all patches (undo/redo)
 */
export const groupUndoableMapEditorDynamicMapElementChanges = createGroupUndoableChangesFunction(
    changeGroupStack,
    DynamicMapElementChangeGroup.None,
    () => ({ mapId: null })
);

export function undoableMapEditorDynamicMapElementPaste(targetPosition: TilePosition, mapEditorStore: MapEditorStore) {
    const cutDynamicMapElement = mapEditorStore.cutDynamicMapElement;
    groupUndoableMapEditorDynamicMapElementChanges(DynamicMapElementChangeGroup.MoveViaPaste, () => {
        cutDynamicMapElement.position.setXYPlane(targetPosition.x, targetPosition.y, targetPosition.plane);
    }, [
        new PasteSideEffect(cutDynamicMapElement, mapEditorStore)
    ]);
}

export function undoableMapEditorSubmitCurrentMapDynamicMapElementsChanges(mapId: number, patch: AugmentedPatch, inversePatch: AugmentedPatch) {
    const currentStack = changeGroupStack[changeGroupStack.length - 1];
    const { currentChangeGroup, currentGroupId, queuedSideEffects } = currentStack;
    currentStack.queuedSideEffects = null;

    if (currentStack.currentChangeGroup !== DynamicMapElementChangeGroup.None) {
        if (currentStack.extraData.mapId != null && currentStack.extraData.mapId !== mapId)
            throw new Error("Groups must have the same mapId");

        currentStack.extraData.mapId = mapId;
    }

    executeUndoableOperation(new MapEditorSubmitCurrentMapDynamicMapElementsChangesOp(mapId, currentChangeGroup, currentGroupId, queuedSideEffects, [patch], [inversePatch]));
}

class MapEditorSubmitCurrentMapDynamicMapElementsChangesOp extends UndoableOperation {
    public constructor(
        private mapId: number,
        public group: DynamicMapElementChangeGroup,
        public groupId: number,
        public sideEffects: UndoableOperationGroupSideEffect[],
        public patches: AugmentedPatch[],
        public inversePatches: AugmentedPatch[]
    ) {
        super("mapEditorSubmitCurrentMapDynamicMapElementsChanges/" + DynamicMapElementChangeGroup[group]);
        //console.log(`[${groupId}:${DynamicMapElementChangeGroup[group]}]`, { patches, inversePatches });
    }

    public async execute(isRedo: boolean) {
        await editorClient.submitDynamicMapElementsChanges(this.mapId, this.patches, this.inversePatches, isRedo);
        if (isRedo) {
            editorClient.patch(editorMapStore.getOrLoadMapWithMetaData(this.mapId).map.dynamicMapElements, this.patches);
        }

        this.sideEffects?.forEach(sideEffect => sideEffect.afterExecute(isRedo));
    }

    public async reverse() {
        const reversedInversePatches = this.inversePatches.slice().reverse();
        await editorClient.submitDynamicMapElementsChanges(this.mapId, reversedInversePatches, this.patches.slice().reverse(), true);
        editorClient.patch(editorMapStore.getOrLoadMapWithMetaData(this.mapId).map.dynamicMapElements, reversedInversePatches);

        this.sideEffects?.forEach(sideEffect => sideEffect.afterReverse());
    }

    public merge(previousOperation: MapEditorSubmitCurrentMapDynamicMapElementsChangesOp) {
        return mergeGroupedPatchOp(this, previousOperation, autoMergableGroups, DynamicMapElementChangeGroup.None);
    }
}

class PasteSideEffect implements UndoableOperationGroupSideEffect {
    private readonly dynamicMapElementModelId: string;
    private readonly mapEditorStore: MapEditorStore;

    public constructor(
        cutDynamicMapElement: DynamicMapElementModel<any>,
        mapEditorStore: MapEditorStore
    ) {
        this.dynamicMapElementModelId = cutDynamicMapElement.$modelId;
        this.mapEditorStore = mapEditorStore;
    }

    public async afterExecute(isRedo: boolean) {
        this.mapEditorStore.setCutDynamicMapElementModelId(null);
    }

    public async afterReverse() {
        this.mapEditorStore.setCutDynamicMapElementModelId(this.dynamicMapElementModelId);
    }
}

export class SelectTileSideEffect implements UndoableOperationGroupSideEffect {
    private readonly mapEditorStore: MapEditorStore;
    private readonly previousTilePosition: TilePosition;
    private readonly newTilePosition: TilePosition;

    public constructor(
        mapEditorStore: MapEditorStore,
        tilePosition: TilePosition
    ) {
        this.mapEditorStore = mapEditorStore;
        this.newTilePosition = copyTilePosition(tilePosition);
        this.previousTilePosition = mapEditorStore.selectedTilePosition;
    }

    public async afterExecute() {
        this.mapEditorStore.setSelectedTilePosition(this.newTilePosition);
    }

    public async afterReverse() {
        this.mapEditorStore.setSelectedTilePosition(this.previousTilePosition);
    }
}

export class ActionMapEditorPlaceAssetSideEffect implements UndoableOperationGroupSideEffect {
    private readonly mapEditorStore: MapEditorStore;
    private readonly previousToolType: EditorToolType;

    public constructor(
        mapEditorStore: MapEditorStore
    ) {
        this.mapEditorStore = mapEditorStore;
        this.previousToolType = this.mapEditorStore.selectedTool;
    }

    public async afterExecute(): Promise<void> {
        this.mapEditorStore.setTool(EditorToolType.SingleSelect);
    }

    public async afterReverse(): Promise<void> {
        this.mapEditorStore.setTool(this.previousToolType);
    }
}