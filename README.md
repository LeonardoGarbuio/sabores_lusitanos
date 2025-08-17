# Sabores Lusitanos - Backend API

Plataforma premium de descoberta de restaurantes portugueses autênticos e experiências gastronómicas culturais.

## 🚀 Funcionalidades

### Sistema de Restaurantes
- CRUD completo de restaurantes
- Filtros avançados (região, cozinha, preço, autenticidade)
- Sistema de avaliações e reviews
- Upload de imagens múltiplas
- Sistema de favoritos
- Busca por texto e localização

### Sistema de Usuários
- Autenticação JWT
- Perfis de usuário com avatares
- Sistema de roles (user, restaurant_owner, admin)
- Gestão de preferências gastronómicas
- Sistema de favoritos

### Sistema de Eventos
- CRUD de eventos culturais
- Calendário de eventos
- Filtros por tipo, região e data
- Upload de imagens
- Sistema de inscrições

### Sistema de Comunidade
- Histórias culturais com sistema de likes
- Sistema de comentários
- Reviews detalhados com sub-avaliações
- Sistema de moderação

### Sistema de Reservas
- Gestão completa de reservas
- Confirmação por código
- Sistema de status (pending, confirmed, cancelled, completed, no-show)
- Prevenção de double booking

### Sistema de Mapa Cultural
- Dados por região gastronómica
- Contadores de restaurantes, eventos e histórias
- Filtros por tipo de conteúdo

### Sistema de Busca
- Busca global em todos os tipos de conteúdo
- Sugestões de busca em tempo real
- Filtros por região e tipo

## 🛠️ Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Base de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação
- **Multer** - Upload de ficheiros
- **Express Validator** - Validação de dados
- **Bcryptjs** - Hash de passwords
- **Helmet** - Segurança
- **CORS** - Cross-origin resource sharing

## 📁 Estrutura do Projeto

```
sabores_lusitanos/
├── config/
│   └── database.js          # Configuração da base de dados
├── middleware/
│   ├── auth.js              # Middleware de autenticação
│   ├── errorHandler.js      # Tratamento de erros
│   └── upload.js            # Upload de ficheiros
├── models/
│   ├── User.js              # Modelo de utilizador
│   ├── Restaurant.js        # Modelo de restaurante
│   ├── Review.js            # Modelo de review
│   ├── Event.js             # Modelo de evento
│   ├── Story.js             # Modelo de história
│   └── Reservation.js       # Modelo de reserva
├── routes/
│   ├── auth.js              # Rotas de autenticação
│   ├── restaurants.js       # Rotas de restaurantes
│   ├── users.js             # Rotas de utilizadores
│   ├── events.js            # Rotas de eventos
│   ├── community.js         # Rotas de comunidade
│   ├── reservations.js      # Rotas de reservas
│   ├── map.js               # Rotas do mapa cultural
│   └── search.js            # Rotas de busca
├── uploads/                 # Pasta de uploads
├── server.js                # Servidor principal
├── package.json             # Dependências
└── README.md                # Documentação
```

## 🚀 Instalação

1. **Clonar o repositório**
   ```bash
   git clone <repository-url>
   cd sabores_lusitanos
   ```

2. **Instalar dependências**
   ```bash
   npm install
   ```

3. **Configurar variáveis de ambiente**
   ```bash
   cp .env.example .env
   # Editar .env com as suas configurações
   ```

4. **Configurar MongoDB**
   - Instalar MongoDB localmente ou usar MongoDB Atlas
   - Atualizar `MONGODB_URI` no ficheiro `.env`

5. **Criar pasta de uploads**
   ```bash
   mkdir uploads
   ```

6. **Executar o servidor**
   ```bash
   # Desenvolvimento
   npm run dev
   
   # Produção
   npm start
   ```

## 📋 Variáveis de Ambiente

Criar um ficheiro `.env` na raiz do projeto:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/sabores_lusitanos

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production

# File Upload Configuration
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880
MAX_FILES=10

# Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Cloudinary Configuration (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🔐 Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação.

### Endpoints de Autenticação:
- `POST /api/auth/register` - Registar utilizador
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obter perfil atual
- `PUT /api/auth/profile` - Atualizar perfil
- `PUT /api/auth/change-password` - Alterar password
- `POST /api/auth/forgot-password` - Esqueci password
- `PUT /api/auth/reset-password` - Reset password

### Headers de Autenticação:
```
Authorization: Bearer <jwt_token>
```

## 📊 Modelos de Dados

### User
- Informações pessoais (nome, email, password)
- Role (user, restaurant_owner, admin)
- Preferências gastronómicas
- Favoritos, reviews, histórias, reservas

### Restaurant
- Informações básicas (nome, descrição, localização)
- Cozinha e especialidades
- Horários e características
- Sistema de avaliações
- Imagens e menu

### Review
- Avaliação geral e sub-avaliações
- Sistema de helpful/unhelpful
- Imagens e tags
- Resposta do proprietário

### Event
- Informações do evento
- Datas e capacidade
- Preços e requisitos
- Localização e organizador

### Story
- Conteúdo cultural
- Sistema de likes e comentários
- Categorias e tags
- Relacionamentos com restaurantes/eventos

### Reservation
- Detalhes da reserva
- Sistema de status
- Código de confirmação
- Prevenção de double booking

## 🔍 Endpoints Principais

### Restaurantes
- `GET /api/restaurants` - Listar com filtros
- `GET /api/restaurants/:slug` - Obter por slug
- `POST /api/restaurants` - Criar (auth)
- `PUT /api/restaurants/:id` - Atualizar (owner/admin)
- `DELETE /api/restaurants/:id` - Eliminar (owner/admin)
- `POST /api/restaurants/:id/images` - Upload imagens

### Eventos
- `GET /api/events` - Listar com filtros
- `GET /api/events/:slug` - Obter por slug
- `POST /api/events` - Criar (auth)
- `PUT /api/events/:id` - Atualizar (owner/admin)
- `DELETE /api/events/:id` - Eliminar (owner/admin)

### Comunidade
- `GET /api/community/stories` - Listar histórias
- `POST /api/community/stories` - Criar história
- `GET /api/community/reviews` - Listar reviews
- `POST /api/community/reviews` - Criar review

### Reservas
- `GET /api/reservations` - Listar reservas
- `POST /api/reservations` - Criar reserva
- `PUT /api/reservations/:id/confirm` - Confirmar (owner)
- `PUT /api/reservations/:id/cancel` - Cancelar

### Busca
- `GET /api/search` - Busca global
- `GET /api/search/suggestions` - Sugestões

### Mapa Cultural
- `GET /api/map/regions` - Todas as regiões
- `GET /api/map/region/:region` - Dados por região

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Produção
npm start

# Build CSS
npm run build:css

# Watch CSS
npm run watch:css

# Seed da base de dados
npm run db:seed
```

## 🔒 Segurança

- **Helmet** - Headers de segurança
- **CORS** - Configuração de origens
- **Rate Limiting** - Limitação de requests
- **Input Validation** - Validação de dados
- **JWT** - Autenticação segura
- **Password Hashing** - Bcrypt para passwords

## 📝 Validação

Todos os endpoints utilizam `express-validator` para validação de dados:

- Validação de tipos e formatos
- Sanitização de inputs
- Mensagens de erro personalizadas
- Validação de permissões

## 🗄️ Base de Dados

### Índices Criados:
- Text search em restaurantes, eventos e histórias
- Índices geográficos para localização
- Índices compostos para performance
- Índices únicos para constraints

### Relacionamentos:
- Referências entre modelos
- Populate automático
- Hooks para atualizações em cascata

## 🚀 Deploy

### Produção:
1. Configurar variáveis de ambiente
2. Configurar MongoDB de produção
3. Configurar domínio e SSL
4. Executar `npm start`

### Docker (opcional):
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contribuição

1. Fork o projeto
2. Criar branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit as mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - ver o ficheiro [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para questões ou suporte, contactar:
- Email: info@saboreslusitanos.pt
- Website: https://saboreslusitanos.pt

---

**Sabores Lusitanos** - Conectando estabelecimentos autênticos portugueses com entusiastas da gastronomia através de experiências culturais genuínas.
#   T e s t   d e p l o y  
 