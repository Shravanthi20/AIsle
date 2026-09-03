import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiDelete, apiGet, apiPut } from '../services/apiClient';

interface CartItem { productId: string; name: string; quantity: number; unitPrice: string; currency: string; subtotal: string; stockAvailable: number; imageUrl: string | null; }
interface Cart { items: CartItem[]; subtotal: string; currency: string; }

export function CartPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (token) void apiGet<Cart>('/cart', token).then(setCart).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load cart'));
  }, [token]);
  async function update(productId: string, quantity: number) {
    if (!token) return;
    try { setCart(await apiPut<Cart>(`/cart/items/${productId}`, { quantity }, token)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update cart'); }
  }
  async function remove(productId: string) {
    if (!token) return;
    try { setCart(await apiDelete<Cart>(`/cart/items/${productId}`, token)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not remove item'); }
  }
  async function clear() { if (token) setCart(await apiDelete<Cart>('/cart', token)); }
  if (!cart) return <p className="text-sm text-slate-500">Loading cart...</p>;
  return <section className="grid gap-6"><div><p className="text-sm font-semibold uppercase tracking-wide text-saffron">Buyer cart</p><h1 className="mt-2 text-3xl font-semibold">Your cart</h1></div>{error ? <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}{cart.items.length === 0 ? <div className="border border-slate-200 bg-white p-6"><p>Your cart is empty.</p><Link className="mt-4 inline-block font-semibold text-mint" to="/buyer">Continue shopping</Link></div> : <div className="grid gap-6 lg:grid-cols-[1fr_320px]"><div className="grid gap-3">{cart.items.map((item) => <article className="flex gap-4 border border-slate-200 bg-white p-4" key={item.productId}>{item.imageUrl ? <img className="h-20 w-20 object-cover" src={item.imageUrl} alt="" /> : null}<div className="min-w-0 flex-1"><h2 className="font-semibold">{item.name}</h2><p className="text-sm text-slate-600">{item.currency} {Number(item.unitPrice).toLocaleString('en-IN')} each</p><p className="mt-1 text-sm">Subtotal: {item.currency} {Number(item.subtotal).toLocaleString('en-IN')}</p><div className="mt-3 flex items-center gap-3"><button type="button" onClick={() => item.quantity > 1 && void update(item.productId, item.quantity - 1)} className="border px-3 py-1" aria-label="Decrease quantity">-</button><span>{item.quantity}</span><button type="button" onClick={() => void update(item.productId, item.quantity + 1)} className="border px-3 py-1" aria-label="Increase quantity">+</button><button type="button" onClick={() => void remove(item.productId)} className="ml-3 text-sm font-semibold text-red-700">Remove</button></div></div></article>)}</div><aside className="h-fit border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold">Summary</h2><p className="mt-4 flex justify-between"><span>Subtotal</span><strong>{cart.currency} {Number(cart.subtotal).toLocaleString('en-IN')}</strong></p><button type="button" onClick={() => navigate('/buyer/checkout')} className="mt-5 w-full bg-ink px-4 py-3 text-sm font-semibold text-white">Checkout</button><button type="button" onClick={() => void clear()} className="mt-3 w-full border px-4 py-2 text-sm font-semibold">Clear cart</button></aside></div>}</section>;
}