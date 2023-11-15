import winston, { format } from "winston";
import { inspect } from "util";
import dayjs from "dayjs";
import path from "path";
import { setSharedLogger } from "../../shared/helper/logger";
import { MESSAGE } from 'triple-beam';

export const logLevelDefault = process.env.LOG_LEVEL || "info";
const logLevelConsole = process.env.LOG_LEVEL_CONSOLE || logLevelDefault;
const logLevelFileCombined = process.env.LOG_LEVEL_FILE_COMBINED || logLevelDefault;
const logFolder = process.env.LOG_FOLDER;

const colorizer = winston.format.colorize();

export function makeFormatPrintf(useTimestamp: boolean, uppercaseLevel: boolean, colorizedLevel: boolean) {
    return format.printf((info) => {
        let result = `[${info.level}] `;

        if (uppercaseLevel) {
            result = result.toUpperCase();
        }

        if (colorizedLevel) {
            result = colorizer.colorize(info.level, result);
        }

        const {
            stack,
            messagePrefix,
            ...metadata
        } = info.metadata;

        if (messagePrefix) {
            if (typeof (messagePrefix) === "string") {
                result += messagePrefix;
            } else {
                result += messagePrefix();
            }
        }

        if (typeof (info.message) === "string") {
            result += info.message;
        } else {
            result += inspect(info.message);
        }

        if (useTimestamp) {
            result = `[${dayjs().format("YYYY-MM-DD HH:mm:ss")}] ` + result;
        }

        if (stack) {
            result += `\n${stack}`;
        }

        if (metadata && Object.keys(metadata).length > 0) {
            result += `${stack ? "\n" : " "}${inspect(metadata, false, 50)}`;
        }

        return result;
        //return `[${new Date().toLocaleString()}] [${info.level.toUpperCase()}] ${info.message} ${inspect(info.metadata)}`;
    });
}

export const logger = winston.createLogger({
    format: format.combine(
        format.errors({ stack: true }),
        format.metadata(),
        makeFormatPrintf(true, true, false)
    ),
    defaultMeta: {},
    transports: [
        new winston.transports.Console({
            level: logLevelConsole,
            format: makeFormatPrintf(false, false, true)
        })
    ]
});

setSharedLogger(logger);

console.log();
console.log("Logging configuration:");
console.log(`- Console: ${logLevelConsole}`);

function addFileTransport(options: winston.transports.FileTransportOptions) {
    const fileTransport = new winston.transports.File(options);
    logger.add(fileTransport);
    console.log(`- ${options.filename}: ${options.level}`);
    return fileTransport;
}

if (logFolder) {
    addFileTransport({ filename: path.join(logFolder, "error.log"), level: "error" });
    const combinedLog = addFileTransport({ filename: path.join(logFolder, "combined.log"), level: logLevelFileCombined });

    const message = `--- Started logging with log level: ${combinedLog.level} ---`;
    const line = "".padStart(message.length, "-");
    combinedLog.log({
        [MESSAGE]: `\n${line}\n${message}\n${line}\n`
    }, () => { });
} else {
    console.log("- Not logging to any files because environment variable LOG_FOLDER is not set.");
}

console.log();