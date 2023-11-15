import React from "react";
import { observer } from "mobx-react-lite";
import { managementStore } from "../../stores/ManagementStore";
import { RiDeleteBack2Line } from "react-icons/ri";
import { HiOutlineRefresh } from "react-icons/hi";
import { AccessCodeConfig, generateUniqueAccesscode } from "../../../shared/helper/accesscodeHelpers";
import { userStore } from "../../stores/UserStore";

interface Props {
    value: string;
    setValue: (value: string) => void;
    config: AccessCodeConfig;
    disabled?: boolean;
}

export const AccessCode: React.FunctionComponent<Props> = observer(({ value, setValue, config, disabled = false }) => {
    return (
        <>
            <input disabled={disabled} readOnly={true} value={value}></input>
            {userStore.mayEditAllWorkshops && (
                <>
                    &ensp;
                    <button disabled={disabled} onClick={() => setValue("")}>
                        <RiDeleteBack2Line />
                    </button>
                    &ensp;
                    <button disabled={disabled} onClick={() => setValue(generateUniqueAccesscode(config, managementStore.accessCodeExists))}>
                        <HiOutlineRefresh />
                    </button>
                </>
            )}
        </>
    );
});