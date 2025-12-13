# Fix Dialog Accessibility Warnings

## 🔍 Masalah

```
Warning: `DialogContent` requires a `DialogTitle` for accessibility
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}
```

## ✅ Solusi

### Option 1: Tambahkan DialogTitle dan DialogDescription (Recommended)

Setiap Dialog harus memiliki title dan description untuk screen reader:

```jsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ✅ BENAR
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Tutup Shift</DialogTitle>
      <DialogDescription>
        Masukkan jumlah uang tunai yang ada di laci kasir
      </DialogDescription>
    </DialogHeader>

    {/* Content dialog */}
    <div>...</div>
  </DialogContent>
</Dialog>
```

### Option 2: Hidden DialogTitle (Jika tidak ingin tampil visual)

Jika tidak ingin menampilkan title secara visual tapi tetap accessible:

```jsx
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ✅ BENAR - Title hidden tapi tetap accessible
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <VisuallyHidden>
      <DialogTitle>Dialog Title</DialogTitle>
    </VisuallyHidden>

    <DialogDescription>
      This is the description
    </DialogDescription>

    {/* Content dialog */}
    <div>...</div>
  </DialogContent>
</Dialog>
```

### Option 3: Manual ARIA attributes

Jika benar-benar tidak butuh title/description:

```jsx
// ⚠️ NOT RECOMMENDED - hanya jika benar-benar diperlukan
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent
    aria-labelledby="custom-title"
    aria-describedby="custom-description"
  >
    <h2 id="custom-title" className="sr-only">Dialog Title</h2>
    <p id="custom-description" className="sr-only">Dialog Description</p>

    {/* Content dialog */}
    <div>...</div>
  </DialogContent>
</Dialog>
```

## 🔧 Cara Memperbaiki File yang Ada

### 1. CloseShiftModal.jsx

**Before** (Missing DialogTitle):
```jsx
<DialogContent className="sm:max-w-md">
  <div className="space-y-4">
    <h2 className="text-2xl font-bold">Tutup Shift</h2>
    {/* ... */}
  </div>
</DialogContent>
```

**After** (Fixed):
```jsx
<DialogContent className="sm:max-w-md">
  <DialogHeader>
    <DialogTitle>Tutup Shift</DialogTitle>
    <DialogDescription>
      Masukkan jumlah uang tunai yang ada di laci kasir untuk menutup shift
    </DialogDescription>
  </DialogHeader>
  <div className="space-y-4">
    {/* Remove manual h2, already in DialogTitle */}
    {/* ... */}
  </div>
</DialogContent>
```

### 2. PaymentModal.jsx

**Before**:
```jsx
<DialogContent className="sm:max-w-2xl">
  <div className="space-y-6">
    <h2 className="text-2xl font-bold">Pembayaran</h2>
    {/* ... */}
  </div>
</DialogContent>
```

**After**:
```jsx
<DialogContent className="sm:max-w-2xl">
  <DialogHeader>
    <DialogTitle>Pembayaran</DialogTitle>
    <DialogDescription>
      Pilih metode pembayaran dan masukkan jumlah pembayaran
    </DialogDescription>
  </DialogHeader>
  <div className="space-y-6">
    {/* ... */}
  </div>
</DialogContent>
```

### 3. CustomerFormModal.jsx

**Before**:
```jsx
<DialogContent>
  <h2>{customer ? 'Edit Customer' : 'Add Customer'}</h2>
  <form>...</form>
</DialogContent>
```

**After**:
```jsx
<DialogContent>
  <DialogHeader>
    <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
    <DialogDescription>
      {customer ? 'Update informasi customer' : 'Tambah customer baru ke database'}
    </DialogDescription>
  </DialogHeader>
  <form>...</form>
</DialogContent>
```

## 📝 Checklist Perbaikan

Semua file yang perlu diperbaiki:

- [ ] `CloseShiftModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `OpenShiftModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `PaymentModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `CustomerFormModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `CustomerSelectModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `ExpenseFormModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `QRMenuModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `PrintReceiptModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `ReceiptModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `CreateTableModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `EditOrderModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `ShiftHistoryModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `UpgradeOptionsModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `DowngradeConfirmationModal.jsx` - Add DialogTitle & DialogDescription
- [ ] `WaiterPOS.jsx` - Fix any dialogs used
- [ ] `BusinessManagement.jsx` - Fix any dialogs used

## 🎯 Template Fix

Untuk mempercepat, gunakan template ini:

```jsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function YourModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* ✅ ALWAYS ADD THIS */}
        <DialogHeader>
          <DialogTitle>Your Modal Title</DialogTitle>
          <DialogDescription>
            Brief description of what this modal does
          </DialogDescription>
        </DialogHeader>

        {/* Your modal content */}
        <div className="space-y-4">
          {/* ... */}
        </div>

        {/* Optional Footer */}
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## 🚫 Common Mistakes

### ❌ Don't Do This:
```jsx
// Missing DialogTitle completely
<DialogContent>
  <h2>Title</h2>  {/* Wrong - not accessible */}
  <div>Content</div>
</DialogContent>

// DialogTitle outside DialogHeader
<DialogContent>
  <DialogTitle>Title</DialogTitle>  {/* Wrong - no structure */}
  <div>Content</div>
</DialogContent>

// Empty DialogTitle
<DialogContent>
  <DialogTitle></DialogTitle>  {/* Wrong - defeats purpose */}
  <div>Content</div>
</DialogContent>
```

### ✅ Do This:
```jsx
// Proper structure
<DialogContent>
  <DialogHeader>
    <DialogTitle>Meaningful Title</DialogTitle>
    <DialogDescription>Helpful description</DialogDescription>
  </DialogHeader>
  <div>Content</div>
</DialogContent>

// Or with VisuallyHidden if needed
<DialogContent>
  <VisuallyHidden>
    <DialogTitle>Hidden but accessible title</DialogTitle>
  </VisuallyHidden>
  <DialogDescription>Description</DialogDescription>
  <div>Content</div>
</DialogContent>
```

## 📊 Priority Levels

### High Priority (User-facing modals):
1. **CloseShiftModal** - Digunakan setiap hari
2. **OpenShiftModal** - Digunakan setiap hari
3. **PaymentModal** - Critical untuk transaksi
4. **CustomerFormModal** - Sering digunakan

### Medium Priority:
5. **PrintReceiptModal**
6. **ReceiptModal**
7. **QRMenuModal**
8. **ExpenseFormModal**

### Low Priority (Admin only):
9. **ShiftHistoryModal**
10. **UpgradeOptionsModal**
11. **DowngradeConfirmationModal**
12. **BusinessManagement** dialogs

## 🧪 Testing

Setelah fix, test dengan:

1. **Screen Reader**:
   - Windows: NVDA (free)
   - Mac: VoiceOver (built-in)

2. **Keyboard Navigation**:
   - Tab through dialog
   - Escape to close
   - Enter on buttons

3. **Console Check**:
   - No more warnings about DialogTitle
   - No more aria-describedby warnings

## 🔗 References

- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WebAIM: Accessible Modal Dialogs](https://webaim.org/techniques/aria/)

## 💡 Tips

1. **DialogTitle should be concise** - Max 1-2 words
2. **DialogDescription should be helpful** - Brief explanation of modal purpose
3. **Keep consistency** - Similar modals should have similar structure
4. **Test with screen reader** - Even if you don't use one regularly
5. **Don't hide important info** - If title is important visually, don't hide it

## 🎨 Styling Tips

```jsx
// Custom styling while keeping accessibility
<DialogHeader>
  <DialogTitle className="text-2xl font-bold text-primary">
    Custom Styled Title
  </DialogTitle>
  <DialogDescription className="text-sm text-muted-foreground">
    Custom styled description with helpful info
  </DialogDescription>
</DialogHeader>

// Or center aligned
<DialogHeader className="text-center">
  <DialogTitle>Centered Title</DialogTitle>
  <DialogDescription>Centered description</DialogDescription>
</DialogHeader>
```

## ✅ Verification

Run these checks after fixing:

```bash
# Check console for warnings
# Should be 0 warnings about Dialog accessibility

# Search for DialogContent without DialogTitle
grep -r "DialogContent" --include="*.jsx" | grep -v "DialogTitle"

# Should only show dialog.jsx itself, not usage files
```

---

**Note**: Accessibility is not optional - it's a requirement for modern web apps. These fixes ensure your app is usable by everyone, including users with disabilities.
