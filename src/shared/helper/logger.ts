type LoggingFunction = (message?: any, ...optionalParams: any[]) => void;

interface Logger {
    error: LoggingFunction;
    warn: LoggingFunction;
    info: LoggingFunction;
    http: LoggingFunction;
    verbose: LoggingFunction;
    debug: LoggingFunction;
    silly: LoggingFunction;
}

export let sharedLogger: Logger = {
    error: console.log,
    warn: console.log,
    info: console.log,
    http: console.log,
    verbose: console.log,
    debug: console.log,
    silly: console.log
};

export function setSharedLogger(logger: Logger) {
    sharedLogger = logger;
}