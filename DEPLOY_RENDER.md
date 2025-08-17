# 🚀 Deploy na Render - Sabores Lusitanos

## 📋 Pré-requisitos

1. **Conta na Render** (gratuita)
2. **MongoDB Atlas** (banco na nuvem)
3. **Repositório Git** (GitHub, GitLab, etc.)

## 🔧 Configuração do MongoDB Atlas

### 1. Criar Cluster
- Acesse [MongoDB Atlas](https://cloud.mongodb.com)
- Crie um cluster gratuito
- Escolha a região mais próxima

### 2. Configurar Usuário
- Crie um usuário de banco de dados
- Anote username e password

### 3. Configurar IP
- Adicione `0.0.0.0/0` para permitir acesso de qualquer lugar
- Ou adicione o IP da Render quando souber

### 4. Obter Connection String
```
mongodb+srv://username:password@cluster.mongodb.net/sabores_lusitanos?retryWrites=true&w=majority
```

## 🚀 Deploy na Render

### 1. Conectar Repositório
- Faça login na Render
- Clique em "New +"
- Selecione "Web Service"
- Conecte seu repositório Git

### 2. Configurar Serviço
```
Name: sabores-lusitanos-api
Environment: Node
Region: Escolha a mais próxima
Branch: main (ou master)
Build Command: npm install
Start Command: npm start
```

### 3. Configurar Variáveis de Ambiente
Clique em "Environment" e adicione:

#### **OBRIGATÓRIAS:**
```
NODE_ENV = production
PORT = 10000
MONGODB_URI = mongodb+srv://username:password@cluster.mongodb.net/sabores_lusitanos?retryWrites=true&w=majority
JWT_SECRET = sua_chave_secreta_muito_segura_aqui_minimo_32_caracteres
```

#### **OPCIONAIS (recomendadas):**
```
JWT_EXPIRE = 30d
EMAIL_HOST = smtp.gmail.com
EMAIL_PORT = 587
EMAIL_USER = seu_email@gmail.com
EMAIL_PASS = sua_senha_de_app_do_gmail
FRONTEND_URL = https://seu-frontend-domain.com
```

### 4. Deploy
- Clique em "Create Web Service"
- Aguarde o build e deploy
- Anote a URL gerada (ex: `https://sabores-lusitanos-api.onrender.com`)

## 🔍 Verificar Deploy

### 1. Health Check
```
GET https://sua-api.onrender.com/api/health
```

**Resposta esperada:**
```json
{
  "status": "OK",
  "message": "Sabores Lusitanos API is running",
  "timestamp": "2024-01-XX..."
}
```

### 2. Testar Endpoints
```bash
# Testar autenticação
curl -X POST https://sua-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@teste.com","password":"123456"}'
```

## ⚠️ Problemas Comuns

### 1. **Build Failed**
- Verifique se todas as dependências estão no `package.json`
- Confirme se o `start` script está correto
- Verifique logs de build

### 2. **Erro de Conexão MongoDB**
- Verifique se o `MONGODB_URI` está correto
- Confirme se o IP da Render está liberado no Atlas
- Teste a conexão localmente

### 3. **Erro de Porta**
- Render usa porta 10000 por padrão
- Confirme se `PORT=10000` está nas variáveis

### 4. **Timeout de Deploy**
- Render tem limite de 15 minutos para build
- Otimize dependências se necessário

## 🔒 Segurança

### 1. **JWT_SECRET**
- Use uma chave de pelo menos 32 caracteres
- Gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2. **MongoDB Atlas**
- Use usuário com permissões mínimas
- Ative autenticação de dois fatores
- Monitore acessos

### 3. **Rate Limiting**
- Já configurado no código
- Limite: 100 requests por 15 minutos por IP

## 📊 Monitoramento

### 1. **Logs**
- Acesse "Logs" no painel da Render
- Monitore erros e performance

### 2. **Métricas**
- Verifique uso de CPU e memória
- Monitore tempo de resposta

### 3. **Health Checks**
- Render faz check automático em `/api/health`
- Se falhar 3 vezes, o serviço para

## 🔄 Atualizações

### 1. **Deploy Automático**
- Ative "Auto-Deploy" nas configurações
- Push para `main` branch faz deploy automático

### 2. **Deploy Manual**
- Clique em "Manual Deploy"
- Escolha branch ou commit específico

## 💰 Custos

- **Plano Gratuito**: $0/mês
- **Limitações**: 
  - 750 horas/mês
  - 512MB RAM
  - 1GB storage
  - Sleep após 15 min inativo

## 🎯 Próximos Passos

1. **Teste todos os endpoints**
2. **Configure domínio personalizado** (opcional)
3. **Configure SSL** (automático na Render)
4. **Monitore performance**
5. **Configure backups do MongoDB**

## 📞 Suporte

- **Render Docs**: [docs.render.com](https://docs.render.com)
- **MongoDB Atlas**: [cloud.mongodb.com](https://cloud.mongodb.com)
- **Issues**: Abra issue no repositório

---

**🎉 Parabéns! Sua API está rodando na nuvem!**
