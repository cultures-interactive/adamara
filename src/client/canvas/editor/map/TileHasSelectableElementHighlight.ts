import { TilePosition } from "../../../../shared/definitions/other/TilePosition";
import { TileHighlight } from "./TileHighlight";
import { UiConstants } from "../../../data/UiConstants";
import { BoundsUpdateMode, MapElementContainer } from "../../shared/map/sorting/MapElementContainer";
import { FlatOrder, createOrUpdateBoxSimple } from "../../../helper/mapElementSortingHelper";
import { flatUnitSize3D } from "../../../../shared/resources/Size3DModel";
import { tileToWorldPositionX, tileToWorldPositionY } from "../../../helper/pixiHelpers";

let runningIndex = 0;

export class TileHasSelectableElementHighlight extends MapElementContainer {
    private index = runningIndex++;

    public constructor(
        tilePosition: TilePosition
    ) {
        super(BoundsUpdateMode.UpdateFromGetLocalBoundsWhenDirty);

        const tileHighlight = new TileHighlight(4, UiConstants.COLOR_VIABLE_SELECTION_HIGHLIGHT_0x, UiConstants.COLOR_VIABLE_SELECTION_HIGHLIGHT_0x, undefined, undefined, undefined, undefined, 0.5);
        this.addChild(tileHighlight);

        this.setBox(createOrUpdateBoxSimple(this.box, tilePosition, flatUnitSize3D, 0, "TileHasSelectableElementHighlight_" + this.index, FlatOrder.EditorElementUnderDecoration));

        this.x = tileToWorldPositionX(tilePosition.x, tilePosition.y);
        this.y = tileToWorldPositionY(tilePosition.x, tilePosition.y);
    }
}