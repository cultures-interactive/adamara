import React from 'react';
import { ErrorBoundaryDisplay } from './ErrorBoundaryDisplay';

interface State {
    error: Error;
}

export class ErrorBoundary extends React.Component<any, State> {
    public constructor(props: State) {
        super(props);
        this.state = { error: null };
    }

    public static getDerivedStateFromError(error: Error) {
        // Update state so the next render will show the fallback UI.
        return { error };
    }

    /*
    public componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        logErrorToMyService(error, errorInfo);
    }
    */

    public render() {
        if (this.state.error) {
            // You can render any custom fallback UI    
            return <ErrorBoundaryDisplay insideErrorBoundary={true} error={this.state.error} />;
        }
        return this.props.children;
    }
}