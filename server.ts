import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SQLite Connection
const db = new Database('nexus_justice.db');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE,
    name TEXT,
    role TEXT DEFAULT 'advocate',
    gemini_api_key TEXT,
    bar_council_no TEXT,
    plan TEXT DEFAULT 'Starter',
    status TEXT DEFAULT 'active',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caller TEXT,
    phone TEXT,
    status TEXT CHECK(status IN ('incoming', 'answered', 'ended', 'missed')) DEFAULT 'incoming',
    duration TEXT,
    summary TEXT,
    advocate_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(advocate_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'nexus-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: 'none',
      httpOnly: true,
    }
  }));

  const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // --- API Routes ---

  // Google OAuth URL
  app.get('/api/auth/google/url', (req, res) => {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`;
    const url = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'],
      redirect_uri: redirectUri,
    });
    res.json({ url });
  });

  // Google OAuth Callback
  app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/auth/google/callback`;
    
    try {
      const { tokens } = await googleClient.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });
      googleClient.setCredentials(tokens);

      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = userInfoRes.data;

      // Upsert user
      let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(userInfo.sub) as any;
      if (!user) {
        const info = db.prepare('INSERT INTO users (google_id, email, name, bar_council_no) VALUES (?, ?, ?, ?)')
          .run(userInfo.sub, userInfo.email, userInfo.name, 'BC/' + Math.floor(Math.random() * 10000));
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
      }

      // Store user in session or return token
      // For simplicity in this demo, we'll use a mock token
      const token = Buffer.from(JSON.stringify({ id: user.id, email: user.email })).toString('base64');

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: '${token}', user: ${JSON.stringify(user)} }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error('OAuth error:', err);
      res.status(500).send('Authentication failed');
    }
  });

  // User Profile
  app.get('/api/user/profile', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const token = authHeader.split(' ')[1];
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
      res.json(user);
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Save Gemini API Key
  app.post('/api/user/apikey', (req, res) => {
    const authHeader = req.headers.authorization;
    const { apiKey } = req.body;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const token = authHeader.split(' ')[1];
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      db.prepare('UPDATE users SET gemini_api_key = ? WHERE id = ?').run(apiKey, decoded.id);
      res.json({ success: true });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // AI Orchestrator Endpoint - Using ONLY Gemini 2.5 Flash Live (as requested)
  app.post('/api/ai/consult', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const { message, history = [] } = req.body;
    
    try {
      const token = authHeader.split(' ')[1];
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const user = db.prepare('SELECT gemini_api_key FROM users WHERE id = ?').get(decoded.id) as any;
      
      const apiKey = user?.gemini_api_key || process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(400).json({ error: 'Gemini API key missing. Please provide one in settings.' });

      // Call Gemini 2.5 Flash Live
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-live:generateContent?key=${apiKey}`, {
        contents: [...history.map((h: any) => ({ role: h.role === 'ai' ? 'model' : 'user', parts: [{ text: h.text }] })), { role: 'user', parts: [{ text: message }] }]
      });
      
      const reply = response.data.candidates[0].content.parts[0].text;
      res.json({ reply });
    } catch (err) {
      console.error('Gemini error:', err);
      res.status(500).json({ error: 'AI service error' });
    }
  });

  // Calls Endpoint
  app.get('/api/calls', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const token = authHeader.split(' ')[1];
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const calls = db.prepare('SELECT * FROM calls WHERE advocate_id = ? ORDER BY timestamp DESC').all(decoded.id);
      res.json({ calls });
    } catch (err) {
      res.status(500).json({ error: 'Fetch calls error' });
    }
  });

  // Dialer Webhook
  app.post('/api/calls/webhook', async (req, res) => {
    const { caller, phone, status, duration, summary, advocateEmail } = req.body;
    try {
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get(advocateEmail) as any;
      const info = db.prepare('INSERT INTO calls (caller, phone, status, duration, summary, advocate_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(caller, phone, status, duration, summary, user?.id);
      
      const call = db.prepare('SELECT * FROM calls WHERE id = ?').get(info.lastInsertRowid);
      broadcastCall(call);
      res.json({ success: true, call });
    } catch (err) {
      res.status(500).json({ error: 'Webhook error' });
    }
  });

  // SSE Clients
  let clients: any[] = [];
  app.get('/api/calls/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const clientId = Date.now();
    clients.push({ id: clientId, res });
    req.on('close', () => clients = clients.filter(c => c.id !== clientId));
  });

  function broadcastCall(call: any) {
    clients.forEach(c => c.res.write(`event: call\ndata: ${JSON.stringify(call)}\n\n`));
  }

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
