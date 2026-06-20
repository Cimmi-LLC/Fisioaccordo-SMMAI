import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutGrid, BookImage, TrendingUp, Users, BarChart3, Settings, LogOut, Building2, Video, Shield, CalendarClock, Briefcase, Menu, X, Activity } from 'lucide-react';
import logo from '@/assets/logo-full.png';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import BrandSwitcher from './BrandSwitcher';

const MOBILE_BREAKPOINT = 768;

const NAV_ITEMS = [
  { to: '/posts', label: 'Post', icon: LayoutGrid },
  { to: '/storie', label: 'Storie', icon: BookImage },
  { to: '/reel', label: 'Reel', icon: Video },
  { to: '/calendario', label: 'Calendario', icon: CalendarClock },
  { to: '/trend', label: 'Trend', icon: TrendingUp },
  { to: '/competitor', label: 'Competitor', icon: Users },
  { to: '/virale', label: 'Analisi Virale', icon: BarChart3 },
];

const ADMIN_NAV_ITEMS = [
  { to: '/brands', label: 'I miei Brand', icon: Briefcase },
];

const BOTTOM_ITEMS = [
  { to: '/brand', label: 'Il tuo Brand', icon: Building2 },
  { to: '/settings', label: 'Impostazioni', icon: Settings },
];

const Sidebar: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = useIsAdmin();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Track viewport: mobile if < 768px
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Close drawer when route changes
  useEffect(() => { if (isMobile) setMobileOpen(false); }, [location.pathname, isMobile]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isMobile, mobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const firstName = user?.user_metadata?.first_name || 'Utente';

  return (
    <>
      {/* Mobile hamburger (visible only on mobile when drawer closed).
          `calc(env(safe-area-inset-top) + 12px)` keeps it below the iPhone
          notch / status bar instead of being eaten by it. */}
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Apri menu"
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 12px)',
            zIndex: 49,
            width: 40, height: 40, borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <Menu style={{ width: 20, height: 20, color: 'var(--ink)' }} />
        </button>
      )}

      {/* Backdrop overlay (mobile only) */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 49,
            background: 'rgba(15,15,30,0.45)',
            transition: 'opacity 0.2s',
          }}
        />
      )}

      <aside
        style={{
          width: 220,
          // Use dynamic viewport units when available — fixes iOS Safari URL bar
          // resizing the page and the sidebar getting clipped at the bottom.
          height: '100dvh',
          minHeight: '100vh',
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 50,
          // Mobile: slide in/out
          transform: isMobile && !mobileOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.25s ease',
          overflowY: 'auto',
          // Respect iPhone notch / home indicator
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
      {/* Logo + close button (mobile) */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <img
          src={logo}
          alt="Fisioaccordo Polipartner — Social Media Manager AI"
          style={{ width: isMobile ? '78%' : '88%', height: 'auto', display: 'block', objectFit: 'contain' }}
        />
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Chiudi menu"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X style={{ width: 18, height: 18, color: 'var(--ink3)' }} />
          </button>
        )}
      </div>

      {/* Brand switcher (admin only) */}
      {isAdmin && (
        <div style={{ padding: '12px 8px 0' }}>
          <BrandSwitcher />
        </div>
      )}

      {/* Main nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isAdmin && ADMIN_NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
              fontSize: 13, fontWeight: isActive ? 700 : 500,
              color: isActive ? 'var(--rosa)' : 'var(--ink3)',
              backgroundColor: isActive ? 'var(--rosa-dim)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <Icon style={{ width: 18, height: 18 }} />
            {label}
          </NavLink>
        ))}
        {isAdmin && <div style={{ height: 1, backgroundColor: 'var(--line)', margin: '6px 4px' }} />}
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          const tourKey = to === '/posts' ? 'nav-post'
            : to === '/storie' ? 'nav-storie'
            : to === '/reel' ? 'nav-reel'
            : undefined;
          return (
            <NavLink
              key={to}
              to={to}
              data-tour={tourKey}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--viola)' : 'var(--ink3)',
                backgroundColor: isActive ? 'var(--viola-dim)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <Icon style={{ width: 18, height: 18 }} />
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: '8px 8px 12px', borderTop: '1px solid var(--line)' }}>
        {isAdmin && (
          <>
            <NavLink
              to="/admin"
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--rosa)' : 'var(--ink3)',
                backgroundColor: isActive ? 'rgba(230,0,126,0.08)' : 'transparent',
                transition: 'all 0.15s',
                marginBottom: 4,
              })}
            >
              <Shield style={{ width: 18, height: 18 }} />
              Admin
            </NavLink>
            <NavLink
              to="/admin/performance"
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--rosa)' : 'var(--ink3)',
                backgroundColor: isActive ? 'rgba(230,0,126,0.08)' : 'transparent',
                transition: 'all 0.15s',
                marginBottom: 4,
              })}
            >
              <Activity style={{ width: 18, height: 18 }} />
              Performance
            </NavLink>
          </>
        )}
        {BOTTOM_ITEMS.map(({ to, label, icon: Icon }) => {
          const tourKey = to === '/brand' ? 'nav-brand' : undefined;
          return (
            <NavLink
              key={to}
              to={to}
              data-tour={tourKey}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--viola)' : 'var(--ink3)',
                backgroundColor: isActive ? 'var(--viola-dim)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <Icon style={{ width: 18, height: 18 }} />
              {label}
            </NavLink>
          );
        })}

        {/* User + Logout */}
        <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, backgroundColor: 'var(--bg)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
            {firstName}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            Esci
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
