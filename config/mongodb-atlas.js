const mongoose = require('mongoose');

const connectDBAtlas = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    });

    console.log(`MongoDB Atlas conectado: ${conn.connection.host}`);
    
    // Configurações de produção
    if (process.env.NODE_ENV === 'production') {
      mongoose.connection.on('error', (err) => {
        console.error('Erro na conexão MongoDB:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB desconectado. Tentando reconectar...');
        setTimeout(() => connectDBAtlas(), 5000);
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconectado com sucesso!');
      });
    }
  } catch (error) {
    console.error('Erro ao conectar ao MongoDB Atlas:', error);
    process.exit(1);
  }
};

module.exports = connectDBAtlas;
