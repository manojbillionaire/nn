import express from 'express';
import { createServer as createViteServer } from 'vite';
import { sql } from '@vercel/postgres';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { clerkMiddleware, getAuth, createClerkClient } from '@clerk/express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Clerk Client for backend management
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

async function initDb() {
  try {
    // Drop table logic if we need to migration, but usually "CREATE TABLE IF NOT EXISTS" is safer for "auto inject"
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        clerk_id TEXT UNIQUE,
        email TEXT UNIQUE,
        name TEXT,
        role TEXT DEFAULT 'advocate',
        gemini_api_key TEXT,
        bar_council_no TEXT,
        code TEXT UNIQUE,
        referred_by TEXT,
        plan TEXT DEFAULT 'Starter',
        status TEXT DEFAULT 'active',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS calls (
        id SERIAL PRIMARY KEY,
        caller TEXT,
        phone TEXT,
        status TEXT CHECK(status IN ('incoming', 'answered', 'ended', 'missed')) DEFAULT 'incoming',
        duration TEXT,
        summary TEXT,
        advocate_id INTEGER REFERENCES users(id),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Ensure first user or specific emails are admins/agency if needed
    // But we'll handle role assignment via the UI or manual DB for now
    
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

async function startServer() {
  // Initialize database
  await initDb();

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Check for Clerk Secret Key
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn('CRITICAL: CLERK_SECRET_KEY is missing. Profile sync will fail.');
  }

  app.use(clerkMiddleware());

  // --- API Routes ---

  // Health Check
  app.get('/api/health', (req, res) => res.json({ status: 'ok', mode: process.env.NODE_ENV }));

  // User Profile - Automatically syncs Clerk data on request
  app.get('/api/user/profile', async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const { rows } = await sql`SELECT * FROM users WHERE clerk_id = ${userId}`;
      let user = rows[0];
      
      if (!user) {
        // Fetch full profile from Clerk to populate database
        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Barrister';
        const barNo = 'BC/' + Math.floor(Math.random() * 10000);
        const code = 'NJ' + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const result = await sql`
          INSERT INTO users (clerk_id, email, name, bar_council_no, code) 
          VALUES (${userId}, ${email}, ${name}, ${barNo}, ${code})
          RETURNING *
        `;
        user = result.rows[0];
      } else if (!user.email || !user.name) {
        // Update existing stub users who logged in before we added Clerk API sync
        const clerkUser = await clerkClient.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Barrister';
        
        const result = await sql`
          UPDATE users 
          SET email = ${email}, name = ${name} 
          WHERE clerk_id = ${userId}
          RETURNING *
        `;
        user = result.rows[0];
      }
      
      res.json(user);
    } catch (err) {
      console.error('Clerk Sync Error:', err);
      // Fallback: try to return whatever we have
      try {
        const { rows } = await sql`SELECT * FROM users WHERE clerk_id = ${userId}`;
        res.json(rows[0] || { clerk_id: userId, name: 'Barrister' });
      } catch (innerErr) {
        res.json({ clerk_id: userId, name: 'Barrister' });
      }
    }
  });

  // Save Gemini API Key
  app.post('/api/user/apikey', async (req, res) => {
    const { userId } = getAuth(req);
    const { apiKey } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      await sql`UPDATE users SET gemini_api_key = ${apiKey} WHERE clerk_id = ${userId}`;
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save API key' });
    }
  });

  // AI Orchestrator Endpoint
  app.post('/api/ai/consult', async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { message, history = [] } = req.body;
    
    try {
      const { rows } = await sql`SELECT gemini_api_key FROM users WHERE clerk_id = ${userId}`;
      const user = rows[0];
      
      const apiKey = user?.gemini_api_key || process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(400).json({ error: 'Gemini API key missing. Please provide one in settings.' });

      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const userRes = await sql`SELECT id FROM users WHERE clerk_id = ${userId}`;
      const user = userRes.rows[0];
      if (!user) return res.json({ calls: [] });

      const { rows } = await sql`SELECT *, timestamp::text as timestamp FROM calls WHERE advocate_id = ${user.id} ORDER BY timestamp DESC`;
      res.json({ calls: rows });
    } catch (err) {
      res.status(500).json({ error: 'Fetch calls error' });
    }
  });

  // Dialer Webhook
  app.post('/api/calls/webhook', async (req, res) => {
    const { caller, phone, status, duration, summary, advocateEmail } = req.body;
    try {
      const userRes = await sql`SELECT id FROM users WHERE email = ${advocateEmail}`;
      const user = userRes.rows[0];
      if (!user) return res.status(404).json({ error: 'Advocate not found' });

      const info = await sql`
        INSERT INTO calls (caller, phone, status, duration, summary, advocate_id) 
        VALUES (${caller}, ${phone}, ${status}, ${duration}, ${summary}, ${user.id})
        RETURNING *
      `;
      
      const call = info.rows[0];
      broadcastCall(call);
      res.json({ success: true, call });
    } catch (err) {
      console.error('Webhook error:', err);
      res.status(500).json({ error: 'Webhook error' });
    }
  });

  // --- Agency Endpoints ---
  app.get('/api/agency/advocates', async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const adminRes = await sql`SELECT role FROM users WHERE clerk_id = ${userId}`;
      if (adminRes.rows[0]?.role !== 'agency') return res.status(403).json({ error: 'Forbidden' });

      const { rows } = await sql`SELECT *, joined_at::text as joined_at FROM users WHERE role = 'advocate' ORDER BY joined_at DESC`;
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch advocates' });
    }
  });

  app.get('/api/agency/stats', async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const advCount = await sql`SELECT COUNT(*) FROM users WHERE role = 'advocate'`;
      const affCount = await sql`SELECT COUNT(*) FROM users WHERE role = 'affiliate'`;
      const callCount = await sql`SELECT COUNT(*) FROM calls`;
      
      res.json({
        totalAdvocates: parseInt(advCount.rows[0].count),
        affiliates: parseInt(affCount.rows[0].count),
        totalCases: parseInt(callCount.rows[0].count),
        pending: 0
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // --- Affiliate Endpoints ---
  app.get('/api/affiliate/dashboard', async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { rows } = await sql`SELECT * FROM users WHERE clerk_id = ${userId}`;
      const user = rows[0];
      if (!user || user.role !== 'affiliate') return res.status(403).json({ error: 'Forbidden' });

      const referrals = await sql`SELECT *, joined_at::text as joined_at FROM users WHERE referred_by = ${user.code}`;
      
      res.json({
        aff: user,
        subscribers: referrals.rows,
        earned: referrals.rows.length * 500, // Example commission
        paymentHistory: []
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch affiliate metrics' });
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

  const distPath = path.join(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === 'production';
  const hasDist = fs.existsSync(distPath);

  if (isProduction && hasDist) {
    console.log('Serving production build from dist/');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Avoid acting on static files that might have been missed
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).end();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('Starting Vite development server...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
