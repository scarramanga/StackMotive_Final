from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import io
import csv
from fastapi.responses import StreamingResponse

from server.database import get_db
from server.auth import get_current_user
from server.models.user import User
from server.models.tax import (
    TaxTransaction, TaxReport, TaxSettings,
    TaxTransactionCreate, TaxTransactionResponse,
    TaxReportRequest, TaxReportResponse,
    TaxSettingsRequest, TaxSettingsResponse,
    TaxSummary, TaxCalculator
)

router = APIRouter()

@router.get("/tax/summary", response_model=TaxSummary)
async def get_tax_summary(
    tax_year: str = Query(default=str(datetime.now().year)),
    country: str = Query(default="AU"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tax summary for the specified year and country"""
    
    # Get user's tax transactions for the year
    transactions = db.query(TaxTransaction).filter(
        TaxTransaction.user_id == current_user.id,
        TaxTransaction.tax_year == tax_year
    ).all()
    
    if not transactions:
        # Return empty summary with mock data for demo
        return TaxSummary(
            total_realized_gains=12450.75,
            total_realized_losses=3200.25,
            net_capital_gains=9250.50,
            short_term_gains=5600.30,
            long_term_gains=6850.45,
            total_fees=125.80,
            total_dividends=890.25,
            estimated_tax_owed=2850.50
        )
    
    # Convert to response models
    transaction_responses = [
        TaxTransactionResponse.from_orm(t) for t in transactions
    ]
    
    # Calculate summary
    summary = TaxCalculator.calculate_capital_gains(
        transaction_responses, country
    )
    
    return summary

@router.get("/tax/transactions", response_model=List[TaxTransactionResponse])
async def get_tax_transactions(
    tax_year: str = Query(default=str(datetime.now().year)),
    country: str = Query(default="AU"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tax transactions for the specified year"""
    
    transactions = db.query(TaxTransaction).filter(
        TaxTransaction.user_id == current_user.id,
        TaxTransaction.tax_year == tax_year
    ).all()
    
    if not transactions:
        # Return mock transactions for demo
        return [
            TaxTransactionResponse(
                id=1,
                user_id=current_user.id,
                symbol="AAPL",
                transaction_type="sell",
                quantity=100,
                price=175.50,
                fees=9.95,
                date=datetime(2024, 3, 15),
                cost_basis=15000,
                proceeds=17540.05,
                capital_gain=2530.10,
                gain_type="long",
                tax_year=tax_year,
                country=country,
                created_at=datetime.now()
            ),
            TaxTransactionResponse(
                id=2,
                user_id=current_user.id,
                symbol="TSLA",
                transaction_type="sell",
                quantity=50,
                price=210.75,
                fees=9.95,
                date=datetime(2024, 6, 20),
                cost_basis=12000,
                proceeds=10527.55,
                capital_gain=-1482.40,
                gain_type="short",
                tax_year=tax_year,
                country=country,
                created_at=datetime.now()
            ),
            TaxTransactionResponse(
                id=3,
                user_id=current_user.id,
                symbol="MSFT",
                transaction_type="sell",
                quantity=75,
                price=420.25,
                fees=9.95,
                date=datetime(2024, 9, 10),
                cost_basis=25000,
                proceeds=31508.80,
                capital_gain=6498.85,
                gain_type="long",
                tax_year=tax_year,
                country=country,
                created_at=datetime.now()
            )
        ]
    
    return [TaxTransactionResponse.from_orm(t) for t in transactions]

@router.post("/tax/report", response_model=TaxReportResponse)
async def generate_tax_report(
    request: TaxReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a comprehensive tax report for the specified year and country"""
    
    # Get transactions
    transactions = db.query(TaxTransaction).filter(
        TaxTransaction.user_id == current_user.id,
        TaxTransaction.tax_year == request.tax_year
    ).all()
    
    # Calculate summary
    if transactions:
        transaction_responses = [TaxTransactionResponse.from_orm(t) for t in transactions]
        summary = TaxCalculator.calculate_capital_gains(
            transaction_responses, request.country, request.accounting_method
        )
    else:
        # Use mock data for demo
        summary = TaxSummary(
            total_realized_gains=12450.75,
            total_realized_losses=3200.25,
            net_capital_gains=9250.50,
            short_term_gains=5600.30,
            long_term_gains=6850.45,
            total_fees=125.80,
            total_dividends=890.25,
            estimated_tax_owed=2850.50
        )
        transaction_responses = await get_tax_transactions(request.tax_year, request.country, db, current_user)
    
    # Get country information
    country_info = TaxCalculator.get_country_info(request.country)
    
    # Create or update tax report in database
    existing_report = db.query(TaxReport).filter(
        TaxReport.user_id == current_user.id,
        TaxReport.tax_year == request.tax_year,
        TaxReport.country == request.country
    ).first()
    
    if existing_report:
        # Update existing report
        existing_report.total_proceeds = sum([t.proceeds or 0 for t in transaction_responses if t.transaction_type == "sell"])
        existing_report.total_cost_basis = sum([t.cost_basis or 0 for t in transaction_responses if t.transaction_type == "sell"])
        existing_report.total_gain_loss = summary.net_capital_gains
        existing_report.short_term_gains = summary.short_term_gains
        existing_report.long_term_gains = summary.long_term_gains
        existing_report.estimated_tax_owed = summary.estimated_tax_owed
        existing_report.generated_at = datetime.utcnow()
        existing_report.report_data = {
            "summary": summary.dict(),
            "country_info": country_info.dict(),
            "accounting_method": request.accounting_method,
            "settings": {
                "include_fees": request.include_fees,
                "include_foreign_income": request.include_foreign_income
            }
        }
        db.commit()
        report = existing_report
    else:
        # Create new report
        report = TaxReport(
            user_id=current_user.id,
            tax_year=request.tax_year,
            country=request.country,
            report_type=request.report_type,
            total_proceeds=sum([t.proceeds or 0 for t in transaction_responses if t.transaction_type == "sell"]),
            total_cost_basis=sum([t.cost_basis or 0 for t in transaction_responses if t.transaction_type == "sell"]),
            total_gain_loss=summary.net_capital_gains,
            short_term_gains=summary.short_term_gains,
            long_term_gains=summary.long_term_gains,
            estimated_tax_owed=summary.estimated_tax_owed,
            report_data={
                "summary": summary.dict(),
                "country_info": country_info.dict(),
                "accounting_method": request.accounting_method,
                "settings": {
                    "include_fees": request.include_fees,
                    "include_foreign_income": request.include_foreign_income
                }
            }
        )
        db.add(report)
        db.commit()
        db.refresh(report)
    
    return TaxReportResponse(
        id=report.id,
        user_id=report.user_id,
        tax_year=report.tax_year,
        country=report.country,
        report_type=report.report_type,
        summary=summary,
        transactions=transaction_responses,
        country_info=country_info,
        generated_at=report.generated_at,
        status=report.status
    )

@router.get("/tax/export/csv")
async def export_tax_csv(
    tax_year: str = Query(default=str(datetime.now().year)),
    country: str = Query(default="AU"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export tax transactions as CSV"""
    
    transactions = await get_tax_transactions(tax_year, country, db, current_user)
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Date", "Symbol", "Type", "Quantity", "Price", "Fees", 
        "Cost Basis", "Proceeds", "Capital Gain/Loss", "Gain Type"
    ])
    
    # Write data
    for transaction in transactions:
        writer.writerow([
            transaction.date.strftime("%Y-%m-%d"),
            transaction.symbol,
            transaction.transaction_type,
            transaction.quantity,
            transaction.price,
            transaction.fees,
            transaction.cost_basis or "",
            transaction.proceeds or "",
            transaction.capital_gain or "",
            transaction.gain_type or ""
        ])
    
    # Create response
    output.seek(0)
    return StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=tax_report_{tax_year}_{country}.csv"}
    )

@router.get("/tax/settings", response_model=TaxSettingsResponse)
async def get_tax_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's tax settings"""
    
    settings = db.query(TaxSettings).filter(
        TaxSettings.user_id == current_user.id
    ).first()
    
    if not settings:
        # Create default settings
        settings = TaxSettings(
            user_id=current_user.id,
            country="AU",
            tax_residency="AU",
            accounting_method="FIFO",
            include_fees=True,
            include_foreign_income=True,
            carry_forward_losses=True,
            previous_year_losses=0.0
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return TaxSettingsResponse.from_orm(settings)

@router.put("/tax/settings", response_model=TaxSettingsResponse)
async def update_tax_settings(
    request: TaxSettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user's tax settings"""
    
    settings = db.query(TaxSettings).filter(
        TaxSettings.user_id == current_user.id
    ).first()
    
    if settings:
        # Update existing settings
        settings.country = request.country
        settings.tax_residency = request.tax_residency
        settings.accounting_method = request.accounting_method
        settings.include_fees = request.include_fees
        settings.include_foreign_income = request.include_foreign_income
        settings.carry_forward_losses = request.carry_forward_losses
        settings.previous_year_losses = request.previous_year_losses
        settings.updated_at = datetime.utcnow()
    else:
        # Create new settings
        settings = TaxSettings(
            user_id=current_user.id,
            **request.dict()
        )
        db.add(settings)
    
    db.commit()
    db.refresh(settings)
    
    return TaxSettingsResponse.from_orm(settings)

@router.get("/tax/country-info")
async def get_country_info(
    country: str = Query(default="AU"),
    current_user: User = Depends(get_current_user)
):
    """Get tax information for a specific country"""
    
    country_info = TaxCalculator.get_country_info(country)
    return country_info.dict()

@router.post("/tax/generate-ir3")
async def generate_ir3_report(
    tax_year: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate New Zealand IR3 tax report"""
    
    if not tax_year:
        raise HTTPException(status_code=400, detail="Tax year is required")
    
    # Get transactions for the year
    transactions = await get_tax_transactions(tax_year, "NZ", db, current_user)
    
    # Calculate summary for NZ
    summary = TaxCalculator.calculate_capital_gains(transactions, "NZ")
    
    # Create IR3 specific report format
    ir3_report = {
        "tax_year": tax_year,
        "taxpayer_name": current_user.email.split("@")[0],
        "ird_number": "123-456-789",  # This would come from user profile
        "income_summary": {
            "salary_wages": 0,  # This would come from other sources
            "investment_income": summary.total_dividends,
            "capital_gains": summary.net_capital_gains,
            "other_income": 0
        },
        "deductions": {
            "investment_expenses": summary.total_fees,
            "other_deductions": 0
        },
        "tax_calculation": {
            "taxable_income": summary.net_capital_gains,
            "tax_on_income": summary.estimated_tax_owed,
            "resident_withholding_tax": 0,
            "provisional_tax": 0
        },
        "attachments": {
            "investment_schedule": [
                {
                    "symbol": t.symbol,
                    "proceeds": t.proceeds,
                    "cost": t.cost_basis,
                    "gain_loss": t.capital_gain
                }
                for t in transactions if t.transaction_type == "sell"
            ]
        }
    }
    
    return {
        "success": True,
        "report_type": "IR3",
        "tax_year": tax_year,
        "country": "NZ",
        "data": ir3_report,
        "generated_at": datetime.utcnow().isoformat()
    } 