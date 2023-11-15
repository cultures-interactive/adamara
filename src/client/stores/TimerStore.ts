import { makeAutoObservable } from "mobx";

export class TimerStore {
    public constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        setInterval(this.refreshCurrentTimePrecision1000, 1000);
    }

    public currentTimePrecision1000 = Date.now();

    public refreshCurrentTimePrecision1000() {
        this.currentTimePrecision1000 = Date.now();
    }
}

export const timerStore = new TimerStore();