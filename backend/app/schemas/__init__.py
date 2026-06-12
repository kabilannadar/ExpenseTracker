from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union
from datetime import date as DateType, datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class FrequencyEnum(str, Enum):
    weekly = "weekly"
    monthly = "monthly"

class AuditActionEnum(str, Enum):
    added = "added"
    edited = "edited"
    deleted = "deleted"

class IncomeSourceEnum(str, Enum):
    salary = "salary"
    freelancing = "freelancing"
    gifts = "gifts"
    cable = "cable"
    other = "other"


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    currency: str
    timezone: str
    dark_mode: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    dark_mode: Optional[bool] = None


# ─── Category ─────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"
    icon: Optional[str] = "tag"

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryOut(BaseModel):
    id: int
    name: str
    color: str
    icon: str
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Expense ──────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    title: str
    amount: float
    date: DateType
    category_id: Optional[int] = None
    payment_method: Optional[str] = "cash"
    note: Optional[str] = None

class ExpenseUpdate(BaseModel):
    title: Union[str, None] = None
    amount: Union[float, None] = None
    date: Union[DateType, None] = None
    category_id: Union[int, None] = None
    payment_method: Union[str, None] = None
    note: Union[str, None] = None

class ExpenseOut(BaseModel):
    id: int
    title: str
    amount: float
    date: DateType
    payment_method: str
    note: Optional[str]
    attachment_path: Optional[str]
    category_id: Optional[int]
    category: Optional[CategoryOut]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Income ───────────────────────────────────────────────────────────────────

class IncomeCreate(BaseModel):
    source: IncomeSourceEnum
    amount: float
    date: DateType
    payment_method: Optional[str] = "cash"
    note: Optional[str] = None

class IncomeUpdate(BaseModel):
    source: Optional[IncomeSourceEnum] = None
    amount: Optional[float] = None
    date: Union[DateType, None] = None
    payment_method: Optional[str] = None
    note: Optional[str] = None

class IncomeOut(BaseModel):
    id: int
    source: IncomeSourceEnum
    amount: float
    date: DateType
    payment_method: str
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Budget ───────────────────────────────────────────────────────────────────

class BudgetCreate(BaseModel):
    category_id: Optional[int] = None
    monthly_limit: Optional[float] = None
    weekly_limit: Optional[float] = None

class BudgetUpdate(BaseModel):
    monthly_limit: Optional[float] = None
    weekly_limit: Optional[float] = None

class BudgetOut(BaseModel):
    id: int
    category_id: Optional[int]
    category: Optional[CategoryOut]
    monthly_limit: Optional[float]
    weekly_limit: Optional[float]
    monthly_spent: Optional[float] = 0.0
    weekly_spent: Optional[float] = 0.0

    class Config:
        from_attributes = True


# ─── Reminder ─────────────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    title: str
    remind_at: datetime
    category_id: Optional[int] = None
    note: Optional[str] = None
    description: Optional[str] = None

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    remind_at: Optional[datetime] = None
    category_id: Optional[int] = None
    note: Optional[str] = None
    description: Optional[str] = None
    is_done: Optional[bool] = None

class ReminderOut(BaseModel):
    id: int
    title: str
    remind_at: datetime
    category_id: Optional[int]
    category: Optional[CategoryOut]
    note: Optional[str]
    description: Optional[str]
    is_done: bool

    class Config:
        from_attributes = True


# ─── Recurring Transaction ────────────────────────────────────────────────────

class RecurringCreate(BaseModel):
    title: str
    amount: float
    frequency: FrequencyEnum
    next_due: DateType
    category_id: Optional[int] = None

class RecurringUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[FrequencyEnum] = None
    next_due: Union[DateType, None] = None
    is_active: Optional[bool] = None

class RecurringOut(BaseModel):
    id: int
    title: str
    amount: float
    frequency: FrequencyEnum
    next_due: DateType
    is_active: bool
    category_id: Optional[int]
    category: Optional[CategoryOut]

    class Config:
        from_attributes = True


# ─── Subscription ─────────────────────────────────────────────────────────────

class SubscriptionCreate(BaseModel):
    name: str
    amount: float
    start_date: DateType
    end_date: Union[DateType, None] = None
    sub_type: Optional[str] = None
    features: Optional[str] = None

class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    start_date: Union[DateType, None] = None
    end_date: Union[DateType, None] = None
    sub_type: Optional[str] = None
    features: Optional[str] = None
    is_active: Optional[bool] = None

class SubscriptionOut(BaseModel):
    id: int
    name: str
    amount: float
    start_date: DateType
    end_date: Optional[DateType]
    sub_type: Optional[str]
    features: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


# ─── Goal ─────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    title: str
    target_amount: float
    saved_amount: Optional[float] = 0.0
    deadline: Union[DateType, None] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = None
    saved_amount: Optional[float] = None
    deadline: Union[DateType, None] = None

class GoalOut(BaseModel):
    id: int
    title: str
    target_amount: float
    saved_amount: float
    deadline: Optional[DateType]
    progress: Optional[float] = None

    class Config:
        from_attributes = True


# ─── Audit Log ────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: int
    action: AuditActionEnum
    entity_type: str
    entity_id: Optional[int]
    detail: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


# ─── Analytics ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_expenses_month: float
    total_income_month: float
    net_savings: float
    weekly_expenses: float
    monthly_budget: Optional[float]
    budget_remaining: Optional[float]
    global_budget_spent: Optional[float] = 0.0
    total_expense_over_budget: float = 0.0
    spending_streak: int
    largest_expense: Optional[float]
    top_categories: List[dict]
    recent_expenses: List[ExpenseOut]
    monthly_trend: List[dict]
    category_breakdown: List[dict]



# ─── EMI ──────────────────────────────────────────────────────────────────────

class EMICreate(BaseModel):
    title: str
    loan_type: str
    loan_platform: Optional[str] = None
    principal_amount: float
    interest_rate: float
    emi_amount: float
    start_date: DateType
    end_date: DateType
    total_tenure: int
    remaining_months: int
    payment_due_date: DateType
    payment_method: Optional[str] = "bank transfer"
    notes: Optional[str] = None

class EMIUpdate(BaseModel):
    title: Optional[str] = None
    loan_type: Optional[str] = None
    loan_platform: Optional[str] = None
    principal_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    emi_amount: Optional[float] = None
    start_date: Optional[DateType] = None
    end_date: Optional[DateType] = None
    total_tenure: Optional[int] = None
    remaining_months: Optional[int] = None
    payment_due_date: Optional[DateType] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class EMIOut(BaseModel):
    id: int
    title: str
    loan_type: str
    loan_platform: Optional[str] = None
    principal_amount: float
    interest_rate: float
    emi_amount: float
    start_date: DateType
    end_date: DateType
    total_tenure: int
    remaining_months: int
    payment_due_date: DateType
    payment_method: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Debt ─────────────────────────────────────────────────────────────────────

class DebtCreate(BaseModel):
    creditor: str
    amount: float
    remaining_amount: float
    interest_rate: Optional[float] = 0.0
    due_date: Union[DateType, None] = None
    min_payment: Optional[float] = 0.0
    notes: Optional[str] = None
    is_paid: Optional[bool] = False

class DebtUpdate(BaseModel):
    creditor: Optional[str] = None
    amount: Optional[float] = None
    remaining_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    due_date: Union[DateType, None] = None
    min_payment: Optional[float] = None
    notes: Optional[str] = None
    is_paid: Optional[bool] = None

class DebtOut(BaseModel):
    id: int
    creditor: str
    amount: float
    remaining_amount: float
    interest_rate: float
    due_date: Optional[DateType]
    min_payment: float
    notes: Optional[str]
    is_paid: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Savings ──────────────────────────────────────────────────────────────────

class SavingCreate(BaseModel):
    title: str
    amount: float
    type: Optional[str] = "credit"
    date: DateType
    notes: Optional[str] = None

class SavingUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[str] = None
    date: Union[DateType, None] = None
    notes: Optional[str] = None

class SavingOut(BaseModel):
    id: int
    title: str
    amount: float
    type: str
    date: DateType
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

