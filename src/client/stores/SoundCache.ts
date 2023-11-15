import { ParsedPath } from "path";
import { Loader } from "pixi.js";
import { CompleteCallback, IMediaInstance, Sound, SoundLoader } from "@pixi/sound";
import { errorStore } from "./ErrorStore";

/**
 * Can be used to load sounds. The sounds will get cached.
 * Uses a {@link Loader} to load the sounds from the server.
 */
export class SoundCache {

    public static readonly LEVEL_BACKGROUND_PREFIX = "level_atmo_";
    public static readonly ATMO_PREFIX = "atmo_";
    public static readonly UI_PREFIX = "ui_";
    public static readonly NPC_PREFIX = "npc_";
    public static readonly IA_PREFIX = "ia_";
    public static readonly SC_PREFIX = "sc_";

    public static readonly ALL_GAME_SOUND_PREFIX = [SoundCache.ATMO_PREFIX, SoundCache.UI_PREFIX, SoundCache.NPC_PREFIX, SoundCache.IA_PREFIX, SoundCache.SC_PREFIX];

    private loader: Loader;

    private allSoundPaths: Array<ParsedPath>;
    private soundIdToSound = new Map<string, Sound>();

    /**
     * Creates a new instance.
     */
    public constructor() {
        SoundLoader.add();
    }

    public createNewLoader() {
        this.loader = new Loader();
        this.loader.onError.add((error, loader, resource) => {
            console.error("SoundCache loading error", { error, loader, resource });
            console.log({ error, loader, resource });
            errorStore.addErrorFromErrorObject(new Error(`[SoundCache] Error while loading: ${resource.url} (${error.name}: ${error.message})`));
        });
    }

    public setSoundPaths(list: Array<ParsedPath>) {
        this.allSoundPaths = list;
    }

    public getSoundPaths(): Array<ParsedPath> {
        return this.allSoundPaths;
    }

    /**
     * Loads the sounds of the assigned list. The loaded sounds will be cached.
     * @param paths The sounds paths to load.
     */
    public async loadSounds(paths: ParsedPath[], progressCallback: (percentage: number) => void = () => { }): Promise<void> {
        return new Promise<void>((resolve) => {
            let currentlyLoadingTotalCount = 0;
            let currentlyLoadingFinishedCount = 0;
            paths.forEach(path => {
                if (!this.isCached(path.name)) {
                    this.loader.add(path.name, path.dir + "/" + path.base);
                    currentlyLoadingTotalCount++;
                }
            });

            const detachProgressCallback = this.loader.onProgress.add(() => {
                currentlyLoadingFinishedCount++;
                progressCallback(currentlyLoadingFinishedCount / currentlyLoadingTotalCount);
            });

            this.loader.load((loader, resources) => {
                for (const property in resources) {
                    this.soundIdToSound.set(resources[property].name, resources[property].sound);
                }
                loader.reset(); // https://github.com/englercj/resource-loader#philosophy
                detachProgressCallback.detach();
                progressCallback(1);
                resolve();
            });
        });
    }

    /**
     * Loads {@link Sound}s with names that start with at one of the assigned prefix.
     * @param prefix The prefix to load the sounds.
     */
    public async loadSoundsWithPrefix(prefix: Array<string>, progressCallback: (percentage: number) => void = () => { }): Promise<void> {
        if (!prefix || !prefix.length) return;
        if (!this.allSoundPaths) {
            throw new Error("Can not load sounds because the sound information was not found.");
        }
        const paths = SoundCache.filterForPrefix(this.allSoundPaths, prefix);
        return this.loadSounds(paths, progressCallback);
    }

    public static filterForPrefix(paths: Array<ParsedPath>, prefix: Array<string>): Array<ParsedPath> {
        return paths.filter(path => {
            return prefix.some(p => path.name.startsWith(p));
        });
    }

    /**
     * Returns true if a {@link Sound} with the assigned name is cached.
     * @param soundName The name to find the cached sound.
     */
    public isCached(soundName: string): boolean {
        return this.soundIdToSound.get(soundName) != null;
    }

    /**
     * Plays the {@link Sound} with the assigned name if it exists in the cache.
     * @param soundName The name of the sound to play.
     * @param volume The volume between 0 and 1.
     * @param loop Loops the sound if true
     * @param completeCallback The callback to call afterwards.
     * @return The sound or null.
     */
    public play(soundName: string, volume: number, loop: boolean, completeCallback: CompleteCallback = null): Sound {
        const sound = this.soundIdToSound.get(soundName);
        if (sound) {
            sound.loop = loop;
            sound.volume = volume;
            const s = sound.play(completeCallback) as IMediaInstance; // linting complains about 'not handled promises' if this is not used as a IMediaInstance
            return sound;
        }
        console.warn("Sound with the name " + soundName + " does not exist.", this.soundIdToSound);
        return null;
    }

    /**
     * Randomly plays one of the assigned sounds.
     * @param soundNames The list of sound names.
     * @param loop Loops the sound if true
     */
    public playOneOf(soundNames: Array<string>, loop = false): Sound {
        if (!soundNames) {
            console.warn("Can not play sound", soundNames);
            return null;
        }
        const soundName = soundNames[Math.floor(Math.random() * soundNames.length)];
        return this.play(soundName, 1, loop);
    }

    public get allSounds() {
        return this.soundIdToSound;
    }
}

export const soundCache = new SoundCache();



