# API Endpoints - ByteShop

## 🔗 Base URL
```
http://localhost:3000/api
```

## 🔐 Autenticação

Todas as rotas protegidas requerem o header:
```
Authorization: Bearer <token>
```

---

## 📋 Endpoints

### 🏥 Health Check

#### Check Server Status
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

---

## 👤 Authentication (`/api/auth`)

### Register User
```http
POST /api/auth/register
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "customer"
    },
    "token": "jwt_token"
  }
}
```

### Login
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "jwt_token"
  }
}
```

---

## 🛍️ Products (`/api/products`)

### List Products (Public)
```http
GET /api/products?page=1&limit=20&category=laptops&min_price=500&max_price=2000&search=gaming&in_stock=true
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `category` (optional): Product category
- `min_price` (optional): Minimum price
- `max_price` (optional): Maximum price
- `search` (optional): Search term
- `in_stock` (optional): Only products in stock

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Gaming Laptop XYZ",
      "description": "High-performance gaming laptop",
      "price": 1299.99,
      "stock_quantity": 15,
      "category": "laptops",
      "image_url": "https://...",
      "specifications": {
        "processor": "Intel i7",
        "ram": "16GB"
      },
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Get Single Product (Public)
```http
GET /api/products/:id
```

### Create Product (Admin Only)
```http
POST /api/products
Authorization: Bearer <admin_token>
```

**Body:**
```json
{
  "name": "Gaming Laptop XYZ",
  "description": "High-performance gaming laptop with RTX 4080",
  "price": 1299.99,
  "stock_quantity": 15,
  "category": "laptops",
  "image_url": "https://example.com/image.jpg",
  "specifications": {
    "processor": "Intel i7-13700H",
    "ram": "16GB DDR5",
    "storage": "1TB NVMe SSD"
  }
}
```

### Update Product (Admin Only)
```http
PUT /api/products/:id
Authorization: Bearer <admin_token>
```

**Body:** (All fields optional)
```json
{
  "price": 1199.99,
  "stock_quantity": 20,
  "is_active": true
}
```

### Delete Product (Admin Only)
```http
DELETE /api/products/:id
Authorization: Bearer <admin_token>
```

---

## 🛒 Cart (`/api/cart`)

### Get User Cart (Authenticated)
```http
GET /api/cart
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "quantity": 2,
      "product": {
        "name": "Gaming Laptop XYZ",
        "price": 1299.99,
        "image_url": "https://..."
      }
    }
  ]
}
```

### Add to Cart (Authenticated)
```http
POST /api/cart
Authorization: Bearer <token>
```

**Body:**
```json
{
  "product_id": "uuid",
  "quantity": 2
}
```

### Update Cart Item (Authenticated)
```http
PUT /api/cart/:itemId
Authorization: Bearer <token>
```

**Body:**
```json
{
  "quantity": 3
}
```

### Remove from Cart (Authenticated)
```http
DELETE /api/cart/:itemId
Authorization: Bearer <token>
```

### Clear Cart (Authenticated)
```http
DELETE /api/cart
Authorization: Bearer <token>
```

---

## 📦 Orders (`/api/orders`)

### Get User Orders (Authenticated)
```http
GET /api/orders?page=1&limit=10&status=pending
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by order status

### Get All Orders (Admin Only)
```http
GET /api/orders/all?user_id=uuid&status=processing&start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <admin_token>
```

### Get Single Order (Authenticated)
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

### Create Order (Authenticated)
```http
POST /api/orders
Authorization: Bearer <token>
```

**Body:**
```json
{
  "shipping_address": "123 Main St, City, State 12345",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 2
    },
    {
      "product_id": "uuid",
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "total_amount": 2599.98,
      "status": "pending",
      "shipping_address": "123 Main St...",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "items": [...]
  },
  "message": "Order created successfully"
}
```

### Update Order Status (Admin Only)
```http
PATCH /api/orders/:id/status
Authorization: Bearer <admin_token>
```

**Body:**
```json
{
  "status": "processing"
}
```

---

## 📊 Error Responses

All endpoints may return error responses:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🎯 Product Categories

- `laptops`
- `smartphones`
- `tablets`
- `accessories`
- `components`
- `peripherals`

## 📦 Order Status

- `pending` - Order created, awaiting payment
- `processing` - Payment confirmed, preparing shipment
- `shipped` - Order shipped
- `delivered` - Order delivered
- `cancelled` - Order cancelled

---

**Base URL:** `http://localhost:3000/api`
