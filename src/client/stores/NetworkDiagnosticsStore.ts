import axios, { AxiosError, AxiosResponse } from "axios";
import { makeAutoObservable, observable, runInAction } from "mobx";
import { Socket } from "socket.io-client";
import { dataConstants } from "../../shared/data/dataConstants";
import { errorStore } from "./ErrorStore";
import { timerStore } from "./TimerStore";

const sec = 1000;
const pingDelay = 60 * sec;
const timeUntilFirstPing = 10 * sec;
const pingKeepRTTCount = 6;

export class NetworkDiagnosticsStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });

        if (navigator.onLine) {
            this.switchToOnline();
        } else {
            this.switchToOffline();
        }

        window.addEventListener("online", this.switchToOnline);
        window.addEventListener("offline", this.switchToOffline);

        const externalPingUrl = dataConstants.networkDiagnosticsExternalPingUrl;
        let externalPingName = "";
        try {
            externalPingName = new URL(externalPingUrl).hostname;

            // We are not interested in any specific data result from the external URL, just if we can reach it.
            this.pingers.push(new Pinger(externalPingName, externalPingUrl, () => true));
        } catch (e) {
            errorStore.addErrorFromErrorObject(e);
        }

        this.pingers.push(new Pinger("Server (HTTP)", "/api/diagnostic/available", result => result.data === "OK"));

        // NOTE tw: I'd love to check if I could also check if the socket.io server is responsive, but...
        // - Checking if the "/socket.io/?EIO=4&transport=polling" result starts with `0{"sid":"` leads to the server thinking that
        //   clients are connecting (and then closing the connection with "no namespace joined yet, close the client", which makes it
        //   harder to diagnose ACTUAL client problems with server-side debug logging).
        // - Checking if "/socket.io/checkIfServerAnswers" answers with `{"code":0,"message":"Transport unknown"}` spams the Chrome
        //   Console with "GET [server]/socket.io/checkIfServerAnswers 400 (Bad Request)".
        //
        // I don't think there are any reasonable cases where a HTTP call to "/api/diagnostic/availables" would succeed but a call
        // to "/socket.io/*" would fail, so for now I'll just remove this check.
        //this.pingers.push(new Pinger("Server (socket.io)", "/socket.io/?EIO=4&transport=polling", result => result.data.startsWith(`0{"sid":"`)));
    }

    public onlineStatus: boolean;
    public switchedToOfflineCounter = new CounterWithTimestamp();
    public switchedToOnlineCounter = new CounterWithTimestamp();

    public editorClientDisconnectedCounter = new CounterWithTimestamp();
    public editorClientConnectedCounter = new CounterWithTimestamp();
    public editorClientDisconnectReasons = observable.map<string, CounterWithTimestamp>();
    public editorClientConnectErrors = observable.map<string, CounterWithTimestamp>();

    public pingers = observable.array<Pinger>();

    public showBecauseOfUserRequest = false;

    /*
    public get showBecauseOfError() {
        if (editorStore.connectionStatus === ConnectionStatus.Connected)
            return false;

        return (this.editorClientDisconnectReasons.size > 0) || (this.editorClientConnectErrors.size > 0);
    }
    */

    public setShowBecauseOfUserRequest(value: boolean) {
        this.showBecauseOfUserRequest = value;
    }

    public toggleShowBecauseOfUserRequest() {
        this.showBecauseOfUserRequest = !this.showBecauseOfUserRequest;
    }

    public switchToOnline() {
        console.log("[NetworkDiagnosticsStore] Network connection is online");
        this.onlineStatus = true;
        this.switchedToOnlineCounter.increase();
    }

    public switchToOffline() {
        console.log("[NetworkDiagnosticsStore] Network connection is offline");
        this.onlineStatus = false;
        this.switchedToOfflineCounter.increase();
    }

    public editorClientConnected() {
        this.editorClientConnectedCounter.increase();
    }

    public editorClientDisconnected(disconnectReason: Socket.DisconnectReason) {
        this.editorClientDisconnectedCounter.increase();

        if (!this.editorClientDisconnectReasons.has(disconnectReason)) {
            this.editorClientDisconnectReasons.set(disconnectReason, new CounterWithTimestamp());
        }

        this.editorClientDisconnectReasons.get(disconnectReason).increase();
    }

    public addEditorClientConnectError(error: Error) {
        const errorString = error?.toString();

        if (!this.editorClientConnectErrors.has(errorString)) {
            this.editorClientConnectErrors.set(errorString, new CounterWithTimestamp());
        }

        this.editorClientConnectErrors.get(errorString).increase();
    }
}

export class CounterWithTimestamp {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    public count = 0;
    public latestTimestamp = 0;

    public increase() {
        this.count++;
        this.latestTimestamp = Date.now();
    }

    public get secondsSinceLastTimestampPrecision1000() {
        return Math.max(0, Math.floor((timerStore.currentTimePrecision1000 - this.latestTimestamp) / 1000));
    }
}

export class Pinger {
    public constructor(
        public readonly title: string,
        public readonly url: string,
        public checkResult: (result: AxiosResponse<string>) => boolean
    ) {
        makeAutoObservable(this, {}, { autoBind: true });
        this.startPingLoop();
    }

    public success = new CounterWithTimestamp();
    public successRoundTripTimeMSArray = observable.array<number>();
    public failure = new CounterWithTimestamp();
    public latestFailureReason: string;

    public get latestSuccessDurationMS() {
        if (this.successRoundTripTimeMSArray.length === 0)
            return 0;

        return this.successRoundTripTimeMSArray[this.successRoundTripTimeMSArray.length - 1];
    }

    public get minSuccessDurationMS() {
        return Math.min(...this.successRoundTripTimeMSArray);
    }

    public get maxSuccessDurationMS() {
        return Math.max(...this.successRoundTripTimeMSArray);
    }

    private startPingLoop() {
        const pingAndSetTimeout = () => {
            this.ping().finally(() => {
                setTimeout(pingAndSetTimeout, pingDelay);
            });
        };

        setTimeout(pingAndSetTimeout, timeUntilFirstPing);
    }

    public async ping() {
        try {
            const start = Date.now();
            const result = await axios.get<string>(this.url);
            runInAction(() => {
                if (this.checkResult(result)) {
                    this.success.increase();
                    const duration = Date.now() - start;
                    this.successRoundTripTimeMSArray.push(duration);
                    if (this.successRoundTripTimeMSArray.length > pingKeepRTTCount) {
                        this.successRoundTripTimeMSArray.splice(0, 1);
                    }
                } else {
                    this.failure.increase();
                    this.latestFailureReason = `${result.status}, but unexpected answer: ${result.data}`;
                }
            });
        } catch (e) {
            runInAction(() => {
                const axiosError = e as AxiosError;
                this.failure.increase();
                if (axiosError.isAxiosError) {
                    this.latestFailureReason = `${axiosError.code}: ${axiosError.message}`;
                } else {
                    this.latestFailureReason = e.toString();
                }
            });
        }
    }
}

export const networkDiagnosticsStore = new NetworkDiagnosticsStore();