import express from 'express';
const app = express();
app.use('/', require('./controller/whatsapp'))

