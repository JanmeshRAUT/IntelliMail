import argparse
import random
import re

import pandas as pd


FIRST_NAMES = [
    "John", "Alice", "Ravi", "Priya", "David", "Ankit", "Sara", "Liam", "Noah", "Aisha",
    "Mateo", "Emma", "Olivia", "Lucas", "Sophia", "Ethan", "Amelia", "Maya", "Arjun", "Nina",
]

SIGNATURES = [
    "Thanks,\nSupport Team",
    "Best regards,\nIT Security Desk",
    "Warm regards,\nCustomer Success",
    "Regards,\nOperations Team",
    "Sincerely,\nAccount Services",
    "Thank you,\nHelp Center",
]

SAFE_LINKS = [
    "https://portal.company.com/dashboard",
    "https://www.amazon.com/orders",
    "https://mail.google.com",
    "https://learn.coursera.org",
    "https://status.microsoft.com",
    "https://www.linkedin.com/feed",
]

FAKE_LINKS = [
    "http://secure-account-verify-now.xyz/login",
    "http://update-banking-alerts.tk/verify",
    "http://microsoft-security-center.ru/auth",
    "http://sign-in-review-mail.cf/reset",
    "http://wallet-checkpoint.gq/confirm",
    "http://support-lock-warning.ga/recover",
]

GREETINGS_FORMAL = ["Dear {name},", "Hello {name},", "Hi {name},", "Good day {name},"]
GREETINGS_CASUAL = ["Hey {name},", "Hi {name},", "Hello,", "Hey team,"]
GREETINGS_URGENT = ["Attention {name},", "Urgent notice,", "Immediate action required,", "Security alert, {name},"]

LEGIT_WORK_BODIES = [
    "Please review the weekly report before our meeting at {time_ref}. I added key updates on milestones and blockers.",
    "Sharing the final draft for client delivery. Let me know if any section needs edits before EOD.",
    "Reminder that the project sync is {time_ref}. Please check the agenda and bring your status notes.",
    "I attached the monthly metrics summary with comments on performance trends and budget impact.",
]

LEGIT_ECOM_BODIES = [
    "Your order {order_id} has shipped and is expected by {delivery_day}. You can track it using the link below.",
    "We packed your items and generated invoice {order_id}. Delivery updates will be available in your account.",
    "Thanks for shopping with us. Your package is in transit and should arrive around {delivery_day}.",
    "Your return request for order {order_id} was approved. Refund processing usually takes 3-5 business days.",
]

LEGIT_PERSONAL_BODIES = [
    "Just checking in to see if you are free this weekend. We can catch up over coffee if that works.",
    "I sent you the photos from yesterday. Let me know which ones you want me to print.",
    "Quick note: I might be late by 15 minutes. Please start without me if needed.",
    "Thanks again for helping with the move. Really appreciate your time and support.",
]

LEGIT_NOTIFICATION_BODIES = [
    "This is a system reminder that your calendar event starts at {time_ref}.",
    "Your backup completed successfully. No action is required at this time.",
    "Maintenance is scheduled for tonight. Some features may be briefly unavailable.",
    "Your password was changed successfully. If this was not you, contact support immediately.",
]

PHISH_VERIFY_BODIES = [
    "We detected unusual sign-in activity and temporarily restricted your access. Please verify your account using {link}.",
    "Your profile is pending verification. Kindly confirm your identity now to avoid suspension: {link}",
    "Compliance check failed for your account. Complete verification within {window} here: {link}",
]

PHISH_RESET_BODIES = [
    "A password reset request was received from a new device. If this was not you, secure your account at {link}.",
    "Your password expires today. Reset now using this secure portal: {link}",
    "We could not validate your credentials. Re-enter your password immediately at {link}",
]

PHISH_BANKING_BODIES = [
    "Your banking profile has a critical alert. Confirm your details to prevent account freeze: {link}",
    "A transaction was flagged for review. Verify billing information now at {link}",
    "Your card access is limited for security reasons. Restore full access by confirming data at {link}",
]

PHISH_SOCIAL_BODIES = [
    "Your mailbox quota is full and incoming messages may bounce. Upgrade access instantly at {link}",
    "The shared document from your manager requires re-authentication. Continue here: {link}",
    "Your payroll update is incomplete. Kindly submit credentials to avoid delayed salary: {link}",
]

SUSPICIOUS_SENTENCES = [
    "Also, to keep your account active, verify your details here: {link}",
    "Please reconfirm your password immediately at {link}",
    "One more step is required: validate your login through {link}",
]

FILLER_WORDS = ["please", "kindly", "just", "quickly", "immediately", "basically"]

TYPO_MAP = {
    "account": "accunt",
    "verify": "verfy",
    "password": "passwrod",
    "security": "securty",
    "information": "infromation",
    "update": "upadte",
    "details": "detials",
}


def random_time_ref() -> str:
    return random.choice(["today 3 PM", "tomorrow morning", "this afternoon", "next Monday", "tonight"])


def random_delivery_day() -> str:
    return random.choice(["Tuesday", "Wednesday", "Friday", "next week", "within 2 days"])


def random_window() -> str:
    return random.choice(["15 minutes", "1 hour", "24 hours", "today"])


def random_order_id() -> str:
    return f"ODR-{random.randint(100000, 999999)}"


def apply_noise(text: str) -> str:
    for source, typo in TYPO_MAP.items():
        if random.random() < 0.08:
            text = re.sub(rf"\b{source}\b", typo, text, count=1, flags=re.IGNORECASE)

    if random.random() < 0.25:
        text = text.replace(",", ",  ", 1)
    if random.random() < 0.25:
        text = text.replace(". ", ".   ")

    if random.random() < 0.35:
        words = text.split()
        if words:
            pos = random.randint(1, max(1, len(words) - 1))
            words.insert(pos, random.choice(FILLER_WORDS))
            text = " ".join(words)

    if random.random() < 0.2:
        text = text.replace("we are", "we're").replace("do not", "don't")

    return text


def build_legitimate_email(name: str) -> str:
    greeting = random.choice(GREETINGS_FORMAL + GREETINGS_CASUAL).format(name=name)
    category = random.choice(["work", "ecommerce", "personal", "notification"])

    if category == "work":
        body = random.choice(LEGIT_WORK_BODIES).format(time_ref=random_time_ref())
    elif category == "ecommerce":
        body = random.choice(LEGIT_ECOM_BODIES).format(order_id=random_order_id(), delivery_day=random_delivery_day())
    elif category == "personal":
        body = random.choice(LEGIT_PERSONAL_BODIES)
    else:
        body = random.choice(LEGIT_NOTIFICATION_BODIES).format(time_ref=random_time_ref())

    extra_lines = []
    if random.random() < 0.45:
        extra_lines.append(f"You can check details here: {random.choice(SAFE_LINKS)}")
    if random.random() < 0.25:
        extra_lines.append(f"Timestamp: 2026-04-{random.randint(1, 28):02d} {random.randint(0, 23):02d}:{random.randint(0, 59):02d}")

    if random.random() < 0.14:
        extra_lines.append(random.choice(SUSPICIOUS_SENTENCES).format(link=random.choice(FAKE_LINKS)))

    paragraphs = [greeting, body]
    # Produce occasional multi-paragraph messages.
    if random.random() < 0.35 and extra_lines:
        paragraphs.append("\n".join(extra_lines))
    elif extra_lines:
        paragraphs.extend(extra_lines)

    paragraphs.append(random.choice(SIGNATURES))
    return "\n\n".join(paragraphs)


def build_phishing_email(name: str) -> str:
    greeting = random.choice(GREETINGS_URGENT + GREETINGS_FORMAL).format(name=name)
    phish_type = random.choice(["verify", "reset", "banking", "social"])

    if phish_type == "verify":
        body = random.choice(PHISH_VERIFY_BODIES).format(link=random.choice(FAKE_LINKS), window=random_window())
    elif phish_type == "reset":
        body = random.choice(PHISH_RESET_BODIES).format(link=random.choice(FAKE_LINKS))
    elif phish_type == "banking":
        body = random.choice(PHISH_BANKING_BODIES).format(link=random.choice(FAKE_LINKS))
    else:
        body = random.choice(PHISH_SOCIAL_BODIES).format(link=random.choice(FAKE_LINKS))

    legit_sentence = random.choice([
        "Please also review the attached weekly report before end of day.",
        "Let us know if you need help with your project timeline.",
        "Your recent order summary is available in your dashboard.",
    ])

    paragraphs = [greeting, body]
    if random.random() < 0.4:
        paragraphs.append(legit_sentence)
    if random.random() < 0.5:
        paragraphs.append(f"Secure link: {random.choice(FAKE_LINKS)}")
    if random.random() < 0.25:
        paragraphs.append(f"Reference ID: SEC-{random.randint(10000, 99999)}")

    paragraphs.append(random.choice(SIGNATURES))
    return "\n\n".join(paragraphs)


def generate_dataset(total_rows: int = 60000, legit_ratio: float = 0.6, seed: int = 42) -> pd.DataFrame:
    random.seed(seed)

    legit_count = int(total_rows * legit_ratio)
    phish_count = total_rows - legit_count

    legit_rows = set()
    phish_rows = set()

    while len(legit_rows) < legit_count:
        name = random.choice(FIRST_NAMES)
        email = apply_noise(build_legitimate_email(name))
        legit_rows.add(email)

    while len(phish_rows) < phish_count:
        name = random.choice(FIRST_NAMES)
        email = apply_noise(build_phishing_email(name))
        phish_rows.add(email)

    rows = [(text, 0) for text in legit_rows] + [(text, 1) for text in phish_rows]
    random.shuffle(rows)
    return pd.DataFrame(rows, columns=["text", "label"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate realistic phishing email dataset")
    parser.add_argument("--rows", type=int, default=60000, help="Total number of rows (>= 60000 recommended)")
    parser.add_argument("--legit-ratio", type=float, default=0.6, help="Legitimate email ratio")
    parser.add_argument("--output", default="data/realistic_email_dataset.csv", help="Output CSV file")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    if args.rows < 60000:
        raise ValueError("rows must be >= 60000")

    df = generate_dataset(total_rows=args.rows, legit_ratio=args.legit_ratio, seed=args.seed)
    df.to_csv(args.output, index=False)

    counts = df["label"].value_counts().to_dict()
    print(f"Dataset created: {df.shape}")
    print(f"Saved to: {args.output}")
    print(f"Label distribution: {counts}")


if __name__ == "__main__":
    main()
