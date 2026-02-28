# Publishing Bytix: Step-by-Step Guide

This guide explains how to deploy the Bytix platform to production.

## 🎯 Target Architecture
- **Frontend**: Vercel (Optimal for Next.js)
- **Backend**: AWS (App Runner or EC2) or Railway/Render
- **Database**: Supabase or Managed PostgreSQL

---

## 1. Database Setup (Supabase / Managed PG)
1. Create a new PostgreSQL database.
2. Get your **DATABASE_URL**.
3. In the `server` directory, run:
   ```bash
   bun prisma db push
   ```

## 2. Backend Deployment (Server)
The backend is designed for Bun and Docker.

### Option A: Railway / Render (Easiest)
1. Link your GitHub repository.
2. Set the root directory to `server`.
3. Add environment variables from `server/.env`.
4. The system will detect the `Dockerfile` and deploy automatically.

### Option B: AWS (Recommended)
1. Build the Docker image:
   ```bash
   cd server
   docker build -t bytix-server .
   ```
2. Push to Amazon ECR.
3. Deploy to **AWS App Runner** or **ECS**.

## 3. Frontend Deployment (Client)
Vercel is the best platform for Next.js projects.

1. Connect your GitHub repo to **Vercel**.
2. Set the root directory to `client`.
3. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL.
   - `BETTER_AUTH_SECRET`: A secure random string.
4. Click **Deploy**.

## 4. Final Verification
1. Ensure the frontend can reach the backend (CORS settings in `server/src/index.ts`).
2. Test the Binance WebSocket connection.
3. Verify that the `prisma` client is correctly seeded if necessary.

---

### 🚨 Critical Checklist
- [ ] Set `NODE_ENV=production`.
- [ ] Use `https` for all API calls.
- [ ] Rotate your Binance API keys and use secret management.
- [ ] Update `Better Auth` allowed origins to your production domain.
