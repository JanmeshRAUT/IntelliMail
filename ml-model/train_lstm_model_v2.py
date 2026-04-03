import os
import re
import random
import pickle
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.callbacks import EarlyStopping


# ------------------ SEED ------------------
def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)


# ------------------ CLEAN TEXT ------------------
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ------------------ LOAD DATA ------------------
def load_data(path):
    df = pd.read_csv(path)

    df = df.dropna(subset=["text", "label"])
    df["label"] = df["label"].astype(int)

    df["clean_text"] = df["text"].apply(clean_text)

    return df


# ------------------ BUILD MODEL ------------------
def build_model(vocab_size, max_len):
    model = Sequential([
        Embedding(vocab_size, 128, input_length=max_len),

        LSTM(64, return_sequences=True),
        Dropout(0.5),

        LSTM(32),
        Dropout(0.5),

        Dense(32, activation="relu"),
        Dropout(0.5),

        Dense(1, activation="sigmoid")
    ])

    model.compile(
        loss="binary_crossentropy",
        optimizer="adam",
        metrics=["accuracy"]
    )

    return model


# ------------------ MAIN ------------------
def main():

    DATA_PATH = "realistic_email_dataset.csv"

    MAX_WORDS = 20000
    MAX_LEN = 200
    EPOCHS = 5
    BATCH_SIZE = 32

    set_seed()

    # Load
    df = load_data(DATA_PATH)

    print("Dataset size:", df.shape)

    X_text = df["clean_text"].tolist()
    y = df["label"].values

    # Tokenize
    tokenizer = Tokenizer(num_words=MAX_WORDS, oov_token="<OOV>")
    tokenizer.fit_on_texts(X_text)

    sequences = tokenizer.texts_to_sequences(X_text)
    X = pad_sequences(sequences, maxlen=MAX_LEN)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        stratify=y,
        random_state=42
    )

    vocab_size = min(MAX_WORDS, len(tokenizer.word_index) + 1)

    # Model
    model = build_model(vocab_size, MAX_LEN)

    # Class weights
    weights = compute_class_weight(
        class_weight="balanced",
        classes=np.array([0, 1]),
        y=y_train
    )

    class_weights = {0: weights[0], 1: weights[1]}

    # Early stopping
    early_stop = EarlyStopping(
        monitor="val_loss",
        patience=2,
        restore_best_weights=True
    )

    # Train
    print("\n🚀 Training...")
    model.fit(
        X_train,
        y_train,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        validation_split=0.1,
        class_weight=class_weights,
        callbacks=[early_stop]
    )

    # Evaluate
    print("\n📊 Evaluating...")
    loss, acc = model.evaluate(X_test, y_test)
    print("Test Accuracy:", acc)

    # Predictions
    y_prob = model.predict(X_test).flatten()

    print("\nSample predictions:", y_prob[:10])

    # 🔥 threshold fix
    y_pred = (y_prob > 0.3).astype(int)

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    # ------------------ FULL OUTPUT ------------------
    full_prob = model.predict(X).flatten()
    full_pred = (full_prob > 0.3).astype(int)

    output_df = pd.DataFrame({
        "text": df["text"],
        "actual_label": df["label"],
        "predicted_label": full_pred,
        "confidence_score": full_prob
    })

    output_df.to_csv("email_output.csv", index=False)

    # Save model
    model.save("lstm_model.h5")

    with open("tokenizer.pkl", "wb") as f:
        pickle.dump(tokenizer, f)

    print("\n✅ Saved:")
    print("Model → lstm_model.h5")
    print("Tokenizer → tokenizer.pkl")
    print("Output → email_output.csv")


if __name__ == "__main__":
    main()