import { Group } from "@pixi/layers";
import { TextStyle, Text } from "pixi.js";
import { gameConstants } from "../../../data/gameConstants";

export class EditorOnlyElementViewText extends Text {
    public constructor(textGroup: Group) {
        super("", new TextStyle({
            fontSize: 16,
            lineJoin: "round",
            stroke: "white",
            strokeThickness: 6
        }));

        this.anchor.x = 0.5;
        this.anchor.y = 0.5;
        this.position.x = gameConstants.tileWidth / 2;
        this.position.y = gameConstants.tileHeight / 2;
        this.roundPixels = true;
        this.parentGroup = textGroup;
    }
}