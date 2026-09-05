CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text NOT NULL CHECK (objective IN ('UPSELL', 'CROSS_SELL', 'REENGAGE')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campaign_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campaign_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES campaign_runs (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
  attempts integer NOT NULL DEFAULT 0,
  provider_reference text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns (id) ON DELETE CASCADE,
  run_id uuid REFERENCES campaign_runs (id) ON DELETE SET NULL,
  recipient_id uuid REFERENCES users (id) ON DELETE SET NULL,
  product_id uuid REFERENCES products (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_merchant_id_idx ON campaigns (merchant_id);
CREATE INDEX campaigns_status_idx ON campaigns (status);
CREATE INDEX campaign_runs_campaign_id_idx ON campaign_runs (campaign_id);
CREATE INDEX campaign_deliveries_run_id_idx ON campaign_deliveries (run_id);
CREATE INDEX campaign_events_campaign_id_idx ON campaign_events (campaign_id);

CREATE TRIGGER set_campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_campaign_deliveries_updated_at
BEFORE UPDATE ON campaign_deliveries
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
