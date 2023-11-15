import { makeAutoObservable, observable } from "mobx";
import { ModuleModel, ModuleMapData, PlayableModule } from "../../shared/workshop/ModuleModel";
import { WorkshopModel } from "../../shared/workshop/WorkshopModel";
import { editorStore } from "./EditorStore";

export class ManagementStore {
    private workshops: Map<string, WorkshopModel>;
    private sessionWorkshopId: string;
    private openItemDetailViews: Array<string>;

    private modules: Map<string, ModuleModel>;
    private moduleMapList: ModuleMapData[];
    private playableModules: Map<string, PlayableModule>;

    public isInitialized: boolean = false;

    public get isConnectedAndReady() {
        return editorStore.isConnected && this.isInitialized;
    }

    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.workshops = observable.map(new Map());
        this.modules = observable.map(new Map());
        this.openItemDetailViews = Array<string>();
    }

    public setAllWorkshops(newWorkshops: Map<string, WorkshopModel>) {
        this.workshops = observable.map(newWorkshops);
    }

    public setWorkshop(newWorkshop: WorkshopModel) {
        this.workshops.set(newWorkshop.$modelId, newWorkshop);
    }

    public deleteWorkshop(workshopId: string) {
        this.workshops?.delete(workshopId);
    }

    public getWorkshop(workshopId: string) {
        return this.workshops?.get(workshopId);
    }

    public setSessionWorkshop(workshopId: string) {
        this.sessionWorkshopId = workshopId;
    }

    public get getAllWorkshops(): WorkshopModel[] {
        if (!this.workshops || this.workshops.size === 0) return [];
        return Array.from(this.workshops.values());
    }

    public get sessionWorkshop(): WorkshopModel {
        return this.workshops?.get(this.sessionWorkshopId);
    }

    public setAllModules(newModules: Map<string, ModuleModel>) {
        this.modules = observable.map(newModules);
    }

    public setModuleMapList(moduleMapList: ModuleMapData[]) {
        this.moduleMapList = moduleMapList;
    }

    public getModuleMapList(moduleId: string) {
        return this.moduleMapList.filter(map => map.moduleId === moduleId);
    }

    public setModule(newModule: ModuleModel) {
        this.modules.set(newModule.$modelId, newModule);
    }

    public deleteModule(moduleId: string) {
        this.modules?.delete(moduleId);
    }

    public getModule(moduleId: string) {
        return this.modules?.get(moduleId);
    }

    public setAllPlayableModules(playableModules: Map<string, PlayableModule>) {
        this.playableModules = observable.map(playableModules);
    }

    public setPlayableModule(newPlayableModule: PlayableModule) {
        this.playableModules.set(newPlayableModule.$modelId, newPlayableModule);
    }

    public deletePlayableModule(moduleId: string) {
        this.playableModules?.delete(moduleId);
    }

    public getPlayableModule(moduleId: string) {
        return this.playableModules.get(moduleId);
    }

    public get getAllSessionModules(): ModuleModel[] {
        if (!this.workshops || !this.modules || !this.sessionWorkshop) return [];
        return this.getModulesForWorkshop(this.sessionWorkshop.$modelId);
    }

    public getModulesForWorkshop(workshopId: string): ModuleModel[] {
        if (!this.workshops || !this.modules) return [];
        const workshop = this.workshops.get(workshopId);
        if (!workshop) return [];
        return workshop.modules.map(id => this.modules.get(id)).filter(module => !!module);
    }

    public get getAllModules(): ModuleModel[] {
        if (!this.modules || this.modules.size === 0) return [];
        return Array.from(this.modules.values());
    }

    public get getAllPlayableModules(): PlayableModule[] {
        if (!this.playableModules || this.playableModules.size === 0) return [];
        return Array.from(this.playableModules.values());
    }

    public isDetailViewOpen(itemId: string) {
        return this.openItemDetailViews.includes(itemId);
    }

    public toggleItemDetailView(itemId: string) {
        if (!this.isDetailViewOpen(itemId)) {
            this.openItemDetailViews.push(itemId);
        } else {
            this.openItemDetailViews = this.openItemDetailViews.filter((openViewItemId) => openViewItemId !== itemId);
        }
    }

    public setInitialized(status: boolean) {
        this.isInitialized = status;
    }

    public clear() {
        this.workshops.clear();
        this.modules.clear();
        this.sessionWorkshopId = "";
        this.isInitialized = false;
    }

    public accessCodeExists(accesscode: string) {
        if (accesscode.length === 0)
            return false;

        for (const workshop of this.workshops.values()) {
            if (workshop.accesscode === accesscode || workshop.playcode === accesscode)
                return true;

        }

        for (const module of this.modules.values()) {
            if ((module.accesscode === accesscode) || (module.standalonePlayCode === accesscode))
                return true;
        }

        return false;
    }
}

export const managementStore = new ManagementStore();