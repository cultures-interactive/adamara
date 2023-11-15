import { makeAutoObservable } from "mobx";
import { MapEditingUser, UserList } from "../../shared/definitions/socket.io/socketIODefinitions";

export class CurrentMapUserListStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public currentMapUserList: UserList;
    public currentMapUserMap = new Map<number, MapEditingUser>();

    public currentMapId: number = null;

    public setCurrentMapUserList(mapId: number, userList: UserList) {
        this.currentMapId = mapId;
        this.updateCurrentMapUserList(userList);
    }

    public updateCurrentMapUserList(userList: UserList) {
        this.currentMapUserList = userList;
        this.currentMapUserMap.clear();
        for (const user of userList) {
            this.currentMapUserMap.set(user.userId, user);
        }
    }

    public getUsernameForId(userId: number) {
        const user = this.currentMapUserMap.get(userId);
        return user ? user.username : "";
    }

    public clearCurrentMapUserList() {
        this.setCurrentMapUserList(null, []);
    }
}

export const currentMapUserListStore = new CurrentMapUserListStore();