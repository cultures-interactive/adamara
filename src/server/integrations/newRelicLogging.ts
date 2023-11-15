/* eslint-disable prefer-spread */
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/semi */
/* eslint-disable @typescript-eslint/no-var-requires */
import { isLogForwardingEnabled, isLocalDecoratingEnabled, isMetricsEnabled, createModuleUsageMetric } from 'newrelic/lib/util/application-logging';
import NrTransport from 'newrelic/lib/instrumentation/nr-winston-transport';
import { LOGGING } from 'newrelic/lib/metrics/names';
import winston, { Logger } from "winston";
import { makeFormatPrintf } from './logging';
import { MESSAGE } from 'triple-beam';
import { TransformableInfo } from 'logform';

export function registerWinstonLogger(agent: any, winstonLogger: Logger, level: string) {
    if (!isLogForwardingEnabled(agent.config, agent)) {
        if (isMetricsEnabled(agent.config)) {
            winstonLogger.error(" - Cannot send log metrics if log forwarding is disabled. Disable logging with application_logging.enabled=false instead of application_logging.forwarding.enabled");
        }

        return false;
    }

    createModuleUsageMetric('winston', agent.metrics)

    const instrumentedFormatter = nrWinstonFormatter(agent, winston);
    winstonLogger.add(new NrTransport({
        agent,
        level,
        format: instrumentedFormatter()
    }));

    return true;
}

const printf = makeFormatPrintf(false, false, false);

/**
 * This formatter is being used to facilitate
 * the two application logging use cases: metrics and local log decorating.
 *
 * Local log decorating appends `NR-LINKING` piped metadata to
 * the message key in log line. You must configure a log forwarder to get
 * this data to NR1.
 *
 * @param {object} agent NR agent
 * @param {object} winston exported winston package
 * @returns {object} log line NR-LINKING metadata on message when local log decorating is enabled
 */
function nrWinstonFormatter(agent: any, winston: typeof import("winston")) {
    const config = agent.config
    const metrics = agent.metrics

    return winston.format((logLine: TransformableInfo) => {
        if (isMetricsEnabled(config)) {
            metrics.getOrCreateMetric(LOGGING.LINES).incrementCallCount()
            metrics.getOrCreateMetric(`${LOGGING.LINES}/${(logLine.level as string).toUpperCase()}`).incrementCallCount()
        }

        const transformResult = printf.transform(logLine) as any;
        logLine.message = transformResult[MESSAGE];

        if (isLocalDecoratingEnabled(config)) {
            logLine.message += agent.getNRLinkingMetadata()
        }

        return logLine
    })
}
