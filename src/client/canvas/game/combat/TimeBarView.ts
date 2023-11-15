import { Container, Sprite } from "pixi.js";
import { CombatPhaseLength } from "../../../../shared/combat/CombatPhaseLength";
import { staticAssetLoader } from "../../loader/StaticAssetLoader";
import { CombatPhase } from "../../../stores/CombatStore";

export class TimeBarView extends Container {

    private attackBar: Sprite;
    private defenseBar: Sprite;

    private longAttackSymbol: Sprite;
    private shortAttackSymbol: Sprite;
    private longDefenseSymbol: Sprite;
    private shortDefenseSymbol: Sprite;

    public constructor() {
        super();

        const background = staticAssetLoader.createStaticAssetView("TopBar_Background");

        this.attackBar = staticAssetLoader.createStaticAssetView("TopBar_Bar_Attack");
        this.defenseBar = staticAssetLoader.createStaticAssetView("TopBar_Bar_Defense");

        const border = staticAssetLoader.createStaticAssetView("TopBar");

        this.longAttackSymbol = staticAssetLoader.createStaticAssetView("Phase_LongAttack");
        this.shortAttackSymbol = staticAssetLoader.createStaticAssetView("Phase_ShortAttack");
        this.longDefenseSymbol = staticAssetLoader.createStaticAssetView("Phase_LongDefense");
        this.shortDefenseSymbol = staticAssetLoader.createStaticAssetView("Phase_ShortDefense");

        this.reset(null, null);

        this.addChild(border, background, this.attackBar, this.defenseBar, border, this.longAttackSymbol, this.shortAttackSymbol, this.longDefenseSymbol, this.shortDefenseSymbol);
    }

    public reset(phase: CombatPhase, phaseLength: CombatPhaseLength) {
        this.adjustTexture(this.attackBar, 1);
        this.adjustTexture(this.defenseBar, 1);

        const attackPhase = phase === CombatPhase.Attack || phase === CombatPhase.FirstAttack;
        this.attackBar.visible = attackPhase;
        this.defenseBar.visible = phase === CombatPhase.Defense;
        this.longAttackSymbol.visible = attackPhase && phaseLength === CombatPhaseLength.Long;
        this.shortAttackSymbol.visible = attackPhase && phaseLength === CombatPhaseLength.Short;
        this.longDefenseSymbol.visible = phase === CombatPhase.Defense && phaseLength === CombatPhaseLength.Long;
        this.shortDefenseSymbol.visible = phase === CombatPhase.Defense && phaseLength === CombatPhaseLength.Short;
    }

    public reduce(amount: number) {
        this.adjustTexture(this.attackBar, amount);
        this.adjustTexture(this.defenseBar, amount);
    }

    private adjustTexture(sprite: Sprite, amount: number) {
        const { width } = sprite.texture.baseTexture;
        const middle = 88;
        sprite.texture.frame.width = (width - middle) * amount + middle;
        sprite.width = sprite.texture.frame.width;
        sprite.texture.frame.x = ((width - middle) - (width - middle) * amount) * 0.5;
        sprite.position.x = sprite.texture.frame.x;
        sprite.texture.updateUvs();
    }
}