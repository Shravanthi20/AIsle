CREATE TYPE audit_actor_type AS ENUM ('USER', 'BUYER_AGENT', 'MERCHANT_AGENT', 'SYSTEM');

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES users (id) ON DELETE SET NULL,
  merchant_id uuid REFERENCES merchants (id) ON DELETE SET NULL,
  actor_type audit_actor_type NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision text,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id);
CREATE INDEX audit_logs_buyer_id_idx ON audit_logs (buyer_id);
CREATE INDEX audit_logs_merchant_id_idx ON audit_logs (merchant_id);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_action_idx ON audit_logs (action);