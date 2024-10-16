const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const { OAuth2Client } = require('google-auth-library');
const firebaseAdmin = require('firebase-admin');
const path = require('path');

// Rutas y configuración de base de datos
const userRoutes = require('./routes/userRoutes');
const authRouter = require('./routes/authRoutes');
const emailRoutes = require('./routes/emailRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const db = require('./db'); // Importa el módulo db.js
require('./passportConfig'); // Importa la configuración de Passport

// Inicialización de Firebase
const serviceAccount = require('./webaguizon-firebase-adminsdk-lvhrg-7507ef24ea.json'); // Ruta al archivo de configuración de Firebase Admin
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

// Configuración del archivo .env
dotenv.config();

// Inicialización de Express
const app = express();
const PORT = process.env.PORT || 5000;
const client_id = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = 'http://localhost:3000'; // Ajusta esto según tu configuración en producción
const oauth2Client = new OAuth2Client(client_id, clientSecret, redirectUri);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Asegúrate de permitir el origen correcto
  credentials: true
}));
app.use(express.json());

// Redirección HTTP a HTTPS (ajusta según tu configuración)
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// Configuración de sesión
app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Rutas de la API
app.use('/api/users', userRoutes);
app.use('/api/auth', authRouter);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/email', emailRoutes);

// Sirve los archivos estáticos del frontend de React
app.use(express.static(path.join(__dirname, '..', 'godmodefront', 'build')));

// Ruta para cualquier otra petición que no sea manejada por el backend
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'godmodefront', 'build', 'index.html'));
});

// Middleware para manejar rutas no encontradas (404)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware para manejar errores internos del servidor (500)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// Establece la conexión a la base de datos y luego inicia el servidor
db.connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar con la base de datos:', err);
  });

module.exports = app;
