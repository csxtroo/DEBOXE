import React, { useState } from 'react';
import { Ticket, MapPin, Clock, Users, Star, Crown, Camera, Plus, Minus, ShoppingCart } from 'lucide-react';
import { PaymentModal } from './components/PaymentModal';
import { AmploPayService } from './services/amploPayService';
import type { PaymentData, TicketSelection } from './types/payment';

interface TicketCount {
  vipMeia: number;
  vipInteira: number;
  backstageMeia: number;
  backstageInteira: number;
  influencersMeia: number;
  influencersInteira: number;
}

const ticketPrices = {
  vipMeia: 1,
  vipInteira: 130,
  backstageMeia: 110,
  backstageInteira: 210,
  influencersMeia: 150,
  influencersInteira: 320,
};

function App() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [ticketCounts, setTicketCounts] = useState<TicketCount>({
    vipMeia: 0,
    vipInteira: 0,
    backstageMeia: 0,
    backstageInteira: 0,
    influencersMeia: 0,
    influencersInteira: 0,
  });
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    paymentData: PaymentData | null;
  }>({
    isOpen: false,
    paymentData: null
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const updateTicketCount = (ticketType: keyof TicketCount, increment: boolean) => {
    setTicketCounts(prev => ({
      ...prev,
      [ticketType]: Math.max(0, prev[ticketType] + (increment ? 1 : -1))
    }));
  };

  const getTotalTickets = () => {
    return Object.values(ticketCounts).reduce((sum, count) => sum + count, 0);
  };

  const getTotalValue = () => {
    return Object.entries(ticketCounts).reduce((total, [ticketType, count]) => {
      return total + (count * ticketPrices[ticketType as keyof TicketCount]);
    }, 0);
  };

  const getTicketSelections = (): TicketSelection[] => {
    const selections: TicketSelection[] = [];
    const ticketNames = {
      vipMeia: 'ÁREA VIP - MEIA/SOLIDÁRIA',
      vipInteira: 'ÁREA VIP - INTEIRA',
      backstageMeia: 'BACKSTAGE DEBOXE - MEIA/SOLIDÁRIA',
      backstageInteira: 'BACKSTAGE DEBOXE - INTEIRA',
      influencersMeia: 'ÁREA INFLUENCERS - MEIA/SOLIDÁRIA',
      influencersInteira: 'ÁREA INFLUENCERS - INTEIRA'
    };

    Object.entries(ticketCounts).forEach(([ticketType, count]) => {
      if (count > 0) {
        const type = ticketType as keyof TicketCount;
        const unitPrice = ticketPrices[type];
        selections.push({
          type: ticketNames[type],
          quantity: count,
          unitPrice,
          totalPrice: count * unitPrice
        });
      }
    });

    return selections;
  };

  const handleAdvance = async () => {
    if (getTotalTickets() > 0) {
      setIsProcessingPayment(true);
      
      try {
        console.log('💳 Iniciando processo de pagamento real...');
        
        const paymentService = AmploPayService.getInstance();
        const totalAmount = getTotalValue();
        const ticketSelections = getTicketSelections();
        const description = `DEBOXE • ECLIPSE - ${getTotalTickets()} ingresso(s)`;

        console.log('💰 Dados do pagamento real:', {
          totalAmount,
          description,
          ticketCount: getTotalTickets()
        });

        const paymentData = await paymentService.createPixPayment(
          totalAmount,
          description,
          ticketSelections
        );

        console.log('✅ Pagamento real criado com sucesso:', paymentData);

        setPaymentModal({
          isOpen: true,
          paymentData
        });
      } catch (error) {
        console.error('❌ Erro ao processar pagamento real:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        
        // Mensagem de erro mais detalhada
        let helpMessage = '';
        if (errorMessage.includes('API Key')) {
          helpMessage = '\n\n🔧 Solução:\n1. Acesse https://amplopay.com.br\n2. Crie uma conta\n3. Obtenha sua API Key\n4. Configure no arquivo .env';
        } else if (errorMessage.includes('CORS')) {
          helpMessage = '\n\n🔧 Solução:\n1. Acesse o painel da Amplo Pay\n2. Vá em Configurações > API\n3. Adicione https://localhost:5173 nas origens permitidas\n4. Para produção, adicione seu domínio real';
        } else if (errorMessage.includes('conexão')) {
          helpMessage = '\n\n🔧 Solução:\n1. Verifique sua conexão com a internet\n2. Tente novamente em alguns segundos';
        } else if (errorMessage.includes('interno')) {
          helpMessage = '\n\n🔧 Solução:\n1. Aguarde alguns minutos\n2. Tente novamente\n3. Se persistir, contate o suporte';
        }
        
        alert(`❌ Erro no pagamento:\n\n${errorMessage}${helpMessage}`);
      } finally {
        setIsProcessingPayment(false);
      }
    }
  };

  const handlePaymentUpdate = (status: PaymentData['status']) => {
    if (paymentModal.paymentData) {
      setPaymentModal(prev => ({
        ...prev,
        paymentData: prev.paymentData ? { ...prev.paymentData, status } : null
      }));
    }
  };

  const closePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      paymentData: null
    });
    
    // Se o pagamento foi aprovado, limpar o carrinho
    if (paymentModal.paymentData?.status === 'paid') {
      setTicketCounts({
        vipMeia: 0,
        vipInteira: 0,
        backstageMeia: 0,
        backstageInteira: 0,
        influencersMeia: 0,
        influencersInteira: 0,
      });
    }
  };

  const TicketOption = ({ 
    title, 
    ticketType, 
    count 
  }: { 
    title: string; 
    ticketType: keyof TicketCount; 
    count: number;
  }) => (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h5 className="font-medium text-black text-sm">{title}</h5>
          <p className="text-yellow-600 font-semibold text-sm mt-1">
            R$ {ticketPrices[ticketType].toFixed(2)}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => updateTicketCount(ticketType, false)}
            disabled={count === 0}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-yellow-600 hover:bg-yellow-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-medium">{count}</span>
          <button
            onClick={() => updateTicketCount(ticketType, true)}
            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-yellow-600 hover:bg-yellow-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      {count > 0 && (
        <div className="mt-2 text-right">
          <span className="text-sm text-gray-600">Subtotal: R$ {(count * ticketPrices[ticketType]).toFixed(2)}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Banner Image */}
      <div className="w-full">
        <img 
          src="https://static-meubilhete.s3.dualstack.us-east-1.amazonaws.com/event/1c03df0e-3ed5-4a87-848b-67f729d760a9-imageWeb.jpg?1748873696005"
          alt="DEBOXE • ECLIPSE Banner"
          className="w-full h-64 md:h-80 lg:h-96 object-cover"
        />
      </div>

      {/* Title Section */}
      <div className="bg-black py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-center tracking-wider text-white">
            DEBOXE <span className="text-yellow-600">•</span> ECLIPSE
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side - Event Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6 text-yellow-600">Sobre o evento</h2>
              <h3 className="text-xl font-semibold mb-4">DEBOXE • ECLIPSE</h3>
              <p className="text-gray-700 leading-relaxed mb-6">
                O universo da música eletrônica se encontra com a energia do DEBOXE na edição ECLIPSE. 
                Uma experiência imersiva, com estrutura de alto nível, som, luz e efeitos que vão transformar sua noite.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3 text-yellow-600">Atrações confirmadas:</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Cat Dealers</li>
                <li>• Visage</li>
                <li>• E muito mais</li>
              </ul>
            </div>

            <div className="flex items-center space-x-6 text-gray-700">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span>13 de setembro • 20h</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-yellow-600" />
                <span>Estância Deboxe</span>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3 text-yellow-600">Setores disponíveis:</h4>
              <div className="space-y-3 text-gray-700">
                <div>
                  <strong className="text-black">Área VIP:</strong> Conforto, visão privilegiada e benefícios exclusivos.
                </div>
                <div>
                  <strong className="text-black">Backstage Deboxe:</strong> A experiência mais premium, próxima dos artistas e do palco.
                </div>
                <div>
                  <strong className="text-black">Área Influencers:</strong> Espaço reservado para criadores de conteúdo, com ativações e experiências diferenciadas.
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-gray-700">
              <Users className="w-5 h-5 text-yellow-600" />
              <span><strong className="text-black">Faixa etária:</strong> Evento exclusivo para maiores de 18 anos.</span>
            </div>

            {/* Location Section */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-yellow-600">Localização</h4>
              <div className="w-full rounded-lg overflow-hidden shadow-md border border-gray-200">
                <iframe 
                  allowFullScreen 
                  frameBorder="0" 
                  height="300" 
                  width="100%" 
                  style={{border: 0, borderRadius: '8px'}} 
                  src="https://maps.google.com/maps?q=ARENA%20DEBOXE%20-%20APARECIDA%20DE%20GOI%C3%82NIA&z=15&ie=UTF8&iwloc=&output=embed"
                  title="Localização do evento DEBOXE • ECLIPSE"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Arena Deboxe - Aparecida de Goiânia
              </p>
            </div>

            <p className="text-black font-medium text-lg">
              Garanta seu ingresso e viva uma noite única no DEBOXE • ECLIPSE
            </p>
          </div>

          {/* Right Side - Ticket Buttons */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-2xl border border-gray-300">
              <h3 className="text-2xl font-bold mb-6 text-center text-yellow-600">Ingressos Disponíveis</h3>
              
              <div className="space-y-4">
                {/* VIP Ticket */}
                <div className="border border-gray-300 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => toggleSection('vip')}
                    className="w-full group relative overflow-hidden bg-transparent border-2 border-black rounded-xl p-6 transition-all duration-300 hover:border-yellow-600 hover:bg-yellow-600/5 hover:shadow-lg hover:shadow-yellow-600/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Star className="w-6 h-6 text-yellow-600 group-hover:text-yellow-500 transition-colors" />
                        <div className="text-left">
                          <h4 className="text-lg font-semibold group-hover:text-yellow-600 transition-colors">Área VIP</h4>
                          <p className="text-sm text-gray-600">Conforto e visão privilegiada</p>
                        </div>
                      </div>
                      <Ticket className="w-6 h-6 text-black group-hover:text-yellow-600 transition-colors" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/0 to-yellow-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                  
                  {expandedSection === 'vip' && (
                    <div className="p-6 bg-white border-t border-gray-200 space-y-4">
                      <TicketOption 
                        title="ÁREA VIP - MEIA/SOLIDÁRIA - Meia Solidária - Unissex 4º Lote"
                        ticketType="vipMeia"
                        count={ticketCounts.vipMeia}
                      />
                      <TicketOption 
                        title="ÁREA VIP - INTEIRA 4º Lote"
                        ticketType="vipInteira"
                        count={ticketCounts.vipInteira}
                      />
                    </div>
                  )}
                </div>

                {/* Backstage Ticket */}
                <div className="border border-gray-300 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => toggleSection('backstage')}
                    className="w-full group relative overflow-hidden bg-transparent border-2 border-black rounded-xl p-6 transition-all duration-300 hover:border-yellow-600 hover:bg-yellow-600/5 hover:shadow-lg hover:shadow-yellow-600/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Crown className="w-6 h-6 text-yellow-600 group-hover:text-yellow-500 transition-colors" />
                        <div className="text-left">
                          <h4 className="text-lg font-semibold group-hover:text-yellow-600 transition-colors">Backstage Deboxe</h4>
                          <p className="text-sm text-gray-600">Experiência premium</p>
                        </div>
                      </div>
                      <Ticket className="w-6 h-6 text-black group-hover:text-yellow-600 transition-colors" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/0 to-yellow-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                  
                  {expandedSection === 'backstage' && (
                    <div className="p-6 bg-white border-t border-gray-200 space-y-4">
                      <TicketOption 
                        title="BACKSTAGE DEBOXE MEIA/SOLIDÁRIA - Meia Solidária - Unissex 4º Lote"
                        ticketType="backstageMeia"
                        count={ticketCounts.backstageMeia}
                      />
                      <TicketOption 
                        title="BACKSTAGE DEBOXE - INTEIRA 4º Lote"
                        ticketType="backstageInteira"
                        count={ticketCounts.backstageInteira}
                      />
                    </div>
                  )}
                </div>

                {/* Influencers Ticket */}
                <div className="border border-gray-300 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => toggleSection('influencers')}
                    className="w-full group relative overflow-hidden bg-transparent border-2 border-black rounded-xl p-6 transition-all duration-300 hover:border-yellow-600 hover:bg-yellow-600/5 hover:shadow-lg hover:shadow-yellow-600/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Camera className="w-6 h-6 text-yellow-600 group-hover:text-yellow-500 transition-colors" />
                        <div className="text-left">
                          <h4 className="text-lg font-semibold group-hover:text-yellow-600 transition-colors">Área Influencers</h4>
                          <p className="text-sm text-gray-600">Espaço exclusivo para criadores</p>
                        </div>
                      </div>
                      <Ticket className="w-6 h-6 text-black group-hover:text-yellow-600 transition-colors" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/0 to-yellow-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                  
                  {expandedSection === 'influencers' && (
                    <div className="p-6 bg-white border-t border-gray-200 space-y-4">
                      <TicketOption 
                        title="ÁREA INFLUENCERS - MEIA/SOLIDÁRIA - Meia Solidária - Unissex 4º Lote"
                        ticketType="influencersMeia"
                        count={ticketCounts.influencersMeia}
                      />
                      <TicketOption 
                        title="ÁREA INFLUENCERS - INTEIRA 4º Lote"
                        ticketType="influencersInteira"
                        count={ticketCounts.influencersInteira}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Advance Button */}
              {getTotalTickets() > 0 && (
                <div className="mt-8">
                  <div className="bg-gray-100 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total de ingressos:</span>
                      <span className="font-bold text-lg">{getTotalTickets()}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-medium">Valor total:</span>
                      <span className="font-bold text-lg text-yellow-600">
                        R$ {getTotalValue().toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleAdvance}
                    disabled={isProcessingPayment}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-4 px-6 rounded-xl transition-colors duration-300 flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>
                      {isProcessingPayment ? 'Processando...' : 'Avançar para Pagamento'}
                    </span>
                  </button>
                </div>
              )}

              <div className="mt-8 text-center">
                <p className="text-sm text-gray-600 mb-4">Pagamento seguro • Entrada garantida</p>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-yellow-600 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-t from-gray-100 to-white border-t border-gray-200 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            © 2024 DEBOXE • ECLIPSE - Todos os direitos reservados
          </p>
        </div>
      </footer>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={closePaymentModal}
        paymentData={paymentModal.paymentData}
        onPaymentUpdate={handlePaymentUpdate}
      />
    </div>
  );
}

export default App;