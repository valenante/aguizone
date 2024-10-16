const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();


// Configuración del servicio de correo
let transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Host del servidor SMTP de Gmail
  port: 587, // Puerto SMTP
  secure: false, // false para TLS; true para SSL
  auth: {
    user: 'valentinoantenucci1@gmail.com', // Tu dirección de correo
    pass: 'rhcm mehp ryzi jybs' // Tu contraseña de correo
  }
});

// Ruta para enviar correo electrónico
router.post('/send-email', (req, res) => {
  // Detalles del correo electrónico
  let mailOptions = {
    from: 'valentinoantenucci1@gmail.com', // Quién envía el correo
    to: req.body.to, // A quién enviar el correo (aquí esperamos el destinatario desde el cuerpo de la solicitud POST)
    subject: req.body.subject,
    text: req.body.text, // Contenido del correo en texto plano
    html: req.body.html // Contenido del correo en formato HTML
  };

  // Enviar el correo electrónico
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error al enviar el correo:', error);
      res.status(500).send('Error al enviar el correo');
    } else {
      console.log('Correo enviado:', info.response);
      res.status(200).send('Correo enviado correctamente');
    }
  });
});

// Ruta para manejar el proceso de olvidé mi contraseña
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Verificar si existe un usuario con el correo electrónico proporcionado
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No se encontró un usuario con este correo electrónico' });
    }

 
    // Filtrar las solicitudes de restablecimiento en las últimas 24 horas
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    user.resetPasswordRequests = user.resetPasswordRequests.filter(date => date > oneDayAgo);

    // Verificar si ha realizado más de 3 solicitudes en las últimas 24 horas
    if (user.resetPasswordRequests.length >= 3) {
      return res.status(429).json({ message: 'Has alcanzado el límite de solicitudes de restablecimiento de contraseña para hoy.' });
    }

    // Añadir la solicitud actual a la lista
    user.resetPasswordRequests.push(new Date());

    // Almacena el token en la base de datos junto con la fecha de expiración   
    // Generar token único
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Establece la expiración del token en 1 hora (3600000 milisegundos)

    await user.save();

    // Cuerpo del correo electrónico
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Recuperación de contraseña',
      text: `Para resetear tu contraseña, haz clic en este link: http://localhost:3000/resetpassword/${resetToken}`
    };

    // Envía el correo electrónico
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error al enviar el correo:', error);
        return res.status(500).json({ message: 'Error al enviar el correo' });
      }
      console.log('Correo enviado:', info.response);
      res.status(200).json({ message: 'Correo enviado correctamente' });
    });

  } catch (error) {
    console.error('Error al buscar usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  // Expresión regular para validar la contraseña
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  // Validar la contraseña
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos una mayúscula, un número y un carácter especial, y debe tener al menos 8 caracteres.' });
  }

  try {
    // Verificar si el token es válido
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Asegúrate de tener JWT_SECRET configurado en tu entorno

    // Buscar al usuario por su ID almacenado en el token
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Establecer la nueva contraseña hasheada
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;

    // Guardar el usuario con la nueva contraseña
    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al restablecer la contraseña:', error.message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


module.exports = router;
