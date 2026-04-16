import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';

const navItemClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-ink text-white' : 'text-ink/80 hover:bg-ink/8 hover:text-ink'
  }`;

const CartIcon = ({ count }) => (
  <Link
    to="/cart"
    className="relative rounded-lg p-2 text-ink/70 transition hover:bg-ink/8 hover:text-ink"
    aria-label={`Cart – ${count} item${count !== 1 ? 's' : ''}`}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </svg>
    {count > 0 && (
      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-clay text-[10px] font-bold text-white">
        {count > 9 ? '9+' : count}
      </span>
    )}
  </Link>
);

const HamburgerIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
    {open ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    )}
  </svg>
);

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  // Close on route change & scroll lock
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-amber-900/10 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="font-display text-2xl font-bold tracking-tight text-ink" onClick={() => setMobileOpen(false)}>
            FashionHub
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/"        className={navItemClass} end>Home</NavLink>
            <NavLink to="/products" className={navItemClass}>Shop</NavLink>
            {!isAdmin && (
              <NavLink to="/cart" className={navItemClass}>
                Cart {itemCount > 0 ? `(${itemCount})` : ''}
              </NavLink>
            )}
            {!isAuthenticated ? (
              <NavLink to="/login" className={navItemClass}>Login</NavLink>
            ) : !isAdmin ? (
              <NavLink to="/profile" className={navItemClass}>
                {user?.name?.split(' ')[0] || 'Profile'}
              </NavLink>
            ) : null}
            {isAdmin && <NavLink to="/admin" className={navItemClass}>Admin</NavLink>}
            {isAuthenticated && (
              <button type="button" className="btn-secondary ml-1" onClick={handleLogout}>
                Logout
              </button>
            )}
          </nav>

          {/* Mobile right-side icons */}
          <div className="flex items-center gap-1 md:hidden">
            {!isAdmin && <CartIcon count={itemCount} />}
            <button
              type="button"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-drawer"
              onClick={() => setMobileOpen(v => !v)}
              className="rounded-lg p-2 text-ink/70 transition hover:bg-ink/8 hover:text-ink"
            >
              <HamburgerIcon open={mobileOpen} />
            </button>
          </div>

          {/* Desktop cart icon */}
          <div className="hidden md:flex">
            {!isAdmin && <CartIcon count={itemCount} />}
          </div>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        id="mobile-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          transform: mobileOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 260ms cubic-bezier(0.4,0,0.2,1)',
        }}
        className="fixed right-0 top-0 z-50 flex h-full w-72 flex-col bg-cream shadow-2xl md:hidden"
      >
        <div className="flex items-center justify-between border-b border-amber-900/10 px-5 py-4">
          <span className="font-display text-xl font-bold text-ink">FashionHub</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-ink/60 hover:bg-ink/8"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          {[
            { to: '/',         label: 'Home',    end: true },
            { to: '/products', label: 'Shop' },
            ...(!isAdmin ? [{ to: '/cart', label: `Cart${itemCount > 0 ? ` (${itemCount})` : ''}` }] : []),
            ...(isAdmin  ? [{ to: '/admin',   label: 'Admin Dashboard' }] : []),
            ...(!isAuthenticated
              ? [{ to: '/login',    label: 'Login' }, { to: '/register', label: 'Create account' }]
              : !isAdmin
              ? [{ to: '/profile', label: `My Profile` }]
              : []),
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive ? 'bg-ink text-white' : 'text-ink hover:bg-ink/8'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {isAuthenticated && (
          <div className="border-t border-amber-900/10 p-4">
            <p className="mb-3 px-1 text-xs text-ink/50">
              Signed in as <span className="font-semibold text-ink/70">{user?.name}</span>
            </p>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default Navbar;
