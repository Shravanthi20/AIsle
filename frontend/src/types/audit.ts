export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorType: string;
  decision: string | null;
  explanation: string | null;
  createdAt: string;
}