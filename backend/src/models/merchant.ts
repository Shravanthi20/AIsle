export interface Merchant {
  id: string;
  userId: string;
  storeName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
