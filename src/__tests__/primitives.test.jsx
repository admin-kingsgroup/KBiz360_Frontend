// Smoke + behavior tests for the shared responsive primitives. These own no
// business data, so they need no mocks — just assert they render and that the
// interactive bits (Button click, Drawer open/close, FormField error) work.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button, StatusPill, Badge, PageSection, ResponsiveGrid, Toolbar, FilterBar,
  FormField, Input, Select, Textarea, EmptyState, ErrorState, LoadingState, Drawer, Modal,
} from '../shell/primitives';

describe('primitives', () => {
  test('Button renders, fires onClick, and is disabled while loading', () => {
    const onClick = jest.fn();
    const { rerender } = render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByText('Save'));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<Button onClick={onClick} loading>Save</Button>);
    fireEvent.click(screen.getByText('Save'));
    expect(onClick).toHaveBeenCalledTimes(1); // disabled while loading
  });

  test('StatusPill / Badge render their content', () => {
    render(<StatusPill tone="success">Posted</StatusPill>);
    expect(screen.getByText('Posted')).toBeInTheDocument();
    expect(Badge).toBe(StatusPill);
  });

  test('PageSection renders header + body', () => {
    render(<PageSection title="Ledger" subtitle="live"><div>rows</div></PageSection>);
    expect(screen.getByText('Ledger')).toBeInTheDocument();
    expect(screen.getByText('rows')).toBeInTheDocument();
  });

  test('ResponsiveGrid (preset + auto-fill) renders children', () => {
    const { rerender } = render(<ResponsiveGrid cols={4}><span>a</span><span>b</span></ResponsiveGrid>);
    expect(screen.getByText('a')).toBeInTheDocument();
    rerender(<ResponsiveGrid min="220px"><span>c</span></ResponsiveGrid>);
    expect(screen.getByText('c')).toBeInTheDocument();
  });

  test('Toolbar / FilterBar render children + right slot', () => {
    render(<Toolbar right={<button>R</button>}><button>L</button></Toolbar>);
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    render(<FilterBar><input aria-label="f" /></FilterBar>);
    expect(screen.getByLabelText('f')).toBeInTheDocument();
  });

  test('FormField shows error over hint and marks required', () => {
    render(<FormField label="Amount" required hint="in INR" error="Required"><Input aria-label="amt" /></FormField>);
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.queryByText('in INR')).not.toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('Input / Select / Textarea forward refs and accept invalid flag', () => {
    const ref = React.createRef();
    render(<Input ref={ref} invalid aria-label="x" />);
    expect(ref.current.tagName).toBe('INPUT');
    render(<Select aria-label="s"><option>one</option></Select>);
    expect(screen.getByText('one')).toBeInTheDocument();
    render(<Textarea aria-label="t" defaultValue="note" />);
    expect(screen.getByLabelText('t')).toHaveValue('note');
  });

  test('EmptyState / ErrorState / LoadingState render messages and retry', () => {
    const onRetry = jest.fn();
    render(<EmptyState title="No rows" hint="add some" />);
    expect(screen.getByText('No rows')).toBeInTheDocument();
    render(<ErrorState message="boom" onRetry={onRetry} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
    render(<LoadingState label="Fetching…" />);
    expect(screen.getByText('Fetching…')).toBeInTheDocument();
  });

  test('Drawer portals when open, closes on backdrop, hides when closed', () => {
    const onClose = jest.fn();
    const { rerender } = render(<Drawer open title="Filters" onClose={onClose}><div>body</div></Drawer>);
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();

    rerender(<Drawer open={false} title="Filters" onClose={onClose}><div>body</div></Drawer>);
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  test('Modal re-export renders title + body', () => {
    render(<Modal title="Confirm" onClose={() => {}}><div>inside</div></Modal>);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('inside')).toBeInTheDocument();
  });
});
