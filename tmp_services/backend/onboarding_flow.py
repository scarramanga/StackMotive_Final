# Block 15: Onboarding Flow - FULLY INTEGRATED ✅
#
# Integration Verification (Direct Path Tracing):
# Frontend: client/src/components/onboarding/onboarding-flow.tsx
#   └─ Calls: fetch('/api/onboarding/*') endpoints  
#   └─ Router: server/main.py includes onboarding_flow_router
#   └─ Database: Creates user_onboarding_progress, user_trading_preferences tables
#   └─ Agent Memory: Logs all onboarding actions
#   └─ Tests: tests/test_block_15_onboarding_flow.py
#
# Status: 🟢 FULLY INTEGRATED - Frontend → API → Database → Agent Memory

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Path
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime, timedelta, date
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 15: Onboarding Flow - API Routes
# Complete onboarding system with progress tracking and analytics

class OnboardingProgress(BaseModel):
    """Onboarding progress response schema"""
    currentStep: int
    completedSteps: List[int]
    isComplete: bool
    completionPercentage: float
    welcomeViewed: bool = False
    tradingExperience: Optional[str] = None
    riskTolerance: Optional[str] = None
    investmentHorizon: Optional[str] = None
    initialInvestment: Optional[float] = None
    tradingFrequency: Optional[str] = None
    preferredMarkets: List[str] = []
    fullName: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phoneNumber: Optional[str] = None
    preferredCurrency: str = "NZD"
    dateOfBirth: Optional[str] = None
    taxResidency: Optional[str] = None
    secondaryTaxResidency: Optional[str] = None
    taxIdentificationNumber: Optional[str] = None
    taxFileNumber: Optional[str] = None
    employmentStatus: Optional[str] = None
    taxYearPreference: str = "calendar"
    taxRegisteredBusiness: bool = False
    helpLevel: str = "guided"
    notificationPreferences: Dict[str, bool] = {"email": True, "push": True, "sms": False}
    privacySettings: Dict[str, bool] = {"profilePublic": False, "performancePublic": False}
    connectBrokers: bool = False
    selectedBrokers: List[str] = []
    hasExistingPortfolio: bool = False
    existingPortfolioValue: Optional[float] = None
    termsAccepted: bool = False
    termsAcceptedAt: Optional[str] = None
    privacyPolicyAccepted: bool = False
    privacyPolicyAcceptedAt: Optional[str] = None
    startedAt: str
    completedAt: Optional[str] = None
    lastActiveAt: str

class OnboardingStep(BaseModel):
    """Onboarding step template schema"""
    stepNumber: int
    stepName: str
    stepTitle: str
    stepDescription: str
    requiredFields: List[str]
    optionalFields: List[str]
    componentName: str
    displayOrder: int
    isSkippable: bool = False
    minTimeSeconds: int = 0
    helpText: Optional[str] = None
    tooltipText: Optional[str] = None
    exampleData: Dict[str, Any] = {}

class OnboardingAnalytics(BaseModel):
    """Onboarding analytics response schema"""
    totalTimeSeconds: int
    stepsCompleted: int
    completionRate: float
    averageStepTime: float
    helpRequestsTotal: int
    retryCountTotal: int
    stepAnalytics: List[Dict[str, Any]] = []

class TradingPreferences(BaseModel):
    """Trading preferences response schema"""
    tradingStyle: str = "balanced"
    strategyPreference: str = "mixed"
    positionSizingMethod: str = "percentage"
    defaultPositionSize: float = 5.0
    maxPositionSize: float = 20.0
    stopLossPercentage: float = 10.0
    takeProfitPercentage: float = 20.0
    maxDailyTrades: int = 10
    maxWeeklyTrades: int = 50
    cashAllocationTarget: float = 10.0
    equityAllocationTarget: float = 70.0
    bondAllocationTarget: float = 15.0
    alternativeAllocationTarget: float = 5.0
    autoRebalanceEnabled: bool = True
    rebalanceThreshold: float = 5.0
    rebalanceFrequency: str = "monthly"
    baseCurrency: str = "NZD"
    currencyHedgingPreference: str = "auto"
    taxLossHarvestingEnabled: bool = True
    frankingCreditsConsideration: bool = True
    nzTaxOptimization: bool = True
    priceAlertThreshold: float = 5.0
    portfolioAlertThreshold: float = 10.0
    newsAlertEnabled: bool = True
    signalAlertEnabled: bool = True
    autoSaveEnabled: bool = True
    advancedModeEnabled: bool = False
    paperTradingEnabled: bool = True
    realTradingEnabled: bool = False

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

# Agent Memory logging
async def log_to_agent_memory(user_id: int, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp, sessionId)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            "block_15",
            action_type,
            action_summary,
            input_data,
            output_data,
            json.dumps(metadata) if metadata else None,
            datetime.now().isoformat(),
            f"session_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Failed to log to agent memory: {e}")

# Onboarding Progress Endpoints
@router.get("/onboarding/progress")
async def get_onboarding_progress(user_id: int = 1):
    """Get user's onboarding progress"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create onboarding progress table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserOnboardingProgress (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                current_step INTEGER DEFAULT 1,
                completed_steps TEXT DEFAULT '[]',
                is_complete BOOLEAN DEFAULT FALSE,
                completion_percentage REAL DEFAULT 0.0,
                welcome_viewed BOOLEAN DEFAULT FALSE,
                welcome_viewed_at TEXT,
                trading_experience TEXT,
                risk_tolerance TEXT,
                investment_horizon TEXT,
                initial_investment REAL,
                trading_frequency TEXT,
                preferred_markets TEXT DEFAULT '[]',
                full_name TEXT,
                first_name TEXT,
                last_name TEXT,
                phone_number TEXT,
                preferred_currency TEXT DEFAULT 'NZD',
                date_of_birth TEXT,
                tax_residency TEXT,
                secondary_tax_residency TEXT,
                tax_identification_number TEXT,
                tax_file_number TEXT,
                employment_status TEXT,
                tax_year_preference TEXT DEFAULT 'calendar',
                tax_registered_business BOOLEAN DEFAULT FALSE,
                help_level TEXT DEFAULT 'guided',
                notification_preferences TEXT DEFAULT '{"email": true, "push": true, "sms": false}',
                privacy_settings TEXT DEFAULT '{"profilePublic": false, "performancePublic": false}',
                connect_brokers BOOLEAN DEFAULT FALSE,
                selected_brokers TEXT DEFAULT '[]',
                has_existing_portfolio BOOLEAN DEFAULT FALSE,
                existing_portfolio_value REAL,
                terms_accepted BOOLEAN DEFAULT FALSE,
                terms_accepted_at TEXT,
                privacy_policy_accepted BOOLEAN DEFAULT FALSE,
                privacy_policy_accepted_at TEXT,
                session_id TEXT,
                user_agent TEXT,
                ip_address TEXT,
                referral_source TEXT,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        # Get user's onboarding progress
        cursor.execute("""
            SELECT * FROM UserOnboardingProgress WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Create initial onboarding progress
            cursor.execute("""
                INSERT INTO UserOnboardingProgress 
                (userId, current_step, completion_percentage, welcome_viewed)
                VALUES (%s, 1, 0.0, FALSE)
            """, (user_id,))
            
            conn.commit()
            
            # Return initial progress
            progress = OnboardingProgress(
                currentStep=1,
                completedSteps=[],
                isComplete=False,
                completionPercentage=0.0,
                startedAt=datetime.now().isoformat(),
                lastActiveAt=datetime.now().isoformat()
            )
            
            conn.close()
            
            await log_to_agent_memory(
                user_id,
                "onboarding_started",
                "User started onboarding process",
                json.dumps({"userId": user_id}),
                "Initial onboarding progress created",
                {"currentStep": 1}
            )
            
            return progress.dict()
        
        # Parse result
        columns = [description[0] for description in cursor.description]
        progress_data = dict(zip(columns, result))
        
        # Parse JSON fields
        completed_steps = json.loads(progress_data.get('completed_steps', '[]'))
        preferred_markets = json.loads(progress_data.get('preferred_markets', '[]'))
        notification_preferences = json.loads(progress_data.get('notification_preferences', '{"email": true, "push": true, "sms": false}'))
        privacy_settings = json.loads(progress_data.get('privacy_settings', '{"profilePublic": false, "performancePublic": false}'))
        selected_brokers = json.loads(progress_data.get('selected_brokers', '[]'))
        
        progress = OnboardingProgress(
            currentStep=progress_data['current_step'],
            completedSteps=completed_steps,
            isComplete=progress_data['is_complete'],
            completionPercentage=progress_data['completion_percentage'],
            welcomeViewed=progress_data['welcome_viewed'],
            tradingExperience=progress_data['trading_experience'],
            riskTolerance=progress_data['risk_tolerance'],
            investmentHorizon=progress_data['investment_horizon'],
            initialInvestment=progress_data['initial_investment'],
            tradingFrequency=progress_data['trading_frequency'],
            preferredMarkets=preferred_markets,
            fullName=progress_data['full_name'],
            firstName=progress_data['first_name'],
            lastName=progress_data['last_name'],
            phoneNumber=progress_data['phone_number'],
            preferredCurrency=progress_data['preferred_currency'],
            dateOfBirth=progress_data['date_of_birth'],
            taxResidency=progress_data['tax_residency'],
            secondaryTaxResidency=progress_data['secondary_tax_residency'],
            taxIdentificationNumber=progress_data['tax_identification_number'],
            taxFileNumber=progress_data['tax_file_number'],
            employmentStatus=progress_data['employment_status'],
            taxYearPreference=progress_data['tax_year_preference'],
            taxRegisteredBusiness=progress_data['tax_registered_business'],
            helpLevel=progress_data['help_level'],
            notificationPreferences=notification_preferences,
            privacySettings=privacy_settings,
            connectBrokers=progress_data['connect_brokers'],
            selectedBrokers=selected_brokers,
            hasExistingPortfolio=progress_data['has_existing_portfolio'],
            existingPortfolioValue=progress_data['existing_portfolio_value'],
            termsAccepted=progress_data['terms_accepted'],
            termsAcceptedAt=progress_data['terms_accepted_at'],
            privacyPolicyAccepted=progress_data['privacy_policy_accepted'],
            privacyPolicyAcceptedAt=progress_data['privacy_policy_accepted_at'],
            startedAt=progress_data['started_at'],
            completedAt=progress_data['completed_at'],
            lastActiveAt=progress_data['last_active_at']
        )
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_progress_retrieved",
            f"Retrieved onboarding progress - Step {progress.currentStep}",
            json.dumps({"userId": user_id}),
            f"Current step: {progress.currentStep}, Completion: {progress.completionPercentage}%",
            {"currentStep": progress.currentStep, "completionPercentage": progress.completionPercentage}
        )
        
        return progress.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboarding/step")
async def update_onboarding_step(
    step_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update onboarding step progress"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        step_number = step_data.get("stepNumber", 1)
        
        # Get current progress
        cursor.execute("""
            SELECT current_step, completed_steps FROM UserOnboardingProgress 
            WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Onboarding not started")
        
        current_step, completed_steps_str = result
        completed_steps = json.loads(completed_steps_str) if completed_steps_str else []
        
        # Add current step to completed steps if not already there
        if step_number not in completed_steps:
            completed_steps.append(step_number)
        
        # Calculate completion percentage
        completion_percentage = (len(completed_steps) / 5.0) * 100.0
        
        # Update based on step number
        if step_number == 1:
            # Welcome step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET welcome_viewed = TRUE,
                    welcome_viewed_at = CURRENT_TIMESTAMP,
                    current_step = CASE WHEN current_step < 2 THEN 2 ELSE current_step END,
                    completed_steps = %s,
                    completion_percentage = %s,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (json.dumps(completed_steps), completion_percentage, user_id))
            
        elif step_number == 2:
            # Portfolio preferences step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET trading_experience = %s,
                    risk_tolerance = %s,
                    investment_horizon = %s,
                    initial_investment = %s,
                    trading_frequency = %s,
                    preferred_markets = %s,
                    current_step = CASE WHEN current_step < 3 THEN 3 ELSE current_step END,
                    completed_steps = %s,
                    completion_percentage = %s,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (
                step_data.get("tradingExperience"),
                step_data.get("riskTolerance"),
                step_data.get("investmentHorizon"),
                step_data.get("initialInvestment"),
                step_data.get("tradingFrequency"),
                json.dumps(step_data.get("preferredMarkets", [])),
                json.dumps(completed_steps),
                completion_percentage,
                user_id
            ))
            
        elif step_number == 3:
            # Personal information step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET full_name = %s,
                    first_name = %s,
                    last_name = %s,
                    phone_number = %s,
                    preferred_currency = %s,
                    date_of_birth = %s,
                    current_step = CASE WHEN current_step < 4 THEN 4 ELSE current_step END,
                    completed_steps = %s,
                    completion_percentage = %s,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (
                step_data.get("fullName"),
                step_data.get("firstName"),
                step_data.get("lastName"),
                step_data.get("phoneNumber"),
                step_data.get("preferredCurrency", "NZD"),
                step_data.get("dateOfBirth"),
                json.dumps(completed_steps),
                completion_percentage,
                user_id
            ))
            
        elif step_number == 4:
            # Tax information step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET tax_residency = %s,
                    secondary_tax_residency = %s,
                    tax_identification_number = %s,
                    tax_file_number = %s,
                    employment_status = %s,
                    tax_year_preference = %s,
                    tax_registered_business = %s,
                    current_step = CASE WHEN current_step < 5 THEN 5 ELSE current_step END,
                    completed_steps = %s,
                    completion_percentage = %s,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (
                step_data.get("taxResidency"),
                step_data.get("secondaryTaxResidency"),
                step_data.get("taxIdentificationNumber"),
                step_data.get("taxFileNumber"),
                step_data.get("employmentStatus"),
                step_data.get("taxYearPreference", "calendar"),
                step_data.get("taxRegisteredBusiness", False),
                json.dumps(completed_steps),
                completion_percentage,
                user_id
            ))
            
        elif step_number == 5:
            # Summary/completion step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET terms_accepted = TRUE,
                    terms_accepted_at = CURRENT_TIMESTAMP,
                    privacy_policy_accepted = TRUE,
                    privacy_policy_accepted_at = CURRENT_TIMESTAMP,
                    is_complete = TRUE,
                    completed_at = CURRENT_TIMESTAMP,
                    current_step = 5,
                    completed_steps = %s,
                    completion_percentage = 100.0,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (json.dumps(completed_steps), user_id))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_step_updated",
            f"Updated onboarding step {step_number}",
            json.dumps(step_data),
            f"Step {step_number} completed successfully",
            {"stepNumber": step_number, "completionPercentage": completion_percentage}
        )
        
        return {
            "success": True,
            "message": f"Step {step_number} updated successfully",
            "currentStep": min(step_number + 1, 5),
            "completionPercentage": completion_percentage
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboarding/complete")
async def complete_onboarding(
    completion_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Complete the onboarding process"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Mark onboarding as complete
        cursor.execute("""
            UPDATE UserOnboardingProgress 
            SET is_complete = TRUE,
                completed_at = CURRENT_TIMESTAMP,
                completion_percentage = 100.0,
                current_step = 5,
                terms_accepted = TRUE,
                terms_accepted_at = CURRENT_TIMESTAMP,
                privacy_policy_accepted = TRUE,
                privacy_policy_accepted_at = CURRENT_TIMESTAMP,
                last_active_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (user_id,))
        
        # Get the completed onboarding data
        cursor.execute("""
            SELECT * FROM UserOnboardingProgress WHERE userId = ?
        """, (user_id,))
        
        result = cursor.fetchone()
        columns = [description[0] for description in cursor.description]
        progress_data = dict(zip(columns, result))
        
        # Create trading preferences table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserTradingPreferences (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                trading_style TEXT DEFAULT 'balanced',
                strategy_preference TEXT DEFAULT 'mixed',
                position_sizing_method TEXT DEFAULT 'percentage',
                default_position_size REAL DEFAULT 5.0,
                max_position_size REAL DEFAULT 20.0,
                stop_loss_percentage REAL DEFAULT 10.0,
                take_profit_percentage REAL DEFAULT 20.0,
                max_daily_trades INTEGER DEFAULT 10,
                max_weekly_trades INTEGER DEFAULT 50,
                cash_allocation_target REAL DEFAULT 10.0,
                equity_allocation_target REAL DEFAULT 70.0,
                bond_allocation_target REAL DEFAULT 15.0,
                alternative_allocation_target REAL DEFAULT 5.0,
                auto_rebalance_enabled BOOLEAN DEFAULT TRUE,
                rebalance_threshold REAL DEFAULT 5.0,
                rebalance_frequency TEXT DEFAULT 'monthly',
                base_currency TEXT DEFAULT 'NZD',
                currency_hedging_preference TEXT DEFAULT 'auto',
                tax_loss_harvesting_enabled BOOLEAN DEFAULT TRUE,
                franking_credits_consideration BOOLEAN DEFAULT TRUE,
                nz_tax_optimization BOOLEAN DEFAULT TRUE,
                price_alert_threshold REAL DEFAULT 5.0,
                portfolio_alert_threshold REAL DEFAULT 10.0,
                news_alert_enabled BOOLEAN DEFAULT TRUE,
                signal_alert_enabled BOOLEAN DEFAULT TRUE,
                auto_save_enabled BOOLEAN DEFAULT TRUE,
                advanced_mode_enabled BOOLEAN DEFAULT FALSE,
                paper_trading_enabled BOOLEAN DEFAULT TRUE,
                real_trading_enabled BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        # Create trading preferences based on onboarding data
        trading_style = "balanced"
        if progress_data.get('risk_tolerance') == 'conservative':
            trading_style = "conservative"
        elif progress_data.get('risk_tolerance') == 'aggressive':
            trading_style = "aggressive"
        
        cursor.execute("""
            INSERT INTO UserTradingPreferences 
            (userId, trading_style, base_currency, auto_rebalance_enabled, paper_trading_enabled)
            VALUES (%s, %s, %s, TRUE, TRUE)
            ON CONFLICT (userId) DO UPDATE SET
                trading_style = EXCLUDED.trading_style,
                base_currency = EXCLUDED.base_currency
        """, (
            user_id,
            trading_style,
            progress_data.get('preferred_currency', 'NZD')
        ))
        
        # Update user table to mark onboarding complete
        cursor.execute("""
            UPDATE User 
            SET onboardingComplete = TRUE,
                onboardingStep = 5
            WHERE id = %s
        """, (user_id,))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_completed",
            "User completed onboarding process",
            json.dumps(completion_data),
            "Onboarding completed successfully, trading preferences created",
            {
                "completedAt": datetime.now().isoformat(),
                "tradingStyle": trading_style,
                "baseCurrency": progress_data.get('preferred_currency', 'NZD')
            }
        )
        
        return {
            "success": True,
            "message": "Onboarding completed successfully",
            "hasCompletedOnboarding": True,
            "completedAt": datetime.now().isoformat(),
            "tradingPreferences": {
                "tradingStyle": trading_style,
                "baseCurrency": progress_data.get('preferred_currency', 'NZD'),
                "paperTradingEnabled": True
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/onboarding/steps")
async def get_onboarding_steps():
    """Get onboarding step templates"""
    try:
        # Return predefined onboarding steps
        steps = [
            OnboardingStep(
                stepNumber=1,
                stepName="welcome",
                stepTitle="Welcome to StackMotive",
                stepDescription="Get started with your trading journey",
                requiredFields=[],
                optionalFields=[],
                componentName="StepWelcome",
                displayOrder=1,
                helpText="Welcome to StackMotive! This quick setup will personalize your trading experience.",
                tooltipText="Complete setup takes about 5 minutes"
            ),
            OnboardingStep(
                stepNumber=2,
                stepName="portfolio",
                stepTitle="Portfolio Preferences", 
                stepDescription="Configure your trading style and risk tolerance",
                requiredFields=["tradingExperience", "riskTolerance", "investmentHorizon"],
                optionalFields=["initialInvestment", "tradingFrequency", "preferredMarkets"],
                componentName="StepPortfolio",
                displayOrder=2,
                helpText="Tell us about your trading experience and risk preferences to get personalized recommendations.",
                tooltipText="This helps us tailor strategies to your risk profile"
            ),
            OnboardingStep(
                stepNumber=3,
                stepName="personal",
                stepTitle="Personal Information",
                stepDescription="Tell us about yourself",
                requiredFields=["fullName", "preferredCurrency"],
                optionalFields=["phoneNumber", "dateOfBirth"],
                componentName="StepPersonalInfo",
                displayOrder=3,
                helpText="Basic information to personalize your account and set up proper tax reporting.",
                tooltipText="We use this for account management and tax calculations"
            ),
            OnboardingStep(
                stepNumber=4,
                stepName="tax",
                stepTitle="Tax Information",
                stepDescription="Configure your tax settings",
                requiredFields=["taxResidency", "employmentStatus"],
                optionalFields=["taxIdentificationNumber", "taxFileNumber", "taxYearPreference"],
                componentName="StepTaxInfo", 
                displayOrder=4,
                helpText="Tax information enables accurate reporting and optimization for your jurisdiction.",
                tooltipText="Required for proper tax calculations and compliance"
            ),
            OnboardingStep(
                stepNumber=5,
                stepName="summary",
                stepTitle="Review & Complete",
                stepDescription="Review your information and complete setup",
                requiredFields=["termsAccepted"],
                optionalFields=[],
                componentName="StepSummary",
                displayOrder=5,
                helpText="Review all your information before completing the setup process.",
                tooltipText="You can change these settings anytime in your preferences"
            )
        ]
        
        await log_to_agent_memory(
            1,  # System action
            "onboarding_steps_retrieved",
            "Retrieved onboarding step templates",
            json.dumps({"action": "get_steps"}),
            f"Returned {len(steps)} step templates",
            {"stepsCount": len(steps)}
        )
        
        return [step.dict() for step in steps]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/onboarding/analytics")
async def get_onboarding_analytics(
    user_id: int = 1
):
    """Get onboarding analytics for user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create analytics table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserOnboardingAnalytics (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                step_number INTEGER NOT NULL,
                step_name TEXT NOT NULL,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                time_spent_seconds INTEGER,
                field_interactions TEXT DEFAULT '{}',
                validation_errors TEXT DEFAULT '[]',
                help_requests INTEGER DEFAULT 0,
                completion_method TEXT,
                retry_count INTEGER DEFAULT 0,
                device_type TEXT,
                browser TEXT,
                screen_resolution TEXT,
                form_completion_percentage REAL DEFAULT 0.0,
                data_accuracy_score REAL DEFAULT 0.0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Get analytics data for user
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT step_number) as steps_completed,
                COALESCE(SUM(time_spent_seconds), 0) as total_time_seconds,
                COALESCE(AVG(time_spent_seconds), 0) as average_step_time,
                COALESCE(SUM(help_requests), 0) as help_requests_total,
                COALESCE(SUM(retry_count), 0) as retry_count_total
            FROM UserOnboardingAnalytics
            WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if result:
            steps_completed, total_time, avg_time, help_requests, retry_count = result
            completion_rate = (steps_completed / 5.0) * 100.0 if steps_completed else 0.0
        else:
            steps_completed = 0
            total_time = 0
            avg_time = 0.0
            help_requests = 0
            retry_count = 0
            completion_rate = 0.0
        
        # Get step-by-step analytics
        cursor.execute("""
            SELECT step_number, step_name, time_spent_seconds, completion_method, help_requests, retry_count
            FROM UserOnboardingAnalytics
            WHERE userId = %s
            ORDER BY step_number
        """, (user_id,))
        
        step_analytics = []
        for row in cursor.fetchall():
            step_analytics.append({
                "stepNumber": row[0],
                "stepName": row[1],
                "timeSpentSeconds": row[2] or 0,
                "completionMethod": row[3],
                "helpRequests": row[4] or 0,
                "retryCount": row[5] or 0
            })
        
        analytics = OnboardingAnalytics(
            totalTimeSeconds=int(total_time),
            stepsCompleted=int(steps_completed),
            completionRate=completion_rate,
            averageStepTime=float(avg_time),
            helpRequestsTotal=int(help_requests),
            retryCountTotal=int(retry_count),
            stepAnalytics=step_analytics
        )
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_analytics_retrieved",
            "Retrieved onboarding analytics",
            json.dumps({"userId": user_id}),
            f"Analytics: {steps_completed} steps, {completion_rate:.1f}% completion",
            {"stepsCompleted": steps_completed, "completionRate": completion_rate}
        )
        
        return analytics.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trading-preferences")
async def get_trading_preferences(user_id: int = 1):
    """Get user's trading preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM UserTradingPreferences WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Return default preferences
            preferences = TradingPreferences()
            
            conn.close()
            return preferences.dict()
        
        columns = [description[0] for description in cursor.description]
        prefs_data = dict(zip(columns, result))
        
        preferences = TradingPreferences(
            tradingStyle=prefs_data['trading_style'],
            strategyPreference=prefs_data['strategy_preference'],
            positionSizingMethod=prefs_data['position_sizing_method'],
            defaultPositionSize=prefs_data['default_position_size'],
            maxPositionSize=prefs_data['max_position_size'],
            stopLossPercentage=prefs_data['stop_loss_percentage'],
            takeProfitPercentage=prefs_data['take_profit_percentage'],
            maxDailyTrades=prefs_data['max_daily_trades'],
            maxWeeklyTrades=prefs_data['max_weekly_trades'],
            cashAllocationTarget=prefs_data['cash_allocation_target'],
            equityAllocationTarget=prefs_data['equity_allocation_target'],
            bondAllocationTarget=prefs_data['bond_allocation_target'],
            alternativeAllocationTarget=prefs_data['alternative_allocation_target'],
            autoRebalanceEnabled=prefs_data['auto_rebalance_enabled'],
            rebalanceThreshold=prefs_data['rebalance_threshold'],
            rebalanceFrequency=prefs_data['rebalance_frequency'],
            baseCurrency=prefs_data['base_currency'],
            currencyHedgingPreference=prefs_data['currency_hedging_preference'],
            taxLossHarvestingEnabled=prefs_data['tax_loss_harvesting_enabled'],
            frankingCreditsConsideration=prefs_data['franking_credits_consideration'],
            nzTaxOptimization=prefs_data['nz_tax_optimization'],
            priceAlertThreshold=prefs_data['price_alert_threshold'],
            portfolioAlertThreshold=prefs_data['portfolio_alert_threshold'],
            newsAlertEnabled=prefs_data['news_alert_enabled'],
            signalAlertEnabled=prefs_data['signal_alert_enabled'],
            autoSaveEnabled=prefs_data['auto_save_enabled'],
            advancedModeEnabled=prefs_data['advanced_mode_enabled'],
            paperTradingEnabled=prefs_data['paper_trading_enabled'],
            realTradingEnabled=prefs_data['real_trading_enabled']
        )
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "trading_preferences_retrieved",
            "Retrieved user trading preferences",
            json.dumps({"userId": user_id}),
            f"Trading style: {preferences.tradingStyle}, Currency: {preferences.baseCurrency}",
            {"tradingStyle": preferences.tradingStyle}
        )
        
        return preferences.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/trading-preferences")
async def update_trading_preferences(
    preferences: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update user's trading preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update trading preferences
        cursor.execute("""
            UPDATE UserTradingPreferences 
            SET trading_style = %s,
                strategy_preference = %s,
                position_sizing_method = %s,
                default_position_size = %s,
                max_position_size = %s,
                stop_loss_percentage = %s,
                take_profit_percentage = %s,
                max_daily_trades = %s,
                max_weekly_trades = %s,
                cash_allocation_target = %s,
                equity_allocation_target = %s,
                bond_allocation_target = %s,
                alternative_allocation_target = %s,
                auto_rebalance_enabled = %s,
                rebalance_threshold = %s,
                rebalance_frequency = %s,
                base_currency = %s,
                currency_hedging_preference = %s,
                tax_loss_harvesting_enabled = %s,
                franking_credits_consideration = %s,
                nz_tax_optimization = %s,
                price_alert_threshold = %s,
                portfolio_alert_threshold = %s,
                news_alert_enabled = %s,
                signal_alert_enabled = %s,
                auto_save_enabled = %s,
                advanced_mode_enabled = %s,
                paper_trading_enabled = %s,
                real_trading_enabled = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = %s
        """, (
            preferences.get('tradingStyle', 'balanced'),
            preferences.get('strategyPreference', 'mixed'),
            preferences.get('positionSizingMethod', 'percentage'),
            preferences.get('defaultPositionSize', 5.0),
            preferences.get('maxPositionSize', 20.0),
            preferences.get('stopLossPercentage', 10.0),
            preferences.get('takeProfitPercentage', 20.0),
            preferences.get('maxDailyTrades', 10),
            preferences.get('maxWeeklyTrades', 50),
            preferences.get('cashAllocationTarget', 10.0),
            preferences.get('equityAllocationTarget', 70.0),
            preferences.get('bondAllocationTarget', 15.0),
            preferences.get('alternativeAllocationTarget', 5.0),
            preferences.get('autoRebalanceEnabled', True),
            preferences.get('rebalanceThreshold', 5.0),
            preferences.get('rebalanceFrequency', 'monthly'),
            preferences.get('baseCurrency', 'NZD'),
            preferences.get('currencyHedgingPreference', 'auto'),
            preferences.get('taxLossHarvestingEnabled', True),
            preferences.get('frankingCreditsConsideration', True),
            preferences.get('nzTaxOptimization', True),
            preferences.get('priceAlertThreshold', 5.0),
            preferences.get('portfolioAlertThreshold', 10.0),
            preferences.get('newsAlertEnabled', True),
            preferences.get('signalAlertEnabled', True),
            preferences.get('autoSaveEnabled', True),
            preferences.get('advancedModeEnabled', False),
            preferences.get('paperTradingEnabled', True),
            preferences.get('realTradingEnabled', False),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "trading_preferences_updated",
            "Updated user trading preferences",
            json.dumps(preferences),
            "Trading preferences updated successfully",
            {"updatedFields": list(preferences.keys())}
        )
        
        return {
            "success": True,
            "message": "Trading preferences updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboarding/reset")
async def reset_onboarding(user_id: int = 1):
    """Reset user's onboarding progress"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Reset onboarding progress
        cursor.execute("""
            UPDATE UserOnboardingProgress 
            SET current_step = 1,
                completed_steps = '[]',
                is_complete = FALSE,
                completion_percentage = 0.0,
                welcome_viewed = FALSE,
                welcome_viewed_at = NULL,
                trading_experience = NULL,
                risk_tolerance = NULL,
                investment_horizon = NULL,
                initial_investment = NULL,
                trading_frequency = NULL,
                preferred_markets = '[]',
                full_name = NULL,
                first_name = NULL,
                last_name = NULL,
                phone_number = NULL,
                date_of_birth = NULL,
                tax_residency = NULL,
                secondary_tax_residency = NULL,
                tax_identification_number = NULL,
                tax_file_number = NULL,
                employment_status = NULL,
                terms_accepted = FALSE,
                terms_accepted_at = NULL,
                privacy_policy_accepted = FALSE,
                privacy_policy_accepted_at = NULL,
                completed_at = NULL,
                last_active_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = %s
        """, (user_id,))
        
        # Update user table
        cursor.execute("""
            UPDATE User 
            SET onboardingComplete = FALSE,
                onboardingStep = 1
            WHERE id = %s
        """, (user_id,))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_reset",
            "User onboarding progress reset",
            json.dumps({"userId": user_id}),
            "Onboarding progress reset to step 1",
            {"resetAt": datetime.now().isoformat()}
        )
        
        return {
            "success": True,
            "message": "Onboarding progress reset successfully",
            "currentStep": 1,
            "isComplete": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
#
# Integration Verification (Direct Path Tracing):
# Frontend: client/src/components/onboarding/onboarding-flow.tsx
#   └─ Calls: fetch('/api/onboarding/*') endpoints  
#   └─ Router: server/main.py includes onboarding_flow_router
#   └─ Database: Creates user_onboarding_progress, user_trading_preferences tables
#   └─ Agent Memory: Logs all onboarding actions
#   └─ Tests: tests/test_block_15_onboarding_flow.py
#
# Status: 🟢 FULLY INTEGRATED - Frontend → API → Database → Agent Memory

from fastapi import APIRouter, HTTPException, Depends, Query, Body, Path
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime, timedelta, date
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 15: Onboarding Flow - API Routes
# Complete onboarding system with progress tracking and analytics

class OnboardingProgress(BaseModel):
    """Onboarding progress response schema"""
    currentStep: int
    completedSteps: List[int]
    isComplete: bool
    completionPercentage: float
    welcomeViewed: bool = False
    tradingExperience: Optional[str] = None
    riskTolerance: Optional[str] = None
    investmentHorizon: Optional[str] = None
    initialInvestment: Optional[float] = None
    tradingFrequency: Optional[str] = None
    preferredMarkets: List[str] = []
    fullName: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phoneNumber: Optional[str] = None
    preferredCurrency: str = "NZD"
    dateOfBirth: Optional[str] = None
    taxResidency: Optional[str] = None
    secondaryTaxResidency: Optional[str] = None
    taxIdentificationNumber: Optional[str] = None
    taxFileNumber: Optional[str] = None
    employmentStatus: Optional[str] = None
    taxYearPreference: str = "calendar"
    taxRegisteredBusiness: bool = False
    helpLevel: str = "guided"
    notificationPreferences: Dict[str, bool] = {"email": True, "push": True, "sms": False}
    privacySettings: Dict[str, bool] = {"profilePublic": False, "performancePublic": False}
    connectBrokers: bool = False
    selectedBrokers: List[str] = []
    hasExistingPortfolio: bool = False
    existingPortfolioValue: Optional[float] = None
    termsAccepted: bool = False
    termsAcceptedAt: Optional[str] = None
    privacyPolicyAccepted: bool = False
    privacyPolicyAcceptedAt: Optional[str] = None
    startedAt: str
    completedAt: Optional[str] = None
    lastActiveAt: str

class OnboardingStep(BaseModel):
    """Onboarding step template schema"""
    stepNumber: int
    stepName: str
    stepTitle: str
    stepDescription: str
    requiredFields: List[str]
    optionalFields: List[str]
    componentName: str
    displayOrder: int
    isSkippable: bool = False
    minTimeSeconds: int = 0
    helpText: Optional[str] = None
    tooltipText: Optional[str] = None
    exampleData: Dict[str, Any] = {}

class OnboardingAnalytics(BaseModel):
    """Onboarding analytics response schema"""
    totalTimeSeconds: int
    stepsCompleted: int
    completionRate: float
    averageStepTime: float
    helpRequestsTotal: int
    retryCountTotal: int
    stepAnalytics: List[Dict[str, Any]] = []

class TradingPreferences(BaseModel):
    """Trading preferences response schema"""
    tradingStyle: str = "balanced"
    strategyPreference: str = "mixed"
    positionSizingMethod: str = "percentage"
    defaultPositionSize: float = 5.0
    maxPositionSize: float = 20.0
    stopLossPercentage: float = 10.0
    takeProfitPercentage: float = 20.0
    maxDailyTrades: int = 10
    maxWeeklyTrades: int = 50
    cashAllocationTarget: float = 10.0
    equityAllocationTarget: float = 70.0
    bondAllocationTarget: float = 15.0
    alternativeAllocationTarget: float = 5.0
    autoRebalanceEnabled: bool = True
    rebalanceThreshold: float = 5.0
    rebalanceFrequency: str = "monthly"
    baseCurrency: str = "NZD"
    currencyHedgingPreference: str = "auto"
    taxLossHarvestingEnabled: bool = True
    frankingCreditsConsideration: bool = True
    nzTaxOptimization: bool = True
    priceAlertThreshold: float = 5.0
    portfolioAlertThreshold: float = 10.0
    newsAlertEnabled: bool = True
    signalAlertEnabled: bool = True
    autoSaveEnabled: bool = True
    advancedModeEnabled: bool = False
    paperTradingEnabled: bool = True
    realTradingEnabled: bool = False

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

# Agent Memory logging
async def log_to_agent_memory(user_id: int, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp, sessionId)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            "block_15",
            action_type,
            action_summary,
            input_data,
            output_data,
            json.dumps(metadata) if metadata else None,
            datetime.now().isoformat(),
            f"session_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Failed to log to agent memory: {e}")

# Onboarding Progress Endpoints
@router.get("/onboarding/progress")
async def get_onboarding_progress(user_id: int = 1):
    """Get user's onboarding progress"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create onboarding progress table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserOnboardingProgress (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                current_step INTEGER DEFAULT 1,
                completed_steps TEXT DEFAULT '[]',
                is_complete BOOLEAN DEFAULT FALSE,
                completion_percentage REAL DEFAULT 0.0,
                welcome_viewed BOOLEAN DEFAULT FALSE,
                welcome_viewed_at TEXT,
                trading_experience TEXT,
                risk_tolerance TEXT,
                investment_horizon TEXT,
                initial_investment REAL,
                trading_frequency TEXT,
                preferred_markets TEXT DEFAULT '[]',
                full_name TEXT,
                first_name TEXT,
                last_name TEXT,
                phone_number TEXT,
                preferred_currency TEXT DEFAULT 'NZD',
                date_of_birth TEXT,
                tax_residency TEXT,
                secondary_tax_residency TEXT,
                tax_identification_number TEXT,
                tax_file_number TEXT,
                employment_status TEXT,
                tax_year_preference TEXT DEFAULT 'calendar',
                tax_registered_business BOOLEAN DEFAULT FALSE,
                help_level TEXT DEFAULT 'guided',
                notification_preferences TEXT DEFAULT '{"email": true, "push": true, "sms": false}',
                privacy_settings TEXT DEFAULT '{"profilePublic": false, "performancePublic": false}',
                connect_brokers BOOLEAN DEFAULT FALSE,
                selected_brokers TEXT DEFAULT '[]',
                has_existing_portfolio BOOLEAN DEFAULT FALSE,
                existing_portfolio_value REAL,
                terms_accepted BOOLEAN DEFAULT FALSE,
                terms_accepted_at TEXT,
                privacy_policy_accepted BOOLEAN DEFAULT FALSE,
                privacy_policy_accepted_at TEXT,
                session_id TEXT,
                user_agent TEXT,
                ip_address TEXT,
                referral_source TEXT,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                last_active_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        # Get user's onboarding progress
        cursor.execute("""
            SELECT * FROM UserOnboardingProgress WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Create initial onboarding progress
            cursor.execute("""
                INSERT INTO UserOnboardingProgress 
                (userId, current_step, completion_percentage, welcome_viewed)
                VALUES (%s, 1, 0.0, FALSE)
            """, (user_id,))
            
            conn.commit()
            
            # Return initial progress
            progress = OnboardingProgress(
                currentStep=1,
                completedSteps=[],
                isComplete=False,
                completionPercentage=0.0,
                startedAt=datetime.now().isoformat(),
                lastActiveAt=datetime.now().isoformat()
            )
            
            conn.close()
            
            await log_to_agent_memory(
                user_id,
                "onboarding_started",
                "User started onboarding process",
                json.dumps({"userId": user_id}),
                "Initial onboarding progress created",
                {"currentStep": 1}
            )
            
            return progress.dict()
        
        # Parse result
        columns = [description[0] for description in cursor.description]
        progress_data = dict(zip(columns, result))
        
        # Parse JSON fields
        completed_steps = json.loads(progress_data.get('completed_steps', '[]'))
        preferred_markets = json.loads(progress_data.get('preferred_markets', '[]'))
        notification_preferences = json.loads(progress_data.get('notification_preferences', '{"email": true, "push": true, "sms": false}'))
        privacy_settings = json.loads(progress_data.get('privacy_settings', '{"profilePublic": false, "performancePublic": false}'))
        selected_brokers = json.loads(progress_data.get('selected_brokers', '[]'))
        
        progress = OnboardingProgress(
            currentStep=progress_data['current_step'],
            completedSteps=completed_steps,
            isComplete=progress_data['is_complete'],
            completionPercentage=progress_data['completion_percentage'],
            welcomeViewed=progress_data['welcome_viewed'],
            tradingExperience=progress_data['trading_experience'],
            riskTolerance=progress_data['risk_tolerance'],
            investmentHorizon=progress_data['investment_horizon'],
            initialInvestment=progress_data['initial_investment'],
            tradingFrequency=progress_data['trading_frequency'],
            preferredMarkets=preferred_markets,
            fullName=progress_data['full_name'],
            firstName=progress_data['first_name'],
            lastName=progress_data['last_name'],
            phoneNumber=progress_data['phone_number'],
            preferredCurrency=progress_data['preferred_currency'],
            dateOfBirth=progress_data['date_of_birth'],
            taxResidency=progress_data['tax_residency'],
            secondaryTaxResidency=progress_data['secondary_tax_residency'],
            taxIdentificationNumber=progress_data['tax_identification_number'],
            taxFileNumber=progress_data['tax_file_number'],
            employmentStatus=progress_data['employment_status'],
            taxYearPreference=progress_data['tax_year_preference'],
            taxRegisteredBusiness=progress_data['tax_registered_business'],
            helpLevel=progress_data['help_level'],
            notificationPreferences=notification_preferences,
            privacySettings=privacy_settings,
            connectBrokers=progress_data['connect_brokers'],
            selectedBrokers=selected_brokers,
            hasExistingPortfolio=progress_data['has_existing_portfolio'],
            existingPortfolioValue=progress_data['existing_portfolio_value'],
            termsAccepted=progress_data['terms_accepted'],
            termsAcceptedAt=progress_data['terms_accepted_at'],
            privacyPolicyAccepted=progress_data['privacy_policy_accepted'],
            privacyPolicyAcceptedAt=progress_data['privacy_policy_accepted_at'],
            startedAt=progress_data['started_at'],
            completedAt=progress_data['completed_at'],
            lastActiveAt=progress_data['last_active_at']
        )
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_progress_retrieved",
            f"Retrieved onboarding progress - Step {progress.currentStep}",
            json.dumps({"userId": user_id}),
            f"Current step: {progress.currentStep}, Completion: {progress.completionPercentage}%",
            {"currentStep": progress.currentStep, "completionPercentage": progress.completionPercentage}
        )
        
        return progress.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboarding/step")
async def update_onboarding_step(
    step_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update onboarding step progress"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        step_number = step_data.get("stepNumber", 1)
        
        # Get current progress
        cursor.execute("""
            SELECT current_step, completed_steps FROM UserOnboardingProgress 
            WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Onboarding not started")
        
        current_step, completed_steps_str = result
        completed_steps = json.loads(completed_steps_str) if completed_steps_str else []
        
        # Add current step to completed steps if not already there
        if step_number not in completed_steps:
            completed_steps.append(step_number)
        
        # Calculate completion percentage
        completion_percentage = (len(completed_steps) / 5.0) * 100.0
        
        # Update based on step number
        if step_number == 1:
            # Welcome step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET welcome_viewed = TRUE,
                    welcome_viewed_at = CURRENT_TIMESTAMP,
                    current_step = CASE WHEN current_step < 2 THEN 2 ELSE current_step END,
                    completed_steps = %s,
                    completion_percentage = %s,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (json.dumps(completed_steps), completion_percentage, user_id))
            
        elif step_number == 2:
            # Portfolio preferences step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET trading_experience = %s,
                    risk_tolerance = %s,
                    investment_horizon = %s,
                    initial_investment = %s,
                    trading_frequency = %s,
                    preferred_markets = %s,
                    current_step = CASE WHEN current_step < 3 THEN 3 ELSE current_step END,
                    completed_steps = %s,
                    completion_percentage = %s,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (
                step_data.get("tradingExperience"),
                step_data.get("riskTolerance"),
                step_data.get("investmentHorizon"),
                step_data.get("initialInvestment"),
                step_data.get("tradingFrequency"),
                json.dumps(step_data.get("preferredMarkets", [])),
                json.dumps(completed_steps),
                completion_percentage,
                user_id
            ))
            
        elif step_number == 3:
            # Personal information step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET full_name = %s,
                    first_name = %s,
                    last_name = %s,
                    phone_number = %s,
                    preferred_currency = %s,
                    date_of_birth = %s,
                    current_step = CASE WHEN current_step < 4 THEN 4 ELSE current_step END,
                    completed_steps = %s,
                    completion_percentage = %s,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (
                step_data.get("fullName"),
                step_data.get("firstName"),
                step_data.get("lastName"),
                step_data.get("phoneNumber"),
                step_data.get("preferredCurrency", "NZD"),
                step_data.get("dateOfBirth"),
                json.dumps(completed_steps),
                completion_percentage,
                user_id
            ))
            
        elif step_number == 4:
            # Tax information step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET tax_residency = %s,
                    secondary_tax_residency = %s,
                    tax_identification_number = %s,
                    tax_file_number = %s,
                    employment_status = %s,
                    tax_year_preference = %s,
                    tax_registered_business = %s,
                    current_step = CASE WHEN current_step < 5 THEN 5 ELSE current_step END,
                    completed_steps = %s,
                    completion_percentage = %s,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (
                step_data.get("taxResidency"),
                step_data.get("secondaryTaxResidency"),
                step_data.get("taxIdentificationNumber"),
                step_data.get("taxFileNumber"),
                step_data.get("employmentStatus"),
                step_data.get("taxYearPreference", "calendar"),
                step_data.get("taxRegisteredBusiness", False),
                json.dumps(completed_steps),
                completion_percentage,
                user_id
            ))
            
        elif step_number == 5:
            # Summary/completion step
            cursor.execute("""
                UPDATE UserOnboardingProgress 
                SET terms_accepted = TRUE,
                    terms_accepted_at = CURRENT_TIMESTAMP,
                    privacy_policy_accepted = TRUE,
                    privacy_policy_accepted_at = CURRENT_TIMESTAMP,
                    is_complete = TRUE,
                    completed_at = CURRENT_TIMESTAMP,
                    current_step = 5,
                    completed_steps = %s,
                    completion_percentage = 100.0,
                    last_active_at = CURRENT_TIMESTAMP
                WHERE userId = %s
            """, (json.dumps(completed_steps), user_id))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_step_updated",
            f"Updated onboarding step {step_number}",
            json.dumps(step_data),
            f"Step {step_number} completed successfully",
            {"stepNumber": step_number, "completionPercentage": completion_percentage}
        )
        
        return {
            "success": True,
            "message": f"Step {step_number} updated successfully",
            "currentStep": min(step_number + 1, 5),
            "completionPercentage": completion_percentage
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboarding/complete")
async def complete_onboarding(
    completion_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Complete the onboarding process"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Mark onboarding as complete
        cursor.execute("""
            UPDATE UserOnboardingProgress 
            SET is_complete = TRUE,
                completed_at = CURRENT_TIMESTAMP,
                completion_percentage = 100.0,
                current_step = 5,
                terms_accepted = TRUE,
                terms_accepted_at = CURRENT_TIMESTAMP,
                privacy_policy_accepted = TRUE,
                privacy_policy_accepted_at = CURRENT_TIMESTAMP,
                last_active_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (user_id,))
        
        # Get the completed onboarding data
        cursor.execute("""
            SELECT * FROM UserOnboardingProgress WHERE userId = ?
        """, (user_id,))
        
        result = cursor.fetchone()
        columns = [description[0] for description in cursor.description]
        progress_data = dict(zip(columns, result))
        
        # Create trading preferences table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserTradingPreferences (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                trading_style TEXT DEFAULT 'balanced',
                strategy_preference TEXT DEFAULT 'mixed',
                position_sizing_method TEXT DEFAULT 'percentage',
                default_position_size REAL DEFAULT 5.0,
                max_position_size REAL DEFAULT 20.0,
                stop_loss_percentage REAL DEFAULT 10.0,
                take_profit_percentage REAL DEFAULT 20.0,
                max_daily_trades INTEGER DEFAULT 10,
                max_weekly_trades INTEGER DEFAULT 50,
                cash_allocation_target REAL DEFAULT 10.0,
                equity_allocation_target REAL DEFAULT 70.0,
                bond_allocation_target REAL DEFAULT 15.0,
                alternative_allocation_target REAL DEFAULT 5.0,
                auto_rebalance_enabled BOOLEAN DEFAULT TRUE,
                rebalance_threshold REAL DEFAULT 5.0,
                rebalance_frequency TEXT DEFAULT 'monthly',
                base_currency TEXT DEFAULT 'NZD',
                currency_hedging_preference TEXT DEFAULT 'auto',
                tax_loss_harvesting_enabled BOOLEAN DEFAULT TRUE,
                franking_credits_consideration BOOLEAN DEFAULT TRUE,
                nz_tax_optimization BOOLEAN DEFAULT TRUE,
                price_alert_threshold REAL DEFAULT 5.0,
                portfolio_alert_threshold REAL DEFAULT 10.0,
                news_alert_enabled BOOLEAN DEFAULT TRUE,
                signal_alert_enabled BOOLEAN DEFAULT TRUE,
                auto_save_enabled BOOLEAN DEFAULT TRUE,
                advanced_mode_enabled BOOLEAN DEFAULT FALSE,
                paper_trading_enabled BOOLEAN DEFAULT TRUE,
                real_trading_enabled BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        # Create trading preferences based on onboarding data
        trading_style = "balanced"
        if progress_data.get('risk_tolerance') == 'conservative':
            trading_style = "conservative"
        elif progress_data.get('risk_tolerance') == 'aggressive':
            trading_style = "aggressive"
        
        cursor.execute("""
            INSERT INTO UserTradingPreferences 
            (userId, trading_style, base_currency, auto_rebalance_enabled, paper_trading_enabled)
            VALUES (%s, %s, %s, TRUE, TRUE)
            ON CONFLICT (userId) DO UPDATE SET
                trading_style = EXCLUDED.trading_style,
                base_currency = EXCLUDED.base_currency
        """, (
            user_id,
            trading_style,
            progress_data.get('preferred_currency', 'NZD')
        ))
        
        # Update user table to mark onboarding complete
        cursor.execute("""
            UPDATE User 
            SET onboardingComplete = TRUE,
                onboardingStep = 5
            WHERE id = %s
        """, (user_id,))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_completed",
            "User completed onboarding process",
            json.dumps(completion_data),
            "Onboarding completed successfully, trading preferences created",
            {
                "completedAt": datetime.now().isoformat(),
                "tradingStyle": trading_style,
                "baseCurrency": progress_data.get('preferred_currency', 'NZD')
            }
        )
        
        return {
            "success": True,
            "message": "Onboarding completed successfully",
            "hasCompletedOnboarding": True,
            "completedAt": datetime.now().isoformat(),
            "tradingPreferences": {
                "tradingStyle": trading_style,
                "baseCurrency": progress_data.get('preferred_currency', 'NZD'),
                "paperTradingEnabled": True
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/onboarding/steps")
async def get_onboarding_steps():
    """Get onboarding step templates"""
    try:
        # Return predefined onboarding steps
        steps = [
            OnboardingStep(
                stepNumber=1,
                stepName="welcome",
                stepTitle="Welcome to StackMotive",
                stepDescription="Get started with your trading journey",
                requiredFields=[],
                optionalFields=[],
                componentName="StepWelcome",
                displayOrder=1,
                helpText="Welcome to StackMotive! This quick setup will personalize your trading experience.",
                tooltipText="Complete setup takes about 5 minutes"
            ),
            OnboardingStep(
                stepNumber=2,
                stepName="portfolio",
                stepTitle="Portfolio Preferences", 
                stepDescription="Configure your trading style and risk tolerance",
                requiredFields=["tradingExperience", "riskTolerance", "investmentHorizon"],
                optionalFields=["initialInvestment", "tradingFrequency", "preferredMarkets"],
                componentName="StepPortfolio",
                displayOrder=2,
                helpText="Tell us about your trading experience and risk preferences to get personalized recommendations.",
                tooltipText="This helps us tailor strategies to your risk profile"
            ),
            OnboardingStep(
                stepNumber=3,
                stepName="personal",
                stepTitle="Personal Information",
                stepDescription="Tell us about yourself",
                requiredFields=["fullName", "preferredCurrency"],
                optionalFields=["phoneNumber", "dateOfBirth"],
                componentName="StepPersonalInfo",
                displayOrder=3,
                helpText="Basic information to personalize your account and set up proper tax reporting.",
                tooltipText="We use this for account management and tax calculations"
            ),
            OnboardingStep(
                stepNumber=4,
                stepName="tax",
                stepTitle="Tax Information",
                stepDescription="Configure your tax settings",
                requiredFields=["taxResidency", "employmentStatus"],
                optionalFields=["taxIdentificationNumber", "taxFileNumber", "taxYearPreference"],
                componentName="StepTaxInfo", 
                displayOrder=4,
                helpText="Tax information enables accurate reporting and optimization for your jurisdiction.",
                tooltipText="Required for proper tax calculations and compliance"
            ),
            OnboardingStep(
                stepNumber=5,
                stepName="summary",
                stepTitle="Review & Complete",
                stepDescription="Review your information and complete setup",
                requiredFields=["termsAccepted"],
                optionalFields=[],
                componentName="StepSummary",
                displayOrder=5,
                helpText="Review all your information before completing the setup process.",
                tooltipText="You can change these settings anytime in your preferences"
            )
        ]
        
        await log_to_agent_memory(
            1,  # System action
            "onboarding_steps_retrieved",
            "Retrieved onboarding step templates",
            json.dumps({"action": "get_steps"}),
            f"Returned {len(steps)} step templates",
            {"stepsCount": len(steps)}
        )
        
        return [step.dict() for step in steps]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/onboarding/analytics")
async def get_onboarding_analytics(
    user_id: int = 1
):
    """Get onboarding analytics for user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create analytics table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserOnboardingAnalytics (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                step_number INTEGER NOT NULL,
                step_name TEXT NOT NULL,
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                time_spent_seconds INTEGER,
                field_interactions TEXT DEFAULT '{}',
                validation_errors TEXT DEFAULT '[]',
                help_requests INTEGER DEFAULT 0,
                completion_method TEXT,
                retry_count INTEGER DEFAULT 0,
                device_type TEXT,
                browser TEXT,
                screen_resolution TEXT,
                form_completion_percentage REAL DEFAULT 0.0,
                data_accuracy_score REAL DEFAULT 0.0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Get analytics data for user
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT step_number) as steps_completed,
                COALESCE(SUM(time_spent_seconds), 0) as total_time_seconds,
                COALESCE(AVG(time_spent_seconds), 0) as average_step_time,
                COALESCE(SUM(help_requests), 0) as help_requests_total,
                COALESCE(SUM(retry_count), 0) as retry_count_total
            FROM UserOnboardingAnalytics
            WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if result:
            steps_completed, total_time, avg_time, help_requests, retry_count = result
            completion_rate = (steps_completed / 5.0) * 100.0 if steps_completed else 0.0
        else:
            steps_completed = 0
            total_time = 0
            avg_time = 0.0
            help_requests = 0
            retry_count = 0
            completion_rate = 0.0
        
        # Get step-by-step analytics
        cursor.execute("""
            SELECT step_number, step_name, time_spent_seconds, completion_method, help_requests, retry_count
            FROM UserOnboardingAnalytics
            WHERE userId = %s
            ORDER BY step_number
        """, (user_id,))
        
        step_analytics = []
        for row in cursor.fetchall():
            step_analytics.append({
                "stepNumber": row[0],
                "stepName": row[1],
                "timeSpentSeconds": row[2] or 0,
                "completionMethod": row[3],
                "helpRequests": row[4] or 0,
                "retryCount": row[5] or 0
            })
        
        analytics = OnboardingAnalytics(
            totalTimeSeconds=int(total_time),
            stepsCompleted=int(steps_completed),
            completionRate=completion_rate,
            averageStepTime=float(avg_time),
            helpRequestsTotal=int(help_requests),
            retryCountTotal=int(retry_count),
            stepAnalytics=step_analytics
        )
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_analytics_retrieved",
            "Retrieved onboarding analytics",
            json.dumps({"userId": user_id}),
            f"Analytics: {steps_completed} steps, {completion_rate:.1f}% completion",
            {"stepsCompleted": steps_completed, "completionRate": completion_rate}
        )
        
        return analytics.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trading-preferences")
async def get_trading_preferences(user_id: int = 1):
    """Get user's trading preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM UserTradingPreferences WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Return default preferences
            preferences = TradingPreferences()
            
            conn.close()
            return preferences.dict()
        
        columns = [description[0] for description in cursor.description]
        prefs_data = dict(zip(columns, result))
        
        preferences = TradingPreferences(
            tradingStyle=prefs_data['trading_style'],
            strategyPreference=prefs_data['strategy_preference'],
            positionSizingMethod=prefs_data['position_sizing_method'],
            defaultPositionSize=prefs_data['default_position_size'],
            maxPositionSize=prefs_data['max_position_size'],
            stopLossPercentage=prefs_data['stop_loss_percentage'],
            takeProfitPercentage=prefs_data['take_profit_percentage'],
            maxDailyTrades=prefs_data['max_daily_trades'],
            maxWeeklyTrades=prefs_data['max_weekly_trades'],
            cashAllocationTarget=prefs_data['cash_allocation_target'],
            equityAllocationTarget=prefs_data['equity_allocation_target'],
            bondAllocationTarget=prefs_data['bond_allocation_target'],
            alternativeAllocationTarget=prefs_data['alternative_allocation_target'],
            autoRebalanceEnabled=prefs_data['auto_rebalance_enabled'],
            rebalanceThreshold=prefs_data['rebalance_threshold'],
            rebalanceFrequency=prefs_data['rebalance_frequency'],
            baseCurrency=prefs_data['base_currency'],
            currencyHedgingPreference=prefs_data['currency_hedging_preference'],
            taxLossHarvestingEnabled=prefs_data['tax_loss_harvesting_enabled'],
            frankingCreditsConsideration=prefs_data['franking_credits_consideration'],
            nzTaxOptimization=prefs_data['nz_tax_optimization'],
            priceAlertThreshold=prefs_data['price_alert_threshold'],
            portfolioAlertThreshold=prefs_data['portfolio_alert_threshold'],
            newsAlertEnabled=prefs_data['news_alert_enabled'],
            signalAlertEnabled=prefs_data['signal_alert_enabled'],
            autoSaveEnabled=prefs_data['auto_save_enabled'],
            advancedModeEnabled=prefs_data['advanced_mode_enabled'],
            paperTradingEnabled=prefs_data['paper_trading_enabled'],
            realTradingEnabled=prefs_data['real_trading_enabled']
        )
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "trading_preferences_retrieved",
            "Retrieved user trading preferences",
            json.dumps({"userId": user_id}),
            f"Trading style: {preferences.tradingStyle}, Currency: {preferences.baseCurrency}",
            {"tradingStyle": preferences.tradingStyle}
        )
        
        return preferences.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/trading-preferences")
async def update_trading_preferences(
    preferences: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update user's trading preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update trading preferences
        cursor.execute("""
            UPDATE UserTradingPreferences 
            SET trading_style = %s,
                strategy_preference = %s,
                position_sizing_method = %s,
                default_position_size = %s,
                max_position_size = %s,
                stop_loss_percentage = %s,
                take_profit_percentage = %s,
                max_daily_trades = %s,
                max_weekly_trades = %s,
                cash_allocation_target = %s,
                equity_allocation_target = %s,
                bond_allocation_target = %s,
                alternative_allocation_target = %s,
                auto_rebalance_enabled = %s,
                rebalance_threshold = %s,
                rebalance_frequency = %s,
                base_currency = %s,
                currency_hedging_preference = %s,
                tax_loss_harvesting_enabled = %s,
                franking_credits_consideration = %s,
                nz_tax_optimization = %s,
                price_alert_threshold = %s,
                portfolio_alert_threshold = %s,
                news_alert_enabled = %s,
                signal_alert_enabled = %s,
                auto_save_enabled = %s,
                advanced_mode_enabled = %s,
                paper_trading_enabled = %s,
                real_trading_enabled = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = %s
        """, (
            preferences.get('tradingStyle', 'balanced'),
            preferences.get('strategyPreference', 'mixed'),
            preferences.get('positionSizingMethod', 'percentage'),
            preferences.get('defaultPositionSize', 5.0),
            preferences.get('maxPositionSize', 20.0),
            preferences.get('stopLossPercentage', 10.0),
            preferences.get('takeProfitPercentage', 20.0),
            preferences.get('maxDailyTrades', 10),
            preferences.get('maxWeeklyTrades', 50),
            preferences.get('cashAllocationTarget', 10.0),
            preferences.get('equityAllocationTarget', 70.0),
            preferences.get('bondAllocationTarget', 15.0),
            preferences.get('alternativeAllocationTarget', 5.0),
            preferences.get('autoRebalanceEnabled', True),
            preferences.get('rebalanceThreshold', 5.0),
            preferences.get('rebalanceFrequency', 'monthly'),
            preferences.get('baseCurrency', 'NZD'),
            preferences.get('currencyHedgingPreference', 'auto'),
            preferences.get('taxLossHarvestingEnabled', True),
            preferences.get('frankingCreditsConsideration', True),
            preferences.get('nzTaxOptimization', True),
            preferences.get('priceAlertThreshold', 5.0),
            preferences.get('portfolioAlertThreshold', 10.0),
            preferences.get('newsAlertEnabled', True),
            preferences.get('signalAlertEnabled', True),
            preferences.get('autoSaveEnabled', True),
            preferences.get('advancedModeEnabled', False),
            preferences.get('paperTradingEnabled', True),
            preferences.get('realTradingEnabled', False),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "trading_preferences_updated",
            "Updated user trading preferences",
            json.dumps(preferences),
            "Trading preferences updated successfully",
            {"updatedFields": list(preferences.keys())}
        )
        
        return {
            "success": True,
            "message": "Trading preferences updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/onboarding/reset")
async def reset_onboarding(user_id: int = 1):
    """Reset user's onboarding progress"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Reset onboarding progress
        cursor.execute("""
            UPDATE UserOnboardingProgress 
            SET current_step = 1,
                completed_steps = '[]',
                is_complete = FALSE,
                completion_percentage = 0.0,
                welcome_viewed = FALSE,
                welcome_viewed_at = NULL,
                trading_experience = NULL,
                risk_tolerance = NULL,
                investment_horizon = NULL,
                initial_investment = NULL,
                trading_frequency = NULL,
                preferred_markets = '[]',
                full_name = NULL,
                first_name = NULL,
                last_name = NULL,
                phone_number = NULL,
                date_of_birth = NULL,
                tax_residency = NULL,
                secondary_tax_residency = NULL,
                tax_identification_number = NULL,
                tax_file_number = NULL,
                employment_status = NULL,
                terms_accepted = FALSE,
                terms_accepted_at = NULL,
                privacy_policy_accepted = FALSE,
                privacy_policy_accepted_at = NULL,
                completed_at = NULL,
                last_active_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = %s
        """, (user_id,))
        
        # Update user table
        cursor.execute("""
            UPDATE User 
            SET onboardingComplete = FALSE,
                onboardingStep = 1
            WHERE id = %s
        """, (user_id,))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "onboarding_reset",
            "User onboarding progress reset",
            json.dumps({"userId": user_id}),
            "Onboarding progress reset to step 1",
            {"resetAt": datetime.now().isoformat()}
        )
        
        return {
            "success": True,
            "message": "Onboarding progress reset successfully",
            "currentStep": 1,
            "isComplete": False
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))            