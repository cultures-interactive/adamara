import { ImagePropertiesModel } from "../../../../shared/resources/ImagePropertiesModel";
import { TileAssetModel } from "../../../../shared/resources/TileAssetModel";
import { editorClient } from "../../../communication/EditorClient";
import { UiConstants } from "../../../data/UiConstants";
import { EditorMapView } from "../map/EditorMapView";
import { Generic2DHandle } from "./Generic2DHandle";

export class ImagePositionHandle extends Generic2DHandle {
    private tileAsset: TileAssetModel;
    private imageProperties: ImagePropertiesModel;

    public constructor(stage: EditorMapView) {
        super(
            stage,
            UiConstants.COLOR_SELECTION_HIGHLIGHT_0x,
            () => !!this.imageProperties?.positionOnTile && !!this.tileAsset,
            () => this.imageProperties.positionOnTile?.x + (this.imageProperties.size?.width / 2),
            () => this.imageProperties.positionOnTile?.y + (this.imageProperties.size?.height / 2),
            (x, y) => {
                const newX = Math.round(x - (this.imageProperties.size?.width / 2));
                const newY = Math.round(y - (this.imageProperties.size?.height / 2));
                this.imageProperties.positionOnTile.setX(newX);
                this.imageProperties.positionOnTile.setY(newY);
                editorClient.updateTileAsset(this.tileAsset, null, null, null, null);
            }
        );
        this.handleSize = 5;
        this.indicatorGraphic.beginFill(UiConstants.COLOR_DARK_BUTTON_0x, 1);
        this.indicatorGraphic.drawCircle(0, 0, this.handleSize - 2);
        this.indicatorGraphic.endFill();
    }

    public setImageAsset(imageProperties: ImagePropertiesModel, tileAsset: TileAssetModel) {
        this.imageProperties = imageProperties;
        this.tileAsset = tileAsset;
        this.updatePosition();
    }
}