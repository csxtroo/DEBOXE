export interface PaymentData {
  id: string;
  amount: number;
  description: string;
  tickets: TicketSelection[];
  status: 'pending' | 'paid' | 'failed' | 'expired';
  pixCode?: string;
  qrCodeImage?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface TicketSelection {
  type: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface AmploPayResponse {
  success: boolean;
  data?: {
    id: string;
    pix_code: string;
    qr_code_image: string;
    amount: number;
    status: string;
    expires_at: string;
  };
  error?: string;
}