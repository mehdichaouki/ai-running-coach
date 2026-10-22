import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import handler from './api/generate.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Route pour l'IA
app.post('/api/generate', async (req, res) => {
  // On simule l'environnement Vercel
  await handler(req, res);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé ! Ouvre ce lien : http://localhost:${PORT}`);
});