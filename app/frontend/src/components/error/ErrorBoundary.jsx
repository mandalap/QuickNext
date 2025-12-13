import { AlertCircle, Home, RefreshCw } from 'lucide-react';
import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 ErrorBoundary caught error:', error, errorInfo);
    }
    this.setState({
      error,
      errorInfo,
    });

    // Error tracking: Uncomment and configure when ready to use error tracking service
    // Example with Sentry:
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, {
    //     contexts: { react: { componentStack: errorInfo.componentStack } }
    //   });
    // }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={() =>
            this.setState({ hasError: false, error: null, errorInfo: null })
          }
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, errorInfo, onReset }) => {
  const handleGoHome = () => {
    // Use window.location instead of useNavigate to avoid Router context error
    window.location.href = '/dashboard';
  };

  return (
    <div className='flex items-center justify-center min-h-screen bg-gray-50 p-4'>
      <Card className='w-full max-w-2xl'>
        <CardHeader className='text-center pb-4'>
          <div className='flex justify-center mb-4'>
            <AlertCircle className='w-16 h-16 text-red-500' />
          </div>
          <CardTitle className='text-2xl font-bold text-gray-900'>
            Oops! Terjadi Kesalahan
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
            <p className='text-sm text-red-800 font-medium mb-2'>
              Aplikasi mengalami error yang tidak terduga
            </p>
            {process.env.NODE_ENV === 'development' && error && (
              <details className='mt-2'>
                <summary className='text-xs text-red-600 cursor-pointer hover:text-red-800'>
                  Lihat Detail Error
                </summary>
                <pre className='mt-2 text-xs text-red-900 overflow-auto max-h-40 bg-red-100 p-2 rounded'>
                  {error.toString()}
                  {errorInfo && errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>

          <div className='flex flex-col sm:flex-row gap-3'>
            <Button onClick={onReset} variant='default' className='flex-1'>
              <RefreshCw className='w-4 h-4 mr-2' />
              Coba Lagi
            </Button>
            <Button onClick={handleGoHome} variant='outline' className='flex-1'>
              <Home className='w-4 h-4 mr-2' />
              Kembali ke Dashboard
            </Button>
          </div>

          <div className='text-center text-sm text-gray-500'>
            <p>
              Jika masalah terus berlanjut, silakan hubungi administrator
              sistem.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorBoundary;
