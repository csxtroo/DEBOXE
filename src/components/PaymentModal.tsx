import React, { useState, useEffect } from 'react';
import { X, Copy, CheckCircle, XCircle, Clock, Smartphone, AlertCircle } from 'lucide-react';
import type { PaymentData } from '../types/payment';
import { amploPayService } from '../services/amploPayService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: PaymentData | null;
  onPaymentUpdate: (status: PaymentData['status']) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  paymentData,
  onPaymentUpdate
}) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos em segundos

  // Escutar atualizações de status via evento customizado
  useEffect(() => {
    const handlePaymentUpdate = (event: CustomEvent) => {
      const { paymentId, status } = event.detail;
      if (paymentData && paymentData.id === paymentId) {
        console.log(`💳 Status atualizado para pagamento ${paymentId}: ${status}`);
        onPaymentUpdate(status);
      }
    };

    window.addEventListener('paymentStatusUpdate', handlePaymentUpdate as EventListener);

    return () => {
      window.removeEventListener('paymentStatusUpdate', handlePaymentUpdate as EventListener);
    };
  }, [paymentData, onPaymentUpdate]);

  // Configurar callback de status e iniciar polling quando o modal abrir
  useEffect(() => {
    if (paymentData && isOpen && paymentData.status === 'pending') {
      amploPayService.onStatusUpdate(paymentData.id, (status) => {
        console.log(`🔄 Callback de status: ${status}`);
        onPaymentUpdate(status as PaymentData['status']);
      });

      // Iniciar polling como backup para webhook
      amploPayService.startPaymentPolling(paymentData.id);
    }
  }, [paymentData, isOpen, onPaymentUpdate]);

  // Timer de expiração
  useEffect(() => {
    if (!isOpen || !paymentData || paymentData.status !== 'pending') return;

    // Calcular tempo restante baseado na data de expiração
    const updateTimer = () => {
      if (paymentData.expiresAt) {
        const now = new Date().getTime();
        const expiresAt = new Date(paymentData.expiresAt).getTime();
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          onPaymentUpdate('expired');
        }
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentData, onPaymentUpdate]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const copyPixCode = async () => {
    if (paymentData?.pixCode) {
      try {
        await navigator.clipboard.writeText(paymentData.pixCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Erro ao copiar código Pix:', error);
        // Fallback para navegadores que não suportam clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = paymentData.pixCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (!isOpen || !paymentData) return null;

  const getStatusIcon = () => {
    switch (paymentData.status) {
      case 'paid':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'failed':
        return <XCircle className="w-12 h-12 text-red-500" />;
      case 'expired':
        return <AlertCircle className="w-12 h-12 text-gray-500" />;
      default:
        return <Clock className="w-8 h-8 text-yellow-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (paymentData.status) {
      case 'paid':
        return {
          title: '🎉 Pagamento Confirmado!',
          message: 'Seu pagamento foi processado com sucesso! Você receberá os ingressos por email em breve.',
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200'
        };
      case 'failed':
        return {
          title: '❌ Pagamento Falhou',
          message: 'Houve um problema com seu pagamento. Por favor, tente novamente.',
          color: 'text-red-600',
          bgColor: 'bg-red-50 border-red-200'
        };
      case 'expired':
        return {
          title: '⏰ Pagamento Expirado',
          message: 'O tempo para pagamento expirou. Gere um novo código Pix para continuar.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 border-gray-200'
        };
      default:
        return {
          title: '⏳ Aguardando Pagamento',
          message: 'Escaneie o QR Code ou copie o código Pix para realizar o pagamento.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200'
        };
    }
  };

  const status = getStatusMessage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              💳 Pagamento Pix
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <div className={`rounded-lg p-4 border ${status.bgColor}`}>
              <h3 className={`text-lg font-semibold ${status.color}`}>
                {status.title}
              </h3>
              <p className="text-gray-600 text-sm mt-2">
                {status.message}
              </p>
            </div>
          </div>

          {paymentData.status === 'pending' && (
            <>
              {/* Timer */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <span className="text-yellow-800 font-medium">
                    Tempo restante: {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              {/* QR Code */}
              {paymentData.qrCodeImage && (
                <div className="text-center mb-6">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                    <img
                      src={paymentData.qrCodeImage}
                      alt="QR Code Pix"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <div className="flex items-center justify-center mt-3 text-sm text-gray-600">
                    <Smartphone className="w-4 h-4 mr-2" />
                    <span>Escaneie com seu app de banco</span>
                  </div>
                </div>
              )}

              {/* Pix Code */}
              {paymentData.pixCode && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ou copie o código Pix:
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={paymentData.pixCode}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-xs font-mono"
                    />
                    <button
                      onClick={copyPixCode}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-r-lg hover:bg-yellow-700 transition-colors flex items-center"
                    >
                      <Copy className="w-4 h-4" />
                      {copied && <span className="ml-1 text-xs">✓</span>}
                    </button>
                  </div>
                </div>
              )}

              {/* Status Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <p className="text-blue-800 text-sm font-medium">
                    💳 Pagamento Real - Amplo Pay
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    Aguardando confirmação do pagamento via Pix
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3">📋 Detalhes do Pedido</h4>
            <div className="space-y-2 text-sm">
              {paymentData.tickets.map((ticket, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-gray-600">
                    {ticket.type} x{ticket.quantity}
                  </span>
                  <span className="font-medium">
                    R$ {ticket.totalPrice.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-yellow-600">
                    R$ {paymentData.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {paymentData.status === 'pending' && (
            <div className="text-center text-sm text-gray-500">
              <p>💳 Faça o pagamento via Pix para confirmar sua compra.</p>
              <p className="mt-2 text-xs text-green-600">
                ⏳ Aguardando confirmação da Amplo Pay...
              </p>
            </div>
          )}

          {paymentData.status === 'paid' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-green-800 font-medium">
                  ✅ Pagamento confirmado com sucesso!
                </p>
                <p className="text-green-600 text-sm mt-1">
                  Você receberá os ingressos por email em breve.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                🎉 Concluir
              </button>
            </div>
          )}

          {(paymentData.status === 'failed' || paymentData.status === 'expired') && (
            <button
              onClick={onClose}
              className="w-full bg-yellow-600 text-white py-3 rounded-lg font-medium hover:bg-yellow-700 transition-colors"
            >
              🔄 Tentar Novamente
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
