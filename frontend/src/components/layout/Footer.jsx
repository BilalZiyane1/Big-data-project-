import { Link } from 'react-router-dom';

const CATEGORIES = [
  { label: 'Men',   to: '/products?category=men'   },
  { label: 'Women', to: '/products?category=women' },
  { label: 'Kids',  to: '/products?category=kids'  },
  { label: 'New Arrivals', to: '/products?sort=latest' },
  { label: 'Sale',         to: '/products?sort=priceAsc' },
];

const HELP = [
  { label: 'My Account',   to: '/profile' },
  { label: 'Orders',       to: '/profile' },
  { label: 'Wishlist',     to: '/profile' },
  { label: 'Size Guide',   to: '/products' },
  { label: 'Contact',      to: '/' },
];

const TRUST = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    label: 'Free shipping over $120',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
    label: '30-day free returns',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    label: 'Secure payments',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
    label: '24/7 customer support',
  },
];

const Footer = () => (
  <footer className="border-t border-amber-900/10 bg-white/70 backdrop-blur">
    {/* Trust bar */}
    <div className="border-b border-amber-900/8 bg-sand/20">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8">
        {TRUST.map(item => (
          <div key={item.label} className="flex items-center gap-3 text-ink/70">
            <span className="shrink-0 text-clay">{item.icon}</span>
            <span className="text-xs font-semibold leading-snug">{item.label}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Main footer grid */}
    <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
      {/* Brand */}
      <div className="space-y-3 lg:col-span-2">
        <Link to="/" className="font-display text-2xl font-bold text-ink">FashionHub</Link>
        <p className="max-w-xs text-sm leading-relaxed text-ink/65">
          Contemporary essentials for men, women, and kids. Crafted for daily confidence
          and effortless style.
        </p>
        <div className="flex gap-3 pt-1">
          {['Instagram','Twitter','Pinterest'].map(name => (
            <a
              key={name}
              href="#"
              aria-label={name}
              className="rounded-lg border border-ink/15 p-2 text-ink/50 transition hover:border-clay/40 hover:text-clay"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8"/>
                <circle cx="17.5" cy="6.5" r="1" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* Shop links */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-clay">Shop</p>
        <ul className="space-y-2">
          {CATEGORIES.map(item => (
            <li key={item.to}>
              <Link to={item.to} className="text-sm text-ink/65 transition hover:text-ink">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Help links */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-clay">Help</p>
        <ul className="space-y-2">
          {HELP.map(item => (
            <li key={item.label}>
              <Link to={item.to} className="text-sm text-ink/65 transition hover:text-ink">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="border-t border-amber-900/8">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-xs text-ink/45">
          © {new Date().getFullYear()} FashionHub. All rights reserved.
        </p>
        <div className="flex gap-4">
          {['Privacy Policy','Terms of Service','Cookie Policy'].map(label => (
            <a key={label} href="#" className="text-xs text-ink/45 transition hover:text-ink/70">
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
