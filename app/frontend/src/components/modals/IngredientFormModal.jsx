import { Loader2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const IngredientFormModal = ({
  isOpen,
  onClose,
  onSave,
  ingredient,
  mode = 'add',
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: 'kg',
    cost_per_unit: '',
    current_stock: '',
    min_stock: '',
    supplier: '',
    expiry_date: '',
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Format number with thousand separator (for display only)
  // Format dengan titik sebagai pemisah ribuan (format Indonesia)
  // Sama persis dengan implementasi di PromoManagement.jsx
  const formatNumberInput = value => {
    // Return empty string if no value
    if (!value || value === '' || value === '0') return '';

    // Ensure value is string
    const valueStr = value.toString();

    // Remove any dots that might accidentally be there
    // formData.value should NEVER contain dots, but safety check
    const numericString = valueStr.replace(/[^\d]/g, '');

    // Return empty if not valid numeric string
    if (!numericString || numericString === '0') return '';

    // Validate: must be digits only (no dots, no letters, nothing else)
    if (!/^\d+$/.test(numericString)) {
      return '';
    }

    // Parse to integer (always use base 10)
    const numValue = parseInt(numericString, 10);

    // Return empty if not a valid positive number
    if (isNaN(numValue) || numValue < 0) {
      return '';
    }

    // Format with thousand separator for display ONLY
    try {
      return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue);
    } catch (error) {
      console.error(
        'Error formatting number:',
        error,
        'value:',
        value,
        'numericString:',
        numericString
      );
      // Return numeric string (without dots) if formatting fails
      return numericString;
    }
  };

  // Remove formatting and get numeric value only (always returns numeric string)
  // Input: formatted string (e.g., "50.000") or numeric string (e.g., "50000")
  // Output: numeric string only (e.g., "50000")
  const getNumericValue = value => {
    if (!value || value === '') return '';
    // Remove all non-numeric characters (dots, spaces, etc)
    const numericOnly = value.toString().replace(/[^\d]/g, '');
    return numericOnly;
  };

  useEffect(() => {
    if (mode === 'edit' && ingredient) {
      // Convert numeric values to string (without formatting) for form state
      // Formatting will be applied in the value prop of Input components
      // Form should display: 50000 (will be formatted to "50.000" by formatNumberInput)
      setFormData({
        name: ingredient.name || '',
        category: ingredient.category || '',
        unit: ingredient.unit || 'kg',
        cost_per_unit:
          ingredient.cost_per_unit != null && ingredient.cost_per_unit !== ''
            ? String(Math.round(Number(ingredient.cost_per_unit))) // Ensure it's a whole number
            : '',
        current_stock:
          ingredient.current_stock != null &&
          ingredient.current_stock !== undefined
            ? String(Math.round(Number(ingredient.current_stock))) // Ensure it's a whole number
            : '',
        min_stock:
          ingredient.min_stock != null && ingredient.min_stock !== undefined
            ? String(Math.round(Number(ingredient.min_stock))) // Ensure it's a whole number
            : '',
        supplier: ingredient.supplier || '',
        expiry_date: ingredient.expiry_date || '',
      });
    } else {
      setFormData({
        name: '',
        category: '',
        unit: 'kg',
        cost_per_unit: '',
        current_stock: '',
        min_stock: '',
        supplier: '',
        expiry_date: '',
      });
    }
    setErrors({});
  }, [isOpen, mode, ingredient]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nama bahan harus diisi';
    }

    if (!formData.unit?.trim()) {
      newErrors.unit = 'Satuan harus diisi';
    }

    if (!formData.cost_per_unit || parseFloat(formData.cost_per_unit) < 0) {
      newErrors.cost_per_unit = 'Harga per unit harus >= 0';
    }

    if (!formData.current_stock || parseFloat(formData.current_stock) < 0) {
      newErrors.current_stock = 'Stok saat ini harus >= 0';
    }

    if (!formData.min_stock || parseFloat(formData.min_stock) < 0) {
      newErrors.min_stock = 'Stok minimum harus >= 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      // Modal will be closed by parent component if successful
    } catch (error) {
      console.error('Error saving ingredient:', error);
      // Keep modal open on error so user can fix issues
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-xl font-bold text-gray-900'>
            {mode === 'add' ? 'Tambah Bahan Baku' : 'Edit Bahan Baku'}
          </h2>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600 transition-colors'
            type='button'
          >
            <X className='w-6 h-6' />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className='overflow-y-auto max-h-[calc(90vh-140px)]'
        >
          <div className='p-6 space-y-4'>
            {/* Nama Bahan */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Nama Bahan <span className='text-red-500'>*</span>
              </label>
              <Input
                name='name'
                value={formData.name}
                onChange={handleChange}
                placeholder='Contoh: Beras Premium'
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className='text-red-500 text-sm mt-1'>{errors.name}</p>
              )}
            </div>

            {/* Kategori & Unit */}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Kategori
                </label>
                <Input
                  name='category'
                  value={formData.category}
                  onChange={handleChange}
                  placeholder='Contoh: Bahan Pokok'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Satuan <span className='text-red-500'>*</span>
                </label>
                <select
                  name='unit'
                  value={formData.unit}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.unit ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value='kg'>Kilogram (kg)</option>
                  <option value='gram'>Gram (g)</option>
                  <option value='liter'>Liter (L)</option>
                  <option value='ml'>Mililiter (ml)</option>
                  <option value='pcs'>Pieces (pcs)</option>
                  <option value='pack'>Pack</option>
                  <option value='box'>Box</option>
                </select>
                {errors.unit && (
                  <p className='text-red-500 text-sm mt-1'>{errors.unit}</p>
                )}
              </div>
            </div>

            {/* Harga per Unit */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Harga per Unit <span className='text-red-500'>*</span>
              </label>
              <Input
                type='text'
                inputMode='numeric'
                name='cost_per_unit'
                value={formatNumberInput(formData.cost_per_unit || '')}
                onChange={e => {
                  // Get raw input from user (may contain dots from previous display)
                  const rawInput = e.target.value;

                  // CRITICAL: Extract ONLY digits, remove everything else (dots, spaces, etc)
                  // This MUST happen before storing in state
                  const numericOnly = rawInput.replace(/[^\d]/g, '');

                  // Only update if we have a valid numeric string (or empty)
                  // This prevents storing invalid values
                  if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                    setFormData(prev => ({
                      ...prev,
                      cost_per_unit: numericOnly,
                    }));
                  }
                }}
                placeholder='0'
                className={errors.cost_per_unit ? 'border-red-500' : ''}
              />
              {errors.cost_per_unit && (
                <p className='text-red-500 text-sm mt-1'>
                  {errors.cost_per_unit}
                </p>
              )}
            </div>

            {/* Stok Saat Ini & Min Stock */}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Stok Saat Ini <span className='text-red-500'>*</span>
                </label>
                <Input
                  type='text'
                  inputMode='numeric'
                  name='current_stock'
                  value={formatNumberInput(formData.current_stock || '')}
                  onChange={e => {
                    // Get raw input from user (may contain dots from previous display)
                    const rawInput = e.target.value;

                    // CRITICAL: Extract ONLY digits, remove everything else (dots, spaces, etc)
                    // This MUST happen before storing in state
                    const numericOnly = rawInput.replace(/[^\d]/g, '');

                    // Only update if we have a valid numeric string (or empty)
                    // This prevents storing invalid values
                    if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                      setFormData(prev => ({
                        ...prev,
                        current_stock: numericOnly,
                      }));
                    }
                  }}
                  placeholder='0'
                  className={errors.current_stock ? 'border-red-500' : ''}
                />
                {errors.current_stock && (
                  <p className='text-red-500 text-sm mt-1'>
                    {errors.current_stock}
                  </p>
                )}
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-1'>
                  Stok Minimum <span className='text-red-500'>*</span>
                </label>
                <Input
                  type='text'
                  inputMode='numeric'
                  name='min_stock'
                  value={formatNumberInput(formData.min_stock || '')}
                  onChange={e => {
                    // Get raw input from user (may contain dots from previous display)
                    const rawInput = e.target.value;

                    // CRITICAL: Extract ONLY digits, remove everything else (dots, spaces, etc)
                    // This MUST happen before storing in state
                    const numericOnly = rawInput.replace(/[^\d]/g, '');

                    // Only update if we have a valid numeric string (or empty)
                    // This prevents storing invalid values
                    if (numericOnly === '' || /^\d+$/.test(numericOnly)) {
                      setFormData(prev => ({
                        ...prev,
                        min_stock: numericOnly,
                      }));
                    }
                  }}
                  placeholder='0'
                  className={errors.min_stock ? 'border-red-500' : ''}
                />
                {errors.min_stock && (
                  <p className='text-red-500 text-sm mt-1'>
                    {errors.min_stock}
                  </p>
                )}
                <p className='text-xs text-gray-500 mt-1'>
                  Alert akan muncul jika stok di bawah nilai ini
                </p>
              </div>
            </div>

            {/* Supplier */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Supplier
              </label>
              <Input
                name='supplier'
                value={formData.supplier}
                onChange={handleChange}
                placeholder='Nama supplier'
              />
            </div>

            {/* Tanggal Kadaluarsa */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Tanggal Kadaluarsa
              </label>
              <Input
                type='date'
                name='expiry_date'
                value={formData.expiry_date}
                onChange={handleChange}
              />
              <p className='text-xs text-gray-500 mt-1'>
                Opsional, untuk bahan yang mudah rusak
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className='flex items-center justify-end gap-3 p-6 border-t bg-gray-50'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              type='submit'
              className='bg-blue-600 hover:bg-blue-700'
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className='w-4 h-4 mr-2' />
                  Simpan
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IngredientFormModal;
