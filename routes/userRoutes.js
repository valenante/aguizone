const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User'); // Reemplaza con tu modelo de usuario
const crypto = require('crypto');


// Función para validar la nueva contraseña
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return password.length >= minLength && hasUpperCase && hasNumber && hasSpecialChar;
};

// Función para generar un token único y seguro
function generateResetToken() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        const token = buffer.toString('hex');
        resolve(token);
      }
    });
  });
}

// Middleware para obtener un usuario por ID
async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.user = user;
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

// Ruta para cambiar la contraseña
router.post('/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        message: 'La nueva contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial.'
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Contraseña cambiada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Ruta para cambiar el correo electrónico
router.put('/change-email', [
  body('email').notEmpty().withMessage('El correo electrónico actual es requerido')
    .isEmail().withMessage('El correo electrónico actual no es válido')
    .custom(value => {
      if (!/@/.test(value)) {
        throw new Error('El correo electrónico actual debe contener el símbolo "@"');
      }
      return true;
    }),
  body('newEmail').notEmpty().withMessage('El nuevo correo electrónico es requerido')
    .isEmail().withMessage('El nuevo correo electrónico no es válido')
    .custom(value => {
      if (!/@/.test(value)) {
        throw new Error('El nuevo correo electrónico debe contener el símbolo "@"');
      }
      return true;
    }),
], async (req, res) => {
  const { userId, newEmail } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    user.email = newEmail;
    await user.save();

    res.json({ message: 'Correo electrónico cambiado exitosamente', email: user.email });
  } catch (error) {
    console.error('Error al cambiar el correo electrónico:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Ruta para cambiar el nombre de usuario
router.put('/change-username', [
  body('username')
    .notEmpty().withMessage('El nombre de usuario es requerido')
    .isLength({ max: 15 }).withMessage('El nombre de usuario debe tener como máximo 15 caracteres')
    .custom(value => !(/^\d+$/.test(value))).withMessage('El nombre de usuario no puede ser solo números')
], async (req, res) => {
  const { userId, username } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    user.username = username;
    await user.save();

    res.json({ message: 'Nombre de usuario cambiado exitosamente', username: user.username });
  } catch (error) {
    console.error('Error al cambiar el nombre de usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Ruta para obtener todos los usuarios (ejemplo)
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Ruta para obtener el perfil de un usuario por ID (ejemplo)
router.get('/profile/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error al recuperar datos del perfil:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// Ruta para obtener un usuario por ID (ejemplo)
router.get('/:id', getUser, (req, res) => {
  res.json(res.user);
});

function generateResetToken() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        const token = buffer.toString('hex');
        resolve(token);
      }
    });
  });
}

// Ruta para eliminar un usuario por ID (ejemplo)
router.delete('/:id', async (req, res) => {
  try {
    const deletedUser = await User.deleteOne({ _id: req.params.id });
    if (deletedUser.deletedCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario eliminado correctamente', user: deletedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

