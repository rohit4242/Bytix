# Bytix: Automated Trading Engine

Bytix is a high-performance automated cryptocurrency trading platform built for Binance. It features a modern Next.js frontend and a robust Bun + Hono backend with real-time WebSocket integrations.

## 🚀 Overview

- **Frontend (`client`)**: A sleek, premium dashboard built with Next.js 15, Tailwind CSS 4, and Shadcn UI.
- **Backend (`server`)**: A high-speed trading engine powered by Bun, Hono, and Prisma, handling Binance API integrations and automated strategy execution.

## 🛠️ Tech Stack

### Frontend (Client)
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, Lucide Icons, Framer Motion
- **State Management**: Zustand, React Query
- **Authentication**: Better Auth

### Backend (Server)
- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL (via Prisma ORM)
- **Exchange Integration**: Binance Spot & Margin APIs
- **Real-time**: WebSockets for live market data

## 📦 Project Structure

```text
Bytix/
├── client/           # Next.js frontend application
├── server/           # Bun + Hono backend server
├── README.md         # This file
└── PUBLISHING.md     # Deployment & Publishing guide
```

## ⚙️ Local Setup

### Prerequisites
- [Bun](https://bun.sh) (Recommended) or Node.js
- PostgreSQL database

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd Bytix
```

### 2. Setup Backend
```bash
cd server
bun install
cp .env.example .env # Fill in your Binance API keys and Database URL
bun prisma generate
bun run dev
```

### 3. Setup Frontend
```bash
cd client
bun install
cp .env.example .env # Fill in your Backend URL
bun run dev
```

## 📖 Documentation
- [Publishing Guide](./PUBLISHING.md) - Step-by-step instructions for deployment.
- [Server Docs](./server/docs/) - Detailed backend API documentation.
- [Client Docs](./client/docs/) - Frontend component and logic overview.

---
Built with ❤️ by the Bytix Team.
