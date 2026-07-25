"""
Telegram message parser for ExpenseTracker.

Parses natural-language statement messages into structured data.

Rules:
1) Syntax: <type?> <title> <amount (decimals allowed)> <payment_mode?> <note?>
2) Default type: "expense"
3) Keywords to switch statement type:
   - "income" / "inc"
   - "emi" / "emis"
   - "debt" / "debts" / "loan"
   - "goal" / "goals" / "saving"
   - "sub" / "subscription" / "subs"
   - "remind" / "reminder"
   - "cat" / "category"
   - "budget" / "budgets"
   - "recurring" / "recur" / "repeat"
"""

import re
from datetime import date, timedelta, datetime
from typing import Optional

PAYMENT_KEYWORDS = {
    "upi": "upi",
    "gpay": "upi",
    "phonepe": "upi",
    "paytm": "upi",
    "cash": "cash",
    "card": "card",
    "debit": "card",
    "credit": "card",
    "bank": "bank",
    "netbanking": "netbanking",
    "net banking": "netbanking",
    "neft": "netbanking",
    "imps": "netbanking",
    "rtgs": "netbanking",
    "wallet": "wallet",
    "online": "online",
    "cheque": "cheque",
}

DATE_KEYWORDS = {
    "today": 0,
    "yesterday": -1,
    "day before yesterday": -2,
    "tomorrow": 1,
}

NOISE_WORDS = {
    "spent", "spend", "paid", "pay", "add", "added", "bought", "for", "on", "rs", "inr", "₹", "rupees", "rupee",
}

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "food": ["food", "eat", "lunch", "dinner", "breakfast", "meal", "biryani",
             "pizza", "burger", "snack", "restaurant", "cafe", "swiggy",
             "zomato", "dine", "tiffin", "coffee", "tea", "drink", "drinks"],
    "transport": ["transport", "cab", "uber", "ola", "auto", "bus", "train",
                  "metro", "petrol", "fuel", "diesel", "bike", "taxi", "rapido",
                  "travel", "commute", "flight", "ticket"],
    "groceries": ["grocery", "groceries", "vegetables", "fruits", "milk",
                  "supermarket", "mart", "store", "kirana", "bazar", "market",
                  "reliance", "dmart", "bigbasket"],
    "entertainment": ["entertainment", "movie", "netflix", "amazon", "hotstar",
                      "prime", "spotify", "music", "game", "gaming", "ott",
                      "subscription", "theatre", "cinema"],
    "health": ["health", "medicine", "medical", "doctor", "hospital", "pharmacy",
               "chemist", "clinic", "apollo", "tablet", "pill", "drug"],
    "shopping": ["shopping", "clothes", "shirt", "shoes", "dress", "amazon",
                 "flipkart", "myntra", "fashion", "outfit", "wear"],
    "utilities": ["electricity", "bill", "water", "gas", "wifi", "internet",
                  "phone", "recharge", "mobile", "broadband", "jio", "airtel"],
    "education": ["education", "school", "college", "course", "book", "fee",
                  "tuition", "udemy", "online course"],
    "rent": ["rent", "house", "apartment", "pg", "hostel", "accommodation"],
    "salary": ["salary", "income", "freelance", "payment received"],
}


class ParsedStatement:
    def __init__(
        self,
        statement_type: str,  # 'expense', 'income', 'emi', 'debt', 'goal', 'subscription', 'reminder', 'category', 'budget', 'recurring'
        title: str,
        amount: float,
        payment_method: str,
        date_val: date,
        suggested_category: Optional[str] = None,
        note: Optional[str] = None,
    ):
        self.statement_type = statement_type
        self.title = title
        self.amount = amount
        self.payment_method = payment_method
        self.date = date_val
        self.suggested_category = suggested_category
        self.note = note

    def __repr__(self):
        return (
            f"ParsedStatement(type='{self.statement_type}', title='{self.title}', "
            f"amount={self.amount}, method='{self.payment_method}', "
            f"date={self.date}, category='{self.suggested_category}', note='{self.note}')"
        )


def clean_title(title_raw: str, default_fallback: str = "Expense") -> str:
    words = title_raw.strip().split()
    cleaned = [w for w in words if w.lower() not in NOISE_WORDS]
    result = " ".join(cleaned).strip()
    return result.capitalize() if result else default_fallback


def parse_date_pattern(text: str) -> Optional[date]:
    match = re.search(r"\b(\d{4})[-/](\d{2})[-/](\d{2})\b", text)
    if match:
        try:
            return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        except ValueError:
            pass

    match = re.search(r"\b(\d{2})[-/](\d{2})[-/](\d{4})\b", text)
    if match:
        try:
            return date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
        except ValueError:
            pass

    return None


def parse_expense_message(body: str) -> Optional[ParsedStatement]:
    """
    Parses statement text following rule:
    <type?> <title> <amount> <payment_mode?> <note?>
    """
    text = body.strip()
    if not text:
        return None

    # 1. Determine statement type
    words = text.split()
    first_word_lower = words[0].lower() if words else ""
    statement_type = "expense"

    if first_word_lower in {"income", "inc", "incomes"}:
        statement_type = "income"
        text = " ".join(words[1:]).strip()
    elif first_word_lower in {"emi", "emis"}:
        statement_type = "emi"
        text = " ".join(words[1:]).strip()
    elif first_word_lower in {"debt", "debts", "borrowed", "loan"}:
        statement_type = "debt"
        text = " ".join(words[1:]).strip()
    elif first_word_lower in {"goal", "goals", "saving", "savings", "target"}:
        statement_type = "goal"
        text = " ".join(words[1:]).strip()
    elif first_word_lower in {"sub", "subs", "subscription", "subscriptions"}:
        statement_type = "subscription"
        text = " ".join(words[1:]).strip()
    elif first_word_lower in {"remind", "reminder", "reminders"}:
        statement_type = "reminder"
        text = " ".join(words[1:]).strip()
    elif first_word_lower in {"cat", "category", "categories"}:
        statement_type = "category"
        text = " ".join(words[1:]).strip()
    elif first_word_lower in {"budget", "budgets"}:
        statement_type = "budget"
        text = " ".join(words[1:]).strip()
    elif first_word_lower in {"recurring", "recur", "repeat"}:
        statement_type = "recurring"
        text = " ".join(words[1:]).strip()
    elif first_word_lower in {"expense", "exp", "expenses"}:
        statement_type = "expense"
        text = " ".join(words[1:]).strip()

    if not text:
        return None

    # Handle Category creation special syntax (e.g. category Medical #ef4444 cross)
    if statement_type == "category":
        cat_words = text.split()
        cat_name = cat_words[0].capitalize()
        color = "#6366f1"
        icon = "tag"
        if len(cat_words) > 1:
            if cat_words[1].startswith("#") or len(cat_words[1]) in (6, 7):
                color = cat_words[1]
                if len(cat_words) > 2:
                    icon = cat_words[2]
            else:
                icon = cat_words[1]
        return ParsedStatement(
            statement_type="category",
            title=cat_name,
            amount=0.0,
            payment_method=color,
            date_val=date.today(),
            note=icon
        )

    # 2. Extract Amount (Decimals allowed: e.g. 150, 150.50, ₹150.50, Rs.1000)
    amount_match = re.search(r"(?:rs\.?|₹|inr)?\s*([\d,]+(?:\.\d{1,2})?)", text, re.IGNORECASE)
    if not amount_match:
        return None

    raw_amount = amount_match.group(1).replace(",", "")
    try:
        amount = float(raw_amount)
    except ValueError:
        return None

    # Split text into before_amount (title) and after_amount (payment_mode, date, note)
    start_idx = amount_match.start()
    end_idx = amount_match.end()

    before_amount = text[:start_idx].strip()
    after_amount = text[end_idx:].strip()

    # 3. Clean Title
    title = clean_title(before_amount, default_fallback=statement_type.title())

    # 4. Extract Frequency for Recurring Expenses (weekly/monthly)
    frequency_str = "monthly"
    if statement_type == "recurring":
        if re.search(r"\bweekly\b", text, re.IGNORECASE):
            frequency_str = "weekly"
            after_amount = re.sub(r"\bweekly\b", "", after_amount, count=1, flags=re.IGNORECASE).strip()
        elif re.search(r"\bmonthly\b", text, re.IGNORECASE):
            frequency_str = "monthly"
            after_amount = re.sub(r"\bmonthly\b", "", after_amount, count=1, flags=re.IGNORECASE).strip()

    # 5. Extract Date from after_amount or body
    statement_date = date.today()
    custom_date = parse_date_pattern(body)
    if custom_date:
        statement_date = custom_date
        after_amount = re.sub(r"\b\d{2,4}[-/]\d{2}[-/]\d{2,4}\b", "", after_amount, count=1).strip()
    else:
        for kw, offset in DATE_KEYWORDS.items():
            if re.search(rf"\b{re.escape(kw)}\b", after_amount, re.IGNORECASE):
                statement_date = date.today() + timedelta(days=offset)
                after_amount = re.sub(rf"\b{re.escape(kw)}\b", "", after_amount, count=1, flags=re.IGNORECASE).strip()
                break

    # 6. Extract Payment Method from after_amount
    payment_method = frequency_str if statement_type == "recurring" else "cash"
    after_words = after_amount.split()

    if after_words and statement_type != "recurring":
        first_token = after_words[0].lower()
        if first_token in PAYMENT_KEYWORDS:
            payment_method = PAYMENT_KEYWORDS[first_token]
            after_amount = " ".join(after_words[1:]).strip()
        else:
            for kw, val in PAYMENT_KEYWORDS.items():
                if re.search(rf"^\b{re.escape(kw)}\b", after_amount, re.IGNORECASE):
                    payment_method = val
                    after_amount = re.sub(rf"^\b{re.escape(kw)}\b", "", after_amount, count=1, flags=re.IGNORECASE).strip()
                    break

    # 7. Extract Note
    note = None
    if after_amount:
        after_amount = re.sub(r"^(?:note|desc|info):\s*", "", after_amount, flags=re.IGNORECASE).strip()
        if after_amount:
            note = after_amount

    # 8. Category Suggestion (for Expenses and Recurring)
    suggested_category = None
    full_text_lower = body.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        found = False
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", full_text_lower):
                suggested_category = cat
                found = True
                break
        if found:
            break

    return ParsedStatement(
        statement_type=statement_type,
        title=title,
        amount=amount,
        payment_method=payment_method,
        date_val=statement_date,
        suggested_category=suggested_category,
        note=note,
    )


def format_help_message() -> str:
    return (
        "💡 *How to log statements:*\n\n"
        "Format: `<type?> <title> <amount> <payment mode?> <note?>`\n\n"
        "1️⃣ *Expense (Default):*\n"
        "• `Pizza 150.50 upi for lunch`\n"
        "• `Coffee 80 cash`\n\n"
        "2️⃣ *Income:* (Prefix: `income` or `inc`)\n"
        "• `income Salary 50000 bank April salary`\n\n"
        "3️⃣ *Category:* (Prefix: `category` or `cat`)\n"
        "• `category Medical #ef4444 cross`\n\n"
        "4️⃣ *Budget:* (Prefix: `budget`)\n"
        "• `budget Food 5000` or `budget 25000`\n\n"
        "5️⃣ *Recurring:* (Prefix: `recurring` or `recur`)\n"
        "• `recurring Rent 15000 monthly bank house rent`\n\n"
        "6️⃣ *Goal:* (Prefix: `goal` or `saving`)\n"
        "• `goal Buy iPhone 120000 upi saving for work`\n\n"
        "7️⃣ *Subscription:* (Prefix: `sub` or `subscription`)\n"
        "• `sub Netflix 649 card monthly plan`\n\n"
        "8️⃣ *EMI:* (Prefix: `emi`)\n"
        "• `emi Car Loan 8500.75 netbanking monthly installment`\n\n"
        "9️⃣ *Debt:* (Prefix: `debt`)\n"
        "• `debt John 2000 cash borrowed for trip`\n\n"
        "🔟 *Reminder:* (Prefix: `remind`)\n"
        "• `remind Pay Electricity 1450 tomorrow`\n"
    )
