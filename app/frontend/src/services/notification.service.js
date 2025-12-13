import apiClient from '../utils/apiClient';

const notificationService = {
  // Get all notifications
  async getAll(params = {}) {
    const response = await apiClient.get('/v1/notifications', { params });
    const payload = response.data;
    if (payload && Array.isArray(payload.data)) {
      payload.data = payload.data.map(n => ({ ...n, is_read: !!n.read_at }));
    }
    return payload;
  },

  // Get unread count with retry logic
  async getUnreadCount(retries = 2) {
    try {
      const response = await apiClient.get('/v1/notifications/count', {
        timeout: 5000, // Shorter timeout for notifications
      });
      return response.data.unread ?? 0;
    } catch (error) {
      if (
        retries > 0 &&
        (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR')
      ) {
        // Retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries)));
        return this.getUnreadCount(retries - 1);
      }
      // Return 0 on final failure to avoid UI issues
      return 0;
    }
  },

  // Mark notification as read
  async markAsRead(id) {
    const response = await apiClient.post(`/v1/notifications/${id}/read`);
    return response.data;
  },

  // Mark all notifications as read
  async markAllAsRead() {
    const response = await apiClient.post('/v1/notifications/mark-all-read');
    return response.data;
  },

  // Delete notification
  async delete(_id) {
    // Not implemented on backend yet; noop to keep UI stable
    return { success: true };
  },

  // Get unread notifications
  async getUnread() {
    // Backend does not support is_read filter; client filters
    const res = await this.getAll({ per_page: 10 });
    return { ...res, data: (res.data || []).filter(n => !n.is_read) };
  },
};

export default notificationService;
