"""Build a hybrid phishing-email dataset for LSTM training.

Output columns:
- text
- label (0 legitimate, 1 phishing)

Optional metadata columns can be enabled with --with-metadata.
"""

from __future__ import annotations

import argparse
import random
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd


TRUSTED_DOMAINS = ["coursera.org", "google.com", "microsoft.com", "linkedin.com"]
SUSPICIOUS_DOMAINS = [
    "secure-verification-center.xyz",
    "account-check-now.ru",
    "banking-alerts.tk",
    "support-identity-verify.xyz",
    "password-review-center.ru",
    "security-validate-account.tk",
]

PHISHING_TEMPLATES = [
    "Your {brand} account has been suspended. {action} within {urgency_window}. Visit {link}",
    "We detected suspicious activity on your account. {action} now at {link}",
    "Security alert: unusual login attempt. {action} immediately: {link}",
    "Final warning from {brand}. To avoid service interruption, {action}: {link}",
    "Payment verification required. {action} to prevent account lock: {link}",
    "Your mailbox quota is full. {action} and restore access at {link}",
    "Compliance notice: identity confirmation required. {action} using {link}",
    "Action required: update your billing details. {action} through {link}",
]

LEGITIMATE_TEMPLATES = [
    "Hello team, meeting scheduled for {time_ref}. Please review agenda at {link}",
    "Please find the attached weekly report summary. Supporting docs are available at {link}",
    "Reminder: project sync is {time_ref}. Notes and calendar invite are at {link}",
    "Thanks for your update. I reviewed your draft and shared comments in the document at {link}",
    "Lunch plans for {time_ref}? Let me know your availability.",
    "Monthly newsletter: product updates, learning resources, and upcoming events at {link}",
    "Your training progress dashboard is available at {link}. Keep up the good work.",
    "Internal memo: operational metrics and status report are posted at {link}",
]

ACTION_VARIANTS = [
    "verify your identity",
    "confirm your profile",
    "validate your account",
    "review your credentials",
    "re-authenticate your account",
]

URGENCY_VARIANTS = ["15 minutes", "1 hour", "24 hours", "today", "immediately"]
TIME_REFS = ["3 PM tomorrow", "this afternoon", "next Monday", "today", "tomorrow morning"]
BRANDS = ["Microsoft", "Google", "LinkedIn", "Coursera", "Office365", "IT Helpdesk", "Banking Portal"]

SYNONYM_MAP: Dict[str, List[str]] = {
    "verify": ["confirm", "validate", "authenticate"],
    "account": ["profile", "account access", "member profile"],
    "urgent": ["important", "time-sensitive", "priority"],
    "suspended": ["restricted", "disabled", "locked"],
    "update": ["refresh", "revise", "amend"],
    "meeting": ["sync", "discussion", "session"],
    "report": ["summary", "brief", "update"],
    "please": ["kindly", "please", "request"],
}

CONTRACTION_MAP = {
    "do not": "don't",
    "cannot": "can't",
    "we are": "we're",
    "you are": "you're",
    "it is": "it's",
}

REVERSE_CONTRACTION_MAP = {v: k for k, v in CONTRACTION_MAP.items()}


@dataclass
class Sample:
    text: str
    label: int
    subject: str
    sender_type: str
    contains_link: int


def read_csv_with_fallback(path: Path, usecols: List[str] | None = None) -> pd.DataFrame:
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return pd.read_csv(path, encoding=encoding, on_bad_lines="skip", usecols=usecols)
        except UnicodeDecodeError:
            continue
        except ValueError:
            # usecols mismatch, try full load
            return pd.read_csv(path, encoding=encoding, on_bad_lines="skip")
    return pd.read_csv(path, on_bad_lines="skip")


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s([?.!,])", r"\1", text)
    return text.strip()


def contains_link(text: str) -> int:
    return 1 if re.search(r"https?://", text) else 0


def build_subject(text: str, label: int) -> str:
    if label == 1:
        options = [
            "security alert: action required",
            "account verification required",
            "urgent: suspicious activity detected",
            "final notice: verify now",
        ]
    else:
        options = [
            "team update",
            "project follow-up",
            "meeting reminder",
            "weekly report",
        ]
    return random.choice(options)


def random_trusted_link() -> str:
    domain = random.choice(TRUSTED_DOMAINS)
    suffix = random.choice(["/docs", "/learn", "/support", "/news", "/update", "/course"])
    return f"https://{domain}{suffix}"


def random_suspicious_link() -> str:
    domain = random.choice(SUSPICIOUS_DOMAINS)
    suffix = random.choice(["/verify", "/login", "/auth", "/review", "/security"])
    return f"https://{domain}{suffix}"


def synonym_replacement(text: str, probability: float = 0.18) -> str:
    words = text.split()
    replaced: List[str] = []
    for word in words:
        clean = re.sub(r"[^a-zA-Z0-9'-]", "", word.lower())
        if clean in SYNONYM_MAP and random.random() < probability:
            replacement = random.choice(SYNONYM_MAP[clean])
            replaced.append(replacement)
        else:
            replaced.append(word)
    return " ".join(replaced)


def sentence_shuffle(text: str) -> str:
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", text) if p.strip()]
    if len(parts) < 2:
        return text
    random.shuffle(parts)
    return " ".join(parts)


def minor_grammar_variation(text: str) -> str:
    updated = text
    if random.random() < 0.5:
        source_map = CONTRACTION_MAP if random.random() < 0.5 else REVERSE_CONTRACTION_MAP
        for src, dst in source_map.items():
            if src in updated and random.random() < 0.4:
                updated = updated.replace(src, dst)
    return updated


def augment_text(text: str) -> str:
    augmented = text
    if random.random() < 0.65:
        augmented = synonym_replacement(augmented)
    if random.random() < 0.3:
        augmented = sentence_shuffle(augmented)
    if random.random() < 0.35:
        augmented = minor_grammar_variation(augmented)
    return augmented


def build_email_from_url(url: str, label: int) -> Sample:
    if label == 1:
        action = random.choice(ACTION_VARIANTS)
        urgency = random.choice(URGENCY_VARIANTS)
        brand = random.choice(BRANDS)
        text = random.choice(PHISHING_TEMPLATES).format(
            action=action,
            urgency_window=urgency,
            brand=brand,
            link=url,
        )
        sender_type = random.choice(["external", "unknown", "spoofed"])
    else:
        text = random.choice(LEGITIMATE_TEMPLATES).format(
            time_ref=random.choice(TIME_REFS),
            link=url,
        )
        sender_type = random.choice(["internal", "partner", "trusted"])

    return Sample(
        text=normalize_text(text),
        label=label,
        subject=build_subject(text, label),
        sender_type=sender_type,
        contains_link=contains_link(text),
    )


def random_ref_code() -> str:
    return "".join(random.choices("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", k=8))


def generate_synthetic_phishing(n: int) -> List[Sample]:
    samples: List[Sample] = []
    for _ in range(n):
        text = random.choice(PHISHING_TEMPLATES).format(
            action=random.choice(ACTION_VARIANTS),
            urgency_window=random.choice(URGENCY_VARIANTS),
            brand=random.choice(BRANDS),
            link=random_suspicious_link(),
        )
        text = f"{text} Reference code: {random_ref_code()}."
        text = augment_text(text)
        samples.append(
            Sample(
                text=normalize_text(text),
                label=1,
                subject=build_subject(text, 1),
                sender_type=random.choice(["external", "unknown", "spoofed"]),
                contains_link=contains_link(text),
            )
        )
    return samples


def generate_synthetic_legitimate(n: int) -> List[Sample]:
    samples: List[Sample] = []
    for _ in range(n):
        text = random.choice(LEGITIMATE_TEMPLATES).format(
            time_ref=random.choice(TIME_REFS),
            link=random_trusted_link(),
        )
        text = f"{text} Ref id: {random_ref_code()}."
        text = augment_text(text)
        samples.append(
            Sample(
                text=normalize_text(text),
                label=0,
                subject=build_subject(text, 0),
                sender_type=random.choice(["internal", "partner", "trusted"]),
                contains_link=contains_link(text),
            )
        )
    return samples


def load_real_url_samples(data_dir: Path, max_phiusiil: int = 25000) -> Tuple[List[Sample], List[Sample]]:
    phishing_samples: List[Sample] = []
    legit_samples: List[Sample] = []

    phishing_urls_path = data_dir / "phishing_urls.csv"
    if phishing_urls_path.exists():
        df = read_csv_with_fallback(phishing_urls_path)
        url_col = "url" if "url" in df.columns else df.columns[0]
        label_col = "label" if "label" in df.columns else df.columns[-1]
        df = df[[url_col, label_col]].dropna()
        df.columns = ["url", "label"]
        for row in df.itertuples(index=False):
            label = int(row.label)
            sample = build_email_from_url(str(row.url), label)
            if label == 1:
                phishing_samples.append(sample)
            else:
                legit_samples.append(sample)

    balanced_path = data_dir / "balanced_urls.csv"
    if balanced_path.exists():
        df = read_csv_with_fallback(balanced_path)
        url_col = "url" if "url" in df.columns else df.columns[0]
        if "result" in df.columns:
            label_col = "result"
        elif "label" in df.columns:
            label_col = "label"
        else:
            label_col = df.columns[-1]
        df = df[[url_col, label_col]].dropna()
        df.columns = ["url", "label"]
        for row in df.itertuples(index=False):
            label_raw = str(row.label).strip().lower()
            label = 1 if label_raw in {"1", "phishing", "spam", "malicious"} else 0
            sample = build_email_from_url(str(row.url), label)
            if label == 1:
                phishing_samples.append(sample)
            else:
                legit_samples.append(sample)

    phiusiil_path = data_dir / "PhiUSIIL_Phishing_URL_Dataset.csv"
    if phiusiil_path.exists():
        df = read_csv_with_fallback(phiusiil_path, usecols=["URL", "label"])
        if "URL" not in df.columns:
            url_col = [c for c in df.columns if c.lower() == "url"]
            label_col = [c for c in df.columns if c.lower() == "label"]
            if not url_col or not label_col:
                df = pd.DataFrame(columns=["URL", "label"])
            else:
                df = df[[url_col[0], label_col[0]]]
                df.columns = ["URL", "label"]

        if not df.empty:
            df = df[["URL", "label"]].dropna()
            if len(df) > max_phiusiil:
                df = df.sample(n=max_phiusiil, random_state=42)

            for row in df.itertuples(index=False):
                label = int(row.label)
                sample = build_email_from_url(str(row.URL), label)
                if label == 1:
                    phishing_samples.append(sample)
                else:
                    legit_samples.append(sample)

    return phishing_samples, legit_samples


def dedupe_and_trim(samples: List[Sample], target_size: int) -> List[Sample]:
    unique: Dict[str, Sample] = {}
    for sample in samples:
        key = sample.text
        if key not in unique:
            unique[key] = sample

    deduped = list(unique.values())
    random.shuffle(deduped)
    return deduped[:target_size]


def build_hybrid_dataset(
    data_dir: Path,
    output_path: Path,
    final_size: int,
    phishing_ratio: float,
    with_metadata: bool,
) -> pd.DataFrame:
    target_phishing = int(final_size * phishing_ratio)
    target_legitimate = final_size - target_phishing

    real_phish, real_legit = load_real_url_samples(data_dir)

    # Reserve room for synthetic generation while ensuring real data contributes strongly.
    real_phish_target = min(len(real_phish), int(target_phishing * 0.35))
    real_legit_target = min(len(real_legit), int(target_legitimate * 0.35))

    random.shuffle(real_phish)
    random.shuffle(real_legit)

    phishing_samples = real_phish[:real_phish_target]
    legitimate_samples = real_legit[:real_legit_target]

    synthetic_phish_needed = max(10000, target_phishing - len(phishing_samples))
    synthetic_legit_needed = max(10000, target_legitimate - len(legitimate_samples))

    phishing_samples.extend(generate_synthetic_phishing(synthetic_phish_needed))
    legitimate_samples.extend(generate_synthetic_legitimate(synthetic_legit_needed))

    # Augment real samples for diversity.
    augmented_phish: List[Sample] = []
    augmented_legit: List[Sample] = []

    for sample in phishing_samples[: min(8000, len(phishing_samples))]:
        augmented_text = normalize_text(augment_text(sample.text))
        if augmented_text != sample.text:
            augmented_phish.append(
                Sample(
                    text=augmented_text,
                    label=1,
                    subject=sample.subject,
                    sender_type=sample.sender_type,
                    contains_link=contains_link(augmented_text),
                )
            )

    for sample in legitimate_samples[: min(8000, len(legitimate_samples))]:
        augmented_text = normalize_text(augment_text(sample.text))
        if augmented_text != sample.text:
            augmented_legit.append(
                Sample(
                    text=augmented_text,
                    label=0,
                    subject=sample.subject,
                    sender_type=sample.sender_type,
                    contains_link=contains_link(augmented_text),
                )
            )

    phishing_samples.extend(augmented_phish)
    legitimate_samples.extend(augmented_legit)

    phishing_samples = dedupe_and_trim(phishing_samples, target_phishing)
    legitimate_samples = dedupe_and_trim(legitimate_samples, target_legitimate)

    # If dedupe reduced size, top up. We cap attempts to guarantee completion.
    phish_attempts = 0
    while len(phishing_samples) < target_phishing and phish_attempts < 20:
        needed = target_phishing - len(phishing_samples)
        phishing_samples.extend(generate_synthetic_phishing(min(3000, needed)))
        phishing_samples = dedupe_and_trim(phishing_samples, target_phishing)
        phish_attempts += 1

    legit_attempts = 0
    while len(legitimate_samples) < target_legitimate and legit_attempts < 20:
        needed = target_legitimate - len(legitimate_samples)
        legitimate_samples.extend(generate_synthetic_legitimate(min(3000, needed)))
        legitimate_samples = dedupe_and_trim(legitimate_samples, target_legitimate)
        legit_attempts += 1

    # Final hard guarantee for exact size: allow repeated samples if needed.
    if len(phishing_samples) < target_phishing and phishing_samples:
        shortage = target_phishing - len(phishing_samples)
        phishing_samples.extend(random.choices(phishing_samples, k=shortage))
    if len(legitimate_samples) < target_legitimate and legitimate_samples:
        shortage = target_legitimate - len(legitimate_samples)
        legitimate_samples.extend(random.choices(legitimate_samples, k=shortage))

    phishing_samples = phishing_samples[:target_phishing]
    legitimate_samples = legitimate_samples[:target_legitimate]

    records = phishing_samples + legitimate_samples
    random.shuffle(records)

    rows = []
    for sample in records:
        row = {
            "text": sample.text,
            "label": sample.label,
        }
        if with_metadata:
            row.update(
                {
                    "subject": normalize_text(sample.subject),
                    "sender_type": sample.sender_type,
                    "contains_link": sample.contains_link,
                }
            )
        rows.append(row)

    dataset = pd.DataFrame(rows)
    dataset = dataset.drop_duplicates(subset=["text", "label"]).reset_index(drop=True)

    # Enforce final size exactly after dedupe by stratified trimming.
    phish_df = dataset[dataset["label"] == 1]
    legit_df = dataset[dataset["label"] == 0]

    if len(phish_df) > target_phishing:
        phish_df = phish_df.sample(n=target_phishing, random_state=42)
    if len(legit_df) > target_legitimate:
        legit_df = legit_df.sample(n=target_legitimate, random_state=42)

    dataset = pd.concat([phish_df, legit_df], ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(output_path, index=False)
    return dataset


def main() -> None:
    parser = argparse.ArgumentParser(description="Build hybrid phishing-email dataset")
    parser.add_argument("--data-dir", default="data", help="Directory containing source CSV files")
    parser.add_argument("--output", default="data/email_dataset.csv", help="Output CSV path")
    parser.add_argument("--size", type=int, default=60000, help="Final dataset size (50k-100k recommended)")
    parser.add_argument("--phishing-ratio", type=float, default=0.40, help="Phishing ratio (default 0.40)")
    parser.add_argument("--with-metadata", action="store_true", help="Include subject/sender_type/contains_link columns")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)

    data_dir = Path(args.data_dir)
    output_path = Path(args.output)

    if not data_dir.exists():
        raise FileNotFoundError(f"Data directory not found: {data_dir}")

    if args.size < 50000 or args.size > 100000:
        raise ValueError("Please choose --size between 50000 and 100000")

    dataset = build_hybrid_dataset(
        data_dir=data_dir,
        output_path=output_path,
        final_size=args.size,
        phishing_ratio=args.phishing_ratio,
        with_metadata=args.with_metadata,
    )

    counts = dataset["label"].value_counts().to_dict()
    phishing_count = counts.get(1, 0)
    legit_count = counts.get(0, 0)

    print("Hybrid dataset created successfully")
    print(f"output: {output_path}")
    print(f"rows: {len(dataset)}")
    print(f"phishing(1): {phishing_count}")
    print(f"legitimate(0): {legit_count}")
    print(f"phishing_ratio: {phishing_count / max(len(dataset), 1):.4f}")


if __name__ == "__main__":
    main()
