# DEBOXE • ECLIPSE - Sistema de Vendas de Ingressos

Sistema completo de vendas de ingressos com pagamentos reais via Pix integrado à API da Amplo Pay.

## 🚀 Funcionalidades

- ✅ Interface moderna e responsiva
- ✅ Seleção de ingressos por categoria (VIP, Backstage, Influencers)
- ✅ **Sistema de pagamentos** com API da Amplo Pay
- ✅ **PIX** com QR Code funcional
- ✅ **Modo de desenvolvimento** com pagamentos simulados
- ✅ **Modo de produção** com pagamentos reais
- ✅ Confirmação automática via webhook
- ✅ Polling de backup para confirmação

## 🔧 Configuração

### Modo de Desenvolvimento (Pagamentos Simulados)

O sistema funciona automaticamente em modo de desenvolvimento com pagamentos simulados quando a API Key não está configurada.

### Modo de Produção (Pagamentos Reais)

Para ativar pagamentos reais, configure:

1. Crie uma conta na Amplo Pay: https://amplopay.com.br
2. Obtenha sua API Key no painel
3. Crie um arquivo `.env` na raiz do projeto:

```env
VITE_AMPLO_PAY_API_KEY=sua_api_key_real_aqui
VITE_AMPLO_PAY_BASE_URL=https://api.amplopay.com.br/v1
VITE_SITE_URL=https://seu-dominio.com
```

### Configurar Webhook na Amplo Pay (Apenas para Produção)

No painel da Amplo Pay, configure:
- **URL do Webhook**: `https://seu-dominio.com/webhook/amplo-pay`
- **Eventos**: `payment.paid`, `payment.failed`, `payment.expired`

### Backend para Webhook (Apenas para Produção)

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

# Desenvolvimento (pagamentos simulados)
npm run dev

# Produção (configure API Key real no .env)
npm run build
```

## ✅ Checklist para Produção

- [ ] **API Key real da Amplo Pay configurada**
- [ ] **Webhook configurado no painel da Amplo Pay**
- [ ] **Testar pagamento real com valor baixo**
- [ ] **Verificar recebimento na conta Amplo Pay**

## 🔒 Segurança

- ✅ API Key protegida em variáveis de ambiente
- ✅ Pagamentos processados pela Amplo Pay (produção)
- ✅ Timeout automático de pagamentos (15 min)
- ✅ Polling de backup para confirmação
- ✅ Modo de desenvolvimento seguro com simulações

## 📞 Suporte

Para dúvidas sobre a integração com a Amplo Pay:
- Documentação: https://docs.amplopay.com.br
- Suporte: suporte@amplopay.com.br

## 💰 Fluxo de Pagamento

### Desenvolvimento (Simulado)
1. Cliente seleciona ingressos
2. Sistema gera pagamento simulado
3. Cliente recebe QR Code Pix simulado
4. Pagamento é aprovado automaticamente após 10 segundos
5. Sistema atualiza status automaticamente

### Produção (Real)
1. Cliente seleciona ingressos
2. Sistema gera pagamento real na Amplo Pay
3. Cliente recebe QR Code Pix real
4. Cliente efetua pagamento real
5. Você recebe o dinheiro na sua conta
6. Amplo Pay confirma via webhook
7. Sistema atualiza status automaticamente
8. Ingressos são enviados por email

---
