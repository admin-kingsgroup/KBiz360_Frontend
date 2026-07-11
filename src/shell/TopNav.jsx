/* ════════════════════════════════════════════════════════════════════
   SHELL/TOPNAV.JSX

   SAP Fiori-style horizontal navigation bar (the "shell bar" nav row).
   Replaces the desktop left sidebar: top-level sections render as icon pills
   across a header strip; each section with children opens a clean white
   mega-menu dropdown (multi-column, grouped). Branch + role switchers sit on
   the right. Mobile still uses the drawer SideNav.

   Driven by the same getMenu() data as the old sidebar — nothing about routing
   or permissions changes, only the presentation.
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getMenu } from '../core/menus';
import { BranchSwitcher } from './BranchSwitcher';
import { useMobile } from '../core/hooks';
import { useReconNavCount } from '../core/useReconciliation';

const DARK = '#0d1326', GOLD = '#d4a437', DIM = '#aeb6d0', LINE = '#1a2340';
const FIORI_BLUE = '#0070f2', FIORI_TEXT = '#515559', FIORI_TEXT_DARK = '#24272a', FIORI_BORDER = '#cbd5e1';

/* Does this menu node (or any descendant) point at the active route? */
function containsRoute(node, route) {
  if (!node) return false;
  if (node.href) return node.href === route;
  if (node.children) return node.children.some((c) => containsRoute(c, route));
  return false;
}

/* Split a section's children into mega-menu columns: each nested group is its
   own column; consecutive leaves (and divider-led runs) form labelled columns. */
function buildColumns(children = []) {
  const cols = [];
  let loose = null;
  const flush = () => { if (loose) { cols.push(loose); loose = null; } };
  for (const c of children) {
    if (!c) continue; // tolerate array holes / undefined entries from menu typos
    if (c.divider) { flush(); loose = { title: c.label, items: [] }; continue; }
    if (c.children) { flush(); cols.push({ title: c.label, items: c.children }); continue; }
    if (!loose) loose = { title: null, items: [] };
    loose.items.push(c);
  }
  flush();
  return cols;
}

/* Recursive leaf renderer inside a mega-menu column. */
function Leaf({ node, route, go, depth = 0 }) {
  if (!node) return null;
  if (node.divider) {
    return (
      <div style={{
        fontSize: 9.5, fontWeight: 800, letterSpacing: '0.7px',
        textTransform: 'uppercase', color: '#64748b', padding: '10px 10px 4px'
      }}>
        {node.label}
      </div>
    );
  }
  if (node.children) {
    return (
      <div style={{ marginBottom: 6 }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: '#475569', padding: '8px 10px 4px'
        }}>
          {node.label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {node.children.map((c, i) => <Leaf key={i} node={c} route={route} go={go} depth={depth + 1} />)}
        </div>
      </div>
    );
  }
  const active = route === node.href;
  return (
    <div onClick={() => go(node.href)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
        fontSize: 12, fontWeight: active ? 700 : 500, color: active ? FIORI_BLUE : '#334155',
        background: active ? 'rgba(0, 112, 242, 0.08)' : 'transparent', whiteSpace: 'nowrap',
        transition: 'all 0.15s ease-in-out',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = '#eff6ff';
          e.currentTarget.style.color = FIORI_BLUE;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = '#334155';
        }
      }}>
      {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: FIORI_BLUE, flexShrink: 0 }} />}
      {node.label}
    </div>
  );
}

function MegaMenu({ item, route, go, buttonCoords, parentWidth }) {
  const cols = buildColumns(item.children);
  
  // Safe defaults and calculations for viewport boundaries
  const pWidth = parentWidth || (typeof window !== 'undefined' ? window.innerWidth : 1200);
  const colWidth = 180;
  const gap = 20;
  const numCols = cols.length || 1;
  const dropdownWidth = numCols * colWidth + (numCols - 1) * gap + 32; // 32px for padding
  const finalDropdownWidth = Math.min(dropdownWidth, pWidth - 32);

  const bCoords = buttonCoords || { left: 0, width: 0 };
  const buttonCenter = bCoords.left + bCoords.width / 2;
  const leftBoundary = 16;
  const rightBoundary = Math.max(leftBoundary, pWidth - finalDropdownWidth - 16);
  
  // Clamped position ensures dropdown stays completely inside viewport boundaries
  const leftPos = Math.max(leftBoundary, Math.min(buttonCenter - finalDropdownWidth / 2, rightBoundary));

  return (
    <div className="premium-dropdown-scrollbar" style={{
      position: 'absolute', top: '100%', marginTop: 0, zIndex: 500,
      left: leftPos, width: finalDropdownWidth,
      background: '#ffffff', border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: 8,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 20px 48px rgba(0, 0, 0, 0.08)', padding: 16,
      display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(180px, 1fr))`,
      gap: gap, maxHeight: '75vh', overflowY: 'auto',
      animation: 'navDropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    }}>
      {cols.map((col, ci) => (
        <div key={ci} style={{ minWidth: 0 }}>
          {col.title && (
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
              textTransform: 'uppercase', color: FIORI_BLUE,
              padding: '4px 8px 8px', borderBottom: '1px solid #cdd1d8',
              marginBottom: 8
            }}>
              {col.title}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {col.items.map((c, i) => <Leaf key={i} node={c} route={route} go={go} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopNav({ branch, setBranch, route, setRoute, currentUser, switchUser }) {
  const menu = getMenu(branch, currentUser);
  const reco = useReconNavCount(branch); // { pending, overdue } → badge on the Reconciliation pill
  const [open, setOpen] = useState(null); // index of the open section
  const [coords, setCoords] = useState({ left: 0, width: 0, parentWidth: 0 });
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(null); };
    const onResize = () => setOpen(null);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleOpen = (index, element) => {
    setOpen(index);
    if (index !== null && element && ref.current) {
      const parentRect = ref.current.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      setCoords({
        left: elementRect.left - parentRect.left,
        width: elementRect.width,
        parentWidth: parentRect.width
      });
    }
  };

  const go = (href) => { setRoute(href); setOpen(null); };

  const mob = useMobile();

  return (
    <div ref={ref} style={{
      position: 'relative',
      display: 'flex',
      flexDirection: mob ? 'column' : 'row',
      alignItems: mob ? 'stretch' : 'center',
      gap: mob ? 6 : 8,
      padding: mob ? '6px 16px' : '0 16px',
      background: '#ffffff', borderBottom: '1px solid #cdd1d8', flexShrink: 0,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'visible',
    }}>
      {/* Dynamic injection of premium styles */}
      <style>{`
        @keyframes navDropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .premium-dropdown-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .premium-dropdown-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .premium-dropdown-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .premium-dropdown-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Row 1 / Left: Navigation buttons scrollable container */}
      <div className="hide-scrollbar" style={{ 
        display: 'flex', alignItems: 'center', gap: 4, 
        flex: mob ? 'none' : 1, 
        height: mob ? 36 : '100%', 
        overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch',
        paddingBottom: mob ? 2 : 0
      }}>
        {menu.map((item, i) => {
          const hasChildren = !!item.children;
          const active = hasChildren ? item.children.some((c) => containsRoute(c, route)) : route === item.href;
          const isOpen = open === i;
          return (
            <div key={i} style={{ height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <button onClick={(e) => hasChildren ? (isOpen ? handleOpen(null, null) : handleOpen(i, e.currentTarget)) : go(item.href)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = FIORI_BLUE;
                  e.currentTarget.style.background = 'rgba(0, 112, 242, 0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = active || isOpen ? FIORI_BLUE : '#475569';
                  e.currentTarget.style.background = isOpen ? '#f8fafc' : 'transparent';
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: mob ? '0 8px' : '0 12px', height: '100%',
                  background: isOpen ? '#f8fafc' : 'transparent', border: 'none', cursor: 'pointer',
                  color: active || isOpen ? FIORI_BLUE : '#475569', fontWeight: active ? 700 : 600,
                  fontSize: 13, borderBottom: (active || isOpen) ? `3px solid ${FIORI_BLUE}` : '3px solid transparent',
                  borderRadius: 0, transition: 'all 0.15s ease-in-out',
                }}>
                {item.icon && <item.icon size={15} style={{ flexShrink: 0, color: active || isOpen ? FIORI_BLUE : '#64748b', transition: 'color 0.15s' }} />}
                <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                {item.label === 'Statement Reconciliation' && reco.pending > 0 && (
                  <span title={reco.overdue ? `${reco.overdue} weekly cycle(s) overdue` : `${reco.pending} reconciliation item(s) pending`}
                    style={{ minWidth: 16, height: 16, padding: '0 5px', borderRadius: 9, fontSize: 9.5, fontWeight: 800,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0,
                      background: reco.overdue ? '#A32D2D' : '#d4a437', color: '#fff' }}>
                    {reco.overdue || reco.pending}
                  </span>
                )}
                {item._regime && (
                  <span style={{ fontSize: 7.5, padding: '2px 5px', borderRadius: 3, fontWeight: 800, letterSpacing: '0.5px',
                    background: item._regime === 'GST' ? '#185FA515' : item._regime === 'VAT' ? '#27500A15' : '#d4a43715',
                    color: item._regime === 'GST' ? '#0854a0' : item._regime === 'VAT' ? '#27500A' : '#9a6810' }}>{item._regime}</span>
                )}
                {hasChildren && <ChevronDown size={12} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s', opacity: 0.8, color: active || isOpen ? FIORI_BLUE : '#64748b' }} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Dropdown rendered outside scrollable container to prevent CSS overflow clipping */}
      {open !== null && menu[open] && menu[open].children && (
        <MegaMenu 
          item={menu[open]} 
          route={route} 
          go={go} 
          buttonCoords={coords} 
          parentWidth={coords.parentWidth} 
        />
      )}

      {/* Row 2 / Right: branch (tenant) selector */}
      <div style={{ 
        display: 'flex', alignItems: 'center', 
        justifyContent: mob ? 'stretch' : 'flex-end',
        gap: 8, flexShrink: 0, 
        paddingLeft: mob ? 0 : 10,
        paddingTop: mob ? 4 : 0,
        height: mob ? 36 : '100%',
        borderTop: mob ? '1px solid #dfe2e7' : 'none'
      }}>
        <div style={{ width: mob ? '100%' : 172 }}>
          <BranchSwitcher branch={branch} setBranch={setBranch} currentUser={currentUser} light={true} />
        </div>
      </div>
    </div>
  );
}
