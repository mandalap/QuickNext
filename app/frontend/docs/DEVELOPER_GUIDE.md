# 👨‍💻 QuickKasir Developer Guide

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm atau yarn
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd kasir-pos-system

# Install dependencies
cd app/frontend
npm install

# Start development server
npm start
```

### Environment Variables

Create `.env` file in `app/frontend/`:

```env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_APP_NAME=QuickKasir
```

---

## 📁 Project Structure

```
app/frontend/
├── public/                 # Static files
│   ├── index.html
│   ├── manifest.json
│   └── service-worker.js
├── src/
│   ├── components/         # React components
│   │   ├── pwa/           # PWA components
│   │   ├── ui/            # UI components
│   │   └── ...
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   ├── services/          # API services
│   ├── utils/             # Utilities
│   ├── config/            # Configuration
│   └── App.js             # Main app component
├── scripts/               # Build scripts
└── package.json
```

---

## 🏗️ Architecture

### Tech Stack
- **React 19** - UI framework
- **React Router** - Routing
- **React Query** - Data fetching & caching
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Dexie** - IndexedDB wrapper
- **React Hot Toast** - Notifications

### State Management
- **React Context** - Global state (Auth)
- **React Query** - Server state
- **Local State** - Component state (useState)
- **IndexedDB** - Offline storage

### Code Splitting
- All routes use `React.lazy()`
- Heavy components lazy loaded
- Vendor chunks separated

---

## 🔧 Development Workflow

### Running Development Server
```bash
npm start
# or
npm run dev
```

### Building for Production
```bash
npm run build
```

### Testing Production Build
```bash
npm run serve:production
```

### Code Analysis
```bash
npm run build:analyze
```

---

## 📡 API Integration

### API Client
Located in `src/utils/apiClient.js`

**Usage:**
```javascript
import apiClient from '../utils/apiClient';

// GET request
const response = await apiClient.get('/v1/products');

// POST request
const response = await apiClient.post('/v1/products', data);
```

### Error Handling
Located in `src/utils/errorHandler.js`

**Usage:**
```javascript
import { handleApiError } from '../utils/errorHandler';

try {
  const result = await apiClient.get('/v1/products');
} catch (error) {
  const handled = handleApiError(error);
  // Error sudah di-handle dengan format yang konsisten
}
```

### React Query
Located in `src/config/reactQuery.js`

**Usage:**
```javascript
import { useQuery } from '@tanstack/react-query';
import { productService } from '../services/product.service';

const { data, isLoading, error } = useQuery({
  queryKey: ['products'],
  queryFn: () => productService.getAll(),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## 🔄 PWA Implementation

### Service Worker
Located in `public/service-worker.js`

**Features:**
- Static asset caching
- Runtime caching (stale-while-revalidate)
- API response caching
- Offline fallback

### Offline Storage
Located in `src/db/indexedDB.js`

**Features:**
- Product cache
- Category cache
- Customer cache
- Transaction queue
- Settings cache

### PWA Components
Located in `src/components/pwa/`

- `InstallPrompt.jsx` - Install prompt
- `UpdateNotification.jsx` - Update notification
- `OfflineIndicator.jsx` - Offline status
- `SyncIndicator.jsx` - Sync status

---

## 🧪 Testing

### Manual Testing
1. Test di berbagai browser
2. Test di berbagai device
3. Test offline mode
4. Test error scenarios

### Automated Testing (Future)
- Unit tests (Jest)
- Integration tests
- E2E tests (Playwright)

---

## 🐛 Debugging

### React DevTools
- Install React DevTools extension
- Use Profiler untuk performance
- Use Components untuk inspect state

### Chrome DevTools
- Application tab untuk PWA
- Network tab untuk API calls
- Performance tab untuk profiling
- Memory tab untuk memory leaks

---

## 📦 Build & Deployment

### Production Build
```bash
npm run build
```

**Output:** `build/` folder

### Environment Setup
1. Set `REACT_APP_API_URL` to production API
2. Build dengan production config
3. Serve dengan HTTPS (required for PWA)

### Server Configuration
- Serve `build/` folder
- Enable HTTPS
- Set proper cache headers
- Enable gzip compression

---

## 🔐 Security

### Best Practices
- ✅ API calls menggunakan HTTPS
- ✅ Tokens disimpan di localStorage (secure)
- ✅ Input validation di frontend & backend
- ✅ XSS protection (React auto-escapes)
- ✅ CSRF protection (via tokens)

---

## 📝 Code Style

### Naming Conventions
- Components: PascalCase (`ProductCard.jsx`)
- Hooks: camelCase dengan prefix `use` (`useProducts.js`)
- Services: camelCase (`product.service.js`)
- Utils: camelCase (`errorHandler.js`)

### File Structure
- One component per file
- Co-locate related files
- Use index.js for exports

---

## 🚀 Performance Optimization

### Already Implemented
- ✅ Code splitting
- ✅ Lazy loading
- ✅ React Query caching
- ✅ Service Worker caching
- ✅ Bundle compression
- ✅ Tree shaking

### Monitoring
- Lighthouse audits
- Bundle size analysis
- Performance profiling

---

## 📚 Resources

- [React Documentation](https://react.dev/)
- [React Query Documentation](https://tanstack.com/query)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

## 🤝 Contributing

### Git Workflow
1. Create feature branch
2. Make changes
3. Test thoroughly
4. Commit with clear messages
5. Push and create PR

### Code Review
- Follow code style
- Add comments for complex logic
- Update documentation
- Test before submitting

---

## 📞 Support

For development questions:
- Check documentation
- Review code comments
- Ask team members

---

**Happy Coding!** 🎉

