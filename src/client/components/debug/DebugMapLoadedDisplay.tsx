import { observer } from 'mobx-react-lite';
import React from 'react';
import { editorMapStore, MapStatus } from '../../stores/EditorMapStore';

interface MapProps {
    mapId: number;
    name: string;
}

const Map: React.FunctionComponent<MapProps> = observer(({ mapId, name }) => {
    //console.log("Refreshed " + mapId);
    const { mapStatus, map, mapDoesNotExist } = editorMapStore.getOrLoadMapWithMetaData(mapId, false);
    return (
        <tr style={mapDoesNotExist ? { color: "red" } : undefined}>
            <td>#{mapId}</td>
            <td>{name}</td>
            <td>{MapStatus[mapStatus]}</td>
            <td>{map?.tiles.length}</td>
        </tr>
    );
});

export const DebugMapLoadedDisplay: React.FunctionComponent = observer(() => {
    const { mapList } = editorMapStore;
    return (
        <table>
            <tbody>
                {mapList.map(entry => <Map key={entry.id} mapId={entry.id} name={entry.name} />)}
                {/*
                <Map mapId={-1} name={"Doesn't exist"} />
                */}
            </tbody>
        </table>
    );
});
