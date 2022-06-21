import express from 'express';


const app = express();
const port = 3000;

app.use('/', require('./controller/whatsapp'))

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});
