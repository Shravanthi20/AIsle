CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONSUMED', 'EXPIRED');

CREATE TABLE policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES merchants (id) ON DELETE CASCADE,
  max_purchase_amount numeric(12, 2) NOT NULL DEFAULT 5000,
  approval_required boolean NOT NULL DEFAULT true,
  allowed_actions text[] NOT NULL DEFAULT ARRAY['PURCHASE'],
  blocked_actions text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_purchase_amount >= 0)
);

CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  action text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL,
  cart_snapshot jsonb NOT NULL,
  status approval_status NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz NOT NULL,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders ADD COLUMN approval_id uuid REFERENCES approvals (id) ON DELETE SET NULL;
CREATE INDEX orders_approval_id_idx ON orders (approval_id);

CREATE TRIGGER set_policies_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_approvals_updated_at BEFORE UPDATE ON approvals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX policies_buyer_id_idx ON policies (buyer_id);
CREATE UNIQUE INDEX policies_buyer_scope_idx ON policies (buyer_id, COALESCE(merchant_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX approvals_buyer_id_status_idx ON approvals (buyer_id, status);

INSERT INTO policies (buyer_id)
SELECT id FROM users WHERE role = 'BUYER'
ON CONFLICT DO NOTHING;