import React, { useEffect } from 'react';
import { observer } from "mobx-react-lite";
import { editorClient } from '../../communication/EditorClient';
import { errorStore } from '../../stores/ErrorStore';
import { mainMapEditorStore } from '../../stores/MapEditorStore';

export const CurrentMapTracker: React.FunctionComponent = observer(() => {
    const { currentMapStore } = mainMapEditorStore;

    useEffect(() => {
        if (!editorClient.isConnected)
            return;

        if (currentMapStore.hasCurrentMap) {
            editorClient.setCurrentMap(currentMapStore.currentMapId).catch(errorStore.addErrorFromAxiosErrorObject);
        } else {
            editorClient.closeCurrentMap().catch(errorStore.addErrorFromAxiosErrorObject);
        }
    }, [currentMapStore.currentMapId]);

    useEffect(() => {
        return () => {
            if (!editorClient.isConnected)
                return;

            editorClient.closeCurrentMap().catch(errorStore.addErrorFromAxiosErrorObject);
        };
    }, []);

    return null;
});
