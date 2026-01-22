import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Calculator,
  ChefHat,
  DollarSign,
  Edit,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { queryKeys } from '../../config/reactQuery';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../hooks/useApi';
import { ingredientService } from '../../services/ingredient.service';
import { productService } from '../../services/product.service';
import { recipeService } from '../../services/recipe.service';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../ui/toast';

const InventoryRecipe = () => {
  const { addToast } = useToast();
  const { currentOutlet, currentBusiness } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('ingredients');
  const [searchTerm, setSearchTerm] = useState('');

  // Ingredient State
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [isEditingIngredient, setIsEditingIngredient] = useState(false);
  const [ingredientFormData, setIngredientFormData] = useState({
    name: '',
    category: '',
    unit: '',
    cost_per_unit: '',
    current_stock: '',
    min_stock: '',
    supplier: '',
    expiry_date: '',
  });

  // Recipe State
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [isEditingRecipe, setIsEditingRecipe] = useState(false);
  const [recipeFormData, setRecipeFormData] = useState({
    product_id: '',
    ingredients: [],
  });
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [productComboOpen, setProductComboOpen] = useState(false);

  // Format quantity without thousand separators, trim trailing zeros (max 3 decimals)
  const formatQuantity = qty => {
    const num = Number(qty);
    if (!Number.isFinite(num)) return qty;
    if (Number.isInteger(num)) return String(num);
    const trimmed = num.toFixed(3).replace(/\.0+$|0+$/g, '');
    return trimmed;
  };

  // ✅ REACT QUERY: Fetch Ingredients
  const {
    data: ingredientsData,
    isLoading: ingredientsLoading,
    refetch: refetchIngredients,
  } = useQuery({
    queryKey: queryKeys.inventory.ingredients(currentBusiness?.id),
    queryFn: async () => {
      const result = await ingredientService.getAll();
      return result?.success && result?.data ? result.data : [];
    },
    enabled: !!currentBusiness?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    placeholderData: previousData => previousData || [],
  });

  const ingredients = ingredientsData || [];

  // ✅ REACT QUERY: Fetch Recipes
  const {
    data: recipesData,
    isLoading: recipesLoading,
    refetch: refetchRecipes,
  } = useQuery({
    queryKey: queryKeys.inventory.recipes(currentBusiness?.id),
    queryFn: async () => {
      const result = await recipeService.getAll();
      return result?.success && result?.data ? result.data : [];
    },
    enabled: !!currentBusiness?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    placeholderData: previousData => previousData || [],
  });

  const recipes = recipesData || [];

  // ✅ REACT QUERY: Fetch Products (for recipe modal)
  // Fetch ALL products without pagination for dropdown
  const {
    data: productsData,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['products-for-recipe', currentBusiness?.id],
    queryFn: async () => {
      try {
        // Fetch all products with large per_page to get all products in one request
        const result = await productService.getAll({
          per_page: 10000, // Large number to get all products
          is_active: true, // Only active products
        });

        // Handle paginated response
        if (result?.success && result?.data) {
          let allProducts = [];

          // If response has pagination structure
          if (result.data.data && Array.isArray(result.data.data)) {
            allProducts = result.data.data;

            // If there are more pages, fetch them
            const totalPages = result.data.last_page || 1;
            if (totalPages > 1) {
              const additionalPages = [];
              for (let page = 2; page <= totalPages; page++) {
                try {
                  const pageResult = await productService.getAll({
                    per_page: 10000,
                    page,
                    is_active: true,
                  });
                  if (pageResult?.success && pageResult?.data?.data) {
                    additionalPages.push(...pageResult.data.data);
                  }
                } catch (error) {
                  console.warn(`Failed to fetch products page ${page}:`, error);
                }
              }
              allProducts = [...allProducts, ...additionalPages];
            }
          }
          // If response is direct array
          else if (Array.isArray(result.data)) {
            allProducts = result.data;
          }

          console.log(
            '📦 Products loaded for recipe dropdown:',
            allProducts.length
          );
          return allProducts;
        }

        return [];
      } catch (error) {
        console.error('Error fetching products for recipe:', error);
        return [];
      }
    },
    enabled: !!currentBusiness?.id,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnMount: true,
    placeholderData: previousData => previousData || [],
  });

  const products = productsData || [];

  // Keep useApi hooks for mutations
  const { execute: saveIngredient } = useApi(
    isEditingIngredient ? ingredientService.update : ingredientService.create
  );

  const { execute: deleteIngredient } = useApi(ingredientService.delete);

  const { execute: saveRecipe } = useApi(
    isEditingRecipe ? recipeService.update : recipeService.create
  );

  const { execute: deleteRecipe } = useApi(recipeService.delete);

  // ✅ F5 Handler: Refresh data without full page reload
  const handleRefresh = useCallback(async () => {
    if (ingredientsLoading || recipesLoading || productsLoading) return; // Prevent multiple simultaneous refreshes

    try {
      await Promise.all([
        refetchIngredients(),
        refetchRecipes(),
        refetchProducts(),
      ]);
      addToast({
        title: 'Berhasil!',
        description: 'Data inventori berhasil dimuat ulang',
        type: 'success',
      });
    } catch (error) {
      console.error('Error refreshing inventory data:', error);
      addToast({
        title: 'Error!',
        description: 'Gagal memuat ulang data inventori',
        type: 'error',
      });
    }
  }, [
    ingredientsLoading,
    recipesLoading,
    productsLoading,
    refetchIngredients,
    refetchRecipes,
    refetchProducts,
    addToast,
  ]);

  // ✅ Keyboard shortcuts: F5 and R to refresh without full page reload
  useEffect(() => {
    const handleKeyDown = e => {
      // F5 or R key (with Ctrl/Cmd or without)
      if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault(); // Prevent default browser reload
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefresh]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    if (!ingredients) return [];
    return ingredients.filter(
      ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [ingredients, searchTerm]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    if (!recipes) return [];
    return recipes.filter(
      recipe =>
        recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [recipes, searchTerm]);

  // Statistics
  const calculateStockValue = () => {
    if (!ingredients) return 0;
    return ingredients.reduce((total, ingredient) => {
      return total + ingredient.current_stock * ingredient.cost_per_unit;
    }, 0);
  };

  const getLowStockCount = () => {
    if (!ingredients) return 0;
    return ingredients.filter(
      ingredient => ingredient.current_stock <= ingredient.min_stock
    ).length;
  };

  const getCriticalStockCount = () => {
    if (!ingredients) return 0;
    return ingredients.filter(
      ingredient => ingredient.current_stock <= ingredient.min_stock * 0.5
    ).length;
  };

  // Ingredient Handlers
  const handleOpenIngredientModal = (ingredient = null) => {
    if (ingredient) {
      setIsEditingIngredient(true);
      setIngredientFormData({
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category || '',
        unit: ingredient.unit,
        cost_per_unit: ingredient.cost_per_unit,
        current_stock: ingredient.current_stock,
        min_stock: ingredient.min_stock,
        supplier: ingredient.supplier || '',
        expiry_date: ingredient.expiry_date || '',
      });
    } else {
      setIsEditingIngredient(false);
      setIngredientFormData({
        name: '',
        category: '',
        unit: '',
        cost_per_unit: '',
        current_stock: '',
        min_stock: '',
        supplier: '',
        expiry_date: '',
      });
    }
    setShowIngredientModal(true);
  };

  const handleCloseIngredientModal = () => {
    setShowIngredientModal(false);
    setIngredientFormData({
      name: '',
      category: '',
      unit: '',
      cost_per_unit: '',
      current_stock: '',
      min_stock: '',
      supplier: '',
      expiry_date: '',
    });
  };

  const handleSaveIngredient = async () => {
    try {
      let result;
      if (isEditingIngredient) {
        result = await saveIngredient(
          ingredientFormData.id,
          ingredientFormData
        );
      } else {
        result = await saveIngredient(ingredientFormData);
      }

      if (result.success) {
        addToast({
          title: 'Berhasil',
          description: `Bahan ${
            isEditingIngredient ? 'diupdate' : 'ditambahkan'
          }`,
          type: 'success',
        });
        handleCloseIngredientModal();
        // ✅ REACT QUERY: Invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.ingredients(currentBusiness?.id),
        });
        await refetchIngredients();
      } else {
        addToast({
          title: 'Gagal',
          description: result.error || 'Terjadi kesalahan',
          type: 'error',
        });
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: error.message,
        type: 'error',
      });
    }
  };

  const handleDeleteIngredient = async id => {
    if (!window.confirm('Yakin ingin menghapus bahan ini?')) return;

    const result = await deleteIngredient(id);
    if (result.success) {
      addToast({
        title: 'Berhasil',
        description: 'Bahan berhasil dihapus',
        type: 'success',
      });
      // ✅ REACT QUERY: Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.ingredients(currentBusiness?.id),
      });
      await refetchIngredients();
    } else {
      addToast({
        title: 'Gagal',
        description: result.error || 'Terjadi kesalahan',
        type: 'error',
      });
    }
  };

  // Recipe Handlers
  const handleOpenRecipeModal = (recipe = null) => {
    if (recipe) {
      setIsEditingRecipe(true);
      setRecipeFormData({
        product_id: recipe.product_id,
        ingredients: recipe.ingredients || [],
      });
      setSelectedIngredients(recipe.ingredients || []);
    } else {
      setIsEditingRecipe(false);
      setRecipeFormData({
        product_id: '',
        ingredients: [],
      });
      setSelectedIngredients([]);
    }
    setShowRecipeModal(true);
  };

  const handleCloseRecipeModal = () => {
    setShowRecipeModal(false);
    setRecipeFormData({
      product_id: '',
      ingredients: [],
    });
    setSelectedIngredients([]);
  };

  const handleAddIngredientToRecipe = () => {
    setSelectedIngredients([
      ...selectedIngredients,
      { ingredient_id: '', quantity: '', name: '', unit: '' },
    ]);
  };

  const handleRemoveIngredientFromRecipe = index => {
    const updated = selectedIngredients.filter((_, i) => i !== index);
    setSelectedIngredients(updated);
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...selectedIngredients];

    if (field === 'ingredient_id') {
      const ingredient = ingredients.find(ing => ing.id === parseInt(value));
      updated[index] = {
        ...updated[index],
        ingredient_id: value,
        name: ingredient?.name || '',
        unit: ingredient?.unit || '',
      };
    } else {
      updated[index][field] = value;
    }

    setSelectedIngredients(updated);
  };

  const handleSaveRecipe = async () => {
    try {
      const recipeData = {
        product_id: recipeFormData.product_id,
        ingredients: selectedIngredients.map(ing => ({
          ingredient_id: parseInt(ing.ingredient_id),
          quantity: parseFloat(ing.quantity),
        })),
      };

      let result;
      if (isEditingRecipe) {
        result = await saveRecipe(recipeFormData.product_id, {
          ingredients: recipeData.ingredients,
        });
      } else {
        result = await saveRecipe(recipeData);
      }

      if (result.success) {
        addToast({
          title: 'Berhasil',
          description: `Resep ${isEditingRecipe ? 'diupdate' : 'ditambahkan'}`,
          type: 'success',
        });
        handleCloseRecipeModal();
        // ✅ REACT QUERY: Invalidate and refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.recipes(currentBusiness?.id),
        });
        await refetchRecipes();
      } else {
        addToast({
          title: 'Gagal',
          description: result.error || 'Terjadi kesalahan',
          type: 'error',
        });
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: error.message,
        type: 'error',
      });
    }
  };

  const handleDeleteRecipe = async productId => {
    if (!window.confirm('Yakin ingin menghapus resep ini?')) return;

    const result = await deleteRecipe(productId);
    if (result.success) {
      addToast({
        title: 'Berhasil',
        description: 'Resep berhasil dihapus',
        type: 'success',
      });
      // ✅ REACT QUERY: Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.recipes(currentBusiness?.id),
      });
      await refetchRecipes();
    } else {
      addToast({
        title: 'Gagal',
        description: result.error || 'Terjadi kesalahan',
        type: 'error',
      });
    }
  };

  // Utility Functions
  const getStockStatusBadge = (status, currentStock, minStock) => {
    let statusType = status;
    if (currentStock <= minStock * 0.5) statusType = 'critical';
    else if (currentStock <= minStock) statusType = 'low';
    else statusType = 'adequate';

    const statusConfig = {
      critical: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Kritis',
        icon: AlertTriangle,
      },
      low: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Rendah',
        icon: TrendingDown,
      },
      adequate: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Cukup',
        icon: TrendingUp,
      },
      overstock: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        label: 'Berlebih',
        icon: Archive,
      },
    };

    const config = statusConfig[statusType] || statusConfig.adequate;
    const Icon = config.icon;

    return (
      <Badge
        className={`${config.color} border font-medium flex items-center space-x-1`}
      >
        <Icon className='w-3 h-3' />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const formatCurrency = amount => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className='space-y-6'>
      {/* Outlet Context Banner */}
      {currentOutlet && (
        <Alert className='bg-blue-50 border-blue-400 text-blue-800'>
          <AlertDescription className='flex items-center gap-2'>
            <Package className='w-4 h-4' />
            <span>
              <strong>Konteks Outlet:</strong> Anda sedang melihat data untuk
              outlet <strong>{currentOutlet.name}</strong>. Bahan baku dan resep
              berlaku untuk semua outlet dalam bisnis{' '}
              <strong>{currentBusiness?.name}</strong>.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>
            Bahan Baku & Resep
          </h2>
          <p className='text-gray-600'>
            Kelola inventori bahan dan resep masakan
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={async () => {
              await Promise.all([
                refetchIngredients(),
                refetchRecipes(),
                refetchProducts(),
              ]);
              addToast({
                title: 'Berhasil!',
                description: 'Data inventori berhasil dimuat ulang',
                type: 'success',
              });
            }}
            disabled={ingredientsLoading || recipesLoading || productsLoading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                ingredientsLoading || recipesLoading || productsLoading
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </Button>
          <Button
            className='bg-blue-600 hover:bg-blue-700'
            onClick={() =>
              selectedTab === 'ingredients'
                ? handleOpenIngredientModal()
                : handleOpenRecipeModal()
            }
          >
            <Plus className='w-4 h-4 mr-2' />
            {selectedTab === 'ingredients' ? 'Tambah Bahan' : 'Tambah Resep'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Nilai Stok</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {formatCurrency(calculateStockValue())}
                </p>
              </div>
              <DollarSign className='w-8 h-8 text-green-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Total Bahan</p>
                <p className='text-2xl font-bold text-gray-900'>
                  {ingredients?.length || 0}
                </p>
              </div>
              <Package className='w-8 h-8 text-blue-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Stok Rendah</p>
                <p className='text-2xl font-bold text-yellow-600'>
                  {getLowStockCount()}
                </p>
              </div>
              <AlertTriangle className='w-8 h-8 text-yellow-600' />
            </div>
          </CardContent>
        </Card>

        <Card className='card-hover'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Stok Kritis</p>
                <p className='text-2xl font-bold text-red-600'>
                  {getCriticalStockCount()}
                </p>
              </div>
              <TrendingDown className='w-8 h-8 text-red-600' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='ingredients'>Bahan Baku</TabsTrigger>
              <TabsTrigger value='recipes'>Resep</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          <Tabs value={selectedTab}>
            {/* Ingredients Tab */}
            <TabsContent value='ingredients' className='space-y-4'>
              {/* Search */}
              <div className='flex flex-col sm:flex-row gap-4'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    placeholder='Cari bahan baku...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='pl-10'
                  />
                </div>
              </div>

              {/* Ingredients List */}
              {ingredientsLoading ? (
                <div className='text-center py-8'>Loading...</div>
              ) : filteredIngredients.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  Belum ada bahan baku
                </div>
              ) : (
                <div className='space-y-4'>
                  {filteredIngredients.map(ingredient => (
                    <Card key={ingredient.id} className='card-hover'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between mb-3'>
                          <div className='flex items-center space-x-4'>
                            <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-bold'>
                              <Package className='w-6 h-6' />
                            </div>
                            <div>
                              <h3 className='font-semibold text-gray-900'>
                                {ingredient.name}
                              </h3>
                              <p className='text-sm text-gray-600'>
                                {ingredient.category || 'Uncategorized'} •{' '}
                                {ingredient.supplier || 'No supplier'}
                              </p>
                            </div>
                          </div>
                          {getStockStatusBadge(
                            ingredient.status,
                            ingredient.current_stock,
                            ingredient.min_stock
                          )}
                        </div>

                        <div className='grid grid-cols-2 md:grid-cols-6 gap-4 text-sm'>
                          <div>
                            <p className='text-gray-600'>Stok Saat Ini</p>
                            <p className='font-bold text-lg'>
                              {ingredient.current_stock} {ingredient.unit}
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-600'>Min Stock</p>
                            <p className='font-medium'>
                              {ingredient.min_stock} {ingredient.unit}
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-600'>
                              Harga per {ingredient.unit}
                            </p>
                            <p className='font-medium text-blue-600'>
                              {formatCurrency(ingredient.cost_per_unit)}
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-600'>Nilai Total</p>
                            <p className='font-medium text-green-600'>
                              {formatCurrency(
                                ingredient.total_value ||
                                  ingredient.current_stock *
                                    ingredient.cost_per_unit
                              )}
                            </p>
                          </div>
                          <div>
                            <p className='text-gray-600'>Kadaluarsa</p>
                            <p className='font-medium'>
                              {ingredient.expiry_date
                                ? new Date(
                                    ingredient.expiry_date
                                  ).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  })
                                : '-'}
                            </p>
                          </div>
                          <div className='flex justify-end space-x-2'>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                handleOpenIngredientModal(ingredient)
                              }
                            >
                              <Edit className='w-4 h-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              className='text-red-600 hover:text-red-700'
                              onClick={() =>
                                handleDeleteIngredient(ingredient.id)
                              }
                            >
                              <Trash2 className='w-4 h-4' />
                            </Button>
                          </div>
                        </div>

                        {/* Stock Progress Bar */}
                        <div className='mt-3'>
                          <div className='flex justify-between text-xs text-gray-600 mb-1'>
                            <span>Stok Level</span>
                            <span>
                              {(
                                (ingredient.current_stock /
                                  (ingredient.min_stock * 2)) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                          <div className='w-full bg-gray-200 rounded-full h-2'>
                            <div
                              className={`h-2 rounded-full ${
                                ingredient.current_stock <=
                                ingredient.min_stock * 0.5
                                  ? 'bg-red-500'
                                  : ingredient.current_stock <=
                                    ingredient.min_stock
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.min(
                                  (ingredient.current_stock /
                                    (ingredient.min_stock * 2)) *
                                    100,
                                  100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Recipes Tab */}
            <TabsContent value='recipes' className='space-y-4'>
              {/* Search */}
              <div className='flex flex-col sm:flex-row gap-4 items-center justify-between'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <Input
                    placeholder='Cari resep...'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className='pl-10'
                  />
                </div>
              </div>

              {/* Recipes List */}
              {recipesLoading ? (
                <div className='text-center py-8'>Loading...</div>
              ) : filteredRecipes.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  Belum ada resep
                </div>
              ) : (
                <div className='space-y-4'>
                  {filteredRecipes.map(recipe => (
                    <Card key={recipe.id} className='card-hover'>
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between mb-4'>
                          <div className='flex items-center space-x-4'>
                            <div className='w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white'>
                              <ChefHat className='w-6 h-6' />
                            </div>
                            <div>
                              <h3 className='font-semibold text-gray-900 text-lg'>
                                {recipe.name}
                              </h3>
                              <p className='text-sm text-gray-600'>
                                {recipe.category}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm'>
                          <div className='flex items-center space-x-2'>
                            <Calculator className='w-4 h-4 text-gray-500' />
                            <div>
                              <p className='text-gray-600'>Biaya</p>
                              <p className='font-medium text-red-600'>
                                {formatCurrency(recipe.total_cost)}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <DollarSign className='w-4 h-4 text-gray-500' />
                            <div>
                              <p className='text-gray-600'>Harga Jual</p>
                              <p className='font-medium text-green-600'>
                                {formatCurrency(recipe.selling_price)}
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <TrendingUp className='w-4 h-4 text-gray-500' />
                            <div>
                              <p className='text-gray-600'>Margin</p>
                              <p className='font-bold text-blue-600'>
                                {recipe.margin.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <div className='flex items-center space-x-2'>
                            <Package className='w-4 h-4 text-gray-500' />
                            <div>
                              <p className='text-gray-600'>Bahan</p>
                              <p className='font-medium'>
                                {recipe.ingredients?.length || 0} items
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Ingredients List */}
                        {recipe.ingredients &&
                          recipe.ingredients.length > 0 && (
                            <div className='bg-gray-50 rounded-lg p-3 mb-4'>
                              <h4 className='font-medium text-gray-900 mb-2 flex items-center'>
                                <BookOpen className='w-4 h-4 mr-2' />
                                Bahan-bahan:
                              </h4>
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm'>
                                {recipe.ingredients.map((ingredient, index) => (
                                  <div
                                    key={index}
                                    className='flex items-center justify-between p-2 rounded border bg-white'
                                  >
                                    <div className='flex items-center gap-2'>
                                      <span className='px-2 py-0.5 rounded-full bg-gray-100 border text-gray-700'>
                                        {formatQuantity(ingredient.quantity)}{' '}
                                        {ingredient.unit}
                                      </span>
                                      <span className='text-gray-400'>•</span>
                                      <span className='font-medium text-gray-900'>
                                        {ingredient.name}
                                      </span>
                                    </div>
                                    <span className='font-medium text-gray-600'>
                                      {formatCurrency(ingredient.total_cost)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        <div className='flex justify-between items-center'>
                          <div className='text-sm text-gray-600'>
                            <span>Keuntungan per porsi: </span>
                            <span className='font-bold text-green-600'>
                              {formatCurrency(
                                recipe.selling_price - recipe.total_cost
                              )}
                            </span>
                          </div>

                          <div className='flex space-x-2'>
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => handleOpenRecipeModal(recipe)}
                            >
                              <Edit className='w-4 h-4' />
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              className='text-red-600 hover:text-red-700'
                              onClick={() =>
                                handleDeleteRecipe(recipe.product_id)
                              }
                            >
                              <Trash2 className='w-4 h-4' />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Ingredient Modal */}
      {showIngredientModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex justify-between items-center mb-4'>
                <h3 className='text-xl font-bold'>
                  {isEditingIngredient ? 'Edit Bahan' : 'Tambah Bahan Baru'}
                </h3>
                <button
                  onClick={handleCloseIngredientModal}
                  className='text-gray-400 hover:text-gray-600'
                >
                  <X className='w-6 h-6' />
                </button>
              </div>

              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Nama Bahan *
                    </label>
                    <Input
                      value={ingredientFormData.name}
                      onChange={e =>
                        setIngredientFormData({
                          ...ingredientFormData,
                          name: e.target.value,
                        })
                      }
                      placeholder='Contoh: Beras Premium'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Kategori
                    </label>
                    <Input
                      value={ingredientFormData.category}
                      onChange={e =>
                        setIngredientFormData({
                          ...ingredientFormData,
                          category: e.target.value,
                        })
                      }
                      placeholder='Contoh: Bahan Pokok'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Unit *
                    </label>
                    <Input
                      value={ingredientFormData.unit}
                      onChange={e =>
                        setIngredientFormData({
                          ...ingredientFormData,
                          unit: e.target.value,
                        })
                      }
                      placeholder='Contoh: kg, liter, gram'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Harga per Unit *
                    </label>
                    <Input
                      type='number'
                      value={ingredientFormData.cost_per_unit}
                      onChange={e =>
                        setIngredientFormData({
                          ...ingredientFormData,
                          cost_per_unit: e.target.value,
                        })
                      }
                      placeholder='Contoh: 12000'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Stok Saat Ini *
                    </label>
                    <Input
                      type='number'
                      value={ingredientFormData.current_stock}
                      onChange={e =>
                        setIngredientFormData({
                          ...ingredientFormData,
                          current_stock: e.target.value,
                        })
                      }
                      placeholder='Contoh: 50'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Minimum Stok *
                    </label>
                    <Input
                      type='number'
                      value={ingredientFormData.min_stock}
                      onChange={e =>
                        setIngredientFormData({
                          ...ingredientFormData,
                          min_stock: e.target.value,
                        })
                      }
                      placeholder='Contoh: 20'
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Supplier
                    </label>
                    <Input
                      value={ingredientFormData.supplier}
                      onChange={e =>
                        setIngredientFormData({
                          ...ingredientFormData,
                          supplier: e.target.value,
                        })
                      }
                      placeholder='Contoh: CV Beras Jaya'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium mb-1'>
                      Tanggal Kadaluarsa
                    </label>
                    <Input
                      type='date'
                      value={ingredientFormData.expiry_date}
                      onChange={e =>
                        setIngredientFormData({
                          ...ingredientFormData,
                          expiry_date: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className='flex justify-end space-x-2 mt-6'>
                <Button variant='outline' onClick={handleCloseIngredientModal}>
                  Batal
                </Button>
                <Button
                  onClick={handleSaveIngredient}
                  className='bg-blue-600 hover:bg-blue-700'
                >
                  {isEditingIngredient ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6'>
              <div className='flex justify-between items-center mb-4'>
                <h3 className='text-xl font-bold'>
                  {isEditingRecipe ? 'Edit Resep' : 'Tambah Resep Baru'}
                </h3>
                <button
                  onClick={handleCloseRecipeModal}
                  className='text-gray-400 hover:text-gray-600'
                >
                  <X className='w-6 h-6' />
                </button>
              </div>

              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium mb-1'>
                    Produk *
                  </label>
                  <Popover
                    open={productComboOpen}
                    onOpenChange={setProductComboOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type='button'
                        disabled={isEditingRecipe || productsLoading}
                        className='w-full border rounded-md px-3 py-2 text-left text-sm flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        {productsLoading ? (
                          <div className='flex items-center gap-2 w-full'>
                            <Skeleton className='h-4 w-32' />
                            <Skeleton className='h-3 w-16 ml-auto' />
                          </div>
                        ) : (
                          <>
                            <span>
                              {recipeFormData.product_id
                                ? products?.find(
                                    p =>
                                      String(p.id) ===
                                      String(recipeFormData.product_id)
                                  )?.name || 'Pilih Produk'
                                : 'Pilih Produk'}
                            </span>
                            <span className='text-xs text-gray-500'>
                              {recipeFormData.product_id
                                ? formatCurrency(
                                    products?.find(
                                      p =>
                                        String(p.id) ===
                                        String(recipeFormData.product_id)
                                    )?.price || 0
                                  )
                                : ''}
                            </span>
                          </>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className='p-0 w-[420px]' align='start'>
                      <Command shouldFilter={true}>
                        <CommandInput
                          placeholder='Cari produk...'
                          className='h-9'
                          disabled={productsLoading}
                        />
                        <CommandList className='max-h-[300px] overflow-y-auto'>
                          {productsLoading ? (
                            <div className='p-3 space-y-2'>
                              {/* Skeleton loader untuk produk */}
                              {[...Array(5)].map((_, index) => (
                                <div
                                  key={index}
                                  className='flex items-center justify-between p-2 rounded-md'
                                >
                                  <div className='flex-1 space-y-2'>
                                    <Skeleton className='h-4 w-3/4' />
                                    <Skeleton className='h-3 w-1/2' />
                                  </div>
                                  <div className='ml-2 space-y-2'>
                                    <Skeleton className='h-3 w-16' />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>
                                {products?.length === 0
                                  ? 'Tidak ada produk ditemukan.'
                                  : 'Tidak ada produk yang cocok dengan pencarian.'}
                              </CommandEmpty>
                              <CommandGroup
                                heading={`Produk (${products?.length || 0})`}
                              >
                                {products?.map(product => (
                                  <CommandItem
                                    key={product.id}
                                    value={`${product.name} ${product.id} ${
                                      product.sku || ''
                                    }`}
                                    onSelect={() => {
                                      setRecipeFormData({
                                        ...recipeFormData,
                                        product_id: product.id,
                                      });
                                      setProductComboOpen(false);
                                    }}
                                    className='cursor-pointer'
                                  >
                                    <div className='flex items-center justify-between w-full'>
                                      <span className='flex-1 text-sm font-medium'>
                                        {product.name}
                                      </span>
                                      <div className='flex items-center gap-2 ml-2'>
                                        {product.sku && (
                                          <span className='text-xs text-gray-400'>
                                            SKU: {product.sku}
                                          </span>
                                        )}
                                        <span className='text-xs text-gray-500 font-medium'>
                                          {formatCurrency(product.price || 0)}
                                        </span>
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <div className='flex justify-between items-center mb-2'>
                    <label className='block text-sm font-medium'>
                      Bahan-bahan *
                    </label>
                    <Button size='sm' onClick={handleAddIngredientToRecipe}>
                      <Plus className='w-4 h-4 mr-1' />
                      Tambah Bahan
                    </Button>
                  </div>

                  <div className='space-y-2'>
                    {selectedIngredients.map((item, index) => (
                      <div key={index} className='flex gap-2 items-center'>
                        <select
                          className='flex-1 border rounded-md p-2'
                          value={item.ingredient_id}
                          onChange={e =>
                            handleIngredientChange(
                              index,
                              'ingredient_id',
                              e.target.value
                            )
                          }
                        >
                          <option value=''>Pilih Bahan</option>
                          {ingredients?.map(ingredient => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name} ({ingredient.unit})
                            </option>
                          ))}
                        </select>
                        <Input
                          type='number'
                          step='0.001'
                          className='w-32'
                          placeholder='Jumlah'
                          value={item.quantity}
                          onChange={e =>
                            handleIngredientChange(
                              index,
                              'quantity',
                              e.target.value
                            )
                          }
                        />
                        <span className='text-sm text-gray-600 w-16'>
                          {item.unit}
                        </span>
                        <Button
                          size='sm'
                          variant='outline'
                          className='text-red-600'
                          onClick={() =>
                            handleRemoveIngredientFromRecipe(index)
                          }
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className='flex justify-end space-x-2 mt-6'>
                <Button variant='outline' onClick={handleCloseRecipeModal}>
                  Batal
                </Button>
                <Button
                  onClick={handleSaveRecipe}
                  className='bg-purple-600 hover:bg-purple-700'
                >
                  {isEditingRecipe ? 'Update' : 'Simpan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryRecipe;
