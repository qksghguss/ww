#!/usr/bin/env node
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs/promises');
const path = require('path');

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const API_PREFIX = process.env.API_PREFIX || '/api';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'app-state.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readState() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    if (!raw.trim()) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeState(state) {
  await ensureDataDir();
  const payload = JSON.stringify(state, null, 2);
  await fs.writeFile(DATA_FILE, payload, 'utf8');
}

async function clearState() {
  try {
    await fs.unlink(DATA_FILE);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('combined'));

  app.get(`${API_PREFIX}/health`, (req, res) => {
    res.json({ ok: true });
  });

  app.get(`${API_PREFIX}/app-state`, async (req, res, next) => {
    try {
      const state = await readState();
      if (!state) {
        return res.status(204).end();
      }
      return res.json(state);
    } catch (error) {
      return next(error);
    }
  });

  app.put(`${API_PREFIX}/app-state`, async (req, res, next) => {
    try {
      const state = req.body;
      if (!state || typeof state !== 'object') {
        return res.status(400).json({ message: '잘못된 상태 데이터입니다.' });
      }
      await writeState(state);
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.delete(`${API_PREFIX}/app-state`, async (req, res, next) => {
    try {
      await clearState();
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, req, res, _next) => {
    console.error('API 오류', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  });

  return app;
}

async function start() {
  try {
    await ensureDataDir();
    const app = createServer();
    app.listen(PORT, () => {
      console.log(`📦 Supply Admin API server listening on http://localhost:${PORT}${API_PREFIX}`);
      console.log(`데이터 파일 경로: ${DATA_FILE}`);
    });
  } catch (error) {
    console.error('서버를 시작하지 못했습니다.', error);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { createServer };
