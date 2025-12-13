# Contoh Perbaikan Dialog - Quick Reference

## 🚀 Quick Fix untuk Modal Umum

### 1. CloseShiftModal.jsx

```jsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function CloseShiftModal({ isOpen, onClose, onSubmit, shift }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* ✅ ADD THIS */}
        <DialogHeader>
          <DialogTitle>Tutup Shift</DialogTitle>
          <DialogDescription>
            Masukkan jumlah uang tunai aktual di laci kasir.
            Expected: Rp {shift?.expected_cash?.toLocaleString('id-ID')}
          </DialogDescription>
        </DialogHeader>

        {/* Your existing content - remove <h2> if exists */}
        <div className="space-y-4">
          {/* ... */}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">Batal</Button>
          <Button onClick={onSubmit}>Tutup Shift</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. OpenShiftModal.jsx

```jsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-md">
    {/* ✅ ADD THIS */}
    <DialogHeader>
      <DialogTitle>Buka Shift Baru</DialogTitle>
      <DialogDescription>
        Masukkan nama shift dan modal awal untuk memulai shift kasir
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Shift name input */}
      <div>
        <Label htmlFor="shift_name">Nama Shift</Label>
        <Input id="shift_name" {...} />
      </div>

      {/* Opening balance input */}
      <div>
        <Label htmlFor="opening_balance">Modal Awal</Label>
        <Input id="opening_balance" type="number" {...} />
      </div>

      <DialogFooter>
        <Button type="button" onClick={onClose} variant="outline">
          Batal
        </Button>
        <Button type="submit">Buka Shift</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### 3. PaymentModal.jsx

```jsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-2xl">
    {/* ✅ ADD THIS */}
    <DialogHeader>
      <DialogTitle>Pembayaran Order #{order?.order_number}</DialogTitle>
      <DialogDescription>
        Total pembayaran: Rp {order?.total?.toLocaleString('id-ID')}.
        Pilih metode pembayaran dan masukkan jumlah.
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-6">
      {/* Payment method selection */}
      <div>
        <Label>Metode Pembayaran</Label>
        <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="cash" id="cash" />
            <Label htmlFor="cash">Tunai</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="card" id="card" />
            <Label htmlFor="card">Kartu</Label>
          </div>
          {/* ... other methods */}
        </RadioGroup>
      </div>

      {/* Amount input */}
      <div>
        <Label htmlFor="amount">Jumlah Pembayaran</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {/* Change calculation */}
      {paymentMethod === 'cash' && amount > order?.total && (
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            Kembalian: <span className="font-bold">
              Rp {(amount - order?.total).toLocaleString('id-ID')}
            </span>
          </p>
        </div>
      )}
    </div>

    <DialogFooter>
      <Button onClick={onClose} variant="outline">Batal</Button>
      <Button onClick={handlePayment}>Proses Pembayaran</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 4. CustomerFormModal.jsx

```jsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-md">
    {/* ✅ ADD THIS */}
    <DialogHeader>
      <DialogTitle>
        {customer ? 'Edit Customer' : 'Tambah Customer Baru'}
      </DialogTitle>
      <DialogDescription>
        {customer
          ? 'Update informasi customer yang sudah ada'
          : 'Masukkan informasi customer untuk ditambahkan ke database'
        }
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nama Customer *</Label>
        <Input id="name" {...} />
      </div>

      <div>
        <Label htmlFor="phone">No. Telepon</Label>
        <Input id="phone" type="tel" {...} />
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...} />
      </div>

      <DialogFooter>
        <Button type="button" onClick={onClose} variant="outline">
          Batal
        </Button>
        <Button type="submit">
          {customer ? 'Update' : 'Tambah'} Customer
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### 5. ConfirmationDialog (Generic)

```jsx
function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default" // or "destructive"
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* ✅ ALWAYS INCLUDE */}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            variant={variant}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Usage:
<ConfirmationDialog
  isOpen={showDeleteDialog}
  onClose={() => setShowDeleteDialog(false)}
  onConfirm={handleDelete}
  title="Hapus Item?"
  description="Apakah Anda yakin ingin menghapus item ini? Aksi ini tidak dapat dibatalkan."
  confirmText="Hapus"
  cancelText="Batal"
  variant="destructive"
/>
```

### 6. QRMenuModal.jsx

```jsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-md">
    {/* ✅ ADD THIS */}
    <DialogHeader>
      <DialogTitle>QR Code Menu - Table {table?.name}</DialogTitle>
      <DialogDescription>
        Scan QR code ini untuk akses menu self-service
      </DialogDescription>
    </DialogHeader>

    <div className="flex flex-col items-center space-y-4 py-4">
      {/* QR Code Display */}
      <div className="p-4 bg-white rounded-lg border">
        <QRCode value={qrUrl} size={256} />
      </div>

      {/* Table Info */}
      <div className="text-center">
        <p className="font-medium">{table?.name}</p>
        <p className="text-sm text-muted-foreground">
          URL: {qrUrl}
        </p>
      </div>
    </div>

    <DialogFooter>
      <Button onClick={handlePrint} variant="outline">
        <Printer className="mr-2 h-4 w-4" />
        Print QR Code
      </Button>
      <Button onClick={onClose}>Tutup</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 7. ReceiptModal.jsx

```jsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-md">
    {/* ✅ ADD THIS */}
    <DialogHeader>
      <DialogTitle>Receipt - Order #{order?.order_number}</DialogTitle>
      <DialogDescription>
        Struk pembayaran untuk order ini. Anda bisa print atau download.
      </DialogDescription>
    </DialogHeader>

    {/* Receipt Content */}
    <div className="receipt-content">
      {/* ... receipt details ... */}
    </div>

    <DialogFooter className="flex-col sm:flex-row gap-2">
      <Button onClick={handlePrint} variant="outline" className="w-full">
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
      <Button onClick={handleDownload} variant="outline" className="w-full">
        <Download className="mr-2 h-4 w-4" />
        Download
      </Button>
      <Button onClick={onClose} className="w-full">
        Tutup
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 8. CreateTableModal.jsx

```jsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="sm:max-w-md">
    {/* ✅ ADD THIS */}
    <DialogHeader>
      <DialogTitle>
        {table ? 'Edit Table' : 'Tambah Table Baru'}
      </DialogTitle>
      <DialogDescription>
        {table
          ? 'Update informasi table untuk self-service'
          : 'Buat table baru untuk sistem self-service order'
        }
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="table_name">Nama Table *</Label>
        <Input
          id="table_name"
          placeholder="Table 1, A-01, dll"
          {...}
        />
      </div>

      <div>
        <Label htmlFor="capacity">Kapasitas</Label>
        <Input
          id="capacity"
          type="number"
          placeholder="4"
          {...}
        />
      </div>

      <div>
        <Label htmlFor="location">Lokasi</Label>
        <Input
          id="location"
          placeholder="Area A, Lantai 1, dll"
          {...}
        />
      </div>

      <DialogFooter>
        <Button type="button" onClick={onClose} variant="outline">
          Batal
        </Button>
        <Button type="submit">
          {table ? 'Update' : 'Tambah'} Table
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

## 🎯 Pattern Summary

### Basic Pattern
```jsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title Here</DialogTitle>
      <DialogDescription>Description Here</DialogDescription>
    </DialogHeader>

    {/* Content */}

    <DialogFooter>
      {/* Actions */}
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### With Form
```jsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Form Title</DialogTitle>
      <DialogDescription>Form description</DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit}>
      {/* Form fields */}

      <DialogFooter>
        <Button type="button" variant="outline">Cancel</Button>
        <Button type="submit">Submit</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### With Dynamic Content
```jsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{isDynamic ? 'Dynamic' : 'Static'} Title</DialogTitle>
      <DialogDescription>
        {condition
          ? 'Description for condition A'
          : 'Description for condition B'
        }
      </DialogDescription>
    </DialogHeader>

    {/* Content */}
  </DialogContent>
</Dialog>
```

## 📝 Import Statement

Always make sure you import all necessary components:

```jsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
```

## ✅ Testing Checklist

After fixing each modal:

- [ ] No console warnings about DialogTitle
- [ ] No console warnings about aria-describedby
- [ ] Dialog opens correctly
- [ ] Dialog closes correctly
- [ ] Tab navigation works
- [ ] Escape key closes dialog
- [ ] Click outside closes dialog (if enabled)
- [ ] Title is visible and descriptive
- [ ] Description is helpful
- [ ] Screen reader announces title and description

## 🚨 Common Mistakes to Avoid

```jsx
// ❌ DON'T: Title outside header
<DialogContent>
  <DialogTitle>Title</DialogTitle>
  <div>Content</div>
</DialogContent>

// ❌ DON'T: Missing DialogHeader wrapper
<DialogContent>
  <DialogTitle>Title</DialogTitle>
  <DialogDescription>Description</DialogDescription>
  <div>Content</div>
</DialogContent>

// ❌ DON'T: Empty title/description
<DialogContent>
  <DialogHeader>
    <DialogTitle></DialogTitle>
    <DialogDescription></DialogDescription>
  </DialogHeader>
</DialogContent>

// ✅ DO: Proper structure
<DialogContent>
  <DialogHeader>
    <DialogTitle>Meaningful Title</DialogTitle>
    <DialogDescription>Helpful Description</DialogDescription>
  </DialogHeader>
  <div>Content</div>
</DialogContent>
```
