import { AuthPublicUser } from "./AuthPublicUser";

export interface AuthCheckLoginStatusResult {
    user: AuthPublicUser;
}

export enum UserPrivileges {
    WorkshopPlayer,
    WorkshopParticipant,
    SingleWorkshopAdmin,
    Admin
}