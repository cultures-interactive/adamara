import { fromSnapshot, getSnapshot, model, Model, modelAction, prop, SnapshotOutOf } from "mobx-keystone";
import { TranslatedString } from "../game/TranslatedString";
import { TranslateableEntityData } from "../translation/TranslationDataTypes";

@model("resources/CharacterConfigurationModel")
export class CharacterConfigurationModel extends Model({
    id: prop<number>(0).withSetter(),
    localizedName: prop<TranslatedString>(() => new TranslatedString({})).withSetter(),
    textReferenceId: prop<string>("").withSetter(),
    animationSkins: prop<string>().withSetter(),
    animationAssetName: prop<string>().withSetter(),
    tintColorHex: prop<string>().withSetter(),
    isEnemy: prop<boolean>(false).withSetter(),
    enemyHealth: prop<number>(10).withSetter(),
    enemyDamage: prop<number>(10).withSetter(),
    enemyCombatPresetModelId: prop<string>("").withSetter(),
    moduleOwner: prop<string>("").withSetter()
}) {

    public static readonly DefaultSkinName = "skin-base";

    public static readonly CharacterSkinVariantDirectionPrefix1 = "3quart_"; // North and West
    public static readonly CharacterSkinVariantDirectionPrefix2 = "quart_"; // South and East

    /**
     * Toggles the skins with the assigned class and variant.
     * Considers the direction prefixes of the skins.
     * @param variantClass The class of the skin.
     * @param variantName The name of the skin.
     */
    @modelAction
    public toggleSkins(variantClass: string, variantName: string) {
        if (!variantClass || !variantName) return;
        this.toggleSingleSkin(variantClass + "/" + variantName);
        this.toggleSingleSkin(variantClass + "/" + CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix1 + variantName);
        this.toggleSingleSkin(variantClass + "/" + CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix2 + variantName);
    }

    /**
     * Returns true if this {@link CharacterConfigurationModel} contains
     * the skins of the assigned class and name.
     * Considers the direction prefixes of the skins.
     * @param variantClass The class of the skin.
     * @param variantName The name of the skin.
     * @param ignoreDirections (optional) Ignores directional skins if 'true'.
     */
    public isSkinActive(variantClass: string, variantName: string, ignoreDirections = true): boolean {
        const skins = this.animationSkins.split(",");
        const containsBase = skins.some(s => s == variantClass + "/" + variantName);
        if (ignoreDirections) return containsBase;
        const containsDirection1 = skins.some(skinPath => skinPath == variantClass + "/" + CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix1 + variantName);
        const containsDirection2 = skins.some(skinPath => skinPath == variantClass + "/" + CharacterConfigurationModel.CharacterSkinVariantDirectionPrefix2 + variantName);
        return containsBase && containsDirection1 && containsDirection2;
    }


    private toggleSingleSkin(skinPath: string) {
        const skins = this.animationSkinPathsAsArray();
        if (skins.some(s => s == skinPath)) {
            this.removeSingleSkin(skinPath);
        } else {
            this.addSkin(skinPath);
        }
    }

    public animationSkinPathsAsArray(): Array<string> {
        return this.animationSkins.split(",");
    }

    public removeAllSkins(skinClassName: string) {
        const skins = this.animationSkinPathsAsArray().filter(item => item?.startsWith(skinClassName + "/"));
        skins.forEach(this.removeSingleSkin.bind(this));
    }

    private removeSingleSkin(skinPath: string) {
        this.setAnimationSkins(this.animationSkins.split(",").filter(e => e != skinPath).join(","));
    }

    @modelAction
    public addSkin(skinPath: string) {
        const array = this.animationSkins.split(",");
        array.push(skinPath);
        this.setAnimationSkins(array.join(","));
    }

    @modelAction
    public resetSkins(applyDefaultSkin = true) {
        this.setAnimationSkins("");
        if (applyDefaultSkin) this.addSkin(CharacterConfigurationModel.DefaultSkinName);
    }

    public static newSnapshot(animationAssetName: string, moduleOwner: string): CharacterConfigurationSnapshot {
        return getSnapshot(new CharacterConfigurationModel({
            animationAssetName: animationAssetName,
            animationSkins: CharacterConfigurationModel.DefaultSkinName,
            moduleOwner: moduleOwner
        }));
    }

    public static fromSnapshot(snapshot: CharacterConfigurationSnapshot): CharacterConfigurationModel {
        return fromSnapshot<CharacterConfigurationModel>(snapshot);
    }

    public translatableEntityData(): TranslateableEntityData {
        return {
            entity: this,
            label: "Character",
            translateableStrings: [
                { label: "Name", translatedString: this.localizedName }
            ]
        } as TranslateableEntityData;
    }
}

export type CharacterConfigurationSnapshot = SnapshotOutOf<CharacterConfigurationModel>;
