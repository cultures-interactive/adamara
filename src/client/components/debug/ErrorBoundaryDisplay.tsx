import React from "react";
import styled from "styled-components";
import { dataConstants } from "../../../shared/data/dataConstants";

const DisplayContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;

    h1 {
        margin: 0 0 .67em 0;
    }
`;

const Display = styled.div`
    color: red;
    margin: 1em;
    padding: 2em;
    box-shadow: 0 0 1em black;
`;

const Line = styled.div`
    white-space: pre-wrap;
`;

interface Props {
    error: Error;
    insideErrorBoundary: boolean;
}

export const ErrorBoundaryDisplay: React.FunctionComponent<Props> = ({ error, insideErrorBoundary }) => {
    return (
        <DisplayContainer>
            <Display>
                <h1>You found a bug that crashed the app</h1>
                <div>Sorry that happened! Please copy &amp; paste the following error as text (not as a screenshot) to a developer, and explain what you did before it happened.</div>
                <br />
                <div>The current date/time is: {new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", "minute": "2-digit", second: "2-digit", hour12: false })}</div>
                {dataConstants.sentryDSN && <div>This was also sent to Sentry.</div>}
                {!dataConstants.sentryDSN && <div>Sentry isn't active, so this was not sent to Sentry.</div>}
                <br />
                {!insideErrorBoundary && (
                    <div>Note that this error was somehow caught OUTSIDE of the error boundary. Please tell Tobias Wehrum that this happened.<br /></div>
                )}
                {error?.stack
                    ? <Line>Uncaught {error?.stack}</Line>
                    : <Line>Uncaught {error?.name}: {error?.message}</Line>
                }
            </Display>
        </DisplayContainer>
    );
};