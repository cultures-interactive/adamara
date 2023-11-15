import { UserPrivileges } from "./AuthCheckLoginStatusResult";

export interface AuthPublicUser {
    username: string;
    privilegeLevel: UserPrivileges;
}