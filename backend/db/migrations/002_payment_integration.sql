ALTER TABLE orders
  ADD COLUMN razorpay_order_id text UNIQUE,
  ADD COLUMN razorpay_payment_id text UNIQUE,
  ADD COLUMN razorpay_signature text;