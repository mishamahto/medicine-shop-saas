# Medicine Shop SaaS Application

A comprehensive SaaS application for medicine shops to manage inventory, purchase orders, invoices, bills, and contacts (customers, wholesalers, staff).

## 🚀 Features

- **Inventory Management**: Track medicines, stock levels, expiry dates, low stock alerts
- **Purchase Orders**: Create and manage orders from wholesalers
- **Invoices**: Generate and manage customer invoices
- **Bills**: Track and manage vendor bills
- **Contacts**: Unified management of customers, wholesalers, and staff
- **Dashboard**: Real-time statistics and analytics
- **Authentication**: Secure JWT-based authentication
- **Responsive UI**: Modern React interface with Tailwind CSS

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, SQLite
- **Frontend**: React.js, React Query, Tailwind CSS
- **Authentication**: JWT, bcrypt
- **Database**: SQLite with automatic initialization
- **Security**: Helmet, CORS, Rate Limiting

## 📦 Installation

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/mishamahto/medicine-shop-saas.git
   cd medicine-shop-saas
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Login Credentials
- Username: `admin`
- Password: `admin123`

## 🚀 Deployment

### Google Cloud Platform (GCP)

This application is configured for deployment on Google Cloud Platform using Cloud Run.

**For detailed deployment instructions, see:**
- [GCP_DEPLOYMENT.md](GCP_DEPLOYMENT.md) - Complete GCP deployment guide
- [gcp-setup.sh](gcp-setup.sh) - Automated GCP setup script

**Quick Start:**
1. **Run the setup script:**
   ```bash
   chmod +x gcp-setup.sh
   ./gcp-setup.sh
   ```

2. **Follow the GCP deployment guide** for detailed steps

**Environment Variables (Optional):**
```env
NODE_ENV=production
JWT_SECRET=your_jwt_secret_here
```

## 📁 Project Structure

```
medicine-shop-saas/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── contexts/      # React contexts
│   └── public/            # Static files
├── server/                # Node.js backend
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── database/          # Database setup
│   └── index.js           # Server entry point
├── package.json           # Root package.json
└── README.md             # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Inventory
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Create new item
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item

### Purchase Orders
- `GET /api/purchase-orders` - Get all orders
- `POST /api/purchase-orders` - Create new order
- `PATCH /api/purchase-orders/:id/status` - Update order status

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `PATCH /api/invoices/:id/status` - Update invoice status

### Bills
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Create new bill
- `PUT /api/bills/:id` - Update bill

### Contacts
- `GET /api/customers` - Get all customers
- `GET /api/wholesalers` - Get all wholesalers
- `GET /api/staff` - Get all staff

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Rate limiting
- Helmet security headers
- Input validation and sanitization

## 📊 Database Schema

The application uses SQLite with the following main tables:
- `users` - User authentication
- `inventory` - Medicine inventory
- `purchase_orders` - Purchase orders
- `invoices` - Customer invoices
- `bills` - Vendor bills
- `customers` - Customer information
- `wholesalers` - Wholesaler information
- `staff` - Staff information
- `categories` - Medicine categories

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/mishamahto/medicine-shop-saas/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

## 🎯 Roadmap

- [ ] Multi-tenant architecture
- [ ] Advanced reporting and analytics
- [ ] Mobile app (React Native)
- [ ] Email notifications
- [ ] Barcode scanning
- [ ] Integration with payment gateways
- [ ] Backup and restore functionality
- [ ] Multi-language support

---

**Built with ❤️ for medicine shops worldwide** 

const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/medicine_shop.db'  // ✅ Writable in production
  : path.join(__dirname, 'medicine_shop.db'); // ✅ Local development 