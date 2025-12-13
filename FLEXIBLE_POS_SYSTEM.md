# Flexible POS System - Multi-Business Type Support

## 📋 Overview

Sistem POS yang fleksibel dan dapat dikonfigurasi untuk berbagai jenis bisnis, dari restaurant, retail, laundry, salon, dan lainnya.

## 🎯 Fitur Utama

### 1. Business Type System ✅

- Database schema untuk business types
- Konfigurasi per business type:
  - Support products/services
  - Inventory requirements
  - Table/kitchen management
  - Custom order status flow
  - Pricing models
  - Order fields

### 2. Supported Business Types

#### Restaurant & Cafe

- Products: ✅
- Services: ❌
- Stock Management: ✅
- Tables: ✅
- Kitchen: ✅
- Order Status: `pending` → `preparing` → `ready` → `completed`

#### Retail Store

- Products: ✅
- Services: ❌
- Stock Management: ✅
- Order Status: `pending` → `processing` → `completed`

#### Laundry

- Products: ❌
- Services: ✅
- Stock Management: ❌
- Pricing: Per kg, per item, package
- Order Fields: weight, item_type, special_notes, pickup_date
- Order Status: `received` → `washing` → `ironing` → `ready` → `completed` → `picked_up`

#### Salon & Barbershop

- Products: ✅
- Services: ✅
- Stock Management: ✅
- Order Fields: duration, therapist, notes
- Order Status: `booked` → `in_progress` → `completed`

#### Pharmacy

- Products: ✅
- Services: ❌
- Stock Management: ✅
- Order Fields: prescription, notes
- Features: prescription tracking, expiry tracking

#### General Business

- Products: ✅
- Services: ✅
- Stock Management: ✅
- Flexible configuration

## 🗄️ Database Structure

### Business Types Table

```sql
- id
- code (restaurant, retail, laundry, etc)
- name
- description
- icon
- has_products (boolean)
- has_services (boolean)
- requires_stock (boolean)
- requires_tables (boolean)
- requires_kitchen (boolean)
- order_statuses (JSON)
- pricing_models (JSON)
- order_fields (JSON)
- features (JSON)
- is_active (boolean)
- sort_order (integer)
```

### Businesses Table Update

- Added `business_type_id` foreign key

## 📝 Next Steps

### Phase 1: Backend ✅

- [x] Create BusinessType model
- [x] Create migrations
- [x] Create seeder
- [x] Create API endpoints
- [ ] Update BusinessController to include business_type_id

### Phase 2: Frontend

- [ ] Create BusinessType service
- [ ] Create BusinessType selection component
- [ ] Update BusinessSetup to include business type selection
- [ ] Update BusinessSwitcher to show business type

### Phase 3: Dynamic POS Interface

- [ ] Update ProductManagement to show/hide fields based on business type
- [ ] Update Order flow based on business type
- [ ] Update POS interface based on business type
- [ ] Custom order status handling

### Phase 4: Advanced Features

- [ ] Dynamic field system for orders
- [ ] Custom pricing model handling
- [ ] Feature flags based on business type
- [ ] Custom reports per business type

## 🚀 Usage

### 1. Run Migrations & Seeders

```bash
cd app/backend
php artisan migrate
php artisan db:seed --class=BusinessTypeSeeder
```

### 2. Create Business with Type

```php
$business = Business::create([
    'name' => 'My Restaurant',
    'business_type_id' => BusinessType::where('code', 'restaurant')->first()->id,
    // ... other fields
]);
```

### 3. Get Business Type Config

```php
$businessType = $business->businessType;
$orderStatuses = $businessType->getDefaultOrderStatuses();
$pricingModels = $businessType->getPricingModels();
$orderFields = $businessType->getOrderFields();
```

## 📚 API Endpoints

### Get All Business Types

```
GET /api/business-types
```

### Get Business Type by Code

```
GET /api/business-types/{code}
```

## 🎨 Frontend Integration

### Business Type Service

```javascript
import apiClient from "../utils/apiClient";

export const businessTypeService = {
  getAll: async () => {
    const response = await apiClient.get("/business-types");
    return response.data;
  },

  getByCode: async (code) => {
    const response = await apiClient.get(`/business-types/${code}`);
    return response.data;
  },
};
```

### Business Type Selection Component

```jsx
<BusinessTypeSelector selectedType={businessType} onSelect={handleTypeSelect} />
```

## 📖 Examples

### Restaurant Configuration

```json
{
  "code": "restaurant",
  "has_products": true,
  "has_services": false,
  "requires_stock": true,
  "requires_tables": true,
  "requires_kitchen": true,
  "order_statuses": ["pending", "preparing", "ready", "completed"],
  "pricing_models": ["per_unit"]
}
```

### Laundry Configuration

```json
{
  "code": "laundry",
  "has_products": false,
  "has_services": true,
  "requires_stock": false,
  "order_statuses": [
    "received",
    "washing",
    "ironing",
    "ready",
    "completed",
    "picked_up"
  ],
  "pricing_models": ["per_kg", "per_item", "package"],
  "order_fields": ["weight", "item_type", "special_notes", "pickup_date"]
}
```

## ✅ Status

**Current Phase:** Phase 1 - Backend Foundation ✅

**Completed:**

- ✅ Database schema
- ✅ Business Type model
- ✅ Business Type seeder (6 types)
- ✅ API endpoints

**In Progress:**

- ⏳ Frontend integration
- ⏳ Dynamic POS interface

---

**Version:** 1.0.0  
**Last Updated:** 2025-11-01  
**Author:** System Developer
