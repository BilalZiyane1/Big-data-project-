import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchFeaturedProducts } from '../../api/productApi';
import ProductCard from '../../components/product/ProductCard';
import { SkeletonGrid } from '../../components/common/SkeletonCard';
import { createImpressionObserver, trackEvent } from '../../telemetry/telemetryClient';

const CATEGORIES = [
  {
    label: 'Men',
    sub: 'Elevated essentials',
    category: 'men',
    gradient: 'from-[#2d3a2e] to-[#4a5c3a]',
    accent: '#8BAF6B',
  },
  {
    label: 'Women',
    sub: 'Refined womenswear',
    category: 'women',
    gradient: 'from-[#5a2d2d] to-[#A25C42]',
    accent: '#D8A080',
  },
  {
    label: 'Kids',
    sub: 'Playful & practical',
    category: 'kids',
    gradient: 'from-[#2d3a5a] to-[#4a5c8a]',
    accent: '#8BAFD8',
  },
];

const TRUST = [
  { label: 'Free shipping', sub: 'on orders over $120' },
  { label: '30-day returns', sub: 'no questions asked' },
  { label: 'Secure checkout', sub: 'SSL encrypted' },
];

const HomePage = () => {
  const [featured, setFeatured] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const observerRef = useRef(createImpressionObserver());

  useEffect(() => {
    fetchFeaturedProducts()
      .then(res => setFeatured(res.data || []))
      .finally(() => setLoading(false));

    trackEvent('ui.home.viewed', { category: 'navigation' });

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="page-enter space-y-16">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-[#1e1e24] to-[#2a1f1a] px-6 py-16 text-white sm:px-12 sm:py-20">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-clay/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/4 h-48 w-48 rounded-full bg-sand/15 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 bottom-0 h-32 w-32 rounded-full bg-moss/20 blur-2xl" />

        <div className="relative mx-auto max-w-4xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.4em] text-sand/70">
            Spring Collection 2026
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.1] sm:text-6xl">
            Dressed for<br />
            <span className="text-sand">every moment.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            Curated menswear, womenswear, and kidswear — elevated essentials
            crafted for real, modern living.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/products"
              onClick={() => trackEvent('ui.cta.shop_now_clicked', { category: 'conversion' })}
              className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-ink transition hover:bg-sand"
            >
              Shop the collection
            </Link>
            <Link
              to="/products?category=women"
              className="rounded-xl border border-white/25 px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
            >
              Explore women →
            </Link>
          </div>
        </div>

        {/* Trust pills overlay */}
        <div className="relative mt-12 flex flex-wrap gap-3">
          {TRUST.map(t => (
            <div key={t.label} className="rounded-full border border-white/15 bg-white/8 px-4 py-1.5 backdrop-blur">
              <span className="text-xs font-semibold text-white/80">{t.label}</span>
              <span className="ml-1 text-xs text-white/45">{t.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Category Showcase ─────────────────────────────────────────── */}
      <section className="stagger space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-clay">Browse by</p>
          <h2 className="font-display text-3xl font-bold text-ink">Shop categories</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.category}
              to={`/products?category=${cat.category}`}
              onClick={() => trackEvent('ui.category.clicked', {
                category: 'navigation',
                details: { categoryName: cat.category },
              })}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cat.gradient} px-6 py-10 text-white transition hover:-translate-y-0.5`}
            >
              <div
                className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30 blur-2xl transition group-hover:scale-125"
                style={{ background: cat.accent }}
              />
              <p className="relative font-display text-2xl font-bold">{cat.label}</p>
              <p className="relative mt-1 text-sm text-white/65">{cat.sub}</p>
              <span className="relative mt-4 inline-block text-xs font-semibold uppercase tracking-widest text-white/60 group-hover:text-white/90 transition">
                Shop now →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-clay">Highlighted pieces</p>
            <h2 className="font-display text-3xl font-bold text-ink">Featured products</h2>
          </div>
          <Link to="/products" className="text-sm font-semibold text-ink hover:text-clay">
            View all →
          </Link>
        </div>

        {loading ? (
          <SkeletonGrid count={4} cols="sm:grid-cols-2 lg:grid-cols-4" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map(product => (
              <ProductCard
                key={product._id}
                product={product}
                observerRef={observerRef}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Brand Story Strip ─────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-3xl border border-amber-900/10 bg-sand/30 px-6 py-10 sm:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-clay">Our philosophy</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-ink">
            Clothes that work as hard as you do.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink/65">
            We believe getting dressed should be effortless. Every piece in our collection
            is chosen for its quality, versatility, and ability to look good from morning
            meetings to weekend adventures.
          </p>
          <Link
            to="/products"
            className="mt-6 inline-block rounded-xl bg-ink px-6 py-3 text-sm font-bold text-white transition hover:bg-clay"
          >
            Discover the collection
          </Link>
        </div>
      </section>

    </div>
  );
};

export default HomePage;
