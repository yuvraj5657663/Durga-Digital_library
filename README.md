# Durga Digital Library - Production Monorepo

A production-grade library management system built as a clean monorepo with separate client and server applications. **Legacy code has been completely removed and replaced with modern architecture.**

## 🏗️ Architecture

### Monorepo Structure
```
durga-library-system/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── admin/     # Admin portal components
│   │   │   ├── student/   # Student portal components
│   │   │   └── shared/    # Shared components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # Zustand state management
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Utility functions
│   ├── public/            # Static assets
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── server/                # Express backend
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── controllers/   # Route controllers
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Data access layer
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── middlewares/   # Express middlewares
│   │   ├── validators/    # Joi validators
│   │   ├── jobs/          # Cron jobs & WhatsApp
│   │   ├── utils/         # Utility functions
│   │   └── tests/         # Test files
│   ├── logs/              # Application logs
│   ├── uploads/           # File uploads
│   ├── package.json
│   ├── ecosystem.config.js # PM2 configuration
│   └── Dockerfile
├── scripts/               # Utility scripts
│   ├── migrate.js         # Migration script
│   └── deploy.sh          # Deployment script
├── docker-compose.yml     # Docker orchestration
├── nginx.conf            # Nginx configuration
└── package.json          # Root package.json
```

## 🚀 Features

### Backend (Server)
- **Express.js** with RESTful API architecture
- **MongoDB** with Mongoose ODM
- **JWT Authentication** with refresh tokens
- **Service-Repository Pattern** for clean architecture
- **Centralized Validation** using Joi
- **Error Handling** with custom error classes
- **Winston Logging** with file and console outputs
- **Audit Logging** for all critical operations
- **MongoDB Transactions** for data consistency
- **Rate Limiting** for API protection
- **Cron Jobs** for membership expiry and reminders
- **WhatsApp Integration** for notifications
- **Email Service** with Nodemailer
- **PDF Generation** for receipts and ID cards
- **QR Code Generation** for student identification

### Frontend (Client)
- **React 18** with Vite for fast development
- **React Router** for client-side routing
- **React Query** for server state management
- **Zustand** for client state management
- **Axios** with interceptors for API calls
- **Tailwind CSS** for mobile-first UI
- **Lucide Icons** for consistent iconography
- **Protected Routes** with role-based access
- **Responsive Design** for all screen sizes
- **Admin Portal** for library management
- **Student Portal** for self-service features

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local or Atlas)
- PM2 (for production deployment)
- Docker & Docker Compose (optional)

## 🔧 Setup

### Quick Start

```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run dev
```

This will start:
- Server on http://localhost:3000
- Client on http://localhost:5173

### Environment Configuration

The repository is pre-configured with environment files:

**Server (`server/.env`):**
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/durga-library
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ACCESS_EXPIRES=1h
JWT_REFRESH_EXPIRES=7d
ADMIN_USER=admin
ADMIN_PASS=admin123
ADMIN_EMAIL=admin@durga-library.local
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
DISABLE_WHATSAPP=false
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Client (`client/.env`):**
```env
VITE_API_URL=http://localhost:3000/api/v1
```

**Note**: The root `.env` file is used for local development convenience. Both `server/.env` and `client/.env` should be configured for production.

## 🎯 Development

### Start Both Applications

```bash
# From root directory
npm run dev
```

This starts:
- Server on http://localhost:3000
- Client on http://localhost:5173

### Start Server Only

```bash
cd server
npm run dev
```

### Start Client Only

```bash
cd client
npm run dev
```

## 🏗️ Building

### Build for Production

```bash
# Build both
npm run build

# Build server only
npm run build:server

# Build client only
npm run build:client
```

## 🚢 Deployment

### Using PM2

```bash
# Build applications
npm run build

# Deploy using script
bash scripts/deploy.sh

# Or manually
cd server
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Using Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Using Nginx

1. Copy nginx.conf to your Nginx configuration directory
2. Update server_name in nginx.conf
3. Restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 📊 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Admin Routes
- `GET /api/v1/admin/stats` - Dashboard statistics
- `GET /api/v1/admin/students` - List students
- `POST /api/v1/admin/memberships/renew` - Renew membership
- `GET /api/v1/admin/attendance` - Get attendance
- `POST /api/v1/admin/announcements` - Create announcement

### Student Routes
- `GET /api/v1/student/dashboard` - Student dashboard
- `GET /api/v1/student/profile` - Get profile
- `GET /api/v1/student/attendance` - Get attendance history
- `GET /api/v1/student/payments` - Get payment history

### Public Routes
- `POST /api/v1/inquiries` - Submit inquiry
- `POST /api/v1/online-admissions` - Submit admission request

## 🧪 Testing

```bash
# Run all tests
npm test

# Run server tests
cd server
npm test

# Run client tests
cd client
npm test
```

## 📝 Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run linters
- `npm run clean` - Clean build artifacts

## 🔒 Security Features

- JWT authentication with refresh tokens
- Rate limiting on all endpoints
- CORS configuration
- Helmet.js security headers
- Input validation with Joi
- Password hashing with bcrypt
- SQL injection prevention (NoSQL)
- XSS protection
- CSRF protection (stateless JWT)

## 📱 Mobile-First Design

The client application is built with mobile-first principles:
- Responsive layouts using Tailwind CSS
- Touch-friendly UI components
- Optimized for small screens
- Progressive enhancement
- Fast loading with code splitting

## 🗄️ Database Models

- **User** - Authentication and user management
- **Student** - Student information and status
- **Membership** - Membership tracking
- **Payment** - Payment records
- **Attendance** - Attendance tracking
- **Announcement** - Library announcements
- **Notification** - User notifications
- **AuditLog** - System audit trail
- **Seat** - Seat management
- **Branch** - Multi-branch support
- **Inquiry** - Admission inquiries
- **AdmissionRequest** - Online admission requests

## 🔄 Migration from Old Structure

The repository has been completely cleaned up and migrated from the legacy structure. All old files have been removed:

### What Was Removed
- **Legacy Frontend**: `public/` directory with HTML/CSS/JS
- **Legacy Backend**: Old `src/` directory with duplicate code
- **SQLite Files**: `library.db`, `library.db-shm`, `library.db-wal`
- **Obsolete Scripts**: `clear-data.js`, `nodemon.json`, old test files
- **Duplicate Configuration**: Multiple package.json files

### New Clean Structure
- **`client/`**: Modern React + Vite frontend
- **`server/`**: Express + MongoDB backend with service-repository pattern
- **`scripts/`**: Utility scripts for deployment
- **Root files**: Only configuration and documentation

For detailed cleanup information, see [CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)

## 📞 Support

For issues and questions:
- GitHub Issues: [repository-url]
- Email: support@durgalibrary.com

## 📄 License

ISC

---

**Built with ❤️ for Durga Digital Library**
