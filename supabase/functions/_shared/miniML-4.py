
import pandas as pd
import numpy as np
import re
import string
import nltk
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score, classification_report

# Load Dataset
file_path = "email.csv"
df = pd.read_csv(file_path)

# Convert Labels to Binary (spam = 1, ham = 0)
df['Category'] = df['Category'].map({'spam': 1, 'ham': 0})

# Drop any missing values
df.dropna(subset=['Message'], inplace=True)
df.dropna(subset=['Category'], inplace=True)  # Ensure labels have no NaN

# Text Cleaning Function
def clean_text(text):
    text = str(text).lower()  # Convert to lowercase and ensure it's a string
    text = re.sub(r"[" + string.punctuation + r"]", "", text)  # Remove punctuation
    text = re.sub(r"\d+", "", text)  # Remove numbers
    return text

df['Message'] = df['Message'].apply(clean_text)

# Train-Test Split
X_train, X_test, y_train, y_test = train_test_split(df['Message'].astype(str), df['Category'], test_size=0.2, random_state=42)

# Convert Text to Numerical Features
vectorizer = TfidfVectorizer(stop_words='english')
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

# Ensure X_test_tfidf is not empty
if X_test_tfidf.shape[0] == 0:
    raise ValueError("X_test_tfidf is empty. Check preprocessing steps.")

# Train Model
model = MultinomialNB()
model.fit(X_train_tfidf, y_train)

# Make Predictions
y_pred = model.predict(X_test_tfidf)

# Evaluate Model
accuracy = accuracy_score(y_test, y_pred)
report = classification_report(y_test, y_pred)

print(f"Accuracy: {accuracy * 100:.2f}%")
print("Classification Report:\n", report)

# Function to Predict Spam or Ham
def predict_spam(text):
    text = clean_text(text)
    text_tfidf = vectorizer.transform([text])
    prediction = model.predict(text_tfidf)[0]
    return "Spam" if prediction == 1 else "Ham"

# Example Usage
test_emails = [
    "Congratulations! You've won a $500 Amazon gift card. Click the link to claim now!",
    "Hey John, can you send me the report by tomorrow? Thanks!",
    "URGENT: Your bank account has been compromised. Verify your details immediately!",
    "Let’s meet for coffee this weekend. What time works for you?",
    "Limited-time offer! Buy 1 get 1 free on all electronics. Shop now!","Subject: 🎉 Congratulations! You’ve Won a $1,000 Gift Card! 🎁Dear Valued Customer,You have been selected as the lucky winner of a $1,000 Amazon Gift Card! 🎊To claim your reward, simply click the link below and enter your details:👉 Claim Your Prize Now 👈Hurry! This offer is only valid for the next 24 hours! 🚀🔒 Your information is 100% secure. No credit card required!Best Regards,The Rewards Team", "Subject: [Action Required] Update Your Account Information Dear [User’s Name], We hope you're doing well! As part of our ongoing efforts to enhance security, we kindly ask you to verify and update your account information. Please log in to your account and confirm your details by February 20, 2025 to ensure uninterrupted access to our services. 👉 Update Your Account If you have already completed this update, no further action is required. For any questions, feel free to contact our support team at support@example.com.Thank you for being a valued member of our community! Best Regards, The [Company Name] Team"
]

for email in test_emails:
    print(f"Email: {email}\nPrediction: {predict_spam(email)}\n")

