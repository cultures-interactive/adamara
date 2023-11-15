import { LocalStorageObjectString } from "../integration/localStorage";
import { generate } from "short-uuid";

export const clientId = new LocalStorageObjectString("clientId", generate()).get();