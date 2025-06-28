# Medicine Shop SaaS Application

A comprehensive SaaS application for medicine shops and pharmacies to manage inventory, purchase orders, invoices, billing, and customer relationships.

## Features

### 🏥 Core Management
- **Inventory Management**: Track medicine stock, expiry dates, low stock alerts
- **Purchase Orders**: Order from wholesalers with status tracking
- **Invoicing**: Create customer bills with automatic inventory updates
- **Daily Bills**: Track daily expenses and vendor payments

### 👥 Contact Management
- **Customer Management**: Store customer contacts and purchase history
- **Staff Management**: Employee records with positions and salaries
- **Wholesaler Management**: Supplier contacts and payment terms

### 📊 Analytics & Reporting
- **Dashboard**: Real-time statistics and recent activity
- **Sales Analytics**: Revenue tracking and payment status
- **Inventory Reports**: Stock levels and expiry monitoring
- **Purchase Statistics**: Order tracking and supplier analysis

### 🔐 Security & Authentication
- **JWT Authentication**: Secure login with role-based access
- **User Management**: Admin and staff roles
- **Password Security**: Bcrypt hashing for passwords

## Technology Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database for data persistence
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend
- **React 18** with functional components
- **React Router** for navigation
- **React Query** for data fetching
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **React Hook Form** for form management

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd medicine-shop-saas
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   npm install
   
   # Install frontend dependencies
   cd client
   npm install
   cd ..
   ```

3. **Start the application**
   ```bash
   # Start both backend and frontend (recommended)
   npm run dev
   
   # Or start them separately:
   # Backend only
   npm run server
   
   # Frontend only
   npm run client
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Login Credentials
- **Username**: admin
- **Password**: admin123

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Inventory
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create new item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `PATCH /api/inventory/:id/stock` - Update stock quantity

### Purchase Orders
- `GET /api/purchase-orders` - Get all orders
- `POST /api/purchase-orders` - Create new order
- `PATCH /api/purchase-orders/:id/status` - Update order status
- `POST /api/purchase-orders/:id/receive` - Receive items

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `PATCH /api/invoices/:id/status` - Update invoice status
- `POST /api/invoices/:id/pay` - Mark as paid

### Bills
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Create new bill
- `PUT /api/bills/:id` - Update bill
- `DELETE /api/bills/:id` - Delete bill

### Contacts
- `GET /api/customers` - Get all customers
- `GET /api/staff` - Get all staff
- `GET /api/wholesalers` - Get all wholesalers

## Database Schema

The application uses SQLite with the following main tables:
- `users` - Authentication and user management
- `inventory` - Medicine inventory with expiry tracking
- `purchase_orders` - Orders from wholesalers
- `invoices` - Customer sales and billing
- `bills` - Daily expenses and vendor payments
- `customers` - Customer contact information
- `staff` - Employee records
- `wholesalers` - Supplier information

## Development

### Project Structure
```
medicine-shop-saas/
├── server/                 # Backend Node.js/Express
│   ├── database/          # Database initialization
│   ├── middleware/        # Authentication middleware
│   ├── routes/           # API routes
│   └── index.js          # Server entry point
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── App.js        # Main app component
│   └── public/           # Static files
└── package.json          # Root package.json
```

### Available Scripts
- `npm run dev` - Start both backend and frontend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run build` - Build frontend for production
- `npm run install-all` - Install all dependencies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository. 