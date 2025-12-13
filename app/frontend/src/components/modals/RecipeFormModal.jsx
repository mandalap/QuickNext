import { Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { productService } from '../../services/product.service';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const RecipeFormModal = ({
  isOpen,
  onClose,
  onSave,
  recipe,
  mode = 'add',
  availableIngredients,
}) => {
  const [formData, setFormData] = useState({
    product_id: '',
    ingredients: [],
  });

  const [products, setProducts] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Format number with thousand separator (for display only)
  // Format dengan titik sebagai pemisah ribuan (format Indonesia)
  // Untuk quantity, kita gunakan format yang sama tapi tetap support decimal
  const formatNumberInput = value => {
    // Return empty string if no value
    if (!value || value === '' || value === '0') return '';

    // Ensure value is string
    const valueStr = value.toString();

    // For quantity, we need to support decimals (e.g., 0.5, 1.25)
    // So we allow dots as decimal separators
    // Remove any thousand separators but keep decimal point
    const cleanedStr = valueStr.replace(/[^\d.,]/g, '');

    // Replace comma with dot for decimal (Indonesian format uses comma for decimal, but we'll use dot)
    const normalizedStr = cleanedStr.replace(',', '.');

    // Check if it's a valid number (can have decimal point)
    if (!normalizedStr || normalizedStr === '') return '';

    // Validate: must be digits with optional decimal point
    if (!/^\d*\.?\d*$/.test(normalizedStr)) {
      return '';
    }

    // For quantity, we can have decimals, so we parse as float
    const numValue = parseFloat(normalizedStr);

    // Return empty if not a valid positive number
    if (isNaN(numValue) || numValue < 0) {
      return '';
    }

    // For quantity, we might want to show decimals if present
    // Format with thousand separator and preserve decimals
    try {
      // Split into integer and decimal parts
      const parts = normalizedStr.split('.');
      const integerPart = parts[0] || '0';
      const decimalPart = parts[1];

      // Format integer part with thousand separator
      const formattedInteger = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(parseInt(integerPart, 10));

      // Combine with decimal part if exists
      if (decimalPart !== undefined) {
        return `${formattedInteger}.${decimalPart}`;
      }
      return formattedInteger;
    } catch (error) {
      console.error(
        'Error formatting number:',
        error,
        'value:',
        value,
        'normalizedStr:',
        normalizedStr
      );
      // Return normalized string if formatting fails
      return normalizedStr;
    }
  };

  // Remove formatting and get numeric value only (supports decimals)
  // Input: formatted string (e.g., "50.000.5" or "50.000") or numeric string (e.g., "50000.5")
  // Output: numeric string only (e.g., "50000.5")
  const getNumericValue = value => {
    if (!value || value === '') return '';
    // Remove all non-numeric characters except decimal point
    // Replace comma with dot for decimal
    const cleaned = value
      .toString()
      .replace(/[^\d.,]/g, '')
      .replace(',', '.');
    return cleaned;
  };

  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode === 'edit' && recipe) {
      // Convert numeric values to string (without formatting) for form state
      // Formatting will be applied in the value prop of Input components
      setFormData({
        product_id: recipe.product_id || '',
        ingredients:
          recipe.ingredients?.map(ing => ({
            ingredient_id: ing.ingredient_id,
            quantity:
              ing.quantity != null && ing.quantity !== ''
                ? String(Number(ing.quantity)) // Keep as string, preserve decimals
                : '',
          })) || [],
      });
    } else {
      setFormData({
        product_id: '',
        ingredients: [],
      });
    }
    setErrors({});
  }, [isOpen, mode, recipe]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const result = await productService.getAll();
      if (result.success) {
        // Handle both array and object with data property
        const productsData = Array.isArray(result.data)
          ? result.data
          : result.data?.data || [];
        setProducts(productsData);
      } else {
        console.error('Failed to load products:', result.message);
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleProductChange = e => {
    setFormData(prev => ({ ...prev, product_id: e.target.value }));
    if (errors.product_id) {
      setErrors(prev => ({ ...prev, product_id: '' }));
    }
  };

  const handleAddIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredient_id: '', quantity: '' }],
    }));
  };

  const handleRemoveIngredient = index => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing
      ),
    }));

    // Clear error for this ingredient
    if (errors[`ingredient_${index}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`ingredient_${index}`];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_id) {
      newErrors.product_id = 'Produk harus dipilih';
    }

    if (formData.ingredients.length === 0) {
      newErrors.ingredients = 'Minimal harus ada 1 bahan';
    }

    formData.ingredients.forEach((ing, index) => {
      if (!ing.ingredient_id) {
        newErrors[`ingredient_${index}`] = 'Bahan harus dipilih';
      }
      if (!ing.quantity || parseFloat(ing.quantity) <= 0) {
        newErrors[`ingredient_${index}_quantity`] = 'Jumlah harus > 0';
      }
    });

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
      console.error('Error saving recipe:', error);
      // Keep modal open on error so user can fix issues
    } finally {
      setSaving(false);
    }
  };

  const getSelectedIngredient = ingredientId => {
    if (!availableIngredients || !Array.isArray(availableIngredients)) {
      return null;
    }
    return availableIngredients.find(ing => ing.id === parseInt(ingredientId));
  };

  const calculateIngredientCost = (ingredientId, quantity) => {
    const ingredient = getSelectedIngredient(ingredientId);
    if (ingredient && quantity) {
      return ingredient.cost_per_unit * parseFloat(quantity);
    }
    return 0;
  };

  const calculateTotalCost = () => {
    return formData.ingredients.reduce((total, ing) => {
      return total + calculateIngredientCost(ing.ingredient_id, ing.quantity);
    }, 0);
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-xl font-bold text-gray-900'>
            {mode === 'add' ? 'Tambah Resep' : 'Edit Resep'}
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
          <div className='p-6 space-y-6'>
            {/* Pilih Produk */}
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Produk <span className='text-red-500'>*</span>
              </label>
              <select
                value={formData.product_id}
                onChange={handleProductChange}
                disabled={mode === 'edit'}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.product_id ? 'border-red-500' : 'border-gray-300'
                } ${mode === 'edit' ? 'bg-gray-100' : ''}`}
              >
                <option value=''>Pilih produk...</option>
                {loadingProducts ? (
                  <option disabled>Loading...</option>
                ) : (
                  products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </option>
                  ))
                )}
              </select>
              {errors.product_id && (
                <p className='text-red-500 text-sm mt-1'>{errors.product_id}</p>
              )}
              {mode === 'edit' && (
                <p className='text-xs text-gray-500 mt-1'>
                  Produk tidak dapat diubah saat edit
                </p>
              )}
            </div>

            {/* Bahan-bahan */}
            <div>
              <div className='flex items-center justify-between mb-3'>
                <label className='block text-sm font-medium text-gray-700'>
                  Bahan-bahan <span className='text-red-500'>*</span>
                </label>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={handleAddIngredient}
                  className='text-blue-600'
                >
                  <Plus className='w-4 h-4 mr-1' />
                  Tambah Bahan
                </Button>
              </div>

              {errors.ingredients && formData.ingredients.length === 0 && (
                <p className='text-red-500 text-sm mb-2'>
                  {errors.ingredients}
                </p>
              )}

              <div className='space-y-3'>
                {formData.ingredients.map((ingredient, index) => {
                  const selectedIngredient = getSelectedIngredient(
                    ingredient.ingredient_id
                  );
                  const cost = calculateIngredientCost(
                    ingredient.ingredient_id,
                    ingredient.quantity
                  );

                  return (
                    <div
                      key={index}
                      className='border rounded-lg p-4 bg-gray-50'
                    >
                      <div className='flex items-start gap-3'>
                        <div className='flex-1 space-y-3'>
                          {/* Pilih Bahan */}
                          <div>
                            <select
                              value={ingredient.ingredient_id}
                              onChange={e =>
                                handleIngredientChange(
                                  index,
                                  'ingredient_id',
                                  e.target.value
                                )
                              }
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                errors[`ingredient_${index}`]
                                  ? 'border-red-500'
                                  : 'border-gray-300'
                              }`}
                            >
                              <option value=''>Pilih bahan...</option>
                              {availableIngredients &&
                                Array.isArray(availableIngredients) &&
                                availableIngredients.map(ing => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name} ({ing.unit}) -{' '}
                                    {formatCurrency(ing.cost_per_unit)}/
                                    {ing.unit}
                                  </option>
                                ))}
                            </select>
                            {errors[`ingredient_${index}`] && (
                              <p className='text-red-500 text-xs mt-1'>
                                {errors[`ingredient_${index}`]}
                              </p>
                            )}
                          </div>

                          {/* Jumlah & Biaya */}
                          <div className='grid grid-cols-2 gap-3'>
                            <div>
                              <label className='block text-xs text-gray-600 mb-1'>
                                Jumlah{' '}
                                {selectedIngredient
                                  ? `(${selectedIngredient.unit})`
                                  : ''}
                              </label>
                              <Input
                                type='text'
                                inputMode='decimal'
                                value={formatNumberInput(
                                  ingredient.quantity || ''
                                )}
                                onChange={e => {
                                  // Get raw input from user (may contain dots from previous display)
                                  const rawInput = e.target.value;

                                  // For quantity, we need to support decimals
                                  // Remove all non-numeric characters except decimal point
                                  // Replace comma with dot for decimal
                                  const cleaned = rawInput
                                    .replace(/[^\d.,]/g, '')
                                    .replace(',', '.');

                                  // Only update if we have a valid numeric string (or empty)
                                  // This prevents storing invalid values
                                  if (
                                    cleaned === '' ||
                                    /^\d*\.?\d*$/.test(cleaned)
                                  ) {
                                    handleIngredientChange(
                                      index,
                                      'quantity',
                                      cleaned
                                    );
                                  }
                                }}
                                placeholder='0'
                                className={`text-sm ${
                                  errors[`ingredient_${index}_quantity`]
                                    ? 'border-red-500'
                                    : ''
                                }`}
                              />
                              {errors[`ingredient_${index}_quantity`] && (
                                <p className='text-red-500 text-xs mt-1'>
                                  {errors[`ingredient_${index}_quantity`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className='block text-xs text-gray-600 mb-1'>
                                Biaya
                              </label>
                              <div className='px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-900'>
                                {formatCurrency(cost)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          type='button'
                          onClick={() => handleRemoveIngredient(index)}
                          className='text-red-500 hover:text-red-700 mt-1'
                        >
                          <Trash2 className='w-5 h-5' />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {formData.ingredients.length === 0 && (
                  <div className='text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg'>
                    <p className='text-sm'>Belum ada bahan ditambahkan</p>
                    <p className='text-xs mt-1'>
                      Klik "Tambah Bahan" untuk menambahkan
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Total Cost Summary */}
            {formData.ingredients.length > 0 && (
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm text-gray-600'>Total Biaya Resep</p>
                    <p className='text-2xl font-bold text-blue-600'>
                      {formatCurrency(calculateTotalCost())}
                    </p>
                  </div>
                  {formData.product_id && (
                    <div className='text-right'>
                      <p className='text-sm text-gray-600'>Harga Jual Produk</p>
                      <p className='text-xl font-semibold text-green-600'>
                        {formatCurrency(
                          products.find(
                            p => p.id === parseInt(formData.product_id)
                          )?.price || 0
                        )}
                      </p>
                    </div>
                  )}
                </div>
                {formData.product_id && (
                  <div className='mt-2 pt-2 border-t border-blue-300'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='text-gray-700'>
                        Estimasi Keuntungan:
                      </span>
                      <span className='font-bold text-gray-900'>
                        {formatCurrency(
                          (products.find(
                            p => p.id === parseInt(formData.product_id)
                          )?.price || 0) - calculateTotalCost()
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
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
              className='bg-purple-600 hover:bg-purple-700'
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
                  Simpan Resep
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecipeFormModal;
