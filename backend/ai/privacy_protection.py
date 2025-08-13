"""
Privacy Protection Module for Legal Document Analysis
Handles PII detection, redaction, and privacy compliance
"""

import re
import spacy
import json
import os
from datetime import datetime
from pathlib import Path
import logging
from typing import Dict, List, Tuple, Any

logger = logging.getLogger(__name__)

class PIIRedactor:
    """
    Detects and redacts Personally Identifiable Information (PII) from legal documents
    """
    
    def __init__(self, config_path=None):
        self.config = self._load_config(config_path)
        self.nlp = self._load_spacy_model()
        self.regex_patterns = self._compile_regex_patterns()
        self.pii_entities = self.config.get('pii_entities', {})
        self.redaction_settings = self.config.get('redaction_settings', {})
        
    def _load_config(self, config_path):
        """Load privacy configuration"""
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        
        # Default configuration
        return {
            "pii_entities": {
                "PERSON": "[PERSON]",
                "ORG": "[ORGANIZATION]", 
                "GPE": "[LOCATION]",
                "LOC": "[LOCATION]",
                "FACILITY": "[FACILITY]",
                "DATE": "[DATE]",
                "TIME": "[TIME]",
                "MONEY": "[MONEY]",
                "PERCENT": "[PERCENT]"
            },
            "regex_patterns": {
                "email": {
                    "pattern": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
                    "replacement": "[EMAIL]"
                },
                "phone": {
                    "pattern": r"(\+?1[-.\s]?)?($$?\d{3}$$?[-.\s]?)?(\d{3})[-.\s]?(\d{4})",
                    "replacement": "[PHONE]"
                },
                "ssn": {
                    "pattern": r"\b\d{3}-?\d{2}-?\d{4}\b",
                    "replacement": "[SSN]"
                },
                "credit_card": {
                    "pattern": r"\b(?:\d{4}[-\s]?){3}\d{4}\b",
                    "replacement": "[CREDIT_CARD]"
                },
                "ip_address": {
                    "pattern": r"\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b",
                    "replacement": "[IP_ADDRESS]"
                }
            },
            "redaction_settings": {
                "preserve_structure": True,
                "case_sensitive": False,
                "redact_dates": True,
                "redact_numbers": False,
                "redact_money": False
            }
        }
    
    def _load_spacy_model(self):
        """Load spaCy model for NER"""
        try:
            # Try to load large model first
            nlp = spacy.load("en_core_web_lg")
            logger.info("Loaded en_core_web_lg model")
        except OSError:
            try:
                # Fallback to small model
                nlp = spacy.load("en_core_web_sm")
                logger.info("Loaded en_core_web_sm model")
            except OSError:
                logger.error("No spaCy model found. Please install: python -m spacy download en_core_web_sm")
                raise
        
        return nlp
    
    def _compile_regex_patterns(self):
        """Compile regex patterns for efficiency"""
        compiled_patterns = {}
        
        for pattern_name, pattern_config in self.config.get('regex_patterns', {}).items():
            try:
                compiled_patterns[pattern_name] = {
                    'pattern': re.compile(pattern_config['pattern'], re.IGNORECASE),
                    'replacement': pattern_config['replacement']
                }
            except re.error as e:
                logger.warning(f"Invalid regex pattern for {pattern_name}: {e}")
        
        return compiled_patterns
    
    def detect_pii_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect PII entities using spaCy NER
        """
        doc = self.nlp(text)
        entities = []
        
        for ent in doc.ents:
            if ent.label_ in self.pii_entities:
                entities.append({
                    'text': ent.text,
                    'label': ent.label_,
                    'start': ent.start_char,
                    'end': ent.end_char,
                    'confidence': getattr(ent, 'confidence', 0.9),  # Default confidence
                    'replacement': self.pii_entities[ent.label_]
                })
        
        return entities
    
    def detect_pii_regex(self, text: str) -> List[Dict[str, Any]]:
        """
        Detect PII using regex patterns
        """
        entities = []
        
        for pattern_name, pattern_config in self.regex_patterns.items():
            matches = pattern_config['pattern'].finditer(text)
            
            for match in matches:
                entities.append({
                    'text': match.group(),
                    'label': pattern_name.upper(),
                    'start': match.start(),
                    'end': match.end(),
                    'confidence': 1.0,  # High confidence for regex matches
                    'replacement': pattern_config['replacement']
                })
        
        return entities
    
    def merge_overlapping_entities(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Merge overlapping PII entities, keeping the one with higher confidence
        """
        if not entities:
            return entities
        
        # Sort by start position
        sorted_entities = sorted(entities, key=lambda x: x['start'])
        merged = []
        
        for entity in sorted_entities:
            if not merged:
                merged.append(entity)
                continue
            
            last_entity = merged[-1]
            
            # Check for overlap
            if entity['start'] < last_entity['end']:
                # Overlapping entities - keep the one with higher confidence
                if entity['confidence'] > last_entity['confidence']:
                    merged[-1] = entity
                # If same confidence, keep the longer one
                elif (entity['confidence'] == last_entity['confidence'] and 
                      (entity['end'] - entity['start']) > (last_entity['end'] - last_entity['start'])):
                    merged[-1] = entity
            else:
                merged.append(entity)
        
        return merged
    
    def redact_pii(self, text: str, return_entities: bool = True) -> Dict[str, Any]:
        """
        Main function to detect and redact PII from text
        """
        try:
            # Detect entities using both methods
            ner_entities = self.detect_pii_entities(text)
            regex_entities = self.detect_pii_regex(text)
            
            # Combine and merge overlapping entities
            all_entities = ner_entities + regex_entities
            merged_entities = self.merge_overlapping_entities(all_entities)
            
            # Sort by start position (reverse order for replacement)
            merged_entities.sort(key=lambda x: x['start'], reverse=True)
            
            # Redact text
            redacted_text = text
            for entity in merged_entities:
                redacted_text = (redacted_text[:entity['start']] + 
                               entity['replacement'] + 
                               redacted_text[entity['end']:])
            
            # Prepare result
            result = {
                'original_text': text,
                'redacted_text': redacted_text,
                'entities_redacted': len(merged_entities),
                'redaction_timestamp': datetime.now().isoformat(),
                'privacy_score': self._calculate_privacy_score(text, merged_entities)
            }
            
            if return_entities:
                result['detected_entities'] = [
                    {
                        'text': entity['text'],
                        'label': entity['label'],
                        'start': entity['start'],
                        'end': entity['end'],
                        'confidence': entity['confidence']
                    }
                    for entity in sorted(merged_entities, key=lambda x: x['start'])
                ]
            
            return result
            
        except Exception as e:
            logger.error(f"Error in PII redaction: {e}")
            return {
                'original_text': text,
                'redacted_text': text,
                'entities_redacted': 0,
                'error': str(e),
                'redaction_timestamp': datetime.now().isoformat()
            }
    
    def _calculate_privacy_score(self, text: str, entities: List[Dict[str, Any]]) -> float:
        """
        Calculate privacy score based on PII density and sensitivity
        Score: 0.0 (high privacy risk) to 1.0 (low privacy risk)
        """
        if not text:
            return 1.0
        
        if not entities:
            return 1.0  # No PII found = high privacy score
        
        # Calculate PII density
        total_pii_chars = sum(entity['end'] - entity['start'] for entity in entities)
        pii_density = total_pii_chars / len(text)
        
        # Weight by entity sensitivity
        sensitivity_weights = {
            'SSN': 1.0,
            'CREDIT_CARD': 1.0,
            'EMAIL': 0.7,
            'PHONE': 0.7,
            'PERSON': 0.8,
            'DATE': 0.3,
            'MONEY': 0.2,
            'ORGANIZATION': 0.4,
            'LOCATION': 0.5
        }
        
        weighted_sensitivity = 0
        for entity in entities:
            weight = sensitivity_weights.get(entity['label'], 0.5)
            weighted_sensitivity += weight
        
        # Normalize by number of entities
        avg_sensitivity = weighted_sensitivity / len(entities) if entities else 0
        
        # Calculate final privacy score
        privacy_score = max(0.0, 1.0 - (pii_density * 2 + avg_sensitivity * 0.5))
        
        return round(privacy_score, 3)
    
    def batch_redact(self, texts: List[str]) -> List[Dict[str, Any]]:
        """
        Redact PII from multiple texts
        """
        results = []
        
        for i, text in enumerate(texts):
            try:
                result = self.redact_pii(text)
                result['batch_index'] = i
                results.append(result)
            except Exception as e:
                logger.error(f"Error processing text {i}: {e}")
                results.append({
                    'batch_index': i,
                    'original_text': text,
                    'redacted_text': text,
                    'entities_redacted': 0,
                    'error': str(e),
                    'redaction_timestamp': datetime.now().isoformat()
                })
        
        return results
    
    def audit_privacy_compliance(self, text: str) -> Dict[str, Any]:
        """
        Audit text for privacy compliance and provide recommendations
        """
        redaction_result = self.redact_pii(text)
        
        compliance_report = {
            'privacy_score': redaction_result['privacy_score'],
            'entities_found': redaction_result['entities_redacted'],
            'compliance_level': self._get_compliance_level(redaction_result['privacy_score']),
            'recommendations': self._generate_privacy_recommendations(redaction_result),
            'audit_timestamp': datetime.now().isoformat()
        }
        
        return compliance_report
    
    def _get_compliance_level(self, privacy_score: float) -> str:
        """Determine compliance level based on privacy score"""
        if privacy_score >= 0.9:
            return 'HIGH'
        elif privacy_score >= 0.7:
            return 'MEDIUM'
        elif privacy_score >= 0.5:
            return 'LOW'
        else:
            return 'CRITICAL'
    
    def _generate_privacy_recommendations(self, redaction_result: Dict[str, Any]) -> List[str]:
        """Generate privacy recommendations based on redaction results"""
        recommendations = []
        
        entities_count = redaction_result['entities_redacted']
        privacy_score = redaction_result['privacy_score']
        
        if entities_count == 0:
            recommendations.append("No PII detected. Document appears privacy-compliant.")
        else:
            recommendations.append(f"Found {entities_count} PII entities that should be redacted.")
        
        if privacy_score < 0.5:
            recommendations.append("CRITICAL: High PII density detected. Consider extensive redaction before sharing.")
        elif privacy_score < 0.7:
            recommendations.append("WARNING: Moderate PII risk. Review and redact sensitive information.")
        elif privacy_score < 0.9:
            recommendations.append("CAUTION: Some PII detected. Consider redaction for external sharing.")
        
        if 'detected_entities' in redaction_result:
            sensitive_entities = [e for e in redaction_result['detected_entities'] 
                                if e['label'] in ['SSN', 'CREDIT_CARD']]
            if sensitive_entities:
                recommendations.append("URGENT: Highly sensitive information (SSN/Credit Card) detected. Immediate redaction required.")
        
        return recommendations

# Example usage
if __name__ == "__main__":
    redactor = PIIRedactor()
    
    # Test text with various PII
    test_text = """
    This lease agreement is between John Smith (email: john.smith@email.com, phone: 555-123-4567) 
    and ABC Property Management located at 123 Main Street, New York, NY. 
    The tenant's SSN is 123-45-6789 and credit card ending in 4532-1234-5678-9012.
    """
    
    # Redact PII
    result = redactor.redact_pii(test_text)
    print("Original:", result['original_text'])
    print("Redacted:", result['redacted_text'])
    print(f"Entities redacted: {result['entities_redacted']}")
    print(f"Privacy score: {result['privacy_score']}")
    
    # Audit compliance
    audit = redactor.audit_privacy_compliance(test_text)
    print(f"Compliance level: {audit['compliance_level']}")
    print("Recommendations:", audit['recommendations'])
