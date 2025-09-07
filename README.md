# DEBOXE • ECLIPSE - Sistema de Vendas de Ingressos

Sistema completo de vendas de ingressos com pagamentos reais via Pix integrado à API da Amplo Pay.

## 🚀 Funcionalidades

- ✅ Interface moderna e responsiva
- ✅ Seleção de ingressos por categoria (VIP, Backstage, Influencers)
- ✅ **PAGAMENTOS REAIS** com API da Amplo Pay
- ✅ **PIX REAL** com QR Code funcional
- ✅ Confirmação automática via webhook
- ✅ Polling de backup para confirmação
- ✅ **VOCÊ RECEBE O DINHEIRO DE VERDADE** 💰

## ⚠️ CONFIGURAÇÃO OBRIGATÓRIA

### 1. **API Key da Amplo Pay (OBRIGATÓRIO)**

**SEM A API KEY, O SISTEMA NÃO FUNCIONA!**

1. Crie uma conta na Amplo Pay: https://amplopay.com.br
2. Obtenha sua API Key no painel
3. Crie um arquivo `.env` na raiz do projeto:

```env
VITE_AMPLO_PAY_API_KEY=sua_api_key_real_aqui
VITE_AMPLO_PAY_BASE_URL=https://api.amplopay.com.br/v1
VITE_SITE_URL=https://seu-dominio.com
```

### 2. Configurar Webhook na Amplo Pay

No painel da Amplo Pay, configure:
- **URL do Webhook**: `https://seu-dominio.com/webhook/amplo-pay`
- **Eventos**: `payment.paid`, `payment.failed`, `payment.expired`

### 3. Backend para Webhook (Necessário)

Você precisa implementar um endpoint no seu backend para receber os webhooks:

```javascript
// Exemplo em Node.js/Express
app.post('/webhook/amplo-pay', express.raw({type: 'application/json'}), (req, res) => {
  const payload = req.body;
  const signature = req.headers['x-amplo-signature'];
  
  // Verificar assinatura do webhook
  if (!verifyWebhookSignature(payload, signature)) {
    return res.status(401).send('Unauthorized');
  }
  
  const { event, data } = JSON.parse(payload);
  
  // Processar evento
  switch (event) {
    case 'payment.paid':
      // Marcar pagamento como pago
      // Enviar ingressos por email
      // Notificar frontend via WebSocket/SSE
      break;
    case 'payment.failed':
    case 'payment.expired':
      // Marcar pagamento como falhou/expirou
      break;
  }
  
  res.status(200).send('OK');
});
```

## 🏗️ Instalação e Deploy

```bash
# Instalar dependências
npm install

# OBRIGATÓRIO: Configurar API Key real
cp .env.example .env
# Editar .env com sua API Key da Amplo Pay

# Build para produção
npm run build
```

## ✅ Checklist OBRIGATÓRIO

- [ ] ✅ **API Key real da Amplo Pay configurada**
- [ ] ✅ **Webhook configurado no painel da Amplo Pay**
- [ ] ✅ **Testar pagamento real com valor baixo**
- [ ] ✅ **Verificar recebimento na conta Amplo Pay**

## 🔒 Segurança

- ✅ **API Key protegida em variáveis de ambiente**
- ✅ **Pagamentos reais processados pela Amplo Pay**
- ✅ **Timeout automático de pagamentos (15 min)**
- ✅ **Polling de backup para confirmação**

## 📞 Suporte

Para dúvidas sobre a integração com a Amplo Pay:
- Documentação: https://docs.amplopay.com.br
- Suporte: suporte@amplopay.com.br

## 💰 Fluxo de Pagamento REAL

1. Cliente seleciona ingressos
2. **Sistema gera pagamento REAL na Amplo Pay**
3. **Cliente recebe QR Code Pix REAL**
4. **Cliente efetua pagamento REAL**
5. **VOCÊ RECEBE O DINHEIRO NA SUA CONTA** 💰
6. **Amplo Pay confirma via webhook**
7. **Sistema atualiza status automaticamente**
8. **Ingressos são enviados por email**

---

**Status**: ✅ **SISTEMA DE PAGAMENTO REAL ATIVO** 💰