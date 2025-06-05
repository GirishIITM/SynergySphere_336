# Redis OTP service file - ALL FUNCTIONALITY COMMENTED OUT
# This file contains Redis-based OTP functionality that has been disabled

# import secrets
# import string
# from datetime import datetime, timedelta
# from typing import Optional, Dict, Any
# from utils.redis_utils import RedisCache
# from flask import current_app

# class RedisOTPService:
#     """Redis-based OTP (One-Time Password) service"""
    
#     OTP_PREFIX = "otp:"
#     OTP_ATTEMPTS_PREFIX = "otp_attempts:"
#     OTP_LENGTH = 6
#     OTP_EXPIRATION = 600  # 10 minutes in seconds
#     MAX_ATTEMPTS = 3  # Maximum verification attempts per OTP
#     RATE_LIMIT_WINDOW = 3600  # 1 hour rate limiting window
#     MAX_OTP_PER_HOUR = 5  # Maximum OTPs per hour per user
    
#     @staticmethod
#     def generate_otp() -> str:
#         """Generate a secure numeric OTP"""
#         return ''.join(secrets.choice(string.digits) for _ in range(RedisOTPService.OTP_LENGTH))
    
#     @staticmethod
#     def _get_otp_key(user_id: int, purpose: str = "default") -> str:
#         """Generate Redis key for OTP"""
#         return f"{RedisOTPService.OTP_PREFIX}{user_id}:{purpose}"
    
#     @staticmethod
#     def _get_attempts_key(user_id: int, purpose: str = "default") -> str:
#         """Generate Redis key for OTP attempts tracking"""
#         return f"{RedisOTPService.OTP_ATTEMPTS_PREFIX}{user_id}:{purpose}"
    
#     @staticmethod
#     def _get_rate_limit_key(user_id: int) -> str:
#         """Generate Redis key for rate limiting"""
#         return f"otp_rate_limit:{user_id}"
    
#     @staticmethod
#     def create_otp(user_id: int, purpose: str = "default", custom_expiration: Optional[int] = None) -> Optional[str]:
#         """
#         Create a new OTP for a user and purpose.
        
#         Args:
#             user_id: User ID requesting OTP
#             purpose: Purpose of the OTP (e.g., "login", "password_reset", "email_verification")
#             custom_expiration: Custom expiration time in seconds
            
#         Returns:
#             str: Generated OTP if successful, None otherwise
#         """
#         try:
#             # Check rate limiting
#             if not RedisOTPService._check_rate_limit(user_id):
#                 current_app.logger.warning(f"OTP rate limit exceeded for user {user_id}")
#                 return None
            
#             # Generate OTP
#             otp = RedisOTPService.generate_otp()
#             otp_key = RedisOTPService._get_otp_key(user_id, purpose)
#             attempts_key = RedisOTPService._get_attempts_key(user_id, purpose)
            
#             expiration = custom_expiration or RedisOTPService.OTP_EXPIRATION
            
#             # Prepare OTP data
#             otp_data = {
#                 'otp': otp,
#                 'user_id': user_id,
#                 'purpose': purpose,
#                 'created_at': datetime.utcnow().isoformat(),
#                 'expires_at': (datetime.utcnow() + timedelta(seconds=expiration)).isoformat(),
#                 'verified': False
#             }
            
#             # Store OTP and reset attempts counter
#             RedisCache.set(otp_key, otp_data, expiration)
#             RedisCache.set(attempts_key, 0, expiration)
            
#             # Update rate limiting
#             RedisOTPService._update_rate_limit(user_id)
            
#             current_app.logger.info(f"OTP created for user {user_id}, purpose: {purpose}")
#             return otp
            
#         except Exception as e:
#             current_app.logger.error(f"Error creating OTP for user {user_id}: {e}")
#             # Clean up any partial data
#             RedisCache.delete(otp_key)
#             RedisCache.delete(attempts_key)
#             return None
    
#     @staticmethod
#     def verify_otp(user_id: int, otp: str, purpose: str = "default") -> bool:
#         """
#         Verify an OTP for a user and purpose.
        
#         Args:
#             user_id: User ID
#             otp: OTP to verify
#             purpose: Purpose of the OTP
            
#         Returns:
#             bool: True if OTP is valid and verified, False otherwise
#         """
#         try:
#             otp_key = RedisOTPService._get_otp_key(user_id, purpose)
#             attempts_key = RedisOTPService._get_attempts_key(user_id, purpose)
            
#             # Get OTP data from Redis
#             otp_data = RedisCache.get(otp_key)
#             if not otp_data:
#                 current_app.logger.warning(f"OTP not found for user {user_id}, purpose: {purpose}")
#                 return False
            
#             # Check if already verified
#             if otp_data.get('verified', False):
#                 current_app.logger.warning(f"OTP already verified for user {user_id}, purpose: {purpose}")
#                 return False
            
#             # Check attempts
#             attempts = RedisCache.get(attempts_key, 0)
#             if attempts >= RedisOTPService.MAX_ATTEMPTS:
#                 current_app.logger.warning(f"Max OTP attempts exceeded for user {user_id}, purpose: {purpose}")
#                 # Clean up expired OTP
#                 RedisCache.delete(otp_key)
#                 RedisCache.delete(attempts_key)
#                 return False
            
#             # Verify OTP
#             if otp_data.get('otp') != otp:
#                 # Increment attempts
#                 RedisCache.set(attempts_key, attempts + 1, RedisOTPService.OTP_EXPIRATION)
#                 current_app.logger.warning(f"Invalid OTP for user {user_id}, purpose: {purpose}. Attempts: {attempts + 1}")
#                 return False
            
#             # OTP is valid - mark as verified and clean up
#             otp_data['verified'] = True
#             otp_data['verified_at'] = datetime.utcnow().isoformat()
            
#             # Store briefly for audit then clean up
#             RedisCache.set(otp_key, otp_data, 300)  # Keep for 5 minutes
#             RedisCache.delete(attempts_key)
            
#             current_app.logger.info(f"OTP verified successfully for user {user_id}, purpose: {purpose}")
#             return True
            
#         except Exception as e:
#             current_app.logger.error(f"Error verifying OTP for user {user_id}: {e}")
#             return False
    
#     @staticmethod
#     def invalidate_otp(user_id: int, purpose: str = "default") -> bool:
#         """
#         Invalidate an OTP for a user and purpose.
        
#         Args:
#             user_id: User ID
#             purpose: Purpose of the OTP
            
#         Returns:
#             bool: True if OTP was invalidated
#         """
#         try:
#             otp_key = RedisOTPService._get_otp_key(user_id, purpose)
#             attempts_key = RedisOTPService._get_attempts_key(user_id, purpose)
            
#             RedisCache.delete(otp_key)
#             RedisCache.delete(attempts_key)
            
#             current_app.logger.info(f"OTP invalidated for user {user_id}, purpose: {purpose}")
#             return True
            
#         except Exception as e:
#             current_app.logger.error(f"Error invalidating OTP for user {user_id}: {e}")
#             return False
    
#     @staticmethod
#     def get_otp_info(user_id: int, purpose: str = "default") -> Optional[Dict[str, Any]]:
#         """
#         Get information about an OTP without revealing the actual OTP.
        
#         Args:
#             user_id: User ID
#             purpose: Purpose of the OTP
            
#         Returns:
#             dict: OTP information or None
#         """
#         try:
#             otp_key = RedisOTPService._get_otp_key(user_id, purpose)
#             attempts_key = RedisOTPService._get_attempts_key(user_id, purpose)
            
#             otp_data = RedisCache.get(otp_key)
#             if not otp_data:
#                 return None
            
#             attempts = RedisCache.get(attempts_key, 0)
            
#             # Return safe information (no actual OTP)
#             return {
#                 'user_id': otp_data.get('user_id'),
#                 'purpose': otp_data.get('purpose'),
#                 'created_at': otp_data.get('created_at'),
#                 'expires_at': otp_data.get('expires_at'),
#                 'verified': otp_data.get('verified', False),
#                 'attempts': attempts,
#                 'max_attempts': RedisOTPService.MAX_ATTEMPTS
#             }
            
#         except Exception as e:
#             current_app.logger.error(f"Error getting OTP info for user {user_id}: {e}")
#             return None
    
#     @staticmethod
#     def _check_rate_limit(user_id: int) -> bool:
#         """Check if user is within rate limit for OTP generation"""
#         try:
#             rate_key = RedisOTPService._get_rate_limit_key(user_id)
#             current_count = RedisCache.get(rate_key, 0)
            
#             return current_count < RedisOTPService.MAX_OTP_PER_HOUR
            
#         except Exception as e:
#             current_app.logger.error(f"Error checking rate limit for user {user_id}: {e}")
#             return True  # Allow on error to not block users
    
#     @staticmethod
#     def _update_rate_limit(user_id: int):
#         """Update rate limiting counter"""
#         try:
#             rate_key = RedisOTPService._get_rate_limit_key(user_id)
#             current_count = RedisCache.get(rate_key, 0)
            
#             RedisCache.set(rate_key, current_count + 1, RedisOTPService.RATE_LIMIT_WINDOW)
            
#         except Exception as e:
#             current_app.logger.error(f"Error updating rate limit for user {user_id}: {e}")
    
#     @staticmethod
#     def get_remaining_otps(user_id: int) -> int:
#         """Get remaining OTP generations allowed within rate limit window"""
#         try:
#             rate_key = RedisOTPService._get_rate_limit_key(user_id)
#             current_count = RedisCache.get(rate_key, 0)
            
#             return max(0, RedisOTPService.MAX_OTP_PER_HOUR - current_count)
            
#         except Exception as e:
#             current_app.logger.error(f"Error getting remaining OTPs for user {user_id}: {e}")
#             return RedisOTPService.MAX_OTP_PER_HOUR  # Return max on error
    
#     @staticmethod
#     def cleanup_expired_otps() -> int:
#         """
#         Clean up expired OTPs.
#         This is mainly for logging as Redis TTL handles automatic cleanup.
        
#         Returns:
#             int: Number of OTPs cleaned up (always 0 with Redis TTL)
#         """
#         try:
#             current_app.logger.info("Redis TTL handles automatic cleanup of expired OTPs")
#             return 0
#         except Exception as e:
#             current_app.logger.error(f"Error in OTP cleanup: {e}")
#             return 0
