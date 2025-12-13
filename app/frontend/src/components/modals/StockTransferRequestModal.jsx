import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft } from 'lucide-react';
import stockTransferService from '../../services/stockTransfer.service';
import outletService from '../../services/outlet.service';
import { productService } from '../../services/product.service';
import toast from 'react-hot-toast';

const StockTransferRequestModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    from_outlet_id: '',
    to_outlet_id: '',
    product_id: '',
    quantity: 1,
    reason: ''
  });
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchOutlets();
    fetchProducts();
  }, []);

  const fetchOutlets = async () => {
    try {
      const result = await outletService.getAll();
      setOutlets(result.data || result || []);
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
      toast.error('Failed to load outlets');
    }
  };

  const fetchProducts = async () => {
    try {
      const result = await productService.getAll();
      if (result.success) {
        const productData = result.data?.data || result.data || [];
        setProducts(productData);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.from_outlet_id) {
      newErrors.from_outlet_id = 'Source outlet is required';
    }
    if (!formData.to_outlet_id) {
      newErrors.to_outlet_id = 'Destination outlet is required';
    }
    if (formData.from_outlet_id === formData.to_outlet_id) {
      newErrors.to_outlet_id = 'Destination must be different from source';
    }
    if (!formData.product_id) {
      newErrors.product_id = 'Product is required';
    }
    if (!formData.quantity || formData.quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await stockTransferService.create({
        ...formData,
        quantity: parseInt(formData.quantity)
      });
      toast.success('Transfer request created successfully');
      onSuccess();
    } catch (error) {
      console.error('Failed to create transfer request:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create transfer request';
      toast.error(errorMsg);

      // Handle validation errors from backend
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">New Stock Transfer Request</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* From Outlet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Outlet (Source) *
            </label>
            <select
              name="from_outlet_id"
              value={formData.from_outlet_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.from_outlet_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select source outlet</option>
              {outlets.map(outlet => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
            {errors.from_outlet_id && (
              <p className="mt-1 text-sm text-red-600">{errors.from_outlet_id}</p>
            )}
          </div>

          {/* Arrow Indicator */}
          <div className="flex justify-center">
            <ArrowRightLeft className="w-6 h-6 text-gray-400" />
          </div>

          {/* To Outlet */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Outlet (Destination) *
            </label>
            <select
              name="to_outlet_id"
              value={formData.to_outlet_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.to_outlet_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select destination outlet</option>
              {outlets.map(outlet => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
            {errors.to_outlet_id && (
              <p className="mt-1 text-sm text-red-600">{errors.to_outlet_id}</p>
            )}
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product *
            </label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.product_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.sku}
                </option>
              ))}
            </select>
            {errors.product_id && (
              <p className="mt-1 text-sm text-red-600">{errors.product_id}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.quantity ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows="3"
              placeholder="Why do you need this transfer?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransferRequestModal;
