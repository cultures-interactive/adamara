import React from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { editorMapStore } from "../../stores/EditorMapStore";
import { MapList } from "../../../shared/definitions/socket.io/socketIODefinitions";
import { editorStore } from "../../stores/EditorStore";

interface Props {
    onSelected: (id: number) => void;
    selectedMapId: number;
    disabled?: boolean;
    hasEmpty?: boolean;
    emptyOptionValue?: any;
    hideId?: boolean;
    width100percent?: boolean;
    width?: string;
    limitedToMapId?: number;
}

const EMPTY = 0;

export const MapSelector: React.FunctionComponent<Props> = observer(({
    onSelected,
    selectedMapId,
    disabled,
    hasEmpty,
    emptyOptionValue = 0,
    hideId,
    width100percent,
    width,
    limitedToMapId
}) => {
    const { mapList, mapIdsOfSessionModule } = editorMapStore;
    const { t } = useTranslation();
    function selectMap(mapId: number) {
        onSelected(mapId);
    }

    let filteredMapList = JSON.parse(JSON.stringify(mapList)) as MapList;

    if (limitedToMapId) {
        filteredMapList = filteredMapList.filter(mapData => (mapData.id === limitedToMapId) || (mapData.id === selectedMapId));
    }

    if (editorStore.isModuleEditor) {
        // place maps that are part of the users module at the top of the list
        for (const mapId of mapIdsOfSessionModule) {
            const mapData = filteredMapList.find(mapData => mapData.id === mapId);
            if (mapData) {
                const mapListIndex = filteredMapList.indexOf(mapData);
                mapData.name = `* ${mapData.name}`;
                filteredMapList.splice(mapListIndex, 1);
                filteredMapList.unshift(mapData); // Array.unshift adds an item to beginning of an array
            }
        }
    } else {
        filteredMapList = filteredMapList.filter(mapList => !mapList.isOwnedByAModule);
    }

    return (
        <select
            disabled={disabled}
            value={(selectedMapId > 0) ? selectedMapId : EMPTY}
            onChange={e => {
                const value = Number.parseInt(e.target.value);
                selectMap((value === EMPTY) ? emptyOptionValue : value);
            }}
            style={{ width: width100percent ? "100%" : (width ? width : "unset") }}
        >
            {(!selectedMapId || hasEmpty) && <option value={EMPTY}>{t("shared.no_map_selected")}</option>}
            {
                filteredMapList.map(map =>
                    <option key={map.id} value={map.id}>
                        {hideId ? map.name : t("editor.map_name_with_id", { name: map.name, id: map.id })}
                    </option>
                )
            }
        </select>
    );
});