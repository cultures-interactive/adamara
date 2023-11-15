export class DebugTimer {
    private startTime: [number, number];

    public constructor() {
        this.start();
    }

    public start() {
        this.startTime = process.hrtime();
    }

    public get elapsedTimeMS() {
        const [seconds, nanoseconds] = process.hrtime(this.startTime);
        return seconds * 1000 + nanoseconds / 1000000;
    }

    public get elapsedTimeS() {
        return this.elapsedTimeMS / 1000;
    }
}