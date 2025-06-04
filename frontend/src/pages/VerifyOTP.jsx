import { useEffect, useState } from 'react';
import OtpInput from 'react-otp-input';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import LoadingIndicator from '../components/LoadingIndicator';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import '../styles/verifyOTP.css';
import { authAPI, loadingState } from '../utils/apiCalls';

export default function VerifyOTP() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const { email, username, password, fullName } = location.state || {};

  useEffect(() => {
    if (!email || !username || !password) {
      navigate('/register', { replace: true });
    }
  }, [email, username, password, navigate]);

  useEffect(() => {
    const checkLoadingStates = () => {
      setIsVerifying(loadingState.isLoading('auth-verify-otp'));
      setIsResending(loadingState.isLoading('auth-resend-otp'));
    };

    checkLoadingStates();
    const interval = setInterval(checkLoadingStates, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (otp.length === 6 && !autoSubmitted && !isVerifying) {
      setAutoSubmitted(true);
      handleVerification();
    }
  }, [otp, autoSubmitted, isVerifying]);

  const handleVerification = async () => {
    setError('');
    setSuccess('');

    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP');
      setAutoSubmitted(false);
      return;
    }

    try {
      const response = await authAPI.verifyOTP(email, otp, fullName || username, username, password);
      
      if (response.msg === "Registration completed successfully") {
        setSuccess('Email verified successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Registration completed! Please log in with your credentials.' 
            } 
          });
        }, 2000);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error.message || 'Invalid OTP. Please try again.');
      setAutoSubmitted(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!autoSubmitted) {
      await handleVerification();
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setError('');
    setSuccess('');
    setCanResend(false);
    setCountdown(60);
    setOtp(''); 
    setAutoSubmitted(false);

    try {
      const response = await authAPI.resendOTP(email, username);
      setSuccess('New OTP sent to your email!');
    } catch (error) {
      console.error('Resend OTP error:', error);
      setError(error.message || 'Failed to resend OTP. Please try again.');
      setCanResend(true);
      setCountdown(0);
    }
  };

  const handleOtpChange = (value) => {
    setOtp(value);
    setError(''); 
    setAutoSubmitted(false);
  };

  if (!email) {
    return null;
  }

  return (
    <div className="verify-otp-split-page">
      <div className="verify-otp-left">
        <div className="content">
          <h2>Almost There!</h2>
          <p>
            We've sent a verification code to your email. 
            Please check your inbox and enter the code to complete your registration.
          </p>
          <Link to="/register" className="inline-block">
            <Button className="btn transparent" variant="outline" size="lg">
              Back 
            </Button>
          </Link>
        </div>
        <div className="verify-otp-svg-container">
          <svg className="verify-otp-svg-img" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="150" r="80" fill="#4481eb" opacity="0.1"/>
            <rect x="160" y="120" width="80" height="60" rx="8" fill="#4481eb"/>
            <path d="M170 140L190 155L230 125" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="320" cy="80" r="20" fill="#04befe" opacity="0.3"/>
            <circle cx="80" cy="220" r="15" fill="#4481eb" opacity="0.2"/>
            <rect x="50" y="50" width="30" height="30" rx="4" fill="#04befe" opacity="0.2"/>
          </svg>
        </div>
      </div>
      
      <div className="verify-otp-right">
        <LoadingIndicator loading={isVerifying || isResending}>
          <div className="verify-otp-container">
            <div className="otp-header">
              <div className="otp-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="verify-otp-title">Verify Your Email</h1>
              
              <p className="verify-otp-subtitle">
                We've sent a 6-digit verification code to
                <br />
                <span className="email-highlight">{email}</span>
              </p>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
            
            {success && (
              <div className="success-message">
                <span className="success-icon">✅</span>
                {success}
              </div>
            )}

            <form className="verify-otp-form" onSubmit={handleSubmit}>
              <div className="otp-input-container">
                <label className="otp-label">Enter verification code:</label>
                <div className="otp-input-wrapper">
                  <OtpInput
                    value={otp}
                    onChange={handleOtpChange}
                    numInputs={6}
                    renderSeparator={<span className="otp-separator">-</span>}
                    renderInput={(props) => <Input {...props} className="otp-single-input" />}
                    shouldAutoFocus={true}
                    inputType="number"
                    containerStyle="otp-container"
                  />
                </div>
                <p className="otp-helper-text">
                  {otp.length === 6 ? 
                    (isVerifying ? 'Verifying...' : 'Press Enter or wait for auto-verification') :
                    `Enter ${6 - otp.length} more digits`
                  }
                </p>
              </div>
              
              <Button 
                type="submit" 
                disabled={isVerifying || otp.length !== 6}
                className="verify-button"
              >
                {isVerifying ? (
                  <>
                    <span className="spinner"></span>
                    Verifying...
                  </>
                ) : 'Verify Email'}
              </Button>
            </form>

            <div className="resend-section">
              <p className="resend-text">Didn't receive the code?</p>
              <Button
                type="button"
                onClick={handleResendOTP}
                disabled={!canResend || isResending}
                className="resend-button"
                variant="outline"
              >
                {isResending ? (
                  <>
                    <span className="spinner"></span>
                    Sending...
                  </>
                ) : !canResend ? (
                  <>
                    <span className="countdown-icon">🕐</span>
                    Resend in {countdown}s
                  </>
                ) : (
                  <>
                    <span className="resend-icon">📧</span>
                    Resend OTP
                  </>
                )}
              </Button>
            </div>

            <div className="back-to-register mobile-only">
              <p className="center-text">
                Want to use a different email?
                <Link className="btnn" to="/register">Change Email</Link>
              </p>
            </div>
          </div>
        </LoadingIndicator>
      </div>
    </div>
  );
}
