# 🛠️ Buyva Backend Architecture (Using Supabase)

## 📌 Overview
This document outlines the backend architecture and plan for **Buyva**, a dropshipping e-commerce platform, using **Supabase** as the backend-as-a-service (BaaS) solution.

---

## ✅ Why Supabase is a Great Fit

| Feature             | Benefit                                                                 |
|---------------------|-------------------------------------------------------------------------|
| **No Backend Setup** | Auto-generated REST/GraphQL APIs from PostgreSQL                        |
| **Auth System**      | Email/password, OTP, OAuth, magic link login                           |
| **File Storage**     | Built-in secure file and image storage                                  |
| **Realtime & RLS**   | Realtime updates + Row-Level Security (RLS) for access control          |
| **Edge Functions**   | Custom logic with serverless Node.js functions                          |
| **Scalable SQL DB**  | Full PostgreSQL with SQL query support                                  |
| **Free Tier**        | Suitable for MVP/testing                                                 |

---

## ⚙️ Suggested Tech Stack

| Layer         | Technology                     |
|---------------|----------------------------------|
| Frontend      | React or Next.js + Tailwind CSS |
| Backend API   | Supabase REST/GraphQL + JS SDK  |
| Auth          | Supabase Auth                   |
| Database      | Supabase PostgreSQL             |
| File Storage  | Supabase Storage                |
| Payments      | Paystack                        |
| Image Uploads | Supabase Storage or Cloudinary  |

---

## 🧱 Database Schema Design

### Tables:
- **Users**
  - id (uuid, from Supabase Auth)
  - email
  - full_name
  - role (customer | vendor | admin)
  - created_at

- **Products**
  - id
  - name
  - price
  - description
  - image_url
  - vendor_id (foreign key to Users)
  - category_id (foreign key to Categories)
  - created_at

- **Categories**
  - id
  - name

- **Orders**
  - id
  - customer_id (foreign key to Users)
  - status (pending | shipped | completed)
  - total_amount
  - created_at

- **Order_Items**
  - id
  - order_id (foreign key to Orders)
  - product_id (foreign key to Products)
  - quantity
  - price

- **Addresses**
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
- Role tagging via `user_metadata`

```ts
const { user, session, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: { role: 'vendor' } // or 'customer', 'admin'
  }
});
```

---

## 🖼️ Image & File Uploads

- Use Supabase Storage to upload product and user images
- Secure public/private buckets
- Or use Cloudinary for external optimization

---

## 🔄 API Interaction Example (Supabase JS Client)

```ts
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('your-url', 'your-anon-key');

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
```

---

## ⚡ Custom Logic (Supabase Edge Functions)

Use Edge Functions for:
- Handling payment webhooks from Paystack
- Sending confirmation emails
- Running background tasks (e.g., order cleanup)

```bash
supabase functions new handle-payment
```

Example in `handle-payment/index.ts`:
```ts
export const handler = async (req) => {
  const payload = await req.json();
  // Process Paystack webhook
};
```

---

## 🔐 Security: Row-Level Security (RLS)

Write policies like:
```sql
-- Allow vendors to see their products
CREATE POLICY "Vendors can view own products"
  ON products
  FOR SELECT
  USING (auth.uid() = vendor_id);
```

---

## 📦 Order Fulfillment Flow

1. **Customer** places order via frontend → `orders` & `order_items` tables
2. **Vendor** gets notified (optional via webhook/email)
3. Order status updates from `pending → shipped → completed`

---

## 🧾 Payments (Using Paystack)
- Collect and verify customer payments
- Trigger order confirmation via webhook
- Log payments in a `payments` table (optional)

---

## 📊 Admin Panel (Optional)
- Built using Supabase dashboard or custom panel
- Role-based access to see reports, user data, etc.

---

## 🔍 Realtime Features (Optional)
- Listen to new orders or inventory changes
- Use Supabase's `realtime` to sync changes instantly

---

## 🚀 Deployment & Scaling
- Supabase is hosted and scales automatically
- Optionally use Vercel or Netlify for frontend
- Can migrate to full custom backend later if needed

---

## 📌 Summary
- Supabase handles **Auth**, **Database**, **APIs**, **Storage**, and **Realtime**
- Optional: Add custom logic with Edge Functions
- Secure and scalable from MVP to production

---

> ✅ You’re now ready to use Supabase as your backend for Buyva!
