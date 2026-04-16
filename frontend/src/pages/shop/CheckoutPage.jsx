import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createOrder } from '../../api/orderApi';
import useCart from '../../hooks/useCart';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import { trackCheckoutStep } from '../../telemetry/telemetryClient';

const STEPS = ['Address', 'Payment', 'Review'];

const Field = ({ label, required, type = 'text', colSpan, value, onChange, placeholder }) => (
  <label className={`block text-sm${colSpan ? ` ${colSpan}` : ''}`}>
    <span className="font-medium text-ink/80">{label}{required && ' *'}</span>
    <input
      type={type}
      required={required}
      className="input-base mt-1"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </label>
);

const initAddress = {
  fullName: '', phone: '', addressLine1: '', addressLine2: '',
  city: '', state: '', postalCode: '', country: '',
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearItems } = useCart();
  const toast = useToast();

  const [step,            setStep]           = useState(0);
  const [shippingAddress, setShippingAddress] = useState(initAddress);
  const [paymentMethod,   setPaymentMethod]   = useState('mock');
  const [loading,         setLoading]         = useState(false);

  const { shippingFee, tax, total } = useMemo(() => {
    const fee = subtotal >= 120 ? 0 : 12;
    const t   = Number((subtotal * 0.1).toFixed(2));
    return { shippingFee: fee, tax: t, total: subtotal + fee + t };
  }, [subtotal]);

  if (!items.length) {
    return (
      <section className="card-surface mx-auto max-w-lg p-8 text-center">
        <h1 className="font-display text-3xl font-bold">Nothing to checkout</h1>
        <p className="mt-2 text-sm text-ink/60">Your cart is empty.</p>
        <Link to="/products" className="btn-primary mt-5 inline-block">Back to products</Link>
      </section>
    );
  }

  const addr = (field) => (e) =>
    setShippingAddress(prev => ({ ...prev, [field]: e.target.value }));

  const handleAddressNext = (e) => {
    e.preventDefault();
    trackCheckoutStep('address_filled', {
      country: shippingAddress.country,
      city:    shippingAddress.city,
    });
    setStep(1);
  };

  const handlePaymentNext = (e) => {
    e.preventDefault();
    trackCheckoutStep('payment_selected', { method: paymentMethod });
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createOrder({ shippingAddress, paymentMethod });
      toast.success('Order placed successfully!');
      trackCheckoutStep('order_placed', {
        paymentMethod,
        itemCount: items.length,
        total,
      });
      await clearItems();
      navigate('/profile');
    } catch (err) {
      const msg = err.response?.data?.message || 'Checkout failed';
      toast.error(msg);
      trackCheckoutStep('order_failed', { error: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-enter grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        {/* Progress */}
        <div className="card-surface p-4">
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-2">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  i < step   ? 'bg-emerald-500 text-white'
                  : i === step ? 'bg-ink text-white'
                  : 'bg-ink/10 text-ink/40'
                }`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-semibold ${i === step ? 'text-ink' : 'text-ink/40'}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="h-px flex-1 bg-ink/10" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 0 – Address */}
        {step === 0 && (
          <form className="card-surface space-y-4 p-5" onSubmit={handleAddressNext}>
            <h2 className="font-display text-2xl font-bold">Shipping address</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name"      required colSpan="sm:col-span-2" value={shippingAddress.fullName}    onChange={addr('fullName')} />
              <Field label="Phone"          required                         value={shippingAddress.phone}       onChange={addr('phone')} />
              <Field label="Country"        required                         value={shippingAddress.country}     onChange={addr('country')} />
              <Field label="Address line 1" required colSpan="sm:col-span-2" value={shippingAddress.addressLine1} onChange={addr('addressLine1')} />
              <Field label="Address line 2"          colSpan="sm:col-span-2" value={shippingAddress.addressLine2} onChange={addr('addressLine2')} placeholder="Apt, suite, etc." />
              <Field label="City"           required                         value={shippingAddress.city}        onChange={addr('city')} />
              <Field label="State"          required                         value={shippingAddress.state}       onChange={addr('state')} />
              <Field label="Postal code"    required colSpan="sm:col-span-2" value={shippingAddress.postalCode}  onChange={addr('postalCode')} />
            </div>
            <button type="submit" className="btn-primary">Continue to payment →</button>
          </form>
        )}

        {/* Step 1 – Payment */}
        {step === 1 && (
          <form className="card-surface space-y-4 p-5" onSubmit={handlePaymentNext}>
            <h2 className="font-display text-2xl font-bold">Payment method</h2>
            <div className="space-y-3">
              {[
                { value: 'mock',   label: 'Demo payment', sub: 'Simulated — no real charge' },
                { value: 'stripe', label: 'Credit / Debit card', sub: 'Secured by Stripe' },
              ].map(opt => (
                <label key={opt.value}
                  className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                    paymentMethod === opt.value ? 'border-clay bg-clay/5' : 'border-ink/10 hover:border-ink/30'
                  }`}>
                  <input type="radio" name="payment" value={opt.value}
                    checked={paymentMethod === opt.value}
                    onChange={() => setPaymentMethod(opt.value)}
                    className="accent-clay" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{opt.label}</p>
                    <p className="text-xs text-ink/55">{opt.sub}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary" onClick={() => setStep(0)}>← Back</button>
              <button type="submit" className="btn-primary">Review order →</button>
            </div>
          </form>
        )}

        {/* Step 2 – Review */}
        {step === 2 && (
          <form className="card-surface space-y-4 p-5" onSubmit={handleSubmit}>
            <h2 className="font-display text-2xl font-bold">Review &amp; place order</h2>

            <div className="rounded-xl border border-ink/10 bg-sand/20 p-4 space-y-1 text-sm">
              <p className="font-semibold text-ink">Shipping to</p>
              <p className="text-ink/65">{shippingAddress.fullName}</p>
              <p className="text-ink/65">{shippingAddress.addressLine1}{shippingAddress.addressLine2 ? `, ${shippingAddress.addressLine2}` : ''}</p>
              <p className="text-ink/65">{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
              <p className="text-ink/65">{shippingAddress.country}</p>
              <p className="mt-1 text-ink/65">Payment: <span className="font-medium capitalize text-ink">{paymentMethod}</span></p>
            </div>

            <div className="space-y-2">
              {items.map(item => (
                <div key={`${item.productId}_${item.size}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink/70">{item.name} × {item.quantity}</span>
                  <span className="font-medium text-ink">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 border-t border-ink/10 pt-3">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Placing order…' : `Place order · ${formatCurrency(total)}`}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Summary sidebar */}
      <aside className="card-surface h-fit space-y-3 p-5">
        <h2 className="font-display text-xl font-bold text-ink">Order summary</h2>
        <div className="max-h-52 overflow-y-auto space-y-2">
          {items.map(item => (
            <div key={`${item.productId}_${item.size}`}
              className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sand/50 text-xs font-bold text-ink/60">
                {item.quantity}
              </div>
              <span className="flex-1 text-ink/70 line-clamp-1">{item.name}</span>
              <span className="font-medium text-ink">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5 border-t border-ink/10 pt-3 text-sm text-ink/70">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span>
            <span className={shippingFee === 0 ? 'text-emerald-600 font-semibold' : ''}>{shippingFee === 0 ? 'FREE' : formatCurrency(shippingFee)}</span>
          </div>
          <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
          <div className="flex justify-between border-t border-ink/10 pt-1.5 text-base font-bold text-ink">
            <span>Total</span><span>{formatCurrency(total)}</span>
          </div>
        </div>
      </aside>
    </section>
  );
};

export default CheckoutPage;
