import { faRedo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { observer } from 'mobx-react-lite';
import React, { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ConnectionStatus, editorStore } from '../../stores/EditorStore';
import { errorStore } from '../../stores/ErrorStore';
import { imageStore } from '../../stores/ImageStore';
import { networkDiagnosticsStore } from '../../stores/NetworkDiagnosticsStore';
import { sharedStore } from '../../stores/SharedStore';
import { undoStore } from '../../stores/undo/UndoStore';
import { NetworkDiagnostics } from '../debug/NetworkDiagnostics';
import { AdamaraLogo } from '../shared/AdamaraLogo';
import { Heading1Base } from '../shared/Heading';
import { LoadingBarBlock } from '../shared/LoadingBar';
import { CenterContainer, Overlay, PopupWindow } from '../shared/PopupComponents';
import { LoadingHeaderRightEditor } from './Header';

const ColumNotifications = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    flex-wrap: wrap;
`;

const Title = Heading1Base;

const TextCenter = styled.div`
    text-align: center;
`;

const ErrorPopupWindow = styled(PopupWindow)`
    background: #bb5050;
`;

const ErrorList = styled.ul`
    max-height: 80vh;
`;

export const EditorNotificationsErrorsWithWithContainer: React.FunctionComponent = () => {
    return (
        <CenterContainer>
            <EditorNotificationsErrors />
        </CenterContainer>
    );
};

const EditorNotificationsErrors: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    return (
        <ErrorPopupWindow>
            <Title>{t("editor.errors")}</Title>
            <ErrorList>
                {errorStore.errors.map((error, index) => <li key={index}>{error.translate(t)}</li>)}
            </ErrorList>
            <button onClick={errorStore.clearErrors}>{t("editor.ok")}</button>
        </ErrorPopupWindow>
    );
});

interface Props {
    isConnectedAndReadyCallback: () => boolean;
    AdditionalConnectionStatusDisplay: React.FunctionComponent;
    LoadingHeader: React.FunctionComponent;
}

export const EditorNotifications: React.FunctionComponent<Props> = observer(({ isConnectedAndReadyCallback, AdditionalConnectionStatusDisplay, LoadingHeader }) => {
    const { reloadNecessaryReasonTranslationKey, serverWasShutDown } = editorStore;
    const { hasErrors } = errorStore;
    const { showWaitingForServerOverlay } = undoStore;

    const isConnectedAndReady = isConnectedAndReadyCallback();

    const { t } = useTranslation();

    const showConnectionStatus = !isConnectedAndReady;

    if (!showConnectionStatus &&
        !hasErrors &&
        !reloadNecessaryReasonTranslationKey &&
        !serverWasShutDown &&
        !showWaitingForServerOverlay &&
        !networkDiagnosticsStore.showBecauseOfUserRequest)
        return null;

    if (serverWasShutDown) {
        return (
            <Overlay>
                <CenterContainer>
                    <ErrorPopupWindow>
                        <div>{t("editor.server_was_shutdown")}</div>
                    </ErrorPopupWindow>
                </CenterContainer>
            </Overlay>
        );
    }

    return (
        <Overlay onClick={() => networkDiagnosticsStore.setShowBecauseOfUserRequest(false)} >
            <CenterContainer>
                <ColumNotifications>
                    {showConnectionStatus && (
                        <>
                            <PopupWindow>
                                <TextCenter>
                                    <AdamaraLogo />
                                    <Title>{t("editor.socketio_connection_status_" + ConnectionStatus[editorStore.connectionStatus])}</Title>
                                    <AdditionalConnectionStatusDisplay />
                                    <hr />
                                    <div>
                                        <button onClick={e => { e.stopPropagation(); networkDiagnosticsStore.toggleShowBecauseOfUserRequest(); }} >
                                            {t("editor.network_diagnostics")}
                                        </button>
                                    </div>
                                </TextCenter>
                            </PopupWindow>
                            <LoadingHeader />
                        </>
                    )}
                    {showWaitingForServerOverlay && (
                        <PopupWindow>
                            {t("editor.waiting_for_server")}
                        </PopupWindow>
                    )}
                    {hasErrors && (
                        <EditorNotificationsErrors />
                    )}
                    {reloadNecessaryReasonTranslationKey && (
                        <ErrorPopupWindow>
                            <div>{t(reloadNecessaryReasonTranslationKey)}</div>
                            <button onClick={() => location.reload()}><FontAwesomeIcon icon={faRedo} />&nbsp;{t("editor.reload_necessary_button")}</button>
                        </ErrorPopupWindow>
                    )}
                </ColumNotifications>
                {(networkDiagnosticsStore.showBecauseOfUserRequest) && (
                    <NetworkDiagnostics />
                )}
            </CenterContainer>
        </Overlay >
    );
});

export const EditorAndGameLoadingBars: React.FunctionComponent = observer(() => {
    const { t } = useTranslation();

    if (editorStore.connectionStatus !== ConnectionStatus.Connected)
        return null;

    return (
        <>
            <hr />
            <LoadingBarBlock label={t("editor.loading_mixed_data")} percentage100={Math.floor(editorStore.initializationPercentage * 100)} />
            <LoadingBarBlock label={t("editor.loading_images")} percentage100={Math.floor(imageStore.loadingPercentage * 100)} />
            <LoadingBarBlock label={t("editor.loading_tile_asset_data")} percentage100={Math.floor(sharedStore.tileAssetDataLoadingPercentage * 100)} />
            <LoadingBarBlock label={t("editor.loading_animation_assets")} percentage100={Math.floor(sharedStore.animationAssetsLoadingPercentage * 100)} />
            <LoadingBarBlock label={t("editor.loading_action_trees")} percentage100={Math.floor(sharedStore.actionTreeLoadingPercentage * 100)} />
        </>
    );
});

export const EditorNotificationsEditorAndGame = () => {
    return (
        <EditorNotifications
            isConnectedAndReadyCallback={() => editorStore.isConnectedAndReady}
            AdditionalConnectionStatusDisplay={EditorAndGameLoadingBars}
            LoadingHeader={LoadingHeaderRightEditor}
        />
    );
};