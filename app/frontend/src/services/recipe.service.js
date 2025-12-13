import { API_CONFIG } from '../config/api.config';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

export const recipeService = {
  getAll: async params => {
    try {
      const response = await apiClient.get(API_CONFIG.ENDPOINTS.RECIPES.LIST, {
        params,
      });
      console.log('👨‍🍳 Recipes Response:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  getByProductId: async productId => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.RECIPES.DETAIL(productId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  create: async recipeData => {
    try {
      // recipeData should contain: { product_id: number, ingredients: [{ingredient_id, quantity}] }
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.RECIPES.CREATE,
        recipeData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  update: async (productId, recipeData) => {
    try {
      // recipeData should contain: { ingredients: [{ingredient_id, quantity}] }
      const response = await apiClient.put(
        API_CONFIG.ENDPOINTS.RECIPES.UPDATE(productId),
        recipeData
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  delete: async productId => {
    try {
      const response = await apiClient.delete(
        API_CONFIG.ENDPOINTS.RECIPES.DELETE(productId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },

  calculateCost: async productId => {
    try {
      const response = await apiClient.get(
        API_CONFIG.ENDPOINTS.RECIPES.CALCULATE(productId)
      );
      return { success: true, data: response.data };
    } catch (error) {
      return handleApiError(error);
    }
  },
};
