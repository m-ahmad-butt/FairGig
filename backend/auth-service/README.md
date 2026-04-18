# Auth Service

Authentication and authorization service for FairGig platform.

## Features

- User registration with email verification (OTP)
- Role-based access control (worker, verifier, analyst)
- Admin approval workflow for verifier and analyst roles
- JWT-based authentication with refresh tokens
- Email notifications

## User Roles

- **Worker**: Auto-approved after email verification
- **Verifier**: Requires admin approval after email verification
- **Analyst**: Requires admin approval after email verification

## Admin Email

Admin: `l233059@lhr.nu.edu.pk`

## Environment Variables

```env
PORT=4001
DATABASE_URL=mongodb://localhost:27017/fairgig-auth
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SERVICE_NAME=auth-service
```

## Run locally (without Docker)

**Important: MongoDB must be running as a replica set for Prisma to work.**

### Option 1: Using existing MongoDB (Recommended for development)

1. Stop your current MongoDB if running
2. Start MongoDB with replica set:
```bash
# Windows
mongod --replSet rs0 --port 27017 --dbpath C:\data\db

# Mac/Linux
mongod --replSet rs0 --port 27017 --dbpath /usr/local/var/mongodb
```

3. In a new terminal, initialize the replica set:
```bash
npm install
npm run init-replica
```

4. Generate Prisma client and push schema:
```bash
npm run prisma:generate
npm run prisma:push
```

5. Start the service:
```bash
npm run dev
```

### Option 2: Using Docker Compose (Easier)

```bash
docker compose -f docker-compose.local.yml up --build
```

This will automatically set up MongoDB as a replica set.

## Local Docker Compose

- docker compose -f docker-compose.local.yml up --build

## Health check

- GET /health

## API Endpoints

### Public Endpoints

#### POST /api/auth/signup
Register a new user.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "worker"
}
```

#### POST /api/auth/verify-otp
Verify email with OTP.

**Request:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

#### POST /api/auth/resend-otp
Resend OTP to email.

#### POST /api/auth/login
Login with email and password.

**Response:**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": { "id": "...", "name": "...", "email": "...", "role": "..." }
}
```

#### POST /api/auth/refresh
Refresh access token.

### Protected Endpoints

#### GET /api/auth/me
Get current user info. Requires `Authorization: Bearer <token>` header.

#### POST /api/auth/logout
Logout user.

### Admin Endpoints

Requires admin email and `Authorization: Bearer <token>` header.

#### GET /api/auth/admin/pending-users
Get all pending users awaiting approval.

#### POST /api/auth/admin/approve-user/:userId
Approve a pending user.

#### POST /api/auth/admin/reject-user/:userId
Reject a pending user.

## Workflow

### Worker Registration
1. Sign up → 2. Verify OTP → 3. Auto-activated → 4. Login

### Verifier/Analyst Registration
1. Sign up → 2. Verify OTP → 3. Pending approval → 4. Admin approves → 5. Login
