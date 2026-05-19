const express = require('express');
const basicAuth = require('express-basic-auth');
const { rateLimit } = require('express-rate-limit');
const path = require('path');
const dms = require('./docker');

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email);
}

// Log internally, return a generic message to the client
function serverError(res, err) {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Interner Serverfehler' });
}

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Zu viele Anfragen, bitte warte eine Minute.' },
  })
);

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

app.get('/api/status', async (req, res) => {
  try {
    res.json(await dms.getContainerStatus());
  } catch (err) {
    serverError(res, err);
  }
});

app.get('/api/accounts', async (req, res) => {
  try {
    res.json(await dms.listAccounts());
  } catch (err) {
    serverError(res, err);
  }
});

app.post('/api/accounts', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });
  if (!validEmail(email))
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });

  try {
    await dms.addAccount(email, password);
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

app.delete('/api/accounts/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  if (!validEmail(email))
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });

  try {
    await dms.deleteAccount(email);
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

app.put('/api/accounts/:email/password', async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  if (!validEmail(email))
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });

  const { password } = req.body;
  if (!password)
    return res.status(400).json({ error: 'Passwort erforderlich' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });

  try {
    await dms.updatePassword(email, password);
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

app.listen(PORT, () => {
  console.log(`DMS WebUI läuft auf Port ${PORT}`);
  console.log(`Container: ${process.env.DMS_CONTAINER || 'docker-mailserver'}`);
});
