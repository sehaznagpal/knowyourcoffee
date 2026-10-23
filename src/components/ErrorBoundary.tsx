import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; onReset: () => void };

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Test modal crashed:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="modal-backdrop">
        <div className="oops" role="alert">
          <p>something broke - try again</p>
          <button type="button" className="btn-inline" onClick={() => { this.setState({ failed: false }); this.props.onReset(); }}>close</button>
        </div>
      </div>
    );
  }
}
