import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useCart from '../../hooks/useCart';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import { getFallbackImage, setImageFallback } from '../../utils/image';
import { trackCartEvent, trackCheckoutStep } from '../../telemetry/telemetryClient';

const CartPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, removeItem, updateItem, clearItems } = useCart();
  const toast = useToast();

  const shippingFee = subtotal >= 120 ? 0 : 12;
  const tax         = Number((subtotal * 0.1).toFixed(2));
  const total       = subtotal + shippingFee + tax;

  useEffect(() => {
    trackCartEvent('viewed', {
      itemCount: items.length,
      subtotal,
    });
    trackCheckoutStep('cart_viewed', { itemCount: items.length, subtotal });
  }, []);

  const handleRemove = async (item) => {
    try {
      await removeItem({ productId: item.productId, size: item.size, color: item.color });
      toast.info(`${item.name} removed from cart`);
      trackCartEvent('item_removed', { productId: item.productId, productName: item.name });
    } catch {
      toast.error('Could not remove item');
    }
  };

  const handleClear = async () => {
    try {
      await clearItems();
      toast.info('Cart cleared');
      trackCartEvent('cleared', {});
    } catch {
      toast.error('Could not clear cart');
    }
  };

  const handleCheckout = () => {
    trackCheckoutStep('checkout_started', { itemCount: items.length, total });
    navigate('/checkout');
  };

  if (!items.length) {
    return (
      <section className="page-enter card-surface mx-auto max-w-lg p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sand/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
            className="h-7 w-7 text-clay">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>
          </svg>
        </div>
        <h1 className="font-display text-3xl font-bold text-ink">Your cart is empty</h1>
        <p className="mt-2 text-sm text-ink/60">Add some styles to start your order.</p>
        <Link to="/products" className="btn-primary mt-6 inline-block">
          Continue shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="page-enter grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-ink">
            Shopping cart
            <span className="ml-2 font-body text-base font-normal text-ink/50">
              ({items.length} item{items.length !== 1 ? 's' : ''})
            </span>
          </h1>
          <button type="button" onClick={handleClear}
            className="text-xs font-semibold text-clay hover:underline">
            Clear cart
          </button>
        </div>

        {items.map(item => (
          <article
            key={`${item.productId}_${item.size}_${item.color}`}
            className="card-surface p-4"
          >
            <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
              <img
                src={item.image || getFallbackImage(item.name)}
                alt={item.name}
                className="h-24 w-full rounded-xl object-cover sm:h-28"
                onError={e => setImageFallback(e, item?.name)}
              />
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/products/${item.productId}`}
                      className="font-semibold text-ink hover:text-clay">
                      {item.name}
                    </Link>
                    <p className="text-xs text-ink/55 mt-0.5">
                      {item.size ? `Size ${item.size}` : 'One size'}
                      {item.color ? ` · ${item.color}` : ''}
                    </p>
                  </div>
                  <p className="shrink-0 font-bold text-ink">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl border border-ink/15 bg-white">
                    <button type="button"
                      className="px-3 py-1.5 text-ink/60 hover:text-ink transition"
                      onClick={() => updateItem({ productId: item.productId, quantity: Math.max(1, item.quantity - 1), size: item.size, color: item.color })}>
                      −
                    </button>
                    <span className="border-x border-ink/10 px-3 py-1.5 text-sm font-semibold text-ink">
                      {item.quantity}
                    </span>
                    <button type="button"
                      className="px-3 py-1.5 text-ink/60 hover:text-ink transition"
                      onClick={() => updateItem({ productId: item.productId, quantity: item.quantity + 1, size: item.size, color: item.color })}>
                      +
                    </button>
                  </div>
                  <span className="text-xs text-ink/40">×</span>
                  <span className="text-xs text-ink/60">{formatCurrency(item.price)} each</span>
                  <button type="button"
                    className="ml-auto text-xs font-semibold text-clay hover:underline"
                    onClick={() => handleRemove(item)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Summary */}
      <aside className="card-surface h-fit space-y-4 p-5">
        <h2 className="font-display text-2xl font-bold text-ink">Order summary</h2>

        <div className="space-y-2.5 text-sm">
          <div className="flex justify-between text-ink/70">
            <span>Subtotal ({items.length} items)</span>
            <span className="font-medium text-ink">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink/70">
            <span>Shipping</span>
            <span className={shippingFee === 0 ? 'font-semibold text-emerald-600' : 'text-ink'}>
              {shippingFee === 0 ? 'FREE' : formatCurrency(shippingFee)}
            </span>
          </div>
          <div className="flex justify-between text-ink/70">
            <span>Tax (10%)</span>
            <span className="text-ink">{formatCurrency(tax)}</span>
          </div>
          {shippingFee > 0 && (
            <p className="rounded-lg bg-sand/40 px-3 py-2 text-xs text-ink/60">
              Add {formatCurrency(120 - subtotal)} more to get free shipping
            </p>
          )}
          <div className="flex justify-between border-t border-ink/10 pt-2.5 text-base font-bold text-ink">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <button type="button" className="btn-primary w-full" onClick={handleCheckout}>
          Proceed to checkout
        </button>

        <Link to="/products"
          className="block text-center text-xs font-semibold text-ink/50 hover:text-ink transition">
          ← Continue shopping
        </Link>
      </aside>
    </section>
  );
};

export default CartPage;
