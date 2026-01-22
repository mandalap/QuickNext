import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Global Store untuk shared state antar halaman
 * Menggunakan Zustand dengan selector untuk optimal re-renders
 */

const useGlobalStore = create(
  devtools(
    persist(
      (set, get) => ({
        // UI preferences
        sidebarOpen: true,
        theme: 'light',

        // Modal states
        modals: {
          productModalOpen: false,
          categoryModalOpen: false,
          employeeModalOpen: false,
          outletModalOpen: false,
          customerModalOpen: false,
        },

        // Selection states
        selectedProduct: null,
        selectedEmployee: null,
        selectedOutlet: null,

        // Actions: UI
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),

        // Actions: Modals
        openModal: (modalName) => {
          set((state) => ({
            modals: { ...state.modals, [modalName]: true },
          }));
        },

        closeModal: (modalName) => {
          set((state) => ({
            modals: { ...state.modals, [modalName]: false },
          }));
        },

        closeAllModals: () => {
          set({
            modals: {
              productModalOpen: false,
              categoryModalOpen: false,
              employeeModalOpen: false,
              outletModalOpen: false,
              customerModalOpen: false,
            },
          });
        },

        // Actions: Selections
        setSelectedProduct: (product) => set({ selectedProduct: product }),
        setSelectedEmployee: (employee) => set({ selectedEmployee: employee }),
        setSelectedOutlet: (outlet) => set({ selectedOutlet: outlet }),

        clearSelections: () => {
          set({
            selectedProduct: null,
            selectedEmployee: null,
            selectedOutlet: null,
          });
        },

        // Computed
        isModalOpen: (modalName) => {
          return get().modals[modalName] || false;
        },
      }),
      {
        name: 'global-store',
        partialize: (state) => ({
          // Only persist UI preferences
          sidebarOpen: state.sidebarOpen,
          theme: state.theme,
        }),
      }
    ),
    { name: 'GlobalStore' }
  )
);

export default useGlobalStore;

