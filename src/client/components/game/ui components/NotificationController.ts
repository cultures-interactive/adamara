import { makeAutoObservable } from "mobx";
import { gameCanvasSize } from "../../../data/gameConstants";
import { ActionModel, factions, ReceiveReputationActionModel } from "../../../../shared/action/ActionModel";
import { ActionExtraInformation } from "../../../helper/gameActionTreeHelper";

const NOTIFICATION_AREA_HEIGHT = gameCanvasSize.height;

// sizes in pixel
export const NOTIFICATION_HEIGHT = 100;
export const NOTIFICATION_WIDTH = 350;
export const NOTIFICATION_BORDER_WIDTH = 1;

const NOTIFICATION_HEIGHT_AND_MARGIN_TOP = NOTIFICATION_HEIGHT + 5;
export const NOTIFICATION_LIFETIME_MS = 20000;
const NOTIFICATION_FALL_SPEED_FACTOR = 1;
const INTERVAL_TIME_MS = 200;

const MAX_PAST_NOTIFICATIONS = 50;

const ACTION_TYPES_COLOR_1 = [
    "actions/ReceiveQuestTaskActionModel",
    "actions/QuestTaskFinishedActionModel",
    "actions/AbortQuestActionModel",
    "actions/ReceiveTaskActionModel",
    "actions/FinishTaskActionModel",
    "actions/AbortTaskActionModel"
];

const ACTION_TYPES_COLOR_2 = [
    "actions/ReceiveItemActionModel",
    "actions/LooseItemActionModel"
];

export interface NotificationInfo {
    id: number;
    action: ActionModel;
    extraInformation: ActionExtraInformation;

    borderColor: string;
    backgroundColor: string;

    topDistance: number; // to set the absolute top distance as px
    displayTime: number; // to remove after lifetime expires
    lastIndex: number; // to calculate transition animation duration
    animationDurationMs: number;
}

let runningId = 0;

class NotificationController {
    private pendingNotifications = new Array<NotificationInfo>();
    public visibleNotifications = new Array<NotificationInfo>();
    public pastNotifications = new Array<NotificationInfo>();

    private automaticRemovalIntervalId = -1;
    private updateAnimationTimeout = -1;

    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public addNotificationFromAction(action: ActionModel, extraInformation: ActionExtraInformation) {
        this.addNotification(this.createNotificationInfo(action, extraInformation));
    }

    private createNotificationInfo(action: ActionModel, extraInformation: ActionExtraInformation): NotificationInfo {
        return {
            id: runningId++,
            action,
            extraInformation,
            topDistance: -NOTIFICATION_HEIGHT_AND_MARGIN_TOP,
            lastIndex: -1,
            backgroundColor: this.backgroundColorOf(action),
            borderColor: this.borderColorOf(action)
        } as NotificationInfo;
    }

    private backgroundColorOf(action: ActionModel) {
        if (ACTION_TYPES_COLOR_1.includes(action.$modelType)) return "#ffe6cc";
        if (ACTION_TYPES_COLOR_2.includes(action.$modelType)) return "#fff1cc";
        if (action.$modelType === "actions/ReceiveReputationActionModel") {
            const reputationAction = action as ReceiveReputationActionModel;
            if (reputationAction.fraction == factions[0]) return "#dbe7fc";
            if (reputationAction.fraction == factions[1]) return "#d5e7d3";
        }
        return "#ffffff";
    }

    private borderColorOf(action: ActionModel) {
        if (ACTION_TYPES_COLOR_1.includes(action.$modelType)) return "#d79b02";
        if (ACTION_TYPES_COLOR_2.includes(action.$modelType)) return "#d5b556";
        if (action.$modelType === "actions/ReceiveReputationActionModel") {
            const reputationAction = action as ReceiveReputationActionModel;
            if (reputationAction.fraction == factions[0]) return "#6b8ebf";
            if (reputationAction.fraction == factions[1]) return "#81b366";
        }
        return "#000000";
    }

    public addNotification(notificationInfo: NotificationInfo) {
        if (this.automaticRemovalIntervalId == -1) {
            this.automaticRemovalIntervalId = window.setInterval(this.onAutomaticRemovalIntervalTick.bind(this), INTERVAL_TIME_MS);
        }

        if (this.isDisplayAreaFull()) {
            this.pendingNotifications.push(notificationInfo);
        } else {
            notificationInfo.displayTime = Date.now();
            this.visibleNotifications.push(notificationInfo);
            this.triggerUpdateAnimation();
        }
    }

    public removeNotification(id: number) {
        const notificationToRemove = this.visibleNotifications.find(n => n.id == id);
        if (!notificationToRemove) {
            console.warn("Can not remove a notification by the id", id);
            return;
        }
        this.visibleNotifications = this.visibleNotifications.filter(n => n.id != id);

        this.pastNotifications.unshift(notificationToRemove);
        if (this.pastNotifications.length > MAX_PAST_NOTIFICATIONS) {
            this.pastNotifications.length = MAX_PAST_NOTIFICATIONS;
        }
        this.pastNotifications.sort((a, b) => b.id - a.id);

        if (this.pendingNotifications.length > 0) {
            this.addNotification(this.pendingNotifications.shift());
        }
        this.triggerUpdateAnimation();
    }

    private triggerUpdateAnimation() {
        this.updateAnimationTimeout = window.setTimeout(this.updateAnimation.bind(this), 100);
    }

    private updateAnimation() {
        this.updateAnimationTimeout = -1;
        this.visibleNotifications.forEach((ni, index) => {
            ni.topDistance = this.calcTopDistanceByIndex(index);
            ni.animationDurationMs = (ni.topDistance - this.calcTopDistanceByIndex(ni.lastIndex)) * NOTIFICATION_FALL_SPEED_FACTOR;
            ni.lastIndex = index;
        });
    }

    private calcTopDistanceByIndex(index: number) {
        if (index < 0) return -NOTIFICATION_HEIGHT_AND_MARGIN_TOP;
        return NOTIFICATION_AREA_HEIGHT - ((index + 1) * NOTIFICATION_HEIGHT_AND_MARGIN_TOP);
    }

    private isDisplayAreaFull(): boolean {
        return (NOTIFICATION_AREA_HEIGHT - (this.visibleNotifications.length * NOTIFICATION_HEIGHT_AND_MARGIN_TOP)) < NOTIFICATION_HEIGHT_AND_MARGIN_TOP;
    }

    private onAutomaticRemovalIntervalTick() {
        const now = Date.now();
        this.visibleNotifications.forEach(ni => {
            if (now - ni.displayTime > NOTIFICATION_LIFETIME_MS) {
                this.removeNotification(ni.id);
            }
        });
    }

    public disposeCurrentData() {
        this.pendingNotifications.length = 0;
        this.visibleNotifications.length = 0;
        this.pastNotifications.length = 0;

        if (this.automaticRemovalIntervalId !== -1) {
            clearInterval(this.automaticRemovalIntervalId);
            this.automaticRemovalIntervalId = -1;
        }

        if (this.updateAnimationTimeout !== -1) {
            window.clearTimeout(this.updateAnimationTimeout);
            this.updateAnimationTimeout = -1;
        }
    }
}

export const notificationController = new NotificationController();