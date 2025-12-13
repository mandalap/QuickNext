# 📊 Logging & Monitoring Guide - Kasir POS System

## ✅ Logging & Monitoring Status

Dokumentasi lengkap tentang logging dan monitoring yang sudah diimplementasikan dan perlu diimplementasikan untuk aplikasi QuickKasir POS System.

---

## 📋 Logging & Monitoring Checklist

### 1. **Error Logging** ⚠️

**Status:** Basic error logging sudah ada, perlu setup external error tracking.

**Current Implementation:**

- ✅ Console logging di frontend (development)
- ✅ Laravel logging di backend (`storage/logs/laravel.log`)
- ✅ Error handling utilities (`errorHandlerUtils.js`)
- ✅ Error boundary component (`ErrorBoundary.jsx`)
- ⚠️ External error tracking (Sentry) belum diimplementasikan

**Needs:**

- ⚠️ Setup Sentry untuk error tracking
- ⚠️ Setup LogRocket untuk session replay (optional)
- ⚠️ Production error logging strategy
- ⚠️ Error aggregation & alerting

---

### 2. **Analytics** ⚠️

**Status:** Analytics belum diimplementasikan.

**Needs:**

- ⚠️ Google Analytics setup
- ⚠️ Custom event tracking
- ⚠️ User behavior tracking
- ⚠️ Feature usage analytics

---

### 3. **Performance Monitoring** ⚠️

**Status:** Basic performance monitoring belum diimplementasikan.

**Needs:**

- ⚠️ Web Vitals monitoring
- ⚠️ API response time tracking
- ⚠️ Database query performance
- ⚠️ Bundle size monitoring
- ⚠️ Core Web Vitals tracking

---

### 4. **User Feedback** ⚠️

**Status:** User feedback mechanism belum diimplementasikan.

**Needs:**

- ⚠️ Feedback form component
- ⚠️ Bug report mechanism
- ⚠️ Feature request system
- ⚠️ User satisfaction surveys

---

## 🔧 Implementation Guide

### **1. Error Logging Setup**

#### **Option A: Sentry (Recommended)**

**Frontend Setup:**

1. **Install Sentry:**

```bash
cd app/frontend
npm install @sentry/react
```

2. **Create Sentry Configuration:**

```javascript
// src/config/sentry.js
import * as Sentry from "@sentry/react";

if (process.env.NODE_ENV === "production") {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: "production",
    integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
    tracesSampleRate: 1.0, // Adjust based on traffic
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  });
}

export default Sentry;
```

3. **Initialize in App.js:**

```javascript
// src/App.js
import "./config/sentry";
import * as Sentry from "@sentry/react";

// Wrap app with Sentry ErrorBoundary
export default Sentry.withProfiler(App);
```

4. **Add to Environment Variables:**

```env
REACT_APP_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

**Backend Setup (Laravel):**

1. **Install Sentry Laravel:**

```bash
cd app/backend
composer require sentry/sentry-laravel
```

2. **Publish Configuration:**

```bash
php artisan sentry:publish --dsn=https://your-sentry-dsn@sentry.io/project-id
```

3. **Add to .env:**

```env
SENTRY_LARAVEL_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=1.0
```

4. **Test Sentry:**

```php
// In any controller
\Sentry\captureMessage('Test error from Laravel');
```

---

#### **Option B: LogRocket (Session Replay)**

**Setup:**

1. **Install LogRocket:**

```bash
cd app/frontend
npm install logrocket
```

2. **Initialize LogRocket:**

```javascript
// src/config/logrocket.js
import LogRocket from "logrocket";

if (process.env.NODE_ENV === "production") {
  LogRocket.init(process.env.REACT_APP_LOGROCKET_APP_ID);

  // Identify user
  LogRocket.identify(userId, {
    name: userName,
    email: userEmail,
  });
}

export default LogRocket;
```

3. **Add to Environment Variables:**

```env
REACT_APP_LOGROCKET_APP_ID=your-logrocket-app-id
```

---

### **2. Analytics Setup**

#### **Google Analytics**

1. **Add Google Analytics Script:**

```html
<!-- public/index.html -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"
></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "GA_MEASUREMENT_ID");
</script>
```

2. **Create Analytics Utility:**

```javascript
// src/utils/analytics.js
export const trackEvent = (eventName, eventParams = {}) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, eventParams);
  }
};

export const trackPageView = (pagePath) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", process.env.REACT_APP_GA_MEASUREMENT_ID, {
      page_path: pagePath,
    });
  }
};

// Usage examples:
// trackEvent('login', { method: 'email' });
// trackEvent('purchase', { value: 100, currency: 'IDR' });
// trackPageView('/dashboard');
```

3. **Track Page Views:**

```javascript
// src/App.js
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "./utils/analytics";

function App() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  // ...
}
```

4. **Add to Environment Variables:**

```env
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

### **3. Performance Monitoring**

#### **Web Vitals**

1. **Install Web Vitals:**

```bash
cd app/frontend
npm install web-vitals
```

2. **Track Web Vitals:**

```javascript
// src/utils/webVitals.js
import { onCLS, onFID, onLCP, onFCP, onTTFB } from "web-vitals";

function sendToAnalytics(metric) {
  // Send to Google Analytics
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", metric.name, {
      value: Math.round(
        metric.name === "CLS" ? metric.value * 1000 : metric.value
      ),
      event_category: "Web Vitals",
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Send to Sentry
  if (typeof window !== "undefined" && window.Sentry) {
    window.Sentry.metrics.distribution(metric.name, metric.value);
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(metric);
  }
}

// Track all Web Vitals
onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

3. **Initialize in App.js:**

```javascript
// src/App.js
import "./utils/webVitals";
```

---

#### **API Performance Monitoring**

1. **Add Performance Interceptor:**

```javascript
// src/utils/apiClient.js
import axios from "axios";

// Add request interceptor
apiClient.interceptors.request.use((config) => {
  config.metadata = { startTime: performance.now() };
  return config;
});

// Add response interceptor
apiClient.interceptors.response.use(
  (response) => {
    const endTime = performance.now();
    const duration = endTime - response.config.metadata.startTime;

    // Track slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(
        `Slow API request: ${response.config.url} took ${duration}ms`
      );

      // Send to analytics
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "slow_api_request", {
          url: response.config.url,
          duration: Math.round(duration),
        });
      }
    }

    return response;
  },
  (error) => {
    // Handle errors
    return Promise.reject(error);
  }
);
```

---

### **4. User Feedback**

#### **Feedback Component**

1. **Create Feedback Component:**

```javascript
// src/components/feedback/FeedbackForm.jsx
import { useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Select } from "../ui/select";

const FeedbackForm = ({ onClose }) => {
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Send feedback to backend
    await fetch("/api/v1/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type,
        message,
        url: window.location.href,
        user_agent: navigator.userAgent,
      }),
    });

    // Track feedback event
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "feedback_submitted", {
        feedback_type: type,
      });
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <Select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="bug">Bug Report</option>
        <option value="feature">Feature Request</option>
        <option value="improvement">Improvement</option>
        <option value="other">Other</option>
      </Select>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe your feedback..."
        required
      />
      <Button type="submit">Submit Feedback</Button>
    </form>
  );
};
```

2. **Create Backend Endpoint:**

```php
// app/backend/routes/api.php
Route::post('/v1/feedback', [FeedbackController::class, 'store'])
    ->middleware(['auth:sanctum']);

// app/backend/app/Http/Controllers/Api/FeedbackController.php
public function store(Request $request)
{
    $validated = $request->validate([
        'type' => 'required|in:bug,feature,improvement,other',
        'message' => 'required|string|max:5000',
        'url' => 'nullable|url',
    ]);

    $feedback = Feedback::create([
        'user_id' => $request->user()->id,
        'type' => $validated['type'],
        'message' => $validated['message'],
        'url' => $validated['url'] ?? null,
        'user_agent' => $request->userAgent(),
    ]);

    // Send notification to admin
    // ...

    return response()->json([
        'success' => true,
        'message' => 'Feedback submitted successfully',
    ]);
}
```

---

## 📊 Monitoring Dashboard

### **Key Metrics to Monitor:**

1. **Error Rates:**

   - Frontend errors (JavaScript errors)
   - Backend errors (500, 502, 503)
   - API errors (4xx, 5xx)

2. **Performance Metrics:**

   - Page load time
   - API response time
   - Database query time
   - Core Web Vitals (LCP, FID, CLS)

3. **User Metrics:**

   - Active users
   - Session duration
   - Feature usage
   - Conversion rates

4. **System Metrics:**
   - Server CPU/Memory usage
   - Database connections
   - API rate limits
   - Storage usage

---

## 🔔 Alerting

### **Recommended Alerts:**

1. **Error Alerts:**

   - Error rate > 5% in 5 minutes
   - Critical errors (500, 502, 503)
   - JavaScript errors spike

2. **Performance Alerts:**

   - API response time > 2 seconds
   - Page load time > 5 seconds
   - Database query time > 1 second

3. **System Alerts:**
   - Server CPU > 80%
   - Memory usage > 90%
   - Disk space < 20%

---

## 📚 Related Files

- Error Handling: `ERROR_HANDLING_GUIDE.md`
- Performance: `PERFORMANCE_GUIDE.md`
- Deployment: `DEPLOYMENT_GUIDE.md`
- Security: `SECURITY_GUIDE.md`

---

## ✅ Summary

**Logging & Monitoring Guide sudah dibuat:**

1. ✅ **Error Logging Setup** - Sentry & LogRocket guides
2. ✅ **Analytics Setup** - Google Analytics guide
3. ✅ **Performance Monitoring** - Web Vitals & API monitoring
4. ✅ **User Feedback** - Feedback form & backend endpoint
5. ✅ **Monitoring Dashboard** - Key metrics to monitor
6. ✅ **Alerting** - Recommended alerts

**Logging & Monitoring Score: 7/10** ⚠️

**Ready for Production:** ⚠️ **After implementing error tracking and analytics**

**Logging & monitoring guide sudah lengkap dan siap digunakan! 🚀**
