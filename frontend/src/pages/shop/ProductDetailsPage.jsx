import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addReview, fetchProductById, fetchProducts } from '../../api/productApi';
import { addToWishlist } from '../../api/userApi';
import Loader from '../../components/common/Loader';
import Breadcrumb from '../../components/common/Breadcrumb';
import ProductCard from '../../components/product/ProductCard';
import { StarRating } from '../../components/product/ProductCard';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getProductImageUrl, setImageFallback } from '../../utils/image';
import {
  startProductViewTimer,
  endProductViewTimer,
  trackEvent,
  trackCartEvent,
} from '../../telemetry/telemetryClient';

// ─── Image Gallery ─────────────────────────────────────────────────────────────

const ImageGallery = ({ images = [], productName }) => {
  const [activeIdx, setActiveIdx] = useState(0);

  const items = images.length
    ? images
    : [{ url: getProductImageUrl({ images: [] }, productName) }];

  const active = items[activeIdx] || items[0];

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="card-surface aspect-[4/5] overflow-hidden">
        <img
          key={active.url}
          src={active.url}
          alt={productName}
          className="h-full w-full object-cover transition duration-300"
          onError={e => setImageFallback(e, productName)}
        />
      </div>

      {/* Thumbnails */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === activeIdx
                  ? 'border-clay'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={img.url}
                alt={`${productName} view ${i + 1}`}
                className="h-full w-full object-cover"
                onError={e => setImageFallback(e, productName)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Review Stars Input ────────────────────────────────────────────────────────

const StarInput = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1,2,3,4,5].map(n => (
      <button key={n} type="button" onClick={() => onChange(n)}
        className={`transition hover:scale-110 ${n <= value ? 'text-amber-400' : 'text-ink/25'}`}
        aria-label={`${n} star${n > 1 ? 's' : ''}`}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      </button>
    ))}
  </div>
);

// ─── Page ──────────────────────────────────────────────────────────────────────

const ProductDetailsPage = () => {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const { addItem }    = useCart();
  const { isAuthenticated } = useAuth();
  const toast          = useToast();

  const [product,  setProduct]  = useState(null);
  const [related,  setRelated]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [quantity, setQuantity] = useState(1);
  const [size,     setSize]     = useState('');
  const [color,    setColor]    = useState('');
  const [review,   setReview]   = useState({ rating: 5, comment: '' });
  const observerRef = useRef(null);

  const loadProduct = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchProductById(id);
      setProduct(res.data);
      setSize(res.data.sizes?.[0] || '');
      setColor(res.data.colors?.[0] || '');
      startProductViewTimer(res.data._id, res.data.name);
      trackEvent('ui.product.viewed', {
        category: 'ecommerce',
        details: {
          productId: res.data._id,
          productName: res.data.name,
          category: res.data.category,
          price: res.data.price,
        },
      });
      // Load related (same category, exclude this product)
      fetchProducts({ category: res.data.category, limit: 4 }).then(r => {
        setRelated((r.data || []).filter(p => p._id !== id));
      }).catch(() => {});
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load product');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
    return () => endProductViewTimer();
  }, [id]);

  const hasStock    = useMemo(() => (product?.stockQuantity || 0) > 0, [product]);
  const productImages = useMemo(() => product?.images || [], [product]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      await addItem({ product, quantity, size, color });
      toast.success('Added to cart');
      trackCartEvent('item_added', {
        productId:   product._id,
        productName: product.name,
        quantity,
        size,
        color,
        price: product.price,
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not add to cart');
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    try {
      await addToWishlist(id);
      toast.success('Saved to wishlist');
      trackEvent('ui.product.wishlisted', {
        category: 'ecommerce',
        details: { productId: id, productName: product?.name },
      });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save to wishlist');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}` } });
      return;
    }
    try {
      await addReview(id, review);
      setReview({ rating: 5, comment: '' });
      toast.success('Review submitted — thank you!');
      trackEvent('ui.product.review_submitted', {
        category: 'ecommerce',
        details: { productId: id, rating: review.rating, hasComment: Boolean(review.comment) },
      });
      await loadProduct();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not submit review');
    }
  };

  if (loading) return <Loader fullPage />;

  if (error || !product) {
    return (
      <div className="card-surface p-6">
        <p className="text-red-700">{error || 'Product not found'}</p>
        <Link to="/products" className="mt-3 inline-block text-sm font-semibold text-clay hover:underline">
          Back to products
        </Link>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Home',  to: '/' },
    { label: 'Shop',  to: '/products' },
    { label: product.category.charAt(0).toUpperCase() + product.category.slice(1),
      to: `/products?category=${product.category}` },
    { label: product.name },
  ];

  return (
    <div className="page-enter space-y-12">
      <Breadcrumb items={breadcrumbs} />

      {/* ── Main product grid ─────────────────────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Gallery */}
        <ImageGallery images={productImages} productName={product.name} />

        {/* Info panel */}
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-clay">{product.category}</p>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink">
            {product.name}
          </h1>

          {/* Rating row */}
          <div className="flex items-center gap-3">
            <StarRating value={product.averageRating} count={product.ratingsCount} />
            <span className="text-sm text-ink/55">
              {product.ratingsCount || 0} review{product.ratingsCount !== 1 ? 's' : ''}
            </span>
          </div>

          <p className="font-display text-3xl font-bold text-ink">
            {formatCurrency(product.price)}
          </p>

          <p className="text-sm leading-relaxed text-ink/70">{product.description}</p>

          {/* Options */}
          <div className="grid gap-4 sm:grid-cols-2">
            {product.sizes?.length > 0 && (
              <label className="text-sm">
                <span className="font-medium">Size</span>
                <select className="input-base mt-1" value={size}
                  onChange={e => setSize(e.target.value)}>
                  {product.sizes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}

            {product.colors?.length > 0 && (
              <label className="text-sm">
                <span className="font-medium">Color</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {product.colors.map(c => (
                    <button key={c} type="button"
                      onClick={() => setColor(c)}
                      aria-label={c}
                      className={`h-8 w-8 rounded-full border-2 shadow-sm transition hover:scale-110 ${
                        color === c ? 'border-clay ring-2 ring-clay/30' : 'border-ink/20'
                      }`}
                      style={{ background: c.toLowerCase() }}
                    />
                  ))}
                </div>
              </label>
            )}

            <label className="text-sm sm:col-span-2">
              <span className="font-medium">Quantity</span>
              <div className="mt-1 flex items-center gap-2">
                <button type="button" className="btn-secondary px-3 py-2"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}>−</button>
                <span className="rounded-xl border border-ink/20 bg-white px-5 py-2 text-sm font-semibold">
                  {quantity}
                </span>
                <button type="button" className="btn-secondary px-3 py-2"
                  onClick={() => setQuantity(q => Math.min(product.stockQuantity, q + 1))}>+</button>
                <span className="ml-2 text-xs text-ink/50">
                  {product.stockQuantity > 0
                    ? `${product.stockQuantity} in stock`
                    : 'Out of stock'}
                </span>
              </div>
            </label>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" className="btn-primary flex-1" disabled={!hasStock}
              onClick={handleAddToCart}>
              {hasStock ? 'Add to cart' : 'Out of stock'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleWishlist}
              aria-label="Save to wishlist">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6"
                className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
              </svg>
            </button>
          </div>

          {/* Shipping note */}
          <p className="rounded-xl border border-ink/10 bg-sand/20 px-4 py-3 text-xs text-ink/65">
            ✦ Free shipping on orders over $120 · 30-day returns
          </p>
        </div>
      </section>

      {/* ── Reviews ───────────────────────────────────────────────── */}
      <section className="card-surface space-y-6 p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Customer reviews</h2>
            <p className="mt-0.5 text-sm text-ink/55">
              {product.ratingsCount || 0} review{product.ratingsCount !== 1 ? 's' : ''} ·{' '}
              Avg. {product.averageRating || 0} / 5
            </p>
          </div>
        </div>

        {/* Write a review */}
        <form onSubmit={handleReviewSubmit} className="rounded-2xl border border-ink/8 bg-sand/20 p-5 space-y-4">
          <p className="text-sm font-semibold text-ink">Write a review</p>
          <div>
            <p className="mb-2 text-xs text-ink/60">Your rating</p>
            <StarInput value={review.rating}
              onChange={r => setReview(prev => ({ ...prev, rating: r }))} />
          </div>
          <label className="block text-sm">
            <span className="text-ink/70">Comment (optional)</span>
            <textarea
              className="input-base mt-1 min-h-[90px] resize-none"
              value={review.comment}
              onChange={e => setReview(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Share what you liked or didn't like…"
            />
          </label>
          <button type="submit" className="btn-secondary w-fit">
            Submit review
          </button>
        </form>

        {/* Review list */}
        <div className="space-y-3">
          {(product.reviews || []).length ? (
            product.reviews.map(r => (
              <div key={r._id} className="rounded-2xl border border-ink/10 bg-white p-4 space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-clay/15 text-xs font-bold text-clay">
                      {(r.user?.name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-ink">{r.user?.name || 'Anonymous'}</p>
                  </div>
                  <p className="text-xs text-ink/50">{formatDate(r.createdAt)}</p>
                </div>
                <StarRating value={r.rating} />
                {r.comment && (
                  <p className="text-sm leading-relaxed text-ink/75 pt-1">{r.comment}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-ink/55">No reviews yet — be the first!</p>
          )}
        </div>
      </section>

      {/* ── Related products ──────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-clay">You may also like</p>
              <h2 className="font-display text-2xl font-bold text-ink">Related products</h2>
            </div>
            <Link to={`/products?category=${product.category}`}
              className="text-sm font-semibold text-ink hover:text-clay">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map(p => (
              <ProductCard key={p._id} product={p} observerRef={observerRef} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailsPage;
