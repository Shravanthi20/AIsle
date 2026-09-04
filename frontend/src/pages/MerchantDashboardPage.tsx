import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../services/apiClient';
import type { AuditEvent } from '../types/audit';
import type { MerchantAnalytics } from '../types/analytics';

type Status = 'ACTIVE' | 'INACTIVE';
interface Attribute {
  id?: string;
  key: string;
  value: string;
}
interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: string;
  currency: string;
  stock: number;
  imageUrl: string | null;
  status: Status;
  attributes: Attribute[];
}
interface ProductInsight {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  orderCount: number;
}
interface MerchantAgentResponse {
  answer: string;
  relevantProducts: Product[];
  relevantData: {
    totalOrders: number;
    paidOrders: number;
    revenue: number;
    currency: string | null;
    topSellingProducts: ProductInsight[];
    lowStockProducts: Product[];
    underperformingProducts: ProductInsight[];
  };
  suggestedActions: string[];
}
interface FormState {
  name: string;
  description: string;
  category: string;
  price: string;
  currency: string;
  stock: string;
  imageUrl: string;
  status: Status;
  attributes: Attribute[];
}
const blank: FormState = {
  name: '',
  description: '',
  category: '',
  price: '',
  currency: 'INR',
  stock: '0',
  imageUrl: '',
  status: 'ACTIVE',
  attributes: [{ key: '', value: '' }],
};

function toForm(product: Product): FormState {
  return {
    name: product.name,
    description: product.description ?? '',
    category: product.category,
    price: product.price,
    currency: product.currency,
    stock: String(product.stock),
    imageUrl: product.imageUrl ?? '',
    status: product.status,
    attributes: product.attributes.length
      ? product.attributes.map(({ key, value }) => ({ key, value }))
      : [{ key: '', value: '' }],
  };
}
function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="border border-slate-300 px-3 py-2"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        min={min}
        step={step}
      />
    </label>
  );
}
function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function MerchantDashboardPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistant, setAssistant] = useState<MerchantAgentResponse | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState('');
  const [activity, setActivity] = useState<AuditEvent[]>([]);
  const [analytics, setAnalytics] = useState<MerchantAnalytics | null>(null);
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [result, auditResult, analyticsResult] = await Promise.all([
        apiGet<{ products: Product[] }>('/products', token),
        apiGet<{ events: AuditEvent[] }>('/audit?limit=8', token),
        apiGet<{ analytics: MerchantAnalytics }>('/analytics/merchant', token),
      ]);
      setProducts(result.products);
      setActivity(auditResult.events);
      setAnalytics(analyticsResult.analytics);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load products');
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  const active = useMemo(
    () => products.filter((product) => product.status === 'ACTIVE').length,
    [products],
  );
  const lowStock = useMemo(
    () => products.filter((product) => product.status === 'ACTIVE' && product.stock < 5).length,
    [products],
  );
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function reset() {
    setEditingId(null);
    setForm({ ...blank, attributes: [{ key: '', value: '' }] });
  }
  function edit(product: Product) {
    setEditingId(product.id);
    setForm(toForm(product));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function setAttribute(index: number, field: 'key' | 'value', value: string) {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    setNotice('');
    const attributes = Object.fromEntries(
      form.attributes
        .filter((item) => item.key.trim() && item.value.trim())
        .map((item) => [item.key.trim(), item.value.trim()]),
    );
    const body = { ...form, price: Number(form.price), stock: Number(form.stock), attributes };
    try {
      const result = editingId
        ? await apiPut<{ product: Product }>(`/products/${editingId}`, body, token)
        : await apiPost<{ product: Product }>('/products', body, token);
      setProducts((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? result.product : item))
          : [result.product, ...current],
      );
      setNotice(editingId ? 'Product updated.' : 'Product added.');
      reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save product');
    } finally {
      setSaving(false);
    }
  }
  async function deactivate(product: Product) {
    if (!token || !window.confirm(`Deactivate ${product.name}?`)) return;
    try {
      const result = await apiDelete<{ product: Product }>(`/products/${product.id}`, token);
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? result.product : item)),
      );
      setNotice('Product deactivated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not deactivate product');
    }
  }
  async function stock(product: Product) {
    if (!token) return;
    const value = window.prompt(`Stock for ${product.name}`, String(product.stock));
    if (value === null) return;
    if (!/^\d+$/.test(value)) {
      setError('Stock must be a non-negative whole number');
      return;
    }
    try {
      const result = await apiPatch<{ product: Product }>(
        `/products/${product.id}/stock`,
        { stock: Number(value) },
        token,
      );
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? result.product : item)),
      );
      setNotice('Stock updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update stock');
    }
  }
  async function askAssistant(event: FormEvent) {
    event.preventDefault();
    if (!token || !assistantQuestion.trim()) return;
    setAssistantLoading(true);
    setAssistantError('');
    try {
      const result = await apiPost<MerchantAgentResponse>(
        '/agent/merchant/chat',
        { message: assistantQuestion },
        token,
      );
      setAssistant(result);
    } catch (reason) {
      setAssistantError(reason instanceof Error ? reason.message : 'Could not reach the assistant');
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <section className="grid gap-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-mint">
          Merchant Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Product catalog</h1>
        <p className="mt-2 text-slate-600">
          Manage the products your store makes available to buyers.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total products" value={products.length} />
        <Metric label="Active" value={active} />
        <Metric label="Low stock" value={lowStock} />
      </div>
      {analytics ? <section className="grid gap-5 border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label={`Revenue${analytics.currency ? ` (${analytics.currency})` : ''}`} value={analytics.revenue} />
          <Metric label="Confirmed / completed orders" value={analytics.confirmedCompletedOrders} />
          <Metric label={`Average order value${analytics.currency ? ` (${analytics.currency})` : ''}`} value={analytics.averageOrderValue} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div><h2 className="text-lg font-semibold">Top products</h2>{analytics.topSellingProducts.length ? <ul className="mt-3 grid gap-2 text-sm text-slate-600">{analytics.topSellingProducts.map((item) => <li className="flex justify-between border-b border-slate-100 pb-2" key={item.productId}><span>{item.name}</span><strong>{item.quantitySold} sold</strong></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No confirmed sales yet.</p>}</div>
          <div><h2 className="text-lg font-semibold">Low stock products</h2>{analytics.lowStockProducts.length ? <ul className="mt-3 grid gap-2 text-sm text-slate-600">{analytics.lowStockProducts.map((item) => <li className="flex justify-between border-b border-slate-100 pb-2" key={item.productId}><span>{item.name}</span><strong>{item.stock} left</strong></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No active products are low on stock.</p>}</div>
        </div>
        {analytics.trends.length ? <div><h2 className="text-lg font-semibold">Sales trend</h2><p className="mt-2 text-sm text-slate-600">{analytics.trends.map((point) => `${point.date}: ${point.orders} orders, ${analytics.currency ?? ''} ${point.revenue}`).join('  |  ')}</p></div> : null}
      </section> : null}
      <section className="grid gap-5 border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-mint">Merchant AI Assistant</p>
          <h2 className="mt-1 text-xl font-semibold">Make a growth decision</h2>
          <p className="mt-1 text-sm text-slate-600">Ask about products, sales, stock, or ways to improve your store.</p>
        </div>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={askAssistant}>
          <input
            className="min-w-0 flex-1 border border-slate-300 px-3 py-2"
            value={assistantQuestion}
            onChange={(event) => setAssistantQuestion(event.target.value)}
            placeholder="Which products should I promote?"
            aria-label="Question for merchant AI assistant"
          />
          <button disabled={assistantLoading || !assistantQuestion.trim()} className="bg-ink px-5 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
            {assistantLoading ? 'Analyzing...' : 'Ask assistant'}
          </button>
        </form>
        {assistantError ? <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{assistantError}</p> : null}
        {assistant ? (
          <div className="grid gap-5 border-t border-slate-200 pt-5">
            <p className="text-slate-700">{assistant.answer}</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <Metric label="Orders" value={assistant.relevantData.totalOrders} />
              <Metric label="Paid orders" value={assistant.relevantData.paidOrders} />
              <Metric label={`Revenue${assistant.relevantData.currency ? ` (${assistant.relevantData.currency})` : ''}`} value={assistant.relevantData.revenue} />
              <Metric label="Low stock" value={assistant.relevantData.lowStockProducts.length} />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="font-semibold">Relevant products</h3>
                {assistant.relevantProducts.length ? (
                  <ul className="mt-2 grid gap-2 text-sm text-slate-600">
                    {assistant.relevantProducts.map((product) => <li className="border-b border-slate-100 py-2" key={product.id}>{product.name} <span className="text-slate-400">({product.currency} {product.price}, stock {product.stock})</span></li>)}
                  </ul>
                ) : <p className="mt-2 text-sm text-slate-500">No matching products in your catalog.</p>}
              </div>
              <div>
                <h3 className="font-semibold">Suggested actions</h3>
                <ul className="mt-2 grid gap-2 text-sm text-slate-600">
                  {assistant.suggestedActions.map((action) => <li className="border-b border-slate-100 py-2" key={action}>{action}</li>)}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </section>
      <section className="border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Recent activity</h2>
        {activity.length ? <div className="mt-4 grid gap-3">{activity.map((event) => <div className="border-b border-slate-100 pb-2 text-sm" key={event.id}><p className="font-medium">{event.action.replace(/_/g, ' ')}</p><p className="text-slate-500">{event.explanation ?? event.decision ?? event.entityType}</p></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No recent activity.</p>}
      </section>
      {error ? (
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}
      <form onSubmit={save} className="grid gap-4 border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex justify-between">
          <h2 className="text-xl font-semibold">{editingId ? 'Edit product' : 'Add product'}</h2>
          {editingId ? (
            <button type="button" onClick={reset} className="text-sm font-semibold text-slate-500">
              Cancel
            </button>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Name"
            value={form.name}
            onChange={(value) => setField('name', value)}
            required
          />
          <Field
            label="Category"
            value={form.category}
            onChange={(value) => setField('category', value)}
            required
          />
          <Field
            label="Price"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(value) => setField('price', value)}
            required
          />
          <Field
            label="Currency"
            value={form.currency}
            onChange={(value) => setField('currency', value)}
            required
          />
          <Field
            label="Stock"
            type="number"
            min="0"
            step="1"
            value={form.stock}
            onChange={(value) => setField('stock', value)}
            required
          />
          <Field
            label="Image URL"
            value={form.imageUrl}
            onChange={(value) => setField('imageUrl', value)}
          />
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Status
            <select
              className="border border-slate-300 px-3 py-2"
              value={form.status}
              onChange={(event) => setField('status', event.target.value as Status)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Description
          <textarea
            className="min-h-20 border border-slate-300 px-3 py-2"
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
          />
        </label>
        <div className="grid gap-2">
          <div className="flex justify-between">
            <h3 className="text-sm font-semibold">Attributes</h3>
            <button
              type="button"
              className="text-sm font-semibold text-mint"
              onClick={() => setField('attributes', [...form.attributes, { key: '', value: '' }])}
            >
              + Add attribute
            </button>
          </div>
          {form.attributes.map((item, index) => (
            <div className="grid gap-2 sm:grid-cols-2" key={index}>
              <input
                className="border border-slate-300 px-3 py-2"
                placeholder="Key e.g. brand"
                value={item.key}
                onChange={(event) => setAttribute(index, 'key', event.target.value)}
              />
              <input
                className="border border-slate-300 px-3 py-2"
                placeholder="Value e.g. Nike"
                value={item.value}
                onChange={(event) => setAttribute(index, 'value', event.target.value)}
              />
            </div>
          ))}
        </div>
        <button
          disabled={saving}
          className="w-fit bg-ink px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-400"
        >
          {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add product'}
        </button>
      </form>
      <div className="border border-slate-200 bg-white shadow-sm">
        <div className="flex justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold">Your products</h2>
          <button
            type="button"
            className="text-sm font-semibold text-mint"
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="px-6 py-8 text-sm text-slate-500">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-500">No products yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr className="border-t border-slate-100" key={product.id}>
                    <td className="px-6 py-4 font-semibold">{product.name}</td>
                    <td className="px-4 py-4 text-slate-600">{product.category}</td>
                    <td className="px-4 py-4">
                      {product.currency} {product.price}
                    </td>
                    <td className="px-4 py-4">{product.stock}</td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          product.status === 'ACTIVE' ? 'text-emerald-700' : 'text-slate-500'
                        }
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="font-semibold text-mint"
                          onClick={() => edit(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="font-semibold text-slate-700"
                          onClick={() => void stock(product)}
                        >
                          Stock
                        </button>
                        {product.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            className="font-semibold text-red-600"
                            onClick={() => void deactivate(product)}
                          >
                            Deactivate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
