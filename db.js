// db.js
const mongoose = require('mongoose');

// Función para conectar a la base de datos
async function connect() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mi-tienda', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conexión exitosa a MongoDB');
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error);
    throw error; // Propaga el error para que el index.js pueda capturarlo
  }
}

module.exports = { connect };
