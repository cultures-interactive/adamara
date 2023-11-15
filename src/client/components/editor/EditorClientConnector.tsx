import { Component, ReactNode } from 'react';
import { editorClient } from '../../communication/EditorClient';

// This is a class-based component to have proper mounting/dismounting with hot reloading.
// See the comment in GameContainer.tsx for more details.
export class EditorClientConnector extends Component {
    public componentDidMount() {
        editorClient.connect();
    }

    public componentWillUnmount() {
        editorClient.disconnect();
    }

    public render(): ReactNode {
        return null;
    }
}

/*
export const EditorClientConnector: React.FunctionComponent = () => {
    useEffect(() => {
        editorClient.connect();
        return () => editorClient.disconnect();
    }, []);

    return null;
};
*/