import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AiOutlineArrowRight } from 'react-icons/ai';
import { RiWifiLine, RiWifiOffLine } from 'react-icons/ri';
import styled from 'styled-components';
import { wrapIterator } from '../../../shared/helper/IterableIteratorWrapper';
import { clientId } from '../../data/clientId';
import { timeDurationToString } from '../../helper/displayHelpers';
import { ConnectionStatus, editorStore } from '../../stores/EditorStore';
import { CounterWithTimestamp, networkDiagnosticsStore, Pinger } from '../../stores/NetworkDiagnosticsStore';
import { Heading1Base, Heading2Base } from '../shared/Heading';
import { PopupWindow } from '../shared/PopupComponents';

const ScrollablePopupWindow = styled(PopupWindow)`
    max-height: 100%;
    overflow: auto;
    font-size: 0.8em;
`;

const Title = styled(Heading1Base)`
    text-align: center;
    padding-bottom: 0.3em;
    font-size: x-large;
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;

    th, td {
        padding: 5px;
    }

    th {
        text-align: right;
    }

    tr.warn {
        color: red;
    }
`;

const Header = styled(Heading2Base)`
    text-align: center;
    border-bottom: 1px solid black;
`;

interface CategoryProps {
    title: string;
}

const Category: React.FunctionComponent<CategoryProps> = ({ title, children }) => {
    return (
        <>
            <tr>
                <td colSpan={2}><Header>{title}</Header></td>
            </tr>
            {children}
        </>
    );
};

const Spacer: React.FunctionComponent = () => {
    return (
        <tr>
            <td></td>
        </tr>
    );
};

interface CounterWithTimestampDisplayProps {
    counter: CounterWithTimestamp;
}

const CounterWithTimestampDisplay: React.FunctionComponent<CounterWithTimestampDisplayProps> = observer(({ counter }) => {
    if (counter.count === 0) {
        return <span>0</span>;
    }

    const { count, secondsSinceLastTimestampPrecision1000: totalSeconds } = counter;
    return <span>{count}  ({timeDurationToString(totalSeconds, false)})</span>;
});

interface CounterMapDisplayProps {
    title: string;
    counterMap: Map<string, CounterWithTimestamp>;
    warn: boolean;
}

const CounterMapDisplay: React.FunctionComponent<CounterMapDisplayProps> = observer(({ title, counterMap, warn }) => {
    if (counterMap.size === 0)
        return null;

    return (
        <>
            <Spacer />
            <Category title={title}>
                {wrapIterator(counterMap.entries()).map(([reason, counter]) =>
                    <tr key={reason} className={warn ? "warn" : undefined}>
                        <th>{reason}</th>
                        <td><CounterWithTimestampDisplay counter={counter} /></td>
                    </tr>
                )}
            </Category>
        </>
    );
});

interface PingerDisplayProps {
    pinger: Pinger;
}

const PingerDisplay: React.FunctionComponent<PingerDisplayProps> = observer(({ pinger }) => {
    useEffect(() => {
        pinger.ping().catch(() => { });
    }, []);

    return (
        <>
            {(pinger.success.count > 0) && (
                <>
                    <tr>
                        <th>{pinger.title}: Success</th>
                        <td><CounterWithTimestampDisplay counter={pinger.success} /></td>
                    </tr>
                    <tr>
                        <th></th>
                        <td>{pinger.successRoundTripTimeMSArray.join(", ")} ms</td>
                    </tr>
                </>
            )}
            {(pinger.failure.count > 0) && (
                <>
                    <tr className="warn">
                        <th>{pinger.title}: Failure</th>
                        <td><CounterWithTimestampDisplay counter={pinger.failure} /></td>
                    </tr>
                    <tr className="warn">
                        <th></th>
                        <td>{pinger.latestFailureReason}</td>
                    </tr>
                </>
            )}
        </>
    );
});

const NetworkInformationDisplay: React.FunctionComponent = () => {
    const getRtt = () => navigator && ((navigator as any)["connection"] as any)?.rtt as number;
    const getDownlink = () => navigator && ((navigator as any)["connection"] as any)?.downlink as number;

    const [rtt, setRtt] = useState(getRtt());
    const [downlink, setDownlink] = useState(getDownlink());

    useEffect(() => {
        let timeout: any;

        const refreshValuesLooping = () => {
            setRtt(getRtt());
            setDownlink(getDownlink());
            timeout = setTimeout(refreshValuesLooping, 1000);
        };

        refreshValuesLooping();

        return () => clearTimeout(timeout);
    }, []);

    if (!rtt && !downlink)
        return null;

    return (
        <>
            {downlink && (
                <tr>
                    <th>Downlink</th>
                    <td>{downlink} mbits/s</td>
                </tr>
            )}
            {rtt && (
                <tr>
                    <th>Round-trip time</th>
                    <td>{rtt} ms</td>
                </tr>
            )}
        </>
    );
};

export const NetworkDiagnostics: React.FunctionComponent = observer(() => {
    const {
        onlineStatus,
        switchedToOfflineCounter,
        switchedToOnlineCounter,
        editorClientConnectedCounter,
        editorClientDisconnectedCounter,
        editorClientDisconnectReasons,
        editorClientConnectErrors,
        pingers
    } = networkDiagnosticsStore;

    const { t } = useTranslation();

    return (
        <ScrollablePopupWindow onClick={e => e.stopPropagation()}>
            <Title>{t("editor.network_diagnostics")}</Title>
            <Table>
                <tbody>
                    <Category title="General">
                        <tr>
                            <th>Client ID</th>
                            <td>{clientId}</td>
                        </tr>
                        <tr>
                            <th>Status</th>
                            <td>{onlineStatus ? "Online" : "Disconnected"}</td>
                        </tr>
                        <tr>
                            <th><AiOutlineArrowRight /> <RiWifiLine /></th>
                            <td><CounterWithTimestampDisplay counter={switchedToOnlineCounter} /></td>
                        </tr>
                        {(switchedToOfflineCounter.count > 0) && (
                            <tr className="warn">
                                <th><AiOutlineArrowRight /> <RiWifiOffLine /></th>
                                <td><CounterWithTimestampDisplay counter={switchedToOfflineCounter} /></td>
                            </tr>
                        )}
                        <NetworkInformationDisplay />
                    </Category>
                    <Spacer />
                    <Category title="socket.io Client">
                        <tr>
                            <th>Status</th>
                            <td>{ConnectionStatus[editorStore.connectionStatus]}</td>
                        </tr>
                        <tr>
                            <th><AiOutlineArrowRight /> <RiWifiLine /></th>
                            <td><CounterWithTimestampDisplay counter={editorClientConnectedCounter} /></td>
                        </tr>
                        {(editorClientDisconnectedCounter.count > 0) && (
                            <tr className="warn">
                                <th><AiOutlineArrowRight /> <RiWifiOffLine /></th>
                                <td><CounterWithTimestampDisplay counter={editorClientDisconnectedCounter} /></td>
                            </tr>
                        )}
                    </Category>
                    <CounterMapDisplay title="Disconnect Reasons" counterMap={editorClientDisconnectReasons} warn={true} />
                    <CounterMapDisplay title="Connect Errors" counterMap={editorClientConnectErrors} warn={true} />
                    <Category title="Pings">
                        {pingers.map(pinger => <PingerDisplay key={pinger.url} pinger={pinger} />)}
                    </Category>
                </tbody>
            </Table>
        </ScrollablePopupWindow>
    );
});
