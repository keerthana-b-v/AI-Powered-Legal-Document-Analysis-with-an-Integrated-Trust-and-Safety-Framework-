import json
import sys
import re
from datetime import datetime

def redact_pii(text):
    """Redact PII from text using regex patterns"""
    
    # Define PII patterns
    patterns = {
        'EMAIL': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'PHONE': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
        'SSN': r'\b\d{3}-\d{2}-\d{4}\b',
        'CREDIT_CARD': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        'PERSON': r'\b[A-Z][a-z]+ [A-Z][a-z]+\b'
    }
    
    detected_entities = []
    redacted_text = text
    entities_count = 0
    
    for label, pattern in patterns.items():
        matches = re.finditer(pattern, text)
        for match in matches:
            detected_entities.append({
                'text': match.group(),
                'label': label,
                'start': match.start(),
                'end': match.end(),
                'confidence': 0.9 if label != 'PERSON' else 0.8
            })
            redacted_text = redacted_text.replace(match.group(), f'[{label}]')
            entities_count += 1
    
    # Calculate privacy score (lower is more private)
    privacy_score = min(entities_count / 10.0, 1.0)
    
    return {
        'original_text': text,
        'redacted_text': redacted_text,
        'entities_redacted': entities_count,
        'redaction_timestamp': datetime.now().isoformat(),
        'privacy_score': privacy_score,
        'detected_entities': detected_entities,
        'compliance_audit': {
            'privacy_score': privacy_score,
            'entities_found': entities_count,
            'compliance_level': 'CRITICAL' if entities_count > 2 else 'MODERATE' if entities_count > 0 else 'SAFE',
            'recommendations': [
                f'Found {entities_count} PII entities that should be redacted.',
                'CRITICAL: High PII density detected. Consider extensive redaction before sharing.' if entities_count > 2 else 'Review detected entities before sharing.'
            ],
            'audit_timestamp': datetime.now().isoformat()
        }
    }

if __name__ == '__main__':
    try:
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
            text = data.get('text', '')
        else:
            text = "Sample text for testing"
        
        result = redact_pii(text)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
