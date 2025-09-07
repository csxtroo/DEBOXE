import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { PaymentData, TicketSelection } from '../types/payment';

export interface CreatePaymentRequest {
  amount: number;
  description: string;
  tickets: TicketSelection[];
  customerEmail?: string;
  customerName?: string;
}

export class MockPaymentService {
  private static instance: MockPaymentService;
  private payments = new Map<string, PaymentData>();
  private statusCallbacks = new Map<string, (status: string) => void>();

  constructor() {}

  static getInstance(): MockPaymentService {
    if (!MockPaymentService.instance) {
      MockPaymentService.instance = new MockPaymentService();
    }
    return MockPaymentService.instance;
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentData> {
    console.log('🧪 Usando serviço de pagamento MOCK para desenvolvimento');
    
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 1000));

    const paymentId = uuidv4();
    const pixCode = this.generateMockPixCode();
    const qrCodeImage = await this.generateQRCodeImage(pixCode);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutos

    const paymentData: PaymentData = {
      id: paymentId,
      amount: request.amount,
      description: request.description,
      tickets: request.tickets,
      status: 'pending',
      pixCode,
      qrCodeImage,
      createdAt: new Date(),
      expiresAt,
    };

    this.payments.set(paymentId, paymentData);
    
    // Simular aprovação automática após 10 segundos (para demonstração)
    setTimeout(() => {
      this.updatePaymentStatus(paymentId, 'paid');
    }, 10000);

    console.log('✅ Pagamento MOCK criado:', paymentData);
    return paymentData;
  }

  async createPixPayment(amount: number, description: string, tickets: TicketSelection[]): Promise<PaymentData> {
    return this.createPayment({
      amount,
      description,
      tickets
    });
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentData | null> {
    return this.payments.get(paymentId) || null;
  }

  onStatusUpdate(paymentId: string, callback: (status: string) => void): void {
    this.statusCallbacks.set(paymentId, callback);
  }

  updatePaymentStatus(paymentId: string, status: string): void {
    const callback = this.statusCallbacks.get(paymentId);
    if (callback) {
      callback(status);
    }

    // Atualizar payment local se existir
    const payment = this.payments.get(paymentId);
    if (payment) {
      payment.status = status as PaymentData['status'];
      this.payments.set(paymentId, payment);
    }

    // Disparar evento customizado para o modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('paymentStatusUpdate', {
        detail: { paymentId, status }
      }));
    }

    console.log(`🔄 Status do pagamento MOCK ${paymentId} atualizado para: ${status}`);
  }

  private generateMockPixCode(): string {
    // Gerar um código Pix mock realista
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '00020126580014BR.GOV.BCB.PIX0136';
    
    // Adicionar UUID mock
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    result += '5204000053039865802BR5925DEBOXE ECLIPSE PAGAMENTO6009SAO PAULO62070503***6304';
    
    // Adicionar checksum mock
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * 10));
    }
    
    return result;
  }

  private async generateQRCodeImage(pixCode: string): Promise<string> {
    try {
      return await QRCode.toDataURL(pixCode, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw new Error('Erro ao gerar QR Code');
    }
  }

  startPaymentPolling(paymentId: string, intervalMs: number = 5000): void {
    // Para o mock, não precisamos fazer polling real
    console.log(`🔄 Iniciando polling MOCK para pagamento ${paymentId}`);
  }

  processWebhook(paymentId: string, status: string, eventData: any): void {
    console.log(`💳 Webhook MOCK recebido para pagamento ${paymentId}: ${status}`);
    this.updatePaymentStatus(paymentId, status);
  }
}