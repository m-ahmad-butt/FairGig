# FAST-Ex Frontend

Modern React application for the FAST-Ex marketplace platform.

## Tech Stack

- React 18
- Redux Toolkit (State Management)
- React Router DOM (Routing)
- Tailwind CSS (Styling)
- Socket.io Client (Real-time)
- Stripe (Payments)
- Axios (HTTP Client)
- React Hot Toast (Notifications)
- Vite (Build Tool)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`:
```
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

## Development

Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   ├── Navbar/
│   │   ├── NotificationDropdown/
│   │   └── ProtectedRoute.jsx
│   ├── pages/           # Page components
│   │   ├── login.jsx
│   │   ├── register.jsx
│   │   ├── profile.jsx
│   │   ├── messages.jsx
│   │   ├── discussions*.jsx
│   │   ├── payments.jsx
│   │   ├── transactions.jsx
│   │   ├── notifications.jsx
│   │   └── admin.jsx
│   ├── services/        # API services
│   │   └── api/
│   │       ├── authService.js
│   │       ├── userService.js
│   │       ├── directMessageService.js
│   │       ├── discussionService.js
│   │       ├── transactionService.js
│   │       ├── notificationService.js
│   │       └── adminService.js
│   ├── store/           # Redux store
│   │   ├── store.js
│   │   └── slices/
│   │       ├── authSlice.js
│   │       ├── userSlice.js
│   │       ├── directMessagesSlice.js
│   │       ├── discussionsSlice.js
│   │       ├── transactionsSlice.js
│   │       ├── notificationsSlice.js
│   │       └── adminSlice.js
│   ├── utils/           # Utility functions
│   │   ├── socket.js
│   │   └── validation.js
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── .env.example         # Environment variables template
└── package.json
```

## Features

- User authentication (login, register, OTP verification)
- Profile management
- Real-time direct messaging
- Discussion rooms and topics
- Anonymous messaging in discussions
- Payment integration with Stripe
- Transaction history
- Notifications system
- Admin dashboard
- Responsive design
- Dark mode support

## State Management

All state is managed using Redux Toolkit with the following slices:
- auth: Authentication state
- user: User profile data
- directMessages: Direct messaging state
- discussions: Discussion rooms and topics
- transactions: Payment and transaction history
- notifications: Notifications
- admin: Admin data

## API Integration

All API calls are handled through service files in `src/services/api/`. Each service corresponds to a backend microservice.

## Real-time Features

Socket.io is used for real-time features:
- Direct messaging
- Discussion messages
- Notifications

## Code Standards

- No emojis in code or UI
- Clean, structured code
- Consistent naming (camelCase for variables, PascalCase for components)
- Proper error handling
- Loading states for async operations
- Form validation
- Responsive design
- Accessibility considerations
