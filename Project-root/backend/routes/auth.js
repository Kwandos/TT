const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

let resetTokens = [];

// routes/auth.js
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('Login request received:', email, password);

    try {
        const user = await User.findOne({ email });
        console.log('User found:', user);
        if (!user) {
            console.log('Invalid credentials');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);
        if (!isMatch) {
            console.log('Invalid credentials');
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log('Generated token:', token);
        res.status(200).json({ token });
    } catch (err) {
        console.error('Server error:', err.message);
        res.status(500).send('Server error');
    }
});



// Forgot Password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        resetTokens.push({ token, email });

        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'your-email@gmail.com',
                pass: 'your-email-password'
            }
        });

        const mailOptions = {
            to: email,
            from: 'passwordreset@example.com',
            subject: 'Password Reset',
            text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
                  `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
                  `http://localhost:3000/reset-password/${token}\n\n` +
                  `If you did not request this, please ignore this email and your password will remain unchanged.\n`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Email sent' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Reset Password
router.put('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    const resetToken = resetTokens.find(rt => rt.token === token);
    if (!resetToken) {
        return res.status(400).json({ message: 'Invalid or expired token' });
    }

    try {
        const user = await User.findOne({ email: resetToken.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = await bcrypt.hash(password, 10);
        await user.save();

        resetTokens = resetTokens.filter(rt => rt.token !== token);

        res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
