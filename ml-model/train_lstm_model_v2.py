from __future__ import annotations

import argparse
import os
import pickle
import random
import re
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras.callbacks import EarlyStopping
from tensorflow.keras.layers import Dense, Embedding, LSTM
from tensorflow.keras.models import Sequential
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer


def set_seed(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)


def clean_text(text: str, remove_special_chars: bool) -> str:
    text = str(text).lower()
    if remove_special_chars:
        text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def build_model(vocab_size: int, max_len: int) -> Sequential:
    model = Sequential(
        [
            Embedding(input_dim=vocab_size, output_dim=128, input_length=max_len),
            LSTM(64),
            Dense(1, activation="sigmoid"),
        ]
    )
    model.compile(loss="binary_crossentropy", optimizer="adam", metrics=["accuracy"])
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description="Train LSTM phishing detector and generate predictions")
    parser.add_argument("--input", default="data/email_dataset.csv", help="Input dataset path")
    parser.add_argument("--output", default="data/email_output.csv", help="Output predictions CSV path")
    parser.add_argument("--model-path", default="artifacts/models/lstm_model.h5", help="Path to save trained model")
    parser.add_argument("--tokenizer-path", default="artifacts/models/tokenizer.pkl", help="Path to save tokenizer")
    parser.add_argument("--max-words", type=int, default=20000, help="Maximum vocabulary size")
    parser.add_argument("--max-len", type=int, default=200, help="Padding length")
    parser.add_argument("--epochs", type=int, default=8, help="Training epochs")
    parser.add_argument("--batch-size", type=int, default=64, help="Training batch size")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument(
        "--keep-special-chars",
        action="store_true",
        help="Keep special characters instead of removing them",
    )
    args = parser.parse_args()

    set_seed(args.seed)

    input_path = Path(args.input)
    output_path = Path(args.output)
    model_path = Path(args.model_path)
    tokenizer_path = Path(args.tokenizer_path)

    if not input_path.exists():
        raise FileNotFoundError(f"Input dataset not found: {input_path}")

    df = pd.read_csv(input_path)
    required_cols = {"text", "label"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")

    df = df.dropna(subset=["text", "label"]).copy()
    df["label"] = pd.to_numeric(df["label"], errors="coerce")
    df = df.dropna(subset=["label"])
    df["label"] = df["label"].astype(int)
    df = df[df["label"].isin([0, 1])].copy()

    remove_special_chars = not args.keep_special_chars
    df["clean_text"] = df["text"].apply(lambda t: clean_text(t, remove_special_chars))
    df = df[df["clean_text"].str.len() > 0].copy()

    if df.empty:
        raise ValueError("Dataset is empty after preprocessing.")

    X_text = df["clean_text"].tolist()
    y = df["label"].values

    tokenizer = Tokenizer(num_words=args.max_words, oov_token="<OOV>")
    tokenizer.fit_on_texts(X_text)
    sequences = tokenizer.texts_to_sequences(X_text)
    X = pad_sequences(sequences, maxlen=args.max_len, padding="post", truncating="post")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=args.seed,
        stratify=y,
    )

    vocab_size = min(args.max_words, len(tokenizer.word_index) + 1)
    model = build_model(vocab_size=vocab_size, max_len=args.max_len)

    class_weights_arr = compute_class_weight(class_weight="balanced", classes=np.array([0, 1]), y=y_train)
    class_weights = {0: float(class_weights_arr[0]), 1: float(class_weights_arr[1])}
    early_stopping = EarlyStopping(monitor="val_loss", patience=2, restore_best_weights=True)

    print("Training LSTM model...")
    model.fit(
        X_train,
        y_train,
        epochs=args.epochs,
        batch_size=args.batch_size,
        validation_split=0.1,
        class_weight=class_weights,
        callbacks=[early_stopping],
        verbose=1,
    )

    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test Loss: {loss:.4f}")
    print(f"Test Accuracy: {accuracy:.4f}")

    y_test_prob = model.predict(X_test, verbose=0).flatten()
    y_test_pred = (y_test_prob > 0.5).astype(int)
    print("\nClassification Report (Test):")
    print(classification_report(y_test, y_test_pred, digits=4, zero_division=0))
    print("Confusion Matrix (Test):")
    print(confusion_matrix(y_test, y_test_pred))

    full_prob = model.predict(X, verbose=0).flatten()
    full_pred = (full_prob > 0.5).astype(int)

    output_df = pd.DataFrame(
        {
            "text": df["text"].values,
            "actual_label": df["label"].values,
            "predicted_label": full_pred,
            "confidence_score": full_prob,
        }
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    tokenizer_path.parent.mkdir(parents=True, exist_ok=True)

    output_df.to_csv(output_path, index=False)
    model.save(model_path)
    with open(tokenizer_path, "wb") as f:
        pickle.dump(tokenizer, f)

    print("\nArtifacts saved:")
    print(f"Predictions CSV: {output_path}")
    print(f"Model: {model_path}")
    print(f"Tokenizer: {tokenizer_path}")
    print(f"Rows in output: {len(output_df)}")


if __name__ == "__main__":
    main()