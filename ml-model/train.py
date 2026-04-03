"""Training script for phishing URL detection model."""

from __future__ import annotations

import argparse
import os

import pandas as pd
import matplotlib.pyplot as plt

from model import PhishingURLModel


def _read_csv_with_fallback(path: str) -> pd.DataFrame:
    for encoding in ("utf-8", "latin-1", "cp1252"):
        try:
            return pd.read_csv(path, encoding=encoding, on_bad_lines="skip")
        except UnicodeDecodeError:
            continue
        except pd.errors.ParserError:
            try:
                return pd.read_csv(path, encoding=encoding, on_bad_lines="skip", engine="python")
            except pd.errors.ParserError:
                continue
    return pd.read_csv(path, on_bad_lines="skip", engine="python")


def _find_column(df: pd.DataFrame, candidates: list[str], fallback_index: int) -> str:
    for col in candidates:
        if col in df.columns:
            return col
    return df.columns[fallback_index]


def _normalize_labels(series: pd.Series) -> pd.Series:
    mapped = series.astype(str).str.strip().str.lower().map(
        {
            "0": 0,
            "1": 1,
            "benign": 0,
            "legitimate": 0,
            "safe": 0,
            "phishing": 1,
            "malicious": 1,
        }
    )
    numeric = pd.to_numeric(series, errors="coerce")
    mapped = mapped.fillna(numeric)
    cleaned = mapped.dropna().astype(int)
    cleaned = cleaned[cleaned.isin([0, 1])]
    return cleaned


def load_training_dataframe(primary_csv: str, balancing_csv: str | None = None, use_balancing: bool = False) -> pd.DataFrame:
    primary_df = _read_csv_with_fallback(primary_csv)
    primary_url_col = _find_column(primary_df, ["URL", "url", "Url", "link"], 1 if len(primary_df.columns) > 1 else 0)
    primary_label_col = _find_column(primary_df, ["label", "Label", "result", "Result"], -1)

    primary = pd.DataFrame(
        {
            "url": primary_df[primary_url_col].astype(str),
            "label": _normalize_labels(primary_df[primary_label_col]),
        }
    ).dropna()

    datasets = [primary]

    if use_balancing and balancing_csv and os.path.exists(balancing_csv):
        balancing_df = _read_csv_with_fallback(balancing_csv)
        balance_url_col = _find_column(balancing_df, ["url", "URL", "Url", "link"], 0)
        balance_label_col = _find_column(balancing_df, ["result", "label", "Label"], -1)

        balanced = pd.DataFrame(
            {
                "url": balancing_df[balance_url_col].astype(str),
                "label": _normalize_labels(balancing_df[balance_label_col]),
            }
        ).dropna()
        datasets.append(balanced)

    combined = pd.concat(datasets, ignore_index=True).drop_duplicates(subset=["url"])
    combined = combined[combined["label"].isin([0, 1])]
    return combined


def main() -> None:
    parser = argparse.ArgumentParser(description="Train phishing URL detection model")
    parser.add_argument("--primary-data", default="data/PhiUSIIL_Phishing_URL_Dataset.csv")
    parser.add_argument("--balancing-data", default="data/balanced_urls.csv")
    parser.add_argument("--use-balancing", action="store_true")
    parser.add_argument("--output", default="artifacts/models/phishing_url_model.pkl")
    args = parser.parse_args()

    if not os.path.exists(args.primary_data):
        raise FileNotFoundError(f"Primary dataset not found: {args.primary_data}")

    print("Initializing Phishing URL Detection Model...")
    model = PhishingURLModel(n_estimators=100)

    print(f"Loading primary dataset: {args.primary_data}")
    if args.use_balancing:
        print(f"Balancing dataset enabled: {args.balancing_data}")

    output_dir = os.path.dirname(args.output)
    graphs_dir = os.path.join(os.path.dirname(output_dir), "graphs") if output_dir else "artifacts/graphs"
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(graphs_dir, exist_ok=True)

    dataset_df = load_training_dataframe(
        primary_csv=args.primary_data,
        balancing_csv=args.balancing_data,
        use_balancing=args.use_balancing,
    )

    temp_training_csv = "_training_input.csv"
    dataset_df.to_csv(temp_training_csv, index=False)

    try:
        X, y = model.prepare_training_data(temp_training_csv)
        metrics = model.train(X, y, test_size=0.2)

        print("\n=== Evaluation ===")
        print(f"Accuracy:  {metrics['test_accuracy']:.4f}")
        print(f"Precision: {metrics['precision']:.4f}")
        print(f"Recall:    {metrics['recall']:.4f}")
        print(f"Confusion Matrix: {metrics['confusion_matrix']}")

        print(f"\nSaving model to {args.output}...")
        model.save(args.output)

        confusion = metrics["confusion_matrix"]
        fig, ax = plt.subplots(figsize=(6, 5))
        image = ax.imshow(confusion, cmap="Blues")
        ax.set_title("Confusion Matrix")
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        ax.set_xticks([0, 1], ["Legitimate", "Phishing"])
        ax.set_yticks([0, 1], ["Legitimate", "Phishing"])

        for row_index in range(2):
            for col_index in range(2):
                ax.text(col_index, row_index, confusion[row_index][col_index], ha="center", va="center", color="black")

        fig.colorbar(image, ax=ax, fraction=0.046, pad=0.04)
        confusion_path = os.path.join(graphs_dir, "confusion_matrix.png")
        fig.tight_layout()
        fig.savefig(confusion_path, dpi=200)
        plt.close(fig)

        feature_names = model.feature_names
        feature_importances = model.model.feature_importances_
        feature_pairs = sorted(zip(feature_names, feature_importances), key=lambda item: item[1], reverse=True)
        top_features = feature_pairs[:10]

        fig, ax = plt.subplots(figsize=(10, 6))
        ax.barh([name for name, _ in reversed(top_features)], [score for _, score in reversed(top_features)], color="#2563eb")
        ax.set_title("Top Feature Importances")
        ax.set_xlabel("Importance")
        ax.set_ylabel("Feature")
        feature_path = os.path.join(graphs_dir, "feature_importance.png")
        fig.tight_layout()
        fig.savefig(feature_path, dpi=200)
        plt.close(fig)

        print(f"Saved confusion matrix graph to {confusion_path}")
        print(f"Saved feature importance graph to {feature_path}")
        print("Training complete.")
    finally:
        if os.path.exists(temp_training_csv):
            os.remove(temp_training_csv)


if __name__ == "__main__":
    main()
