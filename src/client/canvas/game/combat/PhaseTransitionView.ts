import { Container, IDestroyOptions, Sprite, Text, TextStyle } from "pixi.js";
import { CombatPhaseLength } from "../../../../shared/combat/CombatPhaseLength";
import { staticAssetLoader } from "../../loader/StaticAssetLoader";
import { CombatPhase } from "../../../stores/CombatStore";
import i18n from "../../../integration/i18n";

export class PhaseTransitionView extends Container {
    private readonly start: Sprite;
    private readonly won: Sprite;
    private readonly lost: Sprite;

    private readonly longAttackText: Sprite;
    private readonly shortAttackText: Sprite;
    private readonly longDefenseText: Sprite;
    private readonly shortDefenseText: Sprite;

    private refreshTextFunction = new Array<() => void>();

    public constructor() {
        super();

        this.start = this.loadElement("combatState", /*t*/"game.combat_start");
        this.won = this.loadElement("combatState", /*t*/"game.combat_won");
        this.lost = this.loadElement("combatState", /*t*/"game.combat_lost");

        const phaseTransitionOffsetY = 30;
        const colorAttack = "0x001EB9";
        const colorDefense = "0x9E0000";
        this.longAttackText = this.loadElement("PhaseTransition_LongAttack", /*t*/"game.combat_phase_transition_long_attack", phaseTransitionOffsetY, colorAttack);
        this.shortAttackText = this.loadElement("PhaseTransition_ShortAttack", /*t*/"game.combat_phase_transition_short_attack", phaseTransitionOffsetY, colorAttack);
        this.longDefenseText = this.loadElement("PhaseTransition_LongDefense", /*t*/"game.combat_phase_transition_long_defense", phaseTransitionOffsetY, colorDefense);
        this.shortDefenseText = this.loadElement("PhaseTransition_ShortDefense", /*t*/"game.combat_phase_transition_short_defense", phaseTransitionOffsetY, colorDefense);

        this.endTransition();

        this.onLanguageChanged = this.onLanguageChanged.bind(this);
        i18n.on("languageChanged", this.onLanguageChanged);
        this.onLanguageChanged();
    }

    public destroy(options?: boolean | IDestroyOptions): void {
        super.destroy(options);

        i18n.off("languageChanged", this.onLanguageChanged);
        this.refreshTextFunction = [];
    }

    public loadElement(name: string, textKey: string, offsetY = 0, color = "black") {
        const element = staticAssetLoader.createStaticAssetView(name);
        this.addChild(element);

        const textField = new Text("", new TextStyle({
            fontSize: 72,
            fill: color,
            fontFamily: "Caveat"
        }));

        textField.position.set(element.width / 2, element.height / 2 + offsetY);
        textField.anchor.set(0.5, 0.5);
        element.addChild(textField);

        this.refreshTextFunction.push(() => {
            const newText = i18n.t(textKey);

            // HACK tw: The empty space behind the text is necessary because otherwise the text is cut off.
            // I don't know if that's a problem of the font file we're using (Caveat), if Pixi cannot properly
            // load/render it, or if something else is going wrong, but if I add an extra space, everything
            // seems fine.
            textField.text = newText + " ";
        });

        return element;
    }

    private onLanguageChanged() {
        this.refreshTextFunction.forEach(f => f());
    }

    public endTransition() {
        this.visible = false;
    }

    public startTransition(phase: CombatPhase, phaseLength: CombatPhaseLength) {
        this.visible = true;

        this.start.visible = phase === CombatPhase.FirstAttack;
        this.won.visible = phase === CombatPhase.WinCombat;
        this.lost.visible = phase === CombatPhase.LooseCombat;

        this.shortAttackText.visible = phase === CombatPhase.Attack && phaseLength === CombatPhaseLength.Short;
        this.longAttackText.visible = phase === CombatPhase.Attack && phaseLength === CombatPhaseLength.Long;
        this.shortDefenseText.visible = phase === CombatPhase.Defense && phaseLength === CombatPhaseLength.Short;
        this.longDefenseText.visible = phase === CombatPhase.Defense && phaseLength === CombatPhaseLength.Long;
    }
}