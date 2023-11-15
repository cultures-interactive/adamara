import { TypedEmitter } from 'tiny-typed-emitter';

interface Events {
    "onMove": () => void;
}

// HACK tw: This is rather hacky. There might be a cleaner way to get events
// to children of the ActionEditor.
export const globalActionEditorEvents = new TypedEmitter<Events>();