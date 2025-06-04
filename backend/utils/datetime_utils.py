from datetime import datetime, timezone

def get_utc_now():
    """Get current UTC time with timezone info"""
    return datetime.now(timezone.utc)

def make_timezone_aware(dt, tz=None):
    """
    Make a datetime object timezone-aware
    
    Args:
        dt (datetime): The datetime object to make timezone-aware
        tz: Timezone to use (defaults to UTC)
    
    Returns:
        datetime: Timezone-aware datetime object
    """
    if tz is None:
        tz = timezone.utc
    
    if dt.tzinfo is None:
        # Naive datetime - assume it's in the specified timezone
        return dt.replace(tzinfo=tz)
    else:
        # Already timezone-aware
        return dt

def ensure_utc(dt):
    """
    Ensure datetime is in UTC timezone
    
    Args:
        dt (datetime): Input datetime
    
    Returns:
        datetime: UTC timezone-aware datetime
    """
    if dt.tzinfo is None:
        # Naive datetime - assume it's UTC
        return dt.replace(tzinfo=timezone.utc)
    else:
        # Convert to UTC if not already
        return dt.astimezone(timezone.utc)

def compare_datetimes(dt1, dt2):
    """
    Safely compare two datetime objects, handling timezone differences
    
    Args:
        dt1, dt2 (datetime): Datetime objects to compare
    
    Returns:
        int: -1 if dt1 < dt2, 0 if equal, 1 if dt1 > dt2
    """
    dt1_utc = ensure_utc(dt1)
    dt2_utc = ensure_utc(dt2)
    
    if dt1_utc < dt2_utc:
        return -1
    elif dt1_utc > dt2_utc:
        return 1
    else:
        return 0

def from_unix_timestamp(timestamp, tz=None):
    """
    Create timezone-aware datetime from UNIX timestamp
    
    Args:
        timestamp (int/float): UNIX timestamp
        tz: Target timezone (defaults to UTC)
    
    Returns:
        datetime: Timezone-aware datetime object
    """
    if tz is None:
        tz = timezone.utc
    
    return datetime.fromtimestamp(timestamp, tz=tz)

def is_expired(expires_at, current_time=None):
    """
    Check if a datetime has expired
    
    Args:
        expires_at (datetime): Expiration datetime
        current_time (datetime, optional): Current time (defaults to now)
    
    Returns:
        bool: True if expired, False otherwise
    """
    if current_time is None:
        current_time = get_utc_now()
    
    return compare_datetimes(current_time, expires_at) > 0
