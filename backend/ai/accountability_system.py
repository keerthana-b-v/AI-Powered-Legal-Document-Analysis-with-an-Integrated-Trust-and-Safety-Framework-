"""
Accountability System for Legal Document Analysis
Provides confidence scoring, human feedback integration, and model accountability
"""

import json
import os
import pymongo
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
import numpy as np
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

logger = logging.getLogger(__name__)

class ConfidenceScorer:
    """
    Provides confidence scoring for AI predictions
    """
    
    def __init__(self, model_path=None, config_path=None):
        self.config = self._load_config(config_path)
        self.confidence_thresholds = self.config.get('confidence_thresholds', {
            'high_confidence': 0.9,
            'medium_confidence': 0.7,
            'low_confidence': 0.5,
            'very_low_confidence': 0.3
        })
        self.clause_types = self.config.get('clause_types', [
            'termination', 'payment', 'liability', 'confidentiality',
            'intellectual_property', 'dispute_resolution', 'force_majeure',
            'governing_law', 'duration', 'internal_maintenance',
            'additions_alterations', 'assignment', 'other'
        ])
        
        # Load model for confidence scoring
        self.model = None
        self.tokenizer = None
        self._load_model(model_path)
    
    def _load_config(self, config_path):
        """Load accountability configuration"""
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        
        return {
            "confidence_thresholds": {
                "high_confidence": 0.9,
                "medium_confidence": 0.7,
                "low_confidence": 0.5,
                "very_low_confidence": 0.3
            },
            "clause_types": [
                "termination", "payment", "liability", "confidentiality",
                "intellectual_property", "dispute_resolution", "force_majeure",
                "governing_law", "duration", "internal_maintenance",
                "additions_alterations", "assignment", "other"
            ],
            "feedback_settings": {
                "auto_export_threshold": 100,
                "export_format": "csv",
                "include_metadata": True
            }
        }
    
    def _load_model(self, model_path):
        """Load pre-trained model for confidence scoring"""
        try:
            if model_path and os.path.exists(model_path):
                self.tokenizer = AutoTokenizer.from_pretrained(model_path)
                self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
                logger.info(f"Loaded model from {model_path}")
            else:
                # Use a default BERT model for legal text
                model_name = "nlpaueb/legal-bert-base-uncased"
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    model_name, 
                    num_labels=len(self.clause_types)
                )
                logger.info(f"Loaded default model: {model_name}")
        except Exception as e:
            logger.warning(f"Could not load model: {e}. Using rule-based confidence scoring.")
            self.model = None
            self.tokenizer = None
    
    def calculate_confidence_score(self, text: str, prediction: str, logits: Optional[List[float]] = None) -> float:
        """
        Calculate confidence score for a prediction
        """
        if self.model and self.tokenizer:
            return self._model_based_confidence(text, prediction)
        else:
            return self._rule_based_confidence(text, prediction, logits)
    
    def _model_based_confidence(self, text: str, prediction: str) -> float:
        """Calculate confidence using the loaded model"""
        try:
            inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
            
            with torch.no_grad():
                outputs = self.model(**inputs)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
                max_prob = torch.max(probabilities).item()
            
            return max_prob
        except Exception as e:
            logger.error(f"Error in model-based confidence calculation: {e}")
            return self._rule_based_confidence(text, prediction)
    
    def _rule_based_confidence(self, text: str, prediction: str, logits: Optional[List[float]] = None) -> float:
        """Calculate confidence using rule-based approach"""
        confidence = 0.5  # Base confidence
        
        # Use logits if provided
        if logits:
            # Convert logits to probabilities
            exp_logits = np.exp(logits)
            probabilities = exp_logits / np.sum(exp_logits)
            confidence = np.max(probabilities)
        else:
            # Rule-based confidence calculation
            text_lower = text.lower()
            prediction_lower = prediction.lower()
            
            # Keyword matching confidence
            keyword_matches = {
                'termination': ['terminate', 'end', 'expire', 'cancel'],
                'payment': ['pay', 'payment', 'fee', 'cost', 'price', 'invoice'],
                'liability': ['liable', 'liability', 'responsible', 'damages'],
                'confidentiality': ['confidential', 'non-disclosure', 'secret', 'proprietary'],
                'intellectual_property': ['intellectual', 'property', 'copyright', 'patent', 'trademark'],
                'dispute_resolution': ['dispute', 'arbitration', 'mediation', 'court'],
                'duration': ['duration', 'term', 'period', 'months', 'years'],
                'governing_law': ['governing', 'law', 'jurisdiction', 'legal']
            }
            
            if prediction_lower in keyword_matches:
                keywords = keyword_matches[prediction_lower]
                matches = sum(1 for keyword in keywords if keyword in text_lower)
                confidence += min(0.4, matches * 0.1)
            
            # Text length confidence (longer texts generally more reliable)
            if len(text) > 100:
                confidence += 0.1
            elif len(text) < 20:
                confidence -= 0.1
            
            # Ensure confidence is within bounds
            confidence = max(0.1, min(0.95, confidence))
        
        return round(confidence, 3)
    
    def get_confidence_level(self, confidence_score: float) -> str:
        """Get confidence level category"""
        if confidence_score >= self.confidence_thresholds['high_confidence']:
            return 'HIGH'
        elif confidence_score >= self.confidence_thresholds['medium_confidence']:
            return 'MEDIUM'
        elif confidence_score >= self.confidence_thresholds['low_confidence']:
            return 'LOW'
        else:
            return 'VERY_LOW'
    
    def classify_with_confidence(self, text: str) -> Dict[str, Any]:
        """
        Classify text and return prediction with confidence score
        """
        try:
            # Simple rule-based classification for demo
            # In production, this would use your actual classification model
            prediction = self._simple_classify(text)
            confidence_score = self.calculate_confidence_score(text, prediction)
            confidence_level = self.get_confidence_level(confidence_score)
            
            return {
                'text': text,
                'prediction': prediction,
                'confidence_score': confidence_score,
                'confidence_level': confidence_level,
                'timestamp': datetime.now().isoformat(),
                'requires_review': confidence_level in ['LOW', 'VERY_LOW']
            }
        except Exception as e:
            logger.error(f"Error in classification with confidence: {e}")
            return {
                'text': text,
                'prediction': 'other',
                'confidence_score': 0.1,
                'confidence_level': 'VERY_LOW',
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
                'requires_review': True
            }
    
    def _simple_classify(self, text: str) -> str:
        """Simple rule-based classifier for demo purposes"""
        text_lower = text.lower()
        
        # Simple keyword-based classification
        if any(word in text_lower for word in ['terminate', 'end', 'expire', 'cancel']):
            return 'termination'
        elif any(word in text_lower for word in ['pay', 'payment', 'fee', 'cost', 'invoice']):
            return 'payment'
        elif any(word in text_lower for word in ['liable', 'liability', 'damages', 'responsible']):
            return 'liability'
        elif any(word in text_lower for word in ['confidential', 'non-disclosure', 'secret']):
            return 'confidentiality'
        elif any(word in text_lower for word in ['intellectual', 'copyright', 'patent', 'trademark']):
            return 'intellectual_property'
        elif any(word in text_lower for word in ['dispute', 'arbitration', 'mediation', 'court']):
            return 'dispute_resolution'
        elif any(word in text_lower for word in ['duration', 'term', 'period', 'months', 'years']):
            return 'duration'
        elif any(word in text_lower for word in ['governing', 'jurisdiction', 'legal']):
            return 'governing_law'
        else:
            return 'other'

class FeedbackCollector:
    """
    Collects and manages human feedback for model improvement
    """
    
    def __init__(self, mongodb_uri=None, db_name="legal_analyzer"):
        self.mongodb_uri = mongodb_uri or os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        self.db_name = db_name
        self.collection_name = 'feedback'
        
        try:
            self.client = pymongo.MongoClient(self.mongodb_uri)
            self.db = self.client[self.db_name]
            self.collection = self.db[self.collection_name]
            
            # Create indexes for better performance
            self.collection.create_index("timestamp")
            self.collection.create_index("clause_id")
            self.collection.create_index("is_processed")
            
            logger.info("Connected to MongoDB for feedback collection")
        except Exception as e:
            logger.error(f"Error connecting to MongoDB: {e}")
            self.client = None
            self.db = None
            self.collection = None
    
    def store_feedback(self, feedback_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Store human feedback in MongoDB
        """
        try:
            if not self.collection:
                return {'success': False, 'error': 'Database not available'}
            
            # Prepare feedback document
            feedback_doc = {
                'clause_id': feedback_data.get('clause_id'),
                'original_text': feedback_data.get('original_text', ''),
                'model_prediction': feedback_data.get('model_prediction', ''),
                'model_confidence': feedback_data.get('model_confidence', 0.0),
                'user_correction': feedback_data.get('user_correction', ''),
                'feedback_type': feedback_data.get('feedback_type', 'correction'),
                'user_id': feedback_data.get('user_id'),
                'session_id': feedback_data.get('session_id'),
                'timestamp': datetime.now(),
                'additional_metadata': feedback_data.get('additional_metadata', {}),
                'is_processed': False
            }
            
            # Insert into MongoDB
            result = self.collection.insert_one(feedback_doc)
            
            logger.info(f"Stored feedback with ID: {result.inserted_id}")
            
            return {
                'success': True,
                'feedback_id': str(result.inserted_id),
                'timestamp': feedback_doc['timestamp'].isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error storing feedback: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_feedback_summary(self, days: int = 30) -> Dict[str, Any]:
        """
        Get summary of feedback collected in the last N days
        """
        try:
            if not self.collection:
                return {'error': 'Database not available'}
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Aggregation pipeline
            pipeline = [
                {
                    '$match': {
                        'timestamp': {'$gte': start_date, '$lte': end_date}
                    }
                },
                {
                    '$group': {
                        '_id': None,
                        'total_feedback': {'$sum': 1},
                        'corrections': {
                            '$sum': {
                                '$cond': [{'$eq': ['$feedback_type', 'correction']}, 1, 0]
                            }
                        },
                        'avg_confidence': {'$avg': '$model_confidence'},
                        'unique_users': {'$addToSet': '$user_id'},
                        'prediction_accuracy': {
                            '$avg': {
                                '$cond': [
                                    {'$eq': ['$model_prediction', '$user_correction']}, 
                                    1, 0
                                ]
                            }
                        }
                    }
                }
            ]
            
            result = list(self.collection.aggregate(pipeline))
            
            if result:
                summary = result[0]
                summary['unique_users_count'] = len(summary.get('unique_users', []))
                summary['date_range'] = {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': days
                }
                del summary['_id']
                del summary['unique_users']  # Remove the actual user list for privacy
            else:
                summary = {
                    'total_feedback': 0,
                    'corrections': 0,
                    'avg_confidence': 0,
                    'unique_users_count': 0,
                    'prediction_accuracy': 0,
                    'date_range': {
                        'start': start_date.isoformat(),
                        'end': end_date.isoformat()
                    }
                }
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting feedback summary: {e}")
            return {'error': str(e)}
    
    def get_feedback_by_clause_type(self, clause_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get feedback for a specific clause type
        """
        try:
            if not self.collection:
                return []
            
            cursor = self.collection.find(
                {'model_prediction': clause_type},
                {'_id': 0}  # Exclude MongoDB _id field
            ).limit(limit).sort('timestamp', -1)
            
            return list(cursor)
            
        except Exception as e:
            logger.error(f"Error getting feedback by clause type: {e}")
            return []
    
    def export_feedback_data(self, output_path: str, days: int = 30) -> Dict[str, Any]:
        """
        Export feedback data to CSV for analysis
        """
        try:
            if not self.collection:
                return {'success': False, 'error': 'Database not available'}
            
            import pandas as pd
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Query feedback data
            cursor = self.collection.find(
                {'timestamp': {'$gte': start_date, '$lte': end_date}},
                {'_id': 0}  # Exclude MongoDB _id field
            )
            
            feedback_data = list(cursor)
            
            if not feedback_data:
                return {'success': False, 'error': 'No feedback data found'}
            
            # Convert to DataFrame and export
            df = pd.DataFrame(feedback_data)
            df.to_csv(output_path, index=False)
            
            logger.info(f"Exported {len(feedback_data)} feedback records to {output_path}")
            
            return {
                'success': True,
                'records_exported': len(feedback_data),
                'output_path': output_path,
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error exporting feedback data: {e}")
            return {'success': False, 'error': str(e)}

# Example usage
if __name__ == "__main__":
    # Test confidence scoring
    scorer = ConfidenceScorer()
    
    test_text = "This contract shall terminate on December 31, 2024, unless renewed by mutual agreement."
    result = scorer.classify_with_confidence(test_text)
    
    print("Classification Result:")
    print(f"Prediction: {result['prediction']}")
    print(f"Confidence: {result['confidence_score']} ({result['confidence_level']})")
    print(f"Requires Review: {result['requires_review']}")
    
    # Test feedback collection
    collector = FeedbackCollector()
    
    feedback_data = {
        'original_text': test_text,
        'model_prediction': result['prediction'],
        'user_correction': 'duration',  # User says it should be 'duration' not 'termination'
        'model_confidence': result['confidence_score'],
        'user_id': 'test_user',
        'session_id': 'test_session'
    }
    
    feedback_result = collector.store_feedback(feedback_data)
    print(f"Feedback stored: {feedback_result}")
    
    # Get feedback summary
    summary = collector.get_feedback_summary(days=7)
    print(f"Feedback summary: {summary}")
