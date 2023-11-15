import { Skeleton, Skin } from '@pixi-spine/all-4.1';

export class AnimationSkinCombinator {

    private skins = Array<Skin>();
    private skinCache: Array<Skin>;

    public constructor(skinCacheParameter: Array<Skin>) {
        this.skinCache = skinCacheParameter ? skinCacheParameter : new Array<Skin>();
    }

    private findInCache(skinName: string): Skin {
        return this.skinCache.find(skin => skin.name == skinName);
    }

    public add(skinName: string) {
        if (this.contains(skinName)) return;
        const skin = this.findInCache(skinName);
        if (skin) this.skins.push(skin);
    }

    public addAll(skinNames: string[]) {
        if (skinNames) skinNames.forEach(name => this.add(name));
    }

    public remove(skinName: string) {
        this.skins = this.skins.filter(skin => skin.name != skinName);
    }

    public contains(skinName: string): boolean {
        return this.skins.some(skin => skin.name == skinName);
    }

    private create(name: string): Skin {
        const combinedSkin = new Skin(name);
        this.skins.forEach(skin => combinedSkin.addSkin(skin));
        return combinedSkin;
    }

    public applyTo(skeleton: Skeleton, name = "combined-skin") {
        if (!skeleton) return;
        skeleton.setSkin(this.create(name));
        skeleton.setSlotsToSetupPose();
    }

}
