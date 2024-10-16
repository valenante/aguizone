const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const admin = require('firebase-admin');


router.post('/google-login', async (req, res) => {
  const { idToken } = req.body;

  try {
    // Verificar el token de Google con Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email } = decodedToken;

    // Buscar el usuario en la base de datos o crear uno nuevo
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        username: `user_${Math.random().toString(36).substr(2, 9)}`, // Nombre de usuario predeterminado
        authProvider: 'google', // Indicar que el usuario se registró con Google
      });
      await user.save();
    }

    // Generar un token JWT
    const token = jwt.sign({ id: user._id, email: user.email, authProvider: 'google'}, process.env.JWT_SECRET, {
      expiresIn: '1h', // Tiempo de expiración del token (ejemplo: 1 hora)
    });

    // Enviar el token JWT como respuesta
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error al verificar el token de Google:', error.message);
    res.status(403).json({ message: 'Error al verificar el token de Google' });
  }
});

router.post('/login',
  [
    body('email').isEmail().withMessage('El correo electrónico no es válido'),
    body('password').notEmpty().withMessage('La contraseña es requerida')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Errores de validación:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Intentando iniciar sesión con:', email, password);

    try {
      const user = await User.findOne({ email });
      console.log('Usuario encontrado:', user);

      if (!user) {
        console.log('No se encontró el usuario.');
        return res.status(400).json({ message: 'Correo o contraseña incorrectos.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Resultado de la comparación de contraseñas:', isMatch);

      if (!isMatch) {
        console.log('Las contraseñas no coinciden.');
        return res.status(400).json({ message: 'Correo o contraseña incorrectos.' });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ message: 'Login exitoso', token });
    } catch (error) {
      console.error('Error en el servidor:', error);
      res.status(500).json({ message: 'Error en el servidor.' });
    }
  }
);

router.post(
  '/signup',
  [
    body('username').notEmpty().withMessage('El nombre de usuario es requerido')
      .custom(value => !(/^\d+$/.test(value))).withMessage('El nombre de usuario no puede ser solo números'),
    body('name').notEmpty().withMessage('El nombre es requerido') 
      .custom(value => !(/^\d+$/.test(value))).withMessage('El nombre no puede ser solo números'),
    body('email').isEmail().withMessage('El correo electrónico no es válido'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
      .withMessage('La contraseña debe contener al menos una letra mayúscula, un número y un carácter especial'),
    body('confirmPassword').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas deben coincidir');
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Errores de validación en registro:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, name, email, password } = req.body;

    try {
      let existingUser = await User.findOne({ email });
      if (existingUser) {
        console.log('El usuario ya existe.');
        return res.status(400).json({ message: 'El usuario ya existe' });
      }

      // Hash de la contraseña antes de guardarla en la base de datos
      console.log('Hashing password:', password);
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('Contraseña hasheada:', hashedPassword);

      const newUser = new User({ username, name, email, password: hashedPassword });
      await newUser.save();

      // Verificar el usuario recién creado
      console.log('Usuario creado:', newUser);

      // Generar token JWT
      const token = jwt.sign({ userId: newUser._id }, 'TuSecretoAqui', { expiresIn: '1h' });
      res.status(201).json({ token });
    } catch (error) {
      console.error('Error en el servidor durante el registro:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

  module.exports = router;