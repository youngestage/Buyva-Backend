# 🛠️ Buyva Backend Architecture (Using Supabase + TypeScript)

## 📌 Overview
This document outlines the backend architecture and plan for Buyva, a dropshipping e-commerce platform, using Supabase as the backend-as-a-service (BaaS) solution. The project will be developed in TypeScript for improved type safety, scalability, and developer experience.

---

## ✅ Why Supabase + TypeScript is a Great Fit

| Feature             | Benefit                                                                 |
|---------------------|-------------------------------------------------------------------------|
| No Backend Setup | Auto-generated REST/GraphQL APIs from PostgreSQL                        |
| TypeScript Native| Full TypeScript support with type-safe client                          |
| Auth System      | Email/password, OTP, OAuth, magic link login                           |
| File Storage     | Built-in secure file and image storage                                  |
| Realtime & RLS   | Realtime updates + Row-Level Security (RLS) for access control          |
| Edge Functions   | Custom logic with serverless TypeScript functions                       |
| Scalable SQL DB  | Full PostgreSQL with SQL query support                                  |
| Free Tier        | Suitable for MVP/testing                                                 |

---

## ⚙️ Suggested Tech Stack

| Layer         | Technology                            |
|---------------|-----------------------------------------|
| Frontend      | React + TypeScript + Tailwind CSS      |
| Backend API   | Supabase REST/GraphQL + TS SDK         |
| Auth          | Supabase Auth                          |
| Database      | Supabase PostgreSQL                    |
| File Storage  | Supabase Storage                       |
| Payments      | Paystack                               |
| Image Uploads | Supabase Storage or Cloudinary         |

---

## 🧱 Database Schema Design

### Tables:
- Users
  - id (uuid, from Supabase Auth)
  - email
  - full_name
  - role (customer | vendor | admin)
  - created_at

- Products
  - id
  - name
  - price
  - description
  - image_url
  - vendor_id (foreign key to Users)
  - category_id (foreign key to Categories)
  - created_at

- Categories
  - id
  - name

- Orders
  - id
  - customer_id (foreign key to Users)
  - status (pending | shipped | completed)
  - total_amount
  - created_at

- Order_Items
  - id
  - order_id (foreign key to Orders)
  - product_id (foreign key to Products)
  - quantity
  - price

- Addresses
  - id
  - user_id
  - address_line
  - city
  - state
  - zip_code

---

## 🔐 Authentication

### Features:
- Email/password signup & login
- OAuth optional (Google, GitHub, etc.)
- Role tagging via user_metadata

const { user, session, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: { role: 'vendor' } // or 'customer', 'admin'
  }
});
---

## 🖼️ Image & File Uploads

- Use Supabase Storage to upload product and user images
- Secure public/private buckets
- Or use Cloudinary for external optimization

---

## 🔄 API Interaction Example (TypeScript)

import { createClient } from '@supabase/supabase-js';
import { Database } from './types/supabase';

const supabase = createClient<Database>('your-url', 'your-anon-key');

// Fetch all products
const { data, error } = await supabase.from('products').select('*');

// Insert product
await supabase.from('products').insert({
  name: 'Nike Slides',
  price: 15000,
  vendor_id: 'uuid',
  image_url: 'https://...',
  category_id: 1
});
---

## ⚡ Custom Logic (Supabase Edge Functions with TypeScript)

Use Edge Functions for:
- Handling payment webhooks from Paystack
- Sending confirmation emails
- Running background tasks (e.g., order cleanup)

supabase functions new handle-payment