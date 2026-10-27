from pydantic import BaseModel
from datetime import date
from decimal import Decimal


class InvoiceData(BaseModel):
    company_name: str | None
    invoice_number: str | None
    invoice_date: date | None
    currency: str | None
    subtotal: Decimal | None
    tax_amount: Decimal | None
    total_amount: Decimal | None


from typing import Literal


class InvoiceUpdate(BaseModel):
    company_name: str | None = None
    invoice_number: str | None = None
    invoice_date: date | None = None
    currency: str | None = None
    subtotal: Decimal | None = None
    tax_amount: Decimal | None = None
    total_amount: Decimal | None = None

    approval_status: Literal["pending", "approved", "rejected"] | None = None