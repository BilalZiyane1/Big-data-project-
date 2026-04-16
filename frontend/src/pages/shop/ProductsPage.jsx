import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../../components/product/ProductCard';
import Pagination from '../../components/common/Pagination';
import { SkeletonGrid } from '../../components/common/SkeletonCard';
import { fetchProducts } from '../../api/productApi';
import useDebounce from '../../hooks/useDebounce';
import {
  createImpressionObserver,
  trackSearchEvent,
} from '../../telemetry/telemetryClient';

const CATEGORIES = ['', 'men', 'women', 'kids'];
const SIZES      = ['', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

const SORT_OPTIONS = [
  { value: 'latest',   label: 'Latest'           },
  { value: 'priceAsc', label: 'Price: Low → High' },
  { value: 'priceDesc',label: 'Price: High → Low' },
  { value: 'rating',   label: 'Top rated'         },
];

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
  </svg>
);

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const observerRef    = useRef(createImpressionObserver());

  const [products,   setProducts]   = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [viewMode,   setViewMode]   = useState('grid'); // 'grid' | 'list'

  const [filters, setFilters] = useState({
    q:        searchParams.get('q')        || '',
    category: searchParams.get('category') || '',
    size:     searchParams.get('size')     || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sort:     searchParams.get('sort')     || 'latest',
    page:     Number(searchParams.get('page'))  || 1,
    limit:    Number(searchParams.get('limit')) || 12,
  });

  const debouncedQ = useDebounce(filters.q);

  // Load products whenever filters change
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchProducts({ ...filters, q: debouncedQ });
        if (!cancelled) {
          setProducts(res.data || []);
          setPagination(res.pagination || null);
          trackSearchEvent('results_loaded', {
            query:    debouncedQ,
            category: filters.category,
            size:     filters.size,
            sort:     filters.sort,
            returned: (res.data || []).length,
            total:    res.pagination?.total,
            page:     filters.page,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'Could not load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [filters.category, filters.size, filters.minPrice, filters.maxPrice,
      filters.sort, filters.page, filters.limit, debouncedQ]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const updateFilter = useCallback((field, value) => {
    setFilters(prev => ({ ...prev, [field]: value, page: field === 'page' ? value : 1 }));
    if (field === 'q')
      trackSearchEvent('query_typed', { query: value });
    else if (field === 'category' || field === 'size' || field === 'sort')
      trackSearchEvent('filter_applied', { field, value });
  }, []);

  // Active filter chips
  const activeFilters = [
    filters.category && { key: 'category', label: `Category: ${filters.category}` },
    filters.size     && { key: 'size',     label: `Size: ${filters.size}` },
    filters.minPrice && { key: 'minPrice', label: `Min: $${filters.minPrice}` },
    filters.maxPrice && { key: 'maxPrice', label: `Max: $${filters.maxPrice}` },
  ].filter(Boolean);

  const clearAll = () => setFilters(prev => ({
    ...prev, category: '', size: '', minPrice: '', maxPrice: '', page: 1,
  }));

  const gridCols = viewMode === 'list'
    ? 'grid-cols-1'
    : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <section className="page-enter grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="card-surface h-fit space-y-5 p-5">
        <h1 className="font-display text-2xl font-bold text-ink">Shop Clothes</h1>

        <label className="block text-sm">
          <span className="font-medium text-ink/80">Search</span>
          <div className="relative mt-1">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40">
              <circle cx="8.5" cy="8.5" r="5.25"/>
              <path strokeLinecap="round" d="M12.5 12.5l3.5 3.5"/>
            </svg>
            <input
              className="input-base pl-9"
              value={filters.q}
              onChange={e => updateFilter('q', e.target.value)}
              placeholder="Search name, category…"
            />
          </div>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-ink/80">Category</span>
          <select className="input-base mt-1" value={filters.category}
            onChange={e => updateFilter('category', e.target.value)}>
            {CATEGORIES.map(v => (
              <option key={v || 'all'} value={v}>{v || 'All categories'}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-ink/80">Size</span>
          <select className="input-base mt-1" value={filters.size}
            onChange={e => updateFilter('size', e.target.value)}>
            {SIZES.map(v => (
              <option key={v || 'all'} value={v}>{v || 'All sizes'}</option>
            ))}
          </select>
        </label>

        <div>
          <p className="text-sm font-medium text-ink/80">Price range</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input type="number" min="0" className="input-base" placeholder="Min"
              value={filters.minPrice} onChange={e => updateFilter('minPrice', e.target.value)} />
            <input type="number" min="0" className="input-base" placeholder="Max"
              value={filters.maxPrice} onChange={e => updateFilter('maxPrice', e.target.value)} />
          </div>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-ink/80">Sort by</span>
          <select className="input-base mt-1" value={filters.sort}
            onChange={e => updateFilter('sort', e.target.value)}>
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        {activeFilters.length > 0 && (
          <button type="button" onClick={clearAll}
            className="text-xs font-semibold text-clay hover:underline">
            Clear all filters
          </button>
        )}
      </aside>

      {/* ── Results ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!loading && pagination && (
              <p className="text-sm text-ink/60">
                <span className="font-semibold text-ink">{pagination.total}</span> results
              </p>
            )}
            {activeFilters.map(f => (
              <span key={f.key}
                className="flex items-center gap-1 rounded-full border border-clay/30 bg-clay/8 px-2.5 py-0.5 text-xs font-semibold text-clay">
                {f.label}
                <button type="button" aria-label={`Remove ${f.label}`}
                  onClick={() => updateFilter(f.key, '')}>
                  <CloseIcon />
                </button>
              </span>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-ink/15 bg-white p-0.5 shadow-sm">
            {[
              { mode: 'grid', icon: 'M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm0 11h7v7h-7z' },
              { mode: 'list', icon: 'M3 5h18M3 10h18M3 15h18M3 20h18' },
            ].map(({ mode, icon }) => (
              <button key={mode} type="button"
                onClick={() => setViewMode(mode)}
                aria-label={`${mode} view`}
                className={`rounded-md p-1.5 transition ${viewMode === mode ? 'bg-ink text-white' : 'text-ink/50 hover:text-ink'}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon}/>
                </svg>
              </button>
            ))}
          </div>
        </div>

        {loading && <SkeletonGrid count={filters.limit} cols={gridCols} />}

        {error && (
          <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <div className={`grid gap-4 ${gridCols}`}>
              {products.map(product => (
                <ProductCard key={product._id} product={product} observerRef={observerRef} />
              ))}
            </div>

            {products.length === 0 && (
              <div className="card-surface py-14 text-center">
                <p className="font-display text-2xl font-bold text-ink">No products found</p>
                <p className="mt-2 text-sm text-ink/60">Try adjusting your filters or search terms.</p>
                {activeFilters.length > 0 && (
                  <button type="button" onClick={clearAll} className="btn-primary mt-4">
                    Clear filters
                  </button>
                )}
              </div>
            )}

            <Pagination pagination={pagination} onChange={page => updateFilter('page', page)} />
          </>
        )}
      </div>
    </section>
  );
};

export default ProductsPage;
