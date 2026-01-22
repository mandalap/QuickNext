// ==========================================
// 2. src/config/validation.schemas.js
// ==========================================
import * as z from 'zod';

export const authSchemas = {
  login: z.object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),

  register: z
    .object({
      name: z.string().min(3, 'Nama minimal 3 karakter'),
      email: z.string().email('Email tidak valid'),
      password: z.string().min(6, 'Password minimal 6 karakter'),
      password_confirmation: z.string(),
    })
    .refine(data => data.password === data.password_confirmation, {
      message: 'Password tidak cocok',
      path: ['password_confirmation'],
    }),
};

export const productSchemas = {
  create: z.object({
    name: z.string().min(3, 'Nama produk minimal 3 karakter'),
    category_id: z.string().min(1, 'Kategori wajib dipilih'),
    price: z.number().positive('Harga harus lebih dari 0'),
    stock: z.number().int().min(0, 'Stok tidak boleh negatif'),
    description: z.string().optional(),
  }),

  stockAdjustment: z.object({
    quantity: z.number().int('Jumlah harus berupa angka bulat'),
    type: z.enum(['add', 'subtract'], {
      errorMap: () => ({ message: 'Tipe harus add atau subtract' }),
    }),
    reason: z.string().min(5, 'Alasan minimal 5 karakter'),
  }),
};

export const customerSchemas = {
  create: z.object({
    name: z.string().min(3, 'Nama minimal 3 karakter'),
    phone: z.string().min(10, 'Nomor telepon tidak valid'),
    email: z.string().email('Email tidak valid').optional(),
    address: z.string().optional(),
  }),
};

export const orderSchemas = {
  create: z.object({
    customer_id: z.string().optional(),
    table_id: z.string().optional(),
    items: z
      .array(
        z.object({
          product_id: z.string(),
          quantity: z.number().int().positive(),
          notes: z.string().optional(),
        })
      )
      .min(1, 'Order harus memiliki minimal 1 item'),
    discount_code: z.string().optional(),
    notes: z.string().optional(),
  }),

  payment: z.object({
    payment_method: z.enum(['cash', 'card', 'qris', 'transfer']),
    amount_paid: z.number().positive('Jumlah bayar harus lebih dari 0'),
  }),
};

export const employeeSchemas = {
  create: z.object({
    name: z.string().min(3, 'Nama minimal 3 karakter'),
    email: z.string().email('Email tidak valid'),
    phone: z.string().min(10, 'Nomor telepon tidak valid'),
    role: z.enum(['cashier', 'kitchen', 'waiter', 'manager']),
    password: z.string().min(6, 'Password minimal 6 karakter'),
  }),
};

export const discountSchemas = {
  create: z.object({
    code: z.string().min(3, 'Kode minimal 3 karakter').toUpperCase(),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive('Nilai harus lebih dari 0'),
    min_purchase: z
      .number()
      .min(0, 'Minimal pembelian tidak boleh negatif')
      .optional(),
    max_discount: z.number().positive().optional(),
    valid_from: z.string(),
    valid_until: z.string(),
    usage_limit: z.number().int().positive().optional(),
  }),
};

export const tableSchemas = {
  create: z.object({
    table_number: z.string().min(1, 'Nomor meja wajib diisi'),
    capacity: z.number().int().positive('Kapasitas harus lebih dari 0'),
    location: z.string().optional(),
  }),
};
