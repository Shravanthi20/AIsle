import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiPost } from '../services/apiClient';
import { Button, Card, ErrorState, LoadingState, StatusBadge } from '../components/ui';
interface Order { id: string; status: string; paymentStatus: string; totalAmount: string; currency: string; razorpayPaymentId?: string | null; razorpayOrderId?: string | null; items: { productId: string; name: string; quantity: number; unitPrice: string; subtotal: string }[]; }
export function OrderConfirmationPage() {
	const { token } = useAuth();
	const { id } = useParams();
	const location = useLocation();
	const stateOrder = (location.state as { order?: Order } | null)?.order;
	const [order, setOrder] = useState<Order | undefined>(stateOrder);
	const [error, setError] = useState('');
	const [paying, setPaying] = useState(false);
	async function retryPayment() {
		if (!token || !order || !window.Razorpay) { setError('Razorpay Checkout is unavailable'); return; }
		setPaying(true); setError('');
		try {
			const payment = await apiPost<{ keyId: string; razorpayOrderId: string; amount: number | string; currency: string; orderId: string }>(`/payments/${order.id}/retry`, undefined, token);
			const razorpay = new window.Razorpay({ key: payment.keyId, amount: payment.amount, currency: payment.currency, name: 'AIsle', order_id: payment.razorpayOrderId, modal: { ondismiss: () => setPaying(false) }, handler: (response) => { void apiPost<{ order: Order }>('/payments/verify', { orderId: order.id, razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature }, token).then((result) => setOrder(result.order)).catch((reason) => setError(reason instanceof Error ? reason.message : 'Payment verification failed')).finally(() => setPaying(false)); } }); razorpay.on('payment.failed', (event) => { void apiPost<{ order: Order }>('/payments/failure', { orderId: order.id, razorpayOrderId: payment.razorpayOrderId }, token).then((result) => { setOrder(result.order); setError(event.error.description ?? 'Payment failed'); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Payment failed')).finally(() => setPaying(false)); }); razorpay.open();
		} catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not start payment'); setPaying(false); }
	}
	useEffect(() => {
		if (!order && token && id) void apiGet<{ order: Order }>(`/orders/${id}`, token).then((response) => setOrder(response.order)).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load order'));
	}, [id, order, token]);
	if (!order) return error ? <ErrorState message={error} /> : <LoadingState label="Loading order..." />;
	return <section className="grid max-w-2xl gap-5"><p className="eyebrow text-saffron">{stateOrder && order.paymentStatus === 'PAID' ? 'Payment successful' : 'Order details'}</p><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-serif text-4xl font-medium">{stateOrder && order.paymentStatus === 'PAID' ? `Order ${order.id} confirmed` : `Order ${order.id}`}</h1><StatusBadge status={order.paymentStatus} /></div>{error ? <div className="error-state state-box"><strong>Payment needs attention</strong><span>{error}</span></div> : null}<Card className="grid gap-3 p-6"><p className="text-sm text-slate-500">Order ID <strong className="text-ink">{order.id}</strong></p><p className="text-sm">Order status <StatusBadge status={order.status} /></p>{order.razorpayPaymentId ? <p className="text-sm">Payment ID <strong>{order.razorpayPaymentId}</strong></p> : null}<div className="mt-3 grid gap-2 border-t pt-4">{order.items.map((item) => <p className="flex justify-between" key={item.productId}><span>{item.name} × {item.quantity}</span><span>{order.currency} {Number(item.subtotal).toLocaleString('en-IN')}</span></p>)}</div><p className="flex justify-between border-t pt-4 text-lg"><strong>Total</strong><strong>{order.currency} {Number(order.totalAmount).toLocaleString('en-IN')}</strong></p>{order.paymentStatus !== 'PAID' && order.status === 'PENDING' ? <Button type="button" disabled={paying} onClick={() => void retryPayment()}>{paying ? 'Opening payment...' : 'Retry payment'}</Button> : null}</Card><Link className="font-semibold text-mint" to="/buyer/orders">View order history</Link></section>;
}