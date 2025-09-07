import QRCode from 'qrcode';
import { PaymentData, TicketSelection } from '../types/payment';

export interface CreatePaymentRequest {
  amount: number;
  description: string;
  tickets: TicketSelection[];
  customerEmail?: string;
  customerName?: string;
}

export interface AmploPayResponse {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  pix_code: string;
  qr_code_url?: string;
  expires_at: string;
  created_at: string;
}

export class AmploPayService {
  private static instance: AmploPayService;
  private apiKey: string;
  private baseUrl: string;
  private payments = new Map<string, PaymentData>();
  private statusCallbacks = new Map<string, (status: string) => void>();
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.apiKey = import.meta.env.VITE_AMPLO_PAY_API_KEY || '';
    this.baseUrl = import.meta.env.VITE_AMPLO_PAY_BASE_URL || 'https://sandbox.amplopay.com.br/v1';
  }

  static getInstance(): AmploPayService {
    if (!AmploPayService.instance) {
      AmploPayService.instance = new AmploPayService();
    }
    return AmploPayService.instance;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(url: string, options: RequestInit, retries = this.maxRetries): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1}/${retries + 1} para ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          mode: 'cors',
          credentials: 'omit',
        });
        
        clearTimeout(timeoutId);
        return response;
        
      } catch (error) {
        console.error(`❌ Tentativa ${i + 1} falhou:`, error);
        
        if (i === retries) {
          // Última tentativa falhou
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new Error('Timeout: A conexão demorou muito para responder. Verifique sua internet.');
            }
            if (error.message.includes('CORS') || error.message.includes('cors')) {
              throw new Error('Erro de CORS: Configure https://localhost:5173 nas origens permitidas no painel da Amplo Pay.');
            }
            if (error.message.includes('fetch')) {
              throw new Error('Erro de conexão: Não foi possível conectar com o servidor de pagamentos.');
            }
          }
          throw error;
        }
        
        // Aguardar antes da próxima tentativa
        await this.delay(this.retryDelay * (i + 1));
      }
    }
    
    throw new Error('Todas as tentativas falharam');
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentData> {
    if (!this.apiKey) {
      throw new Error('API Key da Amplo Pay não configurada. Configure VITE_AMPLO_PAY_API_KEY no arquivo .env');
    }

    try {
      console.log('💳 Criando pagamento real na Amplo Pay...', {
        amount: request.amount,
        description: request.description,
        apiUrl: `${this.baseUrl}/payments`,
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey.length,
        baseUrl: this.baseUrl
      });

      const requestBody = {
        amount: request.amount,
        description: request.description,
        payment_method: 'pix',
        expires_in: 900, // 15 minutos
        callback_url: `${window.location.origin}/webhook/amplo-pay`,
        ...(request.customerEmail && {
          customer: {
            email: request.customerEmail,
            name: request.customerName,
          }
        }),
        metadata: {
          tickets: JSON.stringify(request.tickets),
          source: 'deboxe-eclipse',
        },
      };

      console.log('📤 Enviando dados para Amplo Pay:', requestBody);

      const response = await this.fetchWithRetry(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'DEBOXE-ECLIPSE/1.0',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Resposta da API:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url
      });

      if (!response.ok) {
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          console.error('❌ Dados do erro:', errorData);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          console.error('❌ Erro ao ler resposta de erro:', e);
        }
        
        console.error('❌ Erro da API Amplo Pay:', errorMessage);
        
        // Mensagens de erro mais específicas
        if (response.status === 401) {
          throw new Error('API Key inválida. Verifique sua configuração no arquivo .env');
        } else if (response.status === 403) {
          throw new Error('Acesso negado. Verifique as permissões da sua API Key');
        } else if (response.status === 0) {
          throw new Error('Erro de CORS: Configure https://localhost:5173 nas origens permitidas no painel da Amplo Pay');
        } else if (response.status >= 500) {
          throw new Error('Erro interno da Amplo Pay. Tente novamente em alguns minutos');
        } else {
          throw new Error(`Erro ao processar pagamento: ${errorMessage}`);
        }
      }

      const amploPayResponse: AmploPayResponse = await response.json();
      console.log('✅ Pagamento real criado com sucesso:', amploPayResponse);
      
      // Gerar QR Code se não fornecido pela API
      let qrCodeImage = amploPayResponse.qr_code_url;
      if (!qrCodeImage && amploPayResponse.pix_code) {
        qrCodeImage = await this.generateQRCodeImage(amploPayResponse.pix_code);
      }

      const paymentData: PaymentData = {
        id: amploPayResponse.id,
        amount: amploPayResponse.amount,
        description: request.description,
        tickets: request.tickets,
        status: amploPayResponse.status,
        pixCode: amploPayResponse.pix_code,
        qrCodeImage,
        createdAt: new Date(amploPayResponse.created_at),
        expiresAt: new Date(amploPayResponse.expires_at),
      };

      this.payments.set(paymentData.id, paymentData);
      return paymentData;

    } catch (error) {
      console.error('❌ Erro ao criar pagamento:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('❌ Erro interno do servidor. Tente novamente em alguns instantes.');
    }
  }

  async createPixPayment(amount: number, description: string, tickets: TicketSelection[]): Promise<PaymentData> {
    return this.createPayment({
      amount,
      description,
      tickets
    });
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentData | null> {
    if (!this.apiKey) {
      throw new Error('API Key da Amplo Pay não configurada');
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Erro ao consultar pagamento: ${response.status}`);
        return this.payments.get(paymentId) || null;
      }

      const amploPayResponse: AmploPayResponse = await response.json();
      
      const existingPayment = this.payments.get(paymentId);
      if (existingPayment) {
        existingPayment.status = amploPayResponse.status;
        this.payments.set(paymentId, existingPayment);
        return existingPayment;
      }

      return null;
    } catch (error) {
      console.error('Erro ao consultar status do pagamento:', error);
      return this.payments.get(paymentId) || null;
    }
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

  // Método para processar webhook (chamado pelo webhook handler)
  processWebhook(paymentId: string, status: string, eventData: any): void {
    console.log(`💳 Webhook recebido para pagamento ${paymentId}: ${status}`);
    this.updatePaymentStatus(paymentId, status);
  }

  // Polling para verificar status do pagamento (backup para webhook)
  startPaymentPolling(paymentId: string, intervalMs: number = 5000): void {
    const pollInterval = setInterval(async () => {
      try {
        const payment = await this.getPaymentStatus(paymentId);
        if (payment && (payment.status === 'paid' || payment.status === 'failed' || payment.status === 'expired')) {
          clearInterval(pollInterval);
          this.updatePaymentStatus(paymentId, payment.status);
        }
      } catch (error) {
        console.error('Erro no polling de pagamento:', error);
      }
    }, intervalMs);

    // Limpar polling após 20 minutos
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 20 * 60 * 1000);
  }
}

export const amploPayService = AmploPayService.getInstance();