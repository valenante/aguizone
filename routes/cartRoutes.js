// routes/cart.js
const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');

// Añadir producto al carrito
router.post('/add', async (req, res) => {
    const { userId, productId, quantity } = req.body;
    let cart = await Cart.findOne({ userId });

    if (cart) {
        const productIndex = cart.products.findIndex(p => p.productId.toString() === productId);
        if (productIndex > -1) {
            cart.products[productIndex].quantity += quantity;
        } else {
            cart.products.push({ productId, quantity });
        }
    } else {
        cart = new Cart({ userId, products: [{ productId, quantity }] });
    }

    await cart.save();
    res.send(cart);
});

// Al obtener el carrito del usuario
router.get('/:userId', async (req, res) => {
    try {
        const cart = await Cart.findOne({ userId: req.params.userId }).populate('products.productId');
        if (!cart) {
            return res.status(404).send('Cart not found');
        }
        res.json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Server error');
    }
});

router.delete('/remove', async (req, res) => {
    const { userId, productId } = req.body;

    try {
        let cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Filtrar el producto del carrito
        cart.products = cart.products.filter(p => p.productId.toString() !== productId);

        // Guardar el carrito actualizado en la base de datos
        await cart.save();

        res.status(200).json({ message: "Product removed from cart", cart });
    } catch (error) {
        console.error('Error removing product from cart:', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
