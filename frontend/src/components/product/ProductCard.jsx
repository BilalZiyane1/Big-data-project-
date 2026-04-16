import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { addToWishlist } from '../../api/userApi';
import useAuth from '../../hooks/useAuth';
import { trackEvent } from '../../telemetry/telemetryClient';
import { formatCurrency } from '../../utils/formatters';
import { getProductImageUrl, setImageFallback } from '../../utils/image';

const StarRating = ({ value = 0, count = 0 }) => {
  const stars = Math.round(value);
  return (
    <span className="flex items-center gap-1">
      <span className="flex">
        {[1,2,3,4,5].map(i => (
          <svg key={i} viewBox="0 0 12 12" fill={i <= stars ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.2"
            className={`h-3 w-3 ${i <= stars ? 'text-amber-400' : 'text-ink/25'}`}>
            <path d="M6 1l1.327 2.69 2.97.432-2.148 2.093.507 2.956L6 7.77l-2.656 1.4.507-2.956L1.703 4.122l2.97-.432z"/>
          </svg>
        ))}
      </span>
      {count > 0 && <span className="text-[10px] text-ink/55">({count})</span>}
    </span>
  );
};

const WishlistButton = ({ productId, productName, size = 'sm' }) => {
  const { isAuthenticated } = useAuth();
  const [wished, setWished]   = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    if (!isAuthenticated) {
      window.location.href = '/login';
      return;
    }

    setLoading(true);
    try {
      await addToWishlist(productId);
      setWished(true);
      trackEvent('ui.product.wishlisted', {
        category: 'ecommerce',
        details: { productId, productName },
      });
    } catch {
      /* silent – no toast in card context to keep it lightweight */
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loading, productId, productName]);

  return (
    <button
      type="button"
      aria-label={wished ? 'Saved to wishlist' : 'Save to wishlist'}
      onClick={handleClick}
      className={`absolute right-2 top-2 rounded-full p-1.5 shadow transition ${
        wished
          ? 'bg-clay text-white'
          : 'bg-white/90 text-ink/50 hover:text-clay backdrop-blur'
      }`}
    >
      <svg viewBox="0 0 20 20" fill={wished ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="1.6"
        className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"/>
      </svg>
    </button>
  );
};

const StockBadge = ({ qty }) => {
  if (qty === 0)
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500">Out of stock</span>;
  if (qty <= 5)
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Only {qty} left</span>;
  return null;
};

const ColorDots = ({ colors = [] }) => {
  if (!colors.length) return null;
  const shown = colors.slice(0, 4);
  const rest  = colors.length - shown.length;
  return (
    <div className="flex items-center gap-1">
      {shown.map(c => (
        <span
          key={c}
          title={c}
          className="h-3 w-3 rounded-full border border-ink/15 shadow-sm"
          style={{ background: c.toLowerCase() }}
        />
      ))}
      {rest > 0 && <span className="text-[10px] text-ink/50">+{rest}</span>}
    </div>
  );
};

const ProductCard = ({ product, observerRef }) => {
  const cardRef  = useRef(null);
  const imageSrc = getProductImageUrl(product, product?.name);

  // Register with impression observer if provided
  useEffect(() => {
    const el = cardRef.current;
    if (!el || !observerRef?.current) return;
    observerRef.current.observe(el);
    return () => observerRef.current?.unobserve(el);
  }, [observerRef]);

  return (
    <article
      ref={cardRef}
      className="card-surface group relative overflow-hidden transition hover:-translate-y-0.5"
      data-product-id={product._id}
      data-product-name={product.name}
      data-product-category={product.category}
      data-product-price={product.price}
    >
      <WishlistButton
        productId={product._id}
        productName={product.name}
      />

      <Link
        to={`/products/${product._id}`}
        className="block"
        onClick={() => trackEvent('ui.product.card_clicked', {
          category: 'ecommerce',
          details: { productId: product._id, productName: product.name, category: product.category },
        })}
      >
        <div className="aspect-[4/5] overflow-hidden bg-sand/25">
          <img
            src={imageSrc}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => setImageFallback(e, product?.name)}
          />
        </div>

        <div className="space-y-1.5 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.15em] text-clay">{product.category}</p>
            <StockBadge qty={product.stockQuantity} />
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold text-ink leading-snug">
            {product.name}
          </h3>

          <ColorDots colors={product.colors} />

          <div className="flex items-center justify-between pt-0.5">
            <p className="font-semibold text-ink">{formatCurrency(product.price)}</p>
            <StarRating value={product.averageRating} count={product.ratingsCount} />
          </div>
        </div>
      </Link>
    </article>
  );
};

export default ProductCard;
export { StarRating, WishlistButton };
