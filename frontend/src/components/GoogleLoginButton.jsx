import { useEffect, useRef, useState } from 'react';
import { connectionState } from '../utils/apiCalls/apiRequest';
import { authAPI, googleClientCache } from '../utils/apiCalls/auth';
import LoadingIndicator from './LoadingIndicator';
import { Button } from './ui/button';

const GoogleLoginButton = ({ onSuccess, onError, disabled = false, mode = 'login' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [clientId, setClientId] = useState('');
  const [initError, setInitError] = useState(null);
  const [isOnline, setIsOnline] = useState(connectionState.isOnline);
  const fetchAttemptRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Subscribe to connection state
    const unsubscribe = connectionState.subscribe((online) => {
      if (mountedRef.current) {
        setIsOnline(online);
      }
    });
    
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchClientId();
  }, []);

  const fetchClientId = async () => {
    if (fetchAttemptRef.current) return;

    if (googleClientCache.isValid && !googleClientCache.isExpired()) {
      setClientId(googleClientCache.clientId);
      setInitError(null);
      return;
    }

    if (!googleClientCache.canRetry()) {
      const timeUntilRetry = Math.ceil((5 * 60 * 1000 - (Date.now() - googleClientCache.lastError)) / 1000);
      setInitError(`Google OAuth temporarily unavailable. Retry in ${Math.max(0, timeUntilRetry)} seconds.`);
      return;
    }

    fetchAttemptRef.current = true;
    setInitError(null);

    try {
      const response = await authAPI.getGoogleClientId();
      
      if (mountedRef.current) {
        setClientId(response.client_id);
        setInitError(null);
      }
    } catch (error) {
      console.error('Failed to get Google client ID:', error);
      
      if (mountedRef.current) {
        setInitError('Google OAuth is currently unavailable.');
        onError?.(error.message);
      }
    } finally {
      setTimeout(() => {
        fetchAttemptRef.current = false;
      }, 2000);
    }
  };

  useEffect(() => {
    if (!clientId) return;

    // Load Google OAuth script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleOAuth;
    script.onerror = () => {
      if (mountedRef.current) {
        setInitError('Failed to load Google OAuth script');
        onError?.('Failed to load Google OAuth script');
      }
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [clientId]);

  const initializeGoogleOAuth = () => {
    if (window.google && clientId && mountedRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (error) {
        console.error('Failed to initialize Google OAuth:', error);
        if (mountedRef.current) {
          setInitError('Failed to initialize Google OAuth');
          onError?.('Failed to initialize Google OAuth');
        }
      }
    }
  };

  const handleGoogleResponse = async (response) => {
    if (!mountedRef.current) return;
    
    setIsLoading(true);
    try {
      let result;
      if (mode === 'register') {
        result = await authAPI.googleRegister(response.credential);
      } else {
        result = await authAPI.googleLogin(response.credential);
      }
      onSuccess(result);
    } catch (error) {
      console.error('Google authentication failed:', error);
      onError(error.message || `Google ${mode} failed`);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleAuth = () => {
    if (!window.google || disabled || isLoading || !clientId || initError) return;

    try {
      setIsLoading(true);
      window.google.accounts.id.prompt((notification) => {
        if (mountedRef.current && (notification.isNotDisplayed() || notification.isSkippedMoment())) {
          setIsLoading(false);
          onError?.('Google authentication was cancelled or unavailable');
        }
      });
    } catch (error) {
      console.error('Failed to trigger Google authentication:', error);
      if (mountedRef.current) {
        setIsLoading(false);
        onError?.('Failed to trigger Google authentication');
      }
    }
  };

  const handleRetry = () => {
    googleClientCache.clear();
    setInitError(null);
    setClientId('');
    fetchClientId();
  };

  if (initError) {
    return (
      <div style={{ textAlign: 'center', padding: '12px' }}>
        <div style={{ 
          color: '#d93025', 
          fontSize: '14px', 
          marginBottom: '8px' 
        }}>
          Google OAuth Unavailable
        </div>
        <div style={{ 
          color: '#5f6368', 
          fontSize: '12px', 
          marginBottom: '8px' 
        }}>
          {initError}
        </div>
        <Button
          type="button"
          onClick={handleRetry}
          variant="outline"
          size="sm"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Show loading state while fetching client ID
  if (!clientId) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '12px',
        border: '1px solid #dadce0',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
        color: '#5f6368',
        fontSize: '14px',
      }}>
        <div className="spinner" style={{
          width: '16px',
          height: '16px',
          border: '2px solid #dadce0',
          borderTop: '2px solid #4285f4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        {isOnline ? 'Loading Google OAuth...' : 'Waiting for server...'}
      </div>
    );
  }

  const buttonText = mode === 'register' 
    ? (isLoading ? 'Creating account...' : 'Continue with Google') 
    : (isLoading ? 'Signing in...' : 'Continue with Google');

  return (
    <LoadingIndicator loading={isLoading}>
      <Button
        type="button"
        onClick={handleGoogleAuth}
        disabled={disabled || isLoading || !clientId || initError || !isOnline}
        className="google-login-btn w-full relative overflow-hidden"
        variant="outline"
        size="lg"
      >
        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" className="shrink-0">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          <span className="font-medium">
            {!isOnline ? 'Server Offline' : buttonText}
          </span>
        </div>
      </Button>
    </LoadingIndicator>
  );
};

export default GoogleLoginButton;
