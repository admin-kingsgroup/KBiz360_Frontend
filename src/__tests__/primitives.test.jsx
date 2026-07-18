// Smoke + behavior tests for the shared responsive primitives. These own no
// business data, so they need no mocks — just assert they render and that the
// interactive bits (Button click, Drawer open/close, FormField error) work.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Plus } from 'lucide-react';
import {
  Button, StatusPill, Badge, PageSection, ResponsiveGrid, Toolbar, FilterBar,
  FormField, Input, Select, Textarea, EmptyState, ErrorState, LoadingState, Drawer, Modal,
  IconButton, Checkbox, Switch, Card, Skeleton, SkeletonTable, Tooltip,
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

  test('Button `write` is pre-disabled with a reason for a view-only user (never a live no-op)', () => {
    localStorage.removeItem('kb360-user');
    const onClick = jest.fn();
    // Not view-only → a write button behaves normally.
    render(<Button write onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByText('Save'));
    expect(onClick).toHaveBeenCalledTimes(1);

    // View-only → the SAME write button is disabled, carries the reason, and eats the click…
    localStorage.setItem('kb360-user', JSON.stringify({ viewOnly: true }));
    try {
      render(<Button write onClick={onClick}>Post</Button>);
      const writeBtn = screen.getByText('Post').closest('button');
      expect(writeBtn).toBeDisabled();
      expect(writeBtn.getAttribute('title')).toMatch(/view only/i);
      fireEvent.click(screen.getByText('Post'));
      expect(onClick).toHaveBeenCalledTimes(1); // still 1 — the disabled write button did nothing

      // …while a NON-write (nav / filter / view) button is untouched — backward compatible.
      render(<Button onClick={onClick}>Open</Button>);
      fireEvent.click(screen.getByText('Open'));
      expect(onClick).toHaveBeenCalledTimes(2);
    } finally {
      localStorage.removeItem('kb360-user');
    }
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

  test('IconButton fires onClick and exposes its label', () => {
    const onClick = jest.fn();
    render(<IconButton icon={Plus} label="Add row" onClick={onClick} />);
    fireEvent.click(screen.getByLabelText('Add row'));
    expect(onClick).toHaveBeenCalled();
  });

  test('Checkbox + Switch toggle their value', () => {
    const onCheck = jest.fn(); const onToggle = jest.fn();
    render(<Checkbox checked={false} onChange={onCheck} label="Active" />);
    fireEvent.click(screen.getByText('Active'));
    expect(onCheck).toHaveBeenCalledWith(true);
    render(<Switch checked={false} onChange={onToggle} label="Live" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  test('Card / Skeleton / SkeletonTable / Tooltip render', () => {
    render(<Card><div>panel</div></Card>);
    expect(screen.getByText('panel')).toBeInTheDocument();
    const { container: skel } = render(<SkeletonTable rows={3} cols={3} />);
    expect(skel.querySelectorAll('.kb-skeleton').length).toBeGreaterThan(0);
    render(<Skeleton className="h-3" />);
    render(<Tooltip label="hint"><button>hover me</button></Tooltip>);
    expect(screen.getByText('hover me')).toBeInTheDocument();
    expect(screen.getByText('hint')).toBeInTheDocument();
  });
});
