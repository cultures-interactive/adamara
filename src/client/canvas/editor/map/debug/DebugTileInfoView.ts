import { Container, Graphics, Point, Text, TextStyle } from "pixi.js";
import { drawProjectedArrow, projectPosition, tileToWorldPositionX, tileToWorldPositionY, worldToTilePosition } from "../../../../helper/pixiHelpers";
import { EditorMapView } from "../EditorMapView";
import { gameConstants } from "../../../../data/gameConstants";
import { TileHighlight } from "../TileHighlight";
import { DirectionHelper } from "../../../../../shared/resources/DirectionHelper";
import { MapWalker } from "../../../../interaction/path/MapWalker";
import { MapDataModel } from "../../../../../shared/game/MapDataModel";
import { ReadonlyPosition } from "../../../../../shared/game/PositionModel";

export class DebugTileInfoView extends Container {

    private mouseCoordinatesText: Text;
    private tileCoordinatesText: Text;
    private coordinateOrigin = new Graphics();

    private lastTileHoverX: number = undefined;
    private lastTileHoverY: number = undefined;
    private tileHoverHighlight = new TileHighlight(2, 0xFFFFFF, -1, 0.75);
    private readonly walkLines = new Graphics();

    private worldTextStyle = new TextStyle({
        align: "left",
        fontSize: 12,
        fill: ["white"],
        fontFamily: "Courier New",
        strokeThickness: 2
    });


    public constructor() {
        super();
        this.mouseCoordinatesText = new Text("", this.worldTextStyle);
        this.tileCoordinatesText = new Text("", this.worldTextStyle);
        this.addChild(this.mouseCoordinatesText);
        this.addChild(this.tileCoordinatesText);
        this.drawCoordinateOrigin();
        this.tileHoverHighlight.hide();
        this.addChild(this.tileHoverHighlight);
        this.addChild(this.walkLines);
    }

    public update(mapView: EditorMapView, screenMousePosition: Point, selectedPlane: number) {

        const mouseWorldPosition = mapView.toLocal(screenMousePosition);
        const mouseWorldX = Math.round(mouseWorldPosition.x);
        const mouseWorldY = Math.round(mouseWorldPosition.y);
        const mouseText = `world x: ${mouseWorldX} y: ${mouseWorldY}`;

        const mouseTilePosition = worldToTilePosition(mouseWorldPosition);
        this.updateTileInformation(mouseTilePosition);
        if (mouseTilePosition.x != this.lastTileHoverX || mouseTilePosition.y != this.lastTileHoverY) {
            this.lastTileHoverX = mouseTilePosition.x;
            this.lastTileHoverY = mouseTilePosition.y;
            this.updateCrossInformation(mouseTilePosition, mapView.mapWalker, selectedPlane);
        }
        this.mouseCoordinatesText = this.updateText(this.mouseCoordinatesText, mouseText, mouseWorldX + 15, mouseWorldY - 8);
    }

    private updateText(textElement: Text, text: string, x: number, y: number): Text {
        const scale = 1 / this.parent.scale.x;
        textElement.setTransform(x, y, scale, scale);
        textElement.text = text;
        return textElement;
    }

    private updateTileInformation(tilePosition: Point) {
        this.tileHoverHighlight.show();
        const x = tileToWorldPositionX(tilePosition.x, tilePosition.y);
        const y = tileToWorldPositionY(tilePosition.x, tilePosition.y);
        this.tileHoverHighlight.x = x;
        this.tileHoverHighlight.y = y;
        this.tileCoordinatesText = this.updateText(this.tileCoordinatesText, `tile x: ${tilePosition.x} y: ${tilePosition.y}`,
            x + gameConstants.tileWidth / 2, y + gameConstants.tileHeight + 4);
        this.tileCoordinatesText.x = this.tileCoordinatesText.x - this.tileCoordinatesText.width / 2;

    }

    private updateCrossInformation(tilePosition: Point, mapWalker: MapWalker<MapDataModel, EditorMapView>, selectedPlane: number) {
        this.walkLines.clear();
        this.walkLines.lineStyle(2, 0xFFFFFF, 0.35);
        const baseWorldX = tileToWorldPositionX(tilePosition.x, tilePosition.y, true);
        const baseWorldY = tileToWorldPositionY(tilePosition.x, tilePosition.y, true);
        const position = new ReadonlyPosition({ x: tilePosition.x, y: tilePosition.y, plane: selectedPlane });
        DirectionHelper.allDirections.forEach(direction => {
            const target = mapWalker.canCrossTile(position, direction);
            if (target) {
                const targetWorldX = tileToWorldPositionX(target.x, target.y, true);
                const targetWorldY = tileToWorldPositionY(target.x, target.y, true);
                const startX = (baseWorldX + targetWorldX) / 2;
                const startY = (baseWorldY + targetWorldY) / 2;
                const endX = (startX + targetWorldX) / 2;
                const endY = (startY + targetWorldY) / 2;
                drawProjectedArrow(this.walkLines, startX, startY, (startX + endX) / 2, (startY + endY) / 2);
            }
        });
    }

    private drawCoordinateOrigin() {
        this.addChild(this.coordinateOrigin);

        const xDirection = projectPosition([60, 0, 0]);
        xDirection[0] += gameConstants.tileWidth / 2;
        xDirection[1] += gameConstants.tileHeight / 2;
        this.coordinateOrigin.lineStyle(2, 0x00FF00);
        drawProjectedArrow(this.coordinateOrigin, gameConstants.tileWidth / 2, gameConstants.tileHeight / 2, xDirection[0], xDirection[1]);

        const coordinateTextX = new Text("x", this.worldTextStyle);
        coordinateTextX.x = xDirection[0];
        coordinateTextX.y = xDirection[1];
        this.addChild(coordinateTextX);

        const yDirection = projectPosition([0, 60, 0]);
        yDirection[0] += gameConstants.tileWidth / 2;
        yDirection[1] += gameConstants.tileHeight / 2;
        this.coordinateOrigin.lineStyle(2, 0x0000FF,);
        drawProjectedArrow(this.coordinateOrigin, gameConstants.tileWidth / 2, gameConstants.tileHeight / 2, yDirection[0], yDirection[1]);
        const coordinateTextY = new Text("y", this.worldTextStyle);
        coordinateTextY.x = yDirection[0];
        coordinateTextY.y = yDirection[1];
        this.addChild(coordinateTextY);
    }
}
