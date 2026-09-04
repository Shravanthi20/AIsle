import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../services/apiClient';
import type { AuditEvent } from '../types/audit';
import type { BuyerAnalytics, BuyerOrderAnalytics } from '../types/analytics';

interface Product { product_id: string; name: string; description: string | null; category: string; price: number; currency: string; availability: string; attributes: Record<string, string>; }
interface Cart { items: Array<{ productId: string; name: string; quantity: number; subtotal: string }>; subtotal: string; currency: string; }
interface AgentAction { type: string; productId?: string; label: string }
interface AgentResponse { message: string; state: string; products: Product[]; actions: AgentAction[]; cart?: Cart }
interface ChatEntry { role: 'buyer' | 'agent'; message: string; response?: AgentResponse }

export function BuyerDashboardPage() {
  const { token } = useAuth();
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<ChatEntry[]>([]);
  const [cart, setCart] = useState<Cart>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activity, setActivity] = useState<AuditEvent[]>([]);
  const [analytics, setAnalytics] = useState<BuyerAnalytics | null>(null);
  const [recentOrders, setRecentOrders] = useState<BuyerOrderAnalytics[]>([]);

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      apiGet<{ events: AuditEvent[] }>('/audit?limit=8', token),
      apiGet<{ analytics: BuyerAnalytics }>('/analytics/buyer', token),
      apiGet<{ orders: BuyerOrderAnalytics[] }>('/analytics/buyer/orders', token),
    ]).then(([auditResult, analyticsResult, ordersResult]) => { setActivity(auditResult.events); setAnalytics(analyticsResult.analytics); setRecentOrders(ordersResult.orders.slice(0, 5)); })
      .catch(() => undefined);
  }, [token]);

  async function send(text: string, action?: AgentAction) {
    if (!token || !text.trim()) return;
    setLoading(true); setError('');
    setConversation((current) => [...current, { role: 'buyer', message: text }]);
    try {
      const response = await apiPost<AgentResponse>('/agent/buyer/chat', { message: text, action }, token);
      setConversation((current) => [...current, { role: 'agent', message: response.message, response }]);
      if (response.cart) setCart(response.cart);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The buyer agent could not respond'); }
    finally { setLoading(false); }
  }

  function submit(event: FormEvent) { event.preventDefault(); const text = message.trim(); setMessage(''); void send(text); }

  return <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
    <div className="grid gap-5">
      <header><p className="text-sm font-semibold uppercase tracking-wide text-saffron">Buyer Agent</p><h1 className="mt-2 text-3xl font-semibold">Tell me what you need</h1><p className="mt-2 text-slate-600">I search AIsle's live catalog and explain available options.</p></header>
      <div className="grid min-h-96 gap-4 border border-slate-200 bg-white p-5 shadow-sm">
        {!conversation.length ? <p className="text-sm text-slate-500">Try: “I need black running shoes under ₹8000, size 9.”</p> : null}
        {conversation.map((entry, index) => <div className={entry.role === 'buyer' ? 'ml-auto max-w-[85%] bg-ink px-4 py-3 text-sm text-white' : 'max-w-[85%] bg-slate-100 px-4 py-3 text-sm'} key={`${entry.role}-${index}`}><p>{entry.message}</p>{entry.response?.products.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{entry.response.products.map((product) => <ProductCard key={product.product_id} product={product} actions={entry.response?.actions ?? []} onAction={(selected) => void send(selected.label, selected)} />)}</div> : null}</div>)}
        {loading ? <p className="text-sm text-slate-500">Checking the catalog...</p> : null}
      </div>
      {error ? <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <form onSubmit={submit} className="flex gap-3 border border-slate-200 bg-white p-4 shadow-sm"><input className="min-w-0 flex-1 border border-slate-300 px-4 py-3" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask for a product, details, or cart help" disabled={loading} /><button className="bg-ink px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-400" disabled={loading || !message.trim()}>Send</button></form>
    </div>
    <aside className="grid h-fit gap-6"><div className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Purchase summary</h2>{analytics ? <div className="mt-4 grid gap-2 text-sm"><p className="flex justify-between"><span>Total spending</span><strong>{analytics.currency ?? ''} {analytics.totalSpending}</strong></p><p className="flex justify-between"><span>Orders</span><strong>{analytics.totalOrders}</strong></p>{analytics.mostPurchasedProducts[0] ? <p className="flex justify-between"><span>Most purchased</span><strong>{analytics.mostPurchasedProducts[0].name}</strong></p> : null}</div> : <p className="mt-3 text-sm text-slate-500">Analytics unavailable.</p>}</div><div className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Recent purchases</h2>{recentOrders.length ? <div className="mt-3 grid gap-3 text-sm">{recentOrders.map((order) => <div className="flex justify-between gap-3 border-b border-slate-100 pb-2" key={order.id}><span>{new Date(order.createdAt).toLocaleDateString()}</span><strong>{order.currency} {order.totalAmount}</strong></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No purchases yet.</p>}</div><div className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Cart summary</h2>{!cart?.items.length ? <p className="mt-3 text-sm text-slate-500">Ask me to show your cart.</p> : <><div className="mt-4 grid gap-3">{cart.items.map((item) => <div className="flex justify-between gap-3 text-sm" key={item.productId}><span>{item.name} × {item.quantity}</span><strong>{cart.currency} {Number(item.subtotal).toLocaleString('en-IN')}</strong></div>)}</div><p className="mt-5 flex justify-between border-t pt-4"><span>Total</span><strong>{cart.currency} {Number(cart.subtotal).toLocaleString('en-IN')}</strong></p><Link className="mt-4 block text-sm font-semibold text-mint" to="/buyer/cart">Open cart</Link></>}</div><Activity events={activity} /></aside>
  </section>;
}

function Activity({ events }: { events: AuditEvent[] }) {
  return <div className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Recent activity</h2>{events.length ? <div className="mt-3 grid gap-3">{events.map((event) => <div className="border-b border-slate-100 pb-2 text-sm" key={event.id}><p className="font-medium">{event.action.replace(/_/g, ' ')}</p><p className="text-slate-500">{event.explanation ?? event.decision ?? event.entityType}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No recent activity.</p>}</div>;
}

function ProductCard({ product, actions, onAction }: { product: Product; actions: AgentAction[]; onAction: (action: AgentAction) => void }) {
  const addAction = actions.find((item) => item.productId === product.product_id && item.type === 'add_to_cart');
  return <article className="border border-slate-300 bg-white p-4 text-ink"><p className="text-xs font-semibold uppercase tracking-wide text-saffron">{product.category || 'Catalog match'}</p><h3 className="mt-2 font-semibold">{product.name}</h3><p className="mt-1 font-semibold">{product.currency} {product.price.toLocaleString('en-IN')}</p><p className="mt-2 text-sm text-slate-600">{product.description ?? 'No description available.'}</p><p className="mt-3 text-xs text-emerald-700">{product.availability.replace('_', ' ')}</p>{addAction ? <button type="button" className="mt-4 w-full bg-ink px-3 py-2 text-sm font-semibold text-white" onClick={() => onAction(addAction)}>Add to cart</button> : null}</article>;
}
