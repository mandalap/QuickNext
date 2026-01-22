import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * POS Store untuk state management yang efisien
 * Menggunakan Zustand dengan selector-based access untuk menghindari unnecessary re-renders
 */

const usePOSStore = create(
  devtools(
    persist(
      (set, get) => ({
        // Cart state
        cart: [],
        selectedCustomer: null,
        appliedDiscount: null,
        couponCode: '',

        // Product state
        products: [],
        categories: [],
        selectedCategory: 'all',
        searchTerm: '',
        currentPage: 1,
        itemsPerPage: 12,
        totalProducts: 0,
        sortBy: 'name',
        sortOrder: 'asc',

        // UI state
        loading: false,
        refreshing: false,
        paymentModalOpen: false,
        customerModalOpen: false,
        receiptModalOpen: false,
        printReceiptOpen: false,
        lastReceipt: null,
        printOrderId: null,

        // Actions: Cart
        addToCart: (product) => {
          const cart = get().cart;
          const existingItem = cart.find(item => item.id === product.id);
          
          if (existingItem) {
            set({
              cart: cart.map(item =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            });
          } else {
            set({
              cart: [...cart, { ...product, quantity: 1 }],
            });
          }
        },

        updateCartQuantity: (productId, quantity) => {
          if (quantity <= 0) {
            set({ cart: get().cart.filter(item => item.id !== productId) });
          } else {
            set({
              cart: get().cart.map(item =>
                item.id === productId ? { ...item, quantity } : item
              ),
            });
          }
        },

        removeFromCart: (productId) => {
          set({ cart: get().cart.filter(item => item.id !== productId) });
        },

        clearCart: () => {
          set({
            cart: [],
            selectedCustomer: null,
            appliedDiscount: null,
            couponCode: '',
          });
        },

        setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
        setAppliedDiscount: (discount) => set({ appliedDiscount: discount }),
        setCouponCode: (code) => set({ couponCode: code }),

        // Actions: Products
        setProducts: (products) => set({ products }),
        setCategories: (categories) => set({ categories }),
        setSelectedCategory: (category) => {
          set({ selectedCategory: category, currentPage: 1 });
        },
        setSearchTerm: (term) => {
          set({ searchTerm: term, currentPage: 1 });
        },
        setCurrentPage: (page) => set({ currentPage: page }),
        setTotalProducts: (total) => set({ totalProducts: total }),
        setSorting: (sortBy, sortOrder) => {
          set({ sortBy, sortOrder, currentPage: 1 });
        },

        // Actions: UI
        setLoading: (loading) => set({ loading }),
        setRefreshing: (refreshing) => set({ refreshing }),
        setPaymentModalOpen: (open) => set({ paymentModalOpen: open }),
        setCustomerModalOpen: (open) => set({ customerModalOpen: open }),
        setReceiptModalOpen: (open) => set({ receiptModalOpen: open }),
        setPrintReceiptOpen: (open) => set({ printReceiptOpen: open }),
        setLastReceipt: (receipt) => set({ lastReceipt: receipt }),
        setPrintOrderId: (id) => set({ printOrderId: id }),

        // Computed selectors
        getCartTotal: () => {
          const cart = get().cart;
          return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        },

        getCartItemsCount: () => {
          const cart = get().cart;
          return cart.reduce((sum, item) => sum + item.quantity, 0);
        },

        getCartSubtotal: () => {
          const cart = get().cart;
          return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        },

        getTax: () => {
          const subtotal = get().getCartSubtotal();
          return subtotal * 0.1; // 10% tax
        },

        getDiscount: () => {
          const discount = get().appliedDiscount;
          const subtotal = get().getCartSubtotal();
          
          if (!discount) return 0;
          if (discount.type === 'percent') {
            return (subtotal * discount.value) / 100;
          }
          return discount.value;
        },

        getTotal: () => {
          const subtotal = get().getCartSubtotal();
          const tax = get().getTax();
          const discount = get().getDiscount();
          return subtotal + tax - discount;
        },

        getDiscountPercentage: () => {
          const discount = get().appliedDiscount;
          return discount?.type === 'percent' ? discount.value : 0;
        },

        // Reset store
        reset: () => {
          set({
            cart: [],
            selectedCustomer: null,
            appliedDiscount: null,
            couponCode: '',
            products: [],
            categories: [],
            selectedCategory: 'all',
            searchTerm: '',
            currentPage: 1,
            totalProducts: 0,
          });
        },
      }),
      {
        name: 'pos-store', // Unique name for localStorage
        partialize: (state) => ({
          // Only persist cart-related state
          cart: state.cart,
          selectedCustomer: state.selectedCustomer,
          appliedDiscount: state.appliedDiscount,
          couponCode: state.couponCode,
        }),
      }
    ),
    { name: 'POSStore' }
  )
);

export default usePOSStore;

