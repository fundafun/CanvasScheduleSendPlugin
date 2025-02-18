
const express = require('express');
const fileUpload = require('express-fileupload');
const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2');
const cron = require('node-cron');
const mongoose = require('mongoose');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(fileUpload());
app.use(passport.initialize());

// MongoDB connection (example, replace with your own URL)
mongoose.connect('mongodb://localhost/canvas_plugin', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

// Passport OAuth2 strategy
passport.use(new OAuth2Strategy({
    authorizationURL: 'https://canvas.instructure.com/login/oauth2/auth',
    tokenURL: 'https://canvas.instructure.com/login/oauth2/token',
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/callback',
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

// Logging setup
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.Console({ format: winston.format.simple() })
    ],
});

// Rate limiting setup
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use(limiter);

// File upload and validation
const allowedTypes = ['application/pdf', 'application/msword', 'image/png'];
const maxSize = 50 * 1024 * 1024;

app.post('/upload', (req, res) => {
    const file = req.files.file;
    if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).send('Invalid file type');
    }
    if (file.size > maxSize) {
        return res.status(400).send('File too large');
    }

    // Example saving file metadata to MongoDB
    const File = mongoose.model('File', new mongoose.Schema({
        filename: String,
        scheduleTime: Date,
        status: { type: String, default: 'Scheduled' },
    }));
    const newFile = new File({
        filename: file.name,
        scheduleTime: new Date(), // Just a placeholder for actual scheduling
    });
    newFile.save()
        .then(() => res.send('File uploaded and scheduled'))
        .catch(err => {
            logger.error(err);
            res.status(500).send('Error saving file');
        });
});

// Email confirmation setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your_email@gmail.com',
        pass: 'your_email_password'
    },
});

const sendEmailConfirmation = (userEmail) => {
    const mailOptions = {
        from: 'your_email@gmail.com',
        to: userEmail,
        subject: 'File Submission Confirmation',
        text: 'Your file has been successfully scheduled for submission!',
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            logger.error(error);
        } else {
            logger.info('Email sent: ' + info.response);
        }
    });
};

// Cron job for scheduling recurring submissions
cron.schedule('0 0 * * 1', () => { // Every Monday at midnight
    console.log('Recurring submission task...');
});

// Example route for OAuth2 callback
app.get('/callback', passport.authenticate('oauth2', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
    