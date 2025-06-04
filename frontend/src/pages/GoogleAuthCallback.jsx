import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GoogleAuthCallback = () => {
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const state = urlParams.get('state');

      if (error) {
        // Send error message to parent window
        window.opener?.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error === 'access_denied' ? 'Authentication cancelled' : 'Authentication failed'
        }, window.location.origin);
        window.close();
        return;
      }

      if (!code) {
        window.opener?.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'No authorization code received'
        }, window.location.origin);
        window.close();
        return;
      }

      try {
        // Exchange authorization code for tokens
        const response = await fetch('/auth/google/exchange-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, state }),
        });

        const result = await response.json();

        if (response.ok && result.credential) {
          // Send success message with credential to parent window
          window.opener?.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            credential: result.credential
          }, window.location.origin);
        } else {
          window.opener?.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: result.error || 'Failed to authenticate with Google'
          }, window.location.origin);
        }
      } catch (error) {
        console.error('Error processing Google callback:', error);
        window.opener?.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: 'Failed to process authentication'
        }, window.location.origin);
      }

      window.close();
    };

    handleCallback();
  }, [location]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #4285F4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
      <p>Processing authentication...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GoogleAuthCallback;
