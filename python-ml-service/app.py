# External Python ML Service for Mail Guard
# Deploy this separately (e.g., on Railway, Heroku, or AWS)

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import re
import string
import pickle
import os
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AdvancedEmailClassifier:
    def __init__(self):
        self.pipeline = None
        self.is_trained = False
        self.training_accuracy = 0.0
        self.feature_names = []
        self.training_size = 0
        
    def preprocess_text(self, text):
        """Enhanced text preprocessing"""
        if not text:
            return ""
            
        # Convert to lowercase
        text = text.lower()
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove URLs
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', 'URL', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', 'EMAIL', text)
        
        # Remove numbers but keep number-related spam indicators
        text = re.sub(r'\b\d+\b', 'NUMBER', text)
        
        # Remove punctuation but keep some spam indicators
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Remove extra whitespace
        text = ' '.join(text.split())
        
        return text
    
    def train_model(self):
        """Train the ML model with enhanced features"""
        logger.info("Starting model training...")
        
        # Enhanced training data with more sophisticated patterns
        training_data = [
            # Spam examples
            ("Free money! Click here to claim your prize!", "spam"),
            ("Congratulations! You won $1,000,000 in our lottery!", "spam"),
            ("Limited time offer! Buy now and get 50% off!", "spam"),
            ("Your account will be suspended. Verify immediately!", "spam"),
            ("Cheap medications! No prescription needed!", "spam"),
            ("Make $5000 working from home! No experience required!", "spam"),
            ("Hot singles in your area want to meet you!", "spam"),
            ("Your computer is infected! Download our antivirus now!", "spam"),
            ("Inheritance of $5 million waiting for you!", "spam"),
            ("Weight loss miracle! Lose 30 pounds in 30 days!", "spam"),
            ("Casino bonus! Free spins await you!", "spam"),
            ("Tax refund pending! Claim your $2000 now!", "spam"),
            ("Pharmacy online! Cheapest prices guaranteed!", "spam"),
            ("Work from home! Earn thousands weekly!", "spam"),
            ("Free iPhone! Just pay shipping and handling!", "spam"),
            ("Your PayPal account requires immediate verification!", "spam"),
            ("Bank alert! Your account has been compromised!", "spam"),
            ("Meet Russian brides! Free registration!", "spam"),
            ("Get rich quick with cryptocurrency! Guaranteed profits!", "spam"),
            ("Debt consolidation! Lower your payments now!", "spam"),
            
            # Legitimate examples  
            ("Meeting scheduled for tomorrow at 2 PM in conference room", "legitimate"),
            ("Thank you for your order. Your items will ship within 2 business days", "legitimate"),
            ("Reminder: Your subscription renewal is due next week", "legitimate"),
            ("Welcome to our newsletter! Here's what's new this month", "legitimate"),
            ("Your flight departure time has been updated", "legitimate"),
            ("Project status update: Phase 1 completed successfully", "legitimate"),
            ("Invoice #12345 is attached for your review", "legitimate"),
            ("Training session on cybersecurity scheduled for Friday", "legitimate"),
            ("Thank you for registering for our webinar", "legitimate"),
            ("Your package has been delivered to your address", "legitimate"),
            ("Monthly report: Sales figures and performance metrics", "legitimate"),
            ("System maintenance scheduled for this weekend", "legitimate"),
            ("New employee orientation starts Monday at 9 AM", "legitimate"),
            ("Customer feedback survey: Help us improve our service", "legitimate"),
            ("Conference call dial-in information for today's meeting", "legitimate"),
            ("Your reservation has been confirmed for next Friday", "legitimate"),
            ("Document review required for the upcoming audit", "legitimate"),
            ("Team lunch scheduled for this Thursday at noon", "legitimate"),
            ("Software update available for download", "legitimate"),
            ("Annual performance review meeting next Tuesday", "legitimate"),
        ]
        
        # Prepare data
        texts = [self.preprocess_text(text) for text, label in training_data]
        labels = [label for text, label in training_data]
        
        # Create pipeline with TF-IDF and Multinomial Naive Bayes
        self.pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),  # Use unigrams and bigrams
                stop_words='english',
                min_df=1,
                max_df=0.8,
                sublinear_tf=True
            )),
            ('classifier', MultinomialNB(alpha=0.1))  # Laplace smoothing
        ])
        
        # Split data for validation
        X_train, X_test, y_train, y_test = train_test_split(
            texts, labels, test_size=0.2, random_state=42, stratify=labels
        )
        
        # Train the model
        self.pipeline.fit(X_train, y_train)
        
        # Calculate metrics
        y_pred = self.pipeline.predict(X_test)
        self.training_accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, pos_label='spam')
        recall = recall_score(y_test, y_pred, pos_label='spam')
        f1 = f1_score(y_test, y_pred, pos_label='spam')
        
        # Store feature names
        self.feature_names = self.pipeline.named_steps['tfidf'].get_feature_names_out()
        self.training_size = len(texts)
        self.is_trained = True
        
        logger.info(f"Model trained successfully!")
        logger.info(f"Accuracy: {self.training_accuracy:.3f}")
        logger.info(f"Precision: {precision:.3f}")
        logger.info(f"Recall: {recall:.3f}")
        logger.info(f"F1 Score: {f1:.3f}")
        logger.info(f"Training size: {self.training_size}")
        logger.info(f"Features: {len(self.feature_names)}")
        
        return {
            'accuracy': self.training_accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'training_size': self.training_size,
            'features_count': len(self.feature_names)
        }
    
    def classify_email(self, subject, sender, content):
        """Classify an email using the trained model"""
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        start_time = datetime.now()
        
        # Combine email parts
        full_text = f"{subject} {content}"
        processed_text = self.preprocess_text(full_text)
        
        # Get prediction probability
        probabilities = self.pipeline.predict_proba([processed_text])[0]
        spam_probability = probabilities[1] if len(probabilities) > 1 else 0.0
        
        # Determine classification
        classification = "spam" if spam_probability > 0.5 else "legitimate"
        
        # Calculate confidence based on how far from decision boundary
        confidence = max(spam_probability, 1 - spam_probability)
        
        # Determine threat level
        if spam_probability > 0.8:
            threat_level = "high"
        elif spam_probability > 0.6:
            threat_level = "medium" 
        else:
            threat_level = "low"
        
        # Get important features (words that influenced the decision)
        tfidf_vector = self.pipeline.named_steps['tfidf'].transform([processed_text])
        feature_importance = tfidf_vector.toarray()[0]
        top_features_idx = np.argsort(feature_importance)[-10:][::-1]
        keywords = [self.feature_names[i] for i in top_features_idx if feature_importance[i] > 0]
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return {
            'classification': classification,
            'threat_level': threat_level,
            'confidence': round(confidence, 3),
            'spam_probability': round(spam_probability, 3),
            'keywords': keywords[:5],  # Top 5 keywords
            'processing_time_ms': round(processing_time, 2),
            'algorithm': 'TF-IDF + Multinomial Naive Bayes',
            'model_version': '2.0'
        }

# Initialize the classifier
classifier = AdvancedEmailClassifier()

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Mail Guard Python ML API',
        'version': '2.0',
        'model_trained': classifier.is_trained,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/train', methods=['POST'])
def train_model():
    """Train the ML model"""
    try:
        logger.info("Training request received")
        metrics = classifier.train_model()
        return jsonify({
            'success': True,
            'message': 'Model trained successfully',
            'metrics': metrics,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Training error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/classify', methods=['POST'])
def classify_email():
    """Classify an email"""
    try:
        if not classifier.is_trained:
            # Auto-train if not trained
            logger.info("Model not trained, training now...")
            classifier.train_model()
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        # Extract email data
        subject = data.get('subject', '')
        sender = data.get('sender', '')
        content = data.get('content', '')
        
        if not subject and not content:
            return jsonify({
                'success': False,
                'error': 'Either subject or content must be provided'
            }), 400
        
        logger.info(f"Classifying email from: {sender}")
        
        # Classify the email
        result = classifier.classify_email(subject, sender, content)
        
        return jsonify({
            'success': True,
            'result': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get model information"""
    return jsonify({
        'is_trained': classifier.is_trained,
        'training_accuracy': classifier.training_accuracy,
        'training_size': classifier.training_size,
        'features_count': len(classifier.feature_names),
        'algorithm': 'TF-IDF + Multinomial Naive Bayes',
        'version': '2.0'
    })

if __name__ == '__main__':
    # Auto-train the model on startup
    try:
        classifier.train_model()
        logger.info("Model trained successfully on startup")
    except Exception as e:
        logger.error(f"Failed to train model on startup: {e}")
    
    # Run the Flask app
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)