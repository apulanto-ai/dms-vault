const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const dms = require('./docker');

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

app.use(
  basicAuth({
    users: { [ADMIN_USER]: ADMIN_PASSWORD },
    challenge: true,
    realm: 'DMS Admin',
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/meta', (req, res) => {
  res.json({ container: process.env.DMS_CONTAINER || 'docker-mailserver' });
});

app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await dms.listAccounts();
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });

  try {
    await dms.addAccount(email, password);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/accounts/:email', async (req, res) => {
  try {
    await dms.deleteAccount(decodeURIComponent(req.params.email));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/accounts/:email/password', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Passwort erforderlich' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });

  try {
    await dms.updatePassword(decodeURIComponent(req.params.email), password);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`DMS WebUI läuft auf Port ${PORT}`);
  console.log(`Container: ${process.env.DMS_CONTAINER || 'docker-mailserver'}`);
});
