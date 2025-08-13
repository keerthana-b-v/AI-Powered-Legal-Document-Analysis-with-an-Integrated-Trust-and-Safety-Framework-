import json
import sys
from datetime import datetime
import re

def score_confidence(text):
    """Score confidence of text classification"""
    
    # Simple rule-based confidence scoring
    legal_terms = [
        'contract', 'agreement', 'party', 'parties', 'shall', 'hereby',
        'termination', 'payment', 'liability', 'confidential', 'breach',
        'clause', 'provision', 'obligation', 'rights', 'duties'
    ]
    
    # Count legal terms
    text_lower = text.lower()
    term_count = sum(1 for term in legal_terms if term in text_lower)
    
    # Calculate confidence based on legal term density
    confidence_score = min(term_count / len(legal_terms), 1.0)
    
    # Determine prediction based on dominant terms
    predictions = {
        'termination': ['terminate', 'end', 'expir', 'cancel'],
        'payment': ['pay', 'fee', 'cost', 'price', 'amount'],
        'confidential': ['confidential', 'secret', 'private', 'disclosure'],
        'liability': ['liable', 'responsible', 'damages', 'loss']
    }
    
    prediction = 'general'
    max_matches = 0
    
    for pred_type, keywords in predictions.items():
        matches = sum(1 for keyword in keywords if keyword in text_lower)
        if matches > max_matches:
            max_matches = matches
            prediction = pred_type
    
    # Confidence levels
    if confidence_score >= 0.8:
        confidence_level = 'VERY_HIGH'
    elif confidence_score >= 0.6:
        confidence_level = 'HIGH'
    elif confidence_score >= 0.4:
        confidence_level = 'MEDIUM'
    elif confidence_score >= 0.2:
        confidence_level = 'LOW'
    else:
        confidence_level = 'VERY_LOW'
    
    return {
        'text': text,
        'prediction': prediction,
        'confidence_score': confidence_score,
        'confidence_level': confidence_level,
        'timestamp': datetime.now().isoformat(),
        'requires_review': confidence_score < 0.6
    }

if __name__ == '__main__':
    try:
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
            text = data.get('text', '')
        else:
            text = "Sample contract text"
        
        result = score_confidence(text)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
