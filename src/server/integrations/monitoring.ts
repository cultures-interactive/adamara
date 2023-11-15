import { recordCustomEvent, recordMetric } from "newrelic";

const allMetricSenders = new Array<() => void>();

function makeNewMetric(name: string) {
    let currentValue = 0;

    const send = () => {
        recordMetric(name, currentValue);
    };

    const setAndSend = (newValue: number) => {
        currentValue = newValue;
        send();
    };

    allMetricSenders.push(send);

    return {
        set: setAndSend,
        increment: (delta: number = 1) => setAndSend(currentValue + delta),
        decrement: (delta: number = 1) => setAndSend(currentValue - delta)
    };
}

setInterval(() => {
    allMetricSenders.forEach(send => send());
}, 1000);

const activeConnections = makeNewMetric("Socket/ActiveConnections");
const connects = makeNewMetric("Socket/Connects");
const disconnects = makeNewMetric("Socket/Disconnects");

function reportConnectionEvent(clientId: string, type: string) {
    recordCustomEvent("Socket_Connection_Event", {
        type,
        clientId
    });
}

export function reportSocketIOConnect(clientId: string) {
    activeConnections.increment();
    connects.increment();
    reportConnectionEvent(clientId, "Connect");
}

export function reportSocketIODisconnect(clientId: string) {
    activeConnections.decrement();
    disconnects.increment();
    reportConnectionEvent(clientId, "Disconnect");
}

function reportClientConnectionProblem(type: string, reason: string, clientId: string) {
    recordCustomEvent("Report_ClientConnectionProblem", {
        type,
        reason,
        clientId
    });
}

export function reportClientSocketConnectionProblem(reason: string, clientId: string) {
    reportClientConnectionProblem("Connection Problem", reason, clientId);
}

export function reportClientSocketUnexpectedDisconnect(reason: string, clientId: string) {
    reportClientConnectionProblem("Unexpected Disconnect", reason, clientId);
}