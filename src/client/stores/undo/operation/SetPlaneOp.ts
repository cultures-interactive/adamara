import { UndoableOperation } from "../UndoableOperation";
import { executeUndoableOperation } from "../UndoStore";
import { runInAction } from "mobx";
import { doesPlacementSelectionLooselyEqual, PlacementSelection, MapRelatedStore } from "../../MapRelatedStore";
import { throwIfAssetsDoNotExist } from "./SetPlacementSelectionOp";
import { gameConstants } from "../../../data/gameConstants";
import { MathE } from "../../../../shared/helper/MathExtension";

export function undoableSetPlane(mapRelatedStore: MapRelatedStore, plane: number) {
    const { minPlane, maxPlane } = gameConstants;
    plane = MathE.clamp(plane, minPlane, maxPlane);

    if (mapRelatedStore.selectedPlane === plane)
        return;

    executeUndoableOperation(new SetPlaneOp(mapRelatedStore, plane));
}

class SetPlaneOp extends UndoableOperation {

    private readonly previousPlane: number;
    private readonly previousPlacementSelection: PlacementSelection;

    public constructor(
        private mapRelatedStore: MapRelatedStore,
        private plane: number
    ) {
        super("setPlane");
        this.previousPlane = mapRelatedStore.selectedPlane;
        this.previousPlacementSelection = mapRelatedStore.placementSelection;
    }

    public async execute() {
        this.mapRelatedStore.setPlane(this.plane);
    }

    public async reverse() {
        throwIfAssetsDoNotExist(this.previousPlacementSelection);

        runInAction(() => {
            this.mapRelatedStore.setPlacementSelection(this.previousPlacementSelection);
            this.mapRelatedStore.setPlane(this.previousPlane);
        });

        if (!doesPlacementSelectionLooselyEqual(this.previousPlacementSelection, this.mapRelatedStore.placementSelection)) {
            throw new Error("SetPlaneOp: Couldn't properly reset previous selection.");
        }
    }
}