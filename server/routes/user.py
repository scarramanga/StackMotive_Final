from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr, constr, Field, ConfigDict
from datetime import datetime, timedelta
from passlib.context import CryptContext
from sqlalchemy.exc import IntegrityError
import logging
from sqlalchemy.sql import func

from server.database import get_db
from server.models.user import User
from server.auth import (
    get_current_user,
    verify_password,
    get_password_hash,
    create_access_token,
    create_tokens,
    verify_refresh_token,
    set_refresh_token_cookie,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from server.models.paper_trading import PaperTradingAccount
from server.config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Valid currencies
ALLOWED_CURRENCIES = ['NZD', 'AUD', 'USD']

def to_camel(string: str) -> str:
    """Convert snake_case to camelCase"""
    components = string.split('_')
    return components[0] + ''.join(word.capitalize() for word in components[1:])

class UserBase(BaseModel):
    """Base model for user data"""
    email: EmailStr

class UserRegister(UserBase):
    """Request model for user registration"""
    password: constr(min_length=6)

class LoginRequest(BaseModel):
    """Request model for login"""
    email: EmailStr
    password: str

class Token(BaseModel):
    """Response model for token endpoints"""
    access_token: str
    token_type: str = "bearer"

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer"
            }
        }

class UserPreferences(BaseModel):
    """Request model for user preferences"""
    preferredCurrency: str

class OnboardingComplete(BaseModel):
    """Request model for onboarding completion"""
    hasCompletedOnboarding: bool

class OnboardingProgress(BaseModel):
    """Request model for onboarding progress update"""
    step: int

class EmailCheck(BaseModel):
    """Request model for email uniqueness check"""
    email: EmailStr

class UserResponse(UserBase):
    """Response model for user data"""
    id: int
    isActive: bool = Field(alias="is_active")
    isAdmin: bool = Field(alias="is_admin")
    createdAt: datetime = Field(alias="created_at")
    hasCompletedOnboarding: bool = Field(alias="has_completed_onboarding")
    onboardingStep: int = Field(alias="onboarding_step")
    preferredCurrency: Optional[str] = Field(alias="preferred_currency")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel
    )

# Export models that need to be accessible in OpenAPI schema
__all__ = ["router", "UserResponse", "Token"]

@router.get("/user/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get the current authenticated user's information"""
    user_response = UserResponse.model_validate(current_user)
    return user_response.model_dump()

# TODO: Add rate-limiting to prevent abuse on this endpoint
# Example implementation:
# from slowapi import Limiter
# from slowapi.util import get_remote_address
# limiter = Limiter(key_func=get_remote_address)
# @limiter.limit("5/minute")
@router.post("/login", response_model=Token)
async def login(
    response: Response,
    form_data: LoginRequest = Body(...),
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT tokens"""
    logger.debug(f"Login attempt for email: {form_data.email}")
    
    # Find user by email
    user = db.query(User).filter(User.email == form_data.email).first()
    if not user:
        logger.warning(f"Login failed: No user found with email {form_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Login failed: Invalid password for email {form_data.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"Login successful for email: {form_data.email}")
    
    # Create access and refresh tokens
    access_token, refresh_token = create_tokens(user.email)
    
    # Set refresh token in HttpOnly cookie
    set_refresh_token_cookie(response, refresh_token)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/refresh-token", response_model=Token)
async def refresh_token(
    response: Response,
    refresh_token: str = Cookie(None, alias="refresh_token"),
    db: Session = Depends(get_db)
):
    """Get a new access token using refresh token"""
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
    
    email = verify_refresh_token(refresh_token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    # Verify user still exists
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists"
        )
    
    # Create new access token
    access_token = create_access_token(
        data={"sub": email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Create new refresh token and update cookie
    new_refresh_token = create_tokens(email)[1]
    set_refresh_token_cookie(response, new_refresh_token)
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(
    response: Response,
    current_user: User = Depends(get_current_user)
):
    """Logout user by clearing refresh token"""
    response.delete_cookie(
        key="refresh_token",
        path="/api",
        secure=True,
        httponly=True
    )
    
    return {"message": "Successfully logged out"}

@router.post("/register", response_model=dict)
async def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """Register a new user"""
    try:
        # Check if email already exists
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            is_active=True,
            has_completed_onboarding=False,
            preferred_currency="USD"  # Default currency
        )
        
        db.add(new_user)
        db.commit()
        print(f"🆕 New user committed to DB: {new_user.id}, {new_user.email}")
        db.refresh(new_user)

        return {
            "message": "User created successfully",
            "user_id": new_user.id
        }
        
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please try again."
        )

@router.post("/check-email")
async def check_email_availability(
    email_data: EmailCheck,
    db: Session = Depends(get_db)
):
    """Check if email is available for registration"""
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(User.email == email_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email is already registered"
            )
        
        return {"available": True, "message": "Email is available"}
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error checking email availability: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error checking email availability"
        )

@router.post("/user/preferences")
async def update_user_preferences(
    preferences: UserPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user preferences including preferred currency"""
    
    # Validate currency
    if preferences.preferredCurrency not in ALLOWED_CURRENCIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid currency. Must be one of: {', '.join(ALLOWED_CURRENCIES)}"
        )
    
    # Update user preferences
    current_user.preferred_currency = preferences.preferredCurrency
    db.commit()
    
    return {
        "status": "success",
        "message": "Preferences updated successfully",
        "data": {
            "preferredCurrency": current_user.preferred_currency
        }
    }

@router.get("/user/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_user)
):
    """Get user preferences"""
    return {
        "preferredCurrency": current_user.preferred_currency or "USD"
    }

@router.get("/user/progress")
async def get_user_progress(
    current_user: User = Depends(get_current_user)
):
    """Get user onboarding and account progress"""
    return {
        "onboardingComplete": current_user.has_completed_onboarding,
        "onboardingStep": current_user.onboarding_step,
        "hasCompletedOnboarding": current_user.has_completed_onboarding,
        "completedAt": current_user.onboarding_completed_at
    }

@router.post("/user/onboarding/progress")
async def update_onboarding_progress(
    progress: OnboardingProgress,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's onboarding progress step"""
    
    # Validate step number (should be between 1 and 4 for typical onboarding)
    if progress.step < 1 or progress.step > 10:
        raise HTTPException(
            status_code=400,
            detail="Invalid step number. Must be between 1 and 10"
        )
    
    # Update onboarding step
    current_user.onboarding_step = progress.step
    db.commit()
    
    return {
        "status": "success",
        "message": "Onboarding progress updated successfully",
        "data": {
            "step": current_user.onboarding_step
        }
    }

@router.post("/user/onboarding-complete")
async def complete_onboarding(
    onboarding: OnboardingComplete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark user's onboarding as complete"""
    
    # Update onboarding status
    current_user.has_completed_onboarding = onboarding.hasCompletedOnboarding
    current_user.onboarding_completed_at = datetime.utcnow()
    db.commit()
    
    return {
        "status": "success",
        "message": "Onboarding status updated successfully",
        "data": {
            "hasCompletedOnboarding": current_user.has_completed_onboarding,
            "completedAt": current_user.onboarding_completed_at
        }
    }

@router.get("/user/onboarding")
async def get_onboarding_info(current_user: User = Depends(get_current_user)):
    """Get user's onboarding information"""
    return {
        "hasCompletedOnboarding": current_user.has_completed_onboarding,
        "onboardingComplete": current_user.has_completed_onboarding,  # Alternative field name
        "onboardingStep": getattr(current_user, 'onboarding_step', 1),  # Default to step 1 if not set
        "completedAt": current_user.onboarding_completed_at,
        "steps": [
            {
                "id": "profile",
                "completed": current_user.has_completed_onboarding,
                "title": "Complete Your Profile"
            },
            {
                "id": "preferences",
                "completed": bool(current_user.preferred_currency),
                "title": "Set Trading Preferences"
            }
        ]
    }

@router.get("/user/onboarding-status")
async def get_onboarding_status(
    current_user: User = Depends(get_current_user)
):
    """Get user's current onboarding status"""
    
    return {
        "hasCompletedOnboarding": current_user.has_completed_onboarding,
        "preferredCurrency": current_user.preferred_currency or 'NZD',
        "completedAt": current_user.onboarding_completed_at
    }

@router.get("/holdings")
async def get_holdings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's holdings from their paper trading account"""
    from .paper_trading import get_holdings as get_paper_trading_holdings
    
    # Production mode logging
    if settings.enable_detailed_logging:
        settings.log_change("API_CALL", f"GET /api/holdings - User {current_user.id}")
    
    # Get user's paper trading account
    account = db.query(PaperTradingAccount).filter(
        PaperTradingAccount.user_id == current_user.id,
        PaperTradingAccount.is_active == True
    ).first()
    
    if not account:
        # In production mode, log empty responses
        if settings.enable_detailed_logging:
            settings.log_change("DATA_RESPONSE", f"Empty holdings for user {current_user.id} - no account")
        return []  # Return empty array if no paper trading account
    
    # Delegate to paper trading holdings logic
    try:
        holdings = await get_paper_trading_holdings(account.id, current_user, db)
        
        # Production mode validation - ensure response shape is correct
        if settings.is_production and not isinstance(holdings, list):
            settings.log_change("CRITICAL_ERROR", f"Holdings response not array: {type(holdings)}")
            raise ValueError("Holdings must return array format")
        
        return holdings
    except Exception as e:
        print(f"Error getting holdings: {e}")
        if settings.enable_detailed_logging:
            settings.log_change("ERROR", f"Holdings error for user {current_user.id}: {str(e)}")
        
        # In production, never return fallback data
        if settings.is_production:
            raise e
        
        return []  # Return empty array on error only in non-production

@router.get("/user/trial-status")
async def get_trial_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get user's trial status"""
    from server.config.settings import settings
    
    # 🔒 PRODUCTION MODE: Bypass trial restrictions for testing
    if settings.is_production:
        # In production mode, always return active trial status
        return {
            "inTrial": True,
            "trialEndsAt": (datetime.utcnow() + timedelta(days=365)).isoformat() + "Z",  # 1 year from now
            "isTrialActive": True,  # Keep for backwards compatibility
            "daysRemaining": 365,  # Extended for production testing
            "features": ["paper-trading", "real-time-data", "portfolio-tracking"]
        }
    
    # Standard trial logic for non-production modes
    # Calculate trial end date (30 days from account creation)
    trial_end_date = current_user.created_at + timedelta(days=30)
    is_in_trial = datetime.utcnow() < trial_end_date
    
    return {
        "inTrial": is_in_trial,
        "trialEndsAt": trial_end_date.isoformat() + "Z",
        "isTrialActive": is_in_trial,  # Keep for backwards compatibility
        "daysRemaining": max(0, (trial_end_date - datetime.utcnow()).days),
        "features": ["paper-trading", "real-time-data", "portfolio-tracking"]
    }

# Admin routes
@router.get("/admin/users", response_model=list[UserResponse])
async def get_all_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Admin endpoint to get all users"""
    # Check if user is admin or has stackmotive.dev email
    if not (current_user.is_admin or current_user.email.endswith('@stackmotive.dev')):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    users = db.query(User).all()
    return users

@router.post("/admin/users/{user_id}/toggle-admin")
async def toggle_user_admin(
    user_id: int,
    request: dict,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Toggle admin status for a user"""
    if not (current_user.is_admin or current_user.email.endswith('@stackmotive.dev')):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_admin = request.get('isAdmin', False)
    db.commit()
    db.refresh(user)
    
    return {"message": "User admin status updated successfully"}

@router.post("/admin/users/{user_id}/reset-onboarding")
async def reset_user_onboarding(
    user_id: int,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Reset user onboarding progress"""
    if not (current_user.is_admin or current_user.email.endswith('@stackmotive.dev')):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.has_completed_onboarding = False
    user.onboarding_step = 1
    user.onboarding_completed_at = None
    db.commit()
    db.refresh(user)
    
    return {"message": "User onboarding reset successfully"}

@router.post("/admin/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: int,
    request: dict,
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Toggle active status for a user"""
    if not (current_user.is_admin or current_user.email.endswith('@stackmotive.dev')):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = request.get('isActive', True)
    db.commit()
    db.refresh(user)
    
    return {"message": "User status updated successfully"}

@router.get("/admin/metrics")
async def get_system_metrics(
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get system-wide metrics for admin dashboard"""
    if not (current_user.is_admin or current_user.email.endswith('@stackmotive.dev')):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    from datetime import datetime, timedelta
    
    # Get user counts
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    completed_onboarding = db.query(User).filter(User.has_completed_onboarding == True).count()
    
    # Get registration counts
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    registrations_today = db.query(User).filter(
        func.date(User.created_at) == today
    ).count()
    
    registrations_this_week = db.query(User).filter(
        User.created_at >= week_ago
    ).count()
    
    registrations_this_month = db.query(User).filter(
        User.created_at >= month_ago
    ).count()
    
    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "completedOnboarding": completed_onboarding,
        "totalTrades": 0,  # Placeholder - would integrate with trading system
        "totalVolume": 0,  # Placeholder - would integrate with trading system
        "avgSessionTime": 45,  # Placeholder - would track session data
        "registrationsToday": registrations_today,
        "registrationsThisWeek": registrations_this_week,
        "registrationsThisMonth": registrations_this_month,
    }

@router.get("/admin/activity")
async def get_user_activity(
    timeRange: str = "7d",
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get user activity data for analytics"""
    if not (current_user.is_admin or current_user.email.endswith('@stackmotive.dev')):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Placeholder data - would implement actual activity tracking
    return [] 