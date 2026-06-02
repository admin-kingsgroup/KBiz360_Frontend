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
import { UserSwitcher } from './UserSwitcher';

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
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 4, cursor: 'pointer',
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

function MegaMenu({ item, route, go, alignRight }) {
  const cols = buildColumns(item.children);
  const wide = cols.length > 3;
  return (
    <div style={{
      position: 'absolute', top: '100%', marginTop: 0, zIndex: 500,
      ...(alignRight ? { right: 0 } : { left: 0 }),
      background: '#ffffff', border: '1px solid #dbe0eb', borderRadius: 8,
      boxShadow: '0 8px 32px rgba(29, 45, 62, 0.12)', padding: 16,
      display: 'grid', gridTemplateColumns: `repeat(${Math.min(cols.length || 1, wide ? 4 : 3)}, minmax(170px, 1fr))`,
      gap: 12, maxWidth: '82vw', maxHeight: '72vh', overflowY: 'auto',
    }}>
      {cols.map((col, ci) => (
        <div key={ci} style={{ minWidth: 0, borderRight: ci < cols.length - 1 ? '1px solid #f1f5f9' : 'none', paddingRight: ci < cols.length - 1 ? 12 : 0 }}>
          {col.title && (
            <div style={{
              fontSize: 10.5, fontWeight: 800, letterSpacing: '0.6px',
              textTransform: 'uppercase', color: FIORI_BLUE,
              padding: '4px 10px 8px', borderBottom: '1px solid #f1f5f9',
              marginBottom: 6
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
  const [open, setOpen] = useState(null); // index of the open section
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, []);

  const go = (href) => { setRoute(href); setOpen(null); };

  return (
    <div ref={ref} style={{
      display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 16px',
      background: '#ffffff', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'visible',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, height: '100%', overflow: 'visible' }}>
        {menu.map((item, i) => {
          const hasChildren = !!item.children;
          const active = hasChildren ? item.children.some((c) => containsRoute(c, route)) : route === item.href;
          const isOpen = open === i;
          return (
            <div key={i} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', overflow: 'visible' }}>
              <button onClick={() => hasChildren ? setOpen(isOpen ? null : i) : go(item.href)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = FIORI_BLUE;
                  e.currentTarget.style.background = 'rgba(0, 112, 242, 0.04)';
                  if (open !== null && hasChildren) setOpen(i);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = active || isOpen ? FIORI_BLUE : '#475569';
                  e.currentTarget.style.background = isOpen ? '#f8fafc' : 'transparent';
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: '100%',
                  background: isOpen ? '#f8fafc' : 'transparent', border: 'none', cursor: 'pointer',
                  color: active || isOpen ? FIORI_BLUE : '#475569', fontWeight: active ? 700 : 600,
                  fontSize: 13, borderBottom: (active || isOpen) ? `3px solid ${FIORI_BLUE}` : '3px solid transparent',
                  borderRadius: 0, transition: 'all 0.15s ease-in-out',
                }}>
                {item.icon && <item.icon size={15} style={{ flexShrink: 0, color: active || isOpen ? FIORI_BLUE : '#64748b', transition: 'color 0.15s' }} />}
                <span>{item.label}</span>
                {item._regime && (
                  <span style={{ fontSize: 7.5, padding: '2px 5px', borderRadius: 3, fontWeight: 800, letterSpacing: '0.5px',
                    background: item._regime === 'GST' ? '#185FA515' : item._regime === 'VAT' ? '#27500A15' : '#d4a43715',
                    color: item._regime === 'GST' ? '#0854a0' : item._regime === 'VAT' ? '#27500A' : '#9a6810' }}>{item._regime}</span>
                )}
                {hasChildren && <ChevronDown size={12} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s', opacity: 0.8, color: active || isOpen ? FIORI_BLUE : '#64748b' }} />}
              </button>
              {isOpen && hasChildren && <MegaMenu item={item} route={route} go={go} alignRight={i >= menu.length - 4} />}
            </div>
          );
        })}
      </div>

      {/* Right: tenant context + role (relocated from the old sidebar) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingLeft: 10, height: '100%' }}>
        <div style={{ width: 156 }}><UserSwitcher currentUser={currentUser} switchUser={switchUser} light={true} /></div>
        <div style={{ width: 172 }}><BranchSwitcher branch={branch} setBranch={setBranch} currentUser={currentUser} light={true} /></div>
      </div>
    </div>
  );
}
