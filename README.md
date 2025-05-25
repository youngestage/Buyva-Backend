# Buyva Backend

A modern backend API for Buyva built with Node.js, Express, and Supabase.

## Features

- 🔐 Authentication (Signup, Login, Logout)
- 👤 User Profile Management
- 🔒 Row Level Security (RLS) for data protection
- 🚀 Fast and scalable architecture
- 📝 Comprehensive API documentation

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Supabase account
- PostgreSQL (for local development, optional)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/buyva-backend.git
   cd buyva-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn
   ```

3. **Set up environment variables**

   Copy the example environment file and update the values:

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your Supabase credentials:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Supabase Configuration
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Client URL for CORS
   CLIENT_URL=http://localhost:3000
   ```

4. **Set up the database**

   Run the database initialization script:

   ```bash
   npm run db:init
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

   The server will be available at `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Users

- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update current user profile
- `DELETE /api/users/me` - Delete current user account

### Admin Only

- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id/role` - Update user role (admin/customer)
- `DELETE /api/users/:id` - Delete user (admin only)

## Environment Variables

- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Application environment (development/production)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)
- `JWT_SECRET` - Secret key for JWT signing
- `CLIENT_URL` - URL of your frontend application for CORS

## Project Structure

```text
├── config/           # Configuration files
│   └── db.js        # Database connection
├── controllers/      # Route controllers
│   └── authController.js
├── middlewares/      # Custom middlewares
│   └── authMiddleware.js
├── routes/           # API routes
│   └── authRoutes.js
├── .env.example      # Example environment variables
├── package.json      # Project dependencies
└── server.js         # Application entry point
```

## Deployment

1. **Production Build**

   ```bash
   npm install --production
   ```

2. **Set environment variables**
   - Make sure all required environment variables are set in your production environment

3. **Start the server**

   ```bash
   npm start
   ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request