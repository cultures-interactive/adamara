import { makeAutoObservable } from "mobx";
import { UserPrivileges } from "../../shared/definitions/apiResults/AuthCheckLoginStatusResult";
import { MapEditorComplexity, mainMapEditorStore } from "./MapEditorStore";
import { CharacterConfigurationModel } from "../../shared/resources/CharacterConfigurationModel";
import { editorStore } from "./EditorStore";

export enum LogoutReason {
    UserRequested,
    ByServer
}

export class UserStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public privilegeLevel: UserPrivileges;
    public isLoggedIn = false;
    public restartingAfterLoggingOut = false;

    public setLoggedIn(loginPrivilegeLevel: UserPrivileges) {
        this.isLoggedIn = true;
        this.privilegeLevel = loginPrivilegeLevel;
        this.setMapEditorComplexityAccordingToPrivilegeLevel();
    }

    public setLoggedOut(reason: LogoutReason) {
        this.isLoggedIn = false;
        this.privilegeLevel = null;
    }

    public setRestartingAfterLoggingOut() {
        this.restartingAfterLoggingOut = true;
    }

    public setMapEditorComplexityAccordingToPrivilegeLevel() {
        mainMapEditorStore.setMapEditorComplexity(
            this.isWorkshopParticipant
                ? MapEditorComplexity.Simple
                : MapEditorComplexity.Complex
        );
    }

    private get isAdmin() {
        return this.privilegeLevel == UserPrivileges.Admin;
    }

    private get isSingleWorkshopAdmin() {
        return this.privilegeLevel == UserPrivileges.SingleWorkshopAdmin;
    }

    public get isWorkshopParticipant() {
        return this.privilegeLevel == UserPrivileges.WorkshopParticipant;
    }

    public get isWorkshopPlayer() {
        return (this.privilegeLevel == UserPrivileges.WorkshopPlayer);
    }

    public get shouldUseProductionEditorComplexity() {
        return this.isAdmin || this.isSingleWorkshopAdmin;
    }

    public get mayEditAllWorkshops() {
        return this.isAdmin;
    }

    public get mayOpenMainGameEditor() {
        return this.isAdmin;
    }

    public get mayUseWorkshopManagementView() {
        return this.isAdmin || this.isSingleWorkshopAdmin;
    }

    public get mayAccessEditor() {
        return this.isLoggedIn && (this.isAdmin || this.isSingleWorkshopAdmin || this.isWorkshopParticipant);
    }

    public get shouldShowAdvancedOptions() {
        return this.isAdmin || this.isSingleWorkshopAdmin;
    }

    public get showMapComplexitySelector() {
        return this.isWorkshopParticipant;
    }

    public get mayAccessProductionEditorComplexityFeatures() {
        return this.isAdmin || this.isSingleWorkshopAdmin;
    }

    public mayEditCharacter(character: CharacterConfigurationModel) {
        return editorStore.isMainGameEditor || (character.moduleOwner === editorStore.sessionModuleId);
    }
}

export const userStore = new UserStore();