import { TFunction } from "react-i18next";

export class ErrorNotification {
    public constructor(
        public type: ErrorType,
        public translationKey: string,
        public interpolationOptions: any = {}
    ) {
    }

    public translate(t: TFunction) {
        return t(this.translationKey, this.interpolationOptions);
    }
}

export enum ErrorType {
    General,
    SocketIOConnection
}