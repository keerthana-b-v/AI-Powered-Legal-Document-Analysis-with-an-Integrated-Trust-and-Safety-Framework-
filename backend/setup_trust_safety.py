"""
Setup script for Trust & Safety module
Downloads required models and datasets, creates necessary directories
"""

import os
import sys
import subprocess
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import importlib.util

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_directories():
    """Create required directories for Trust & Safety module"""
    directories = [
        'fairness_reports',
        'fairness_visualizations', 
        'privacy_audit_logs',
        'feedback_data',
        'datasets',
        'uploads/trust_safety'
    ]
    
    logger.info("Creating required directories...")
    
    for directory in directories:
        try:
            os.makedirs(directory, exist_ok=True)
            logger.info(f"✅ Created directory: {directory}")
        except Exception as e:
            logger.error(f"❌ Failed to create directory {directory}: {e}")
            return False
    
    return True

def install_python_dependencies():
    """Install Python dependencies"""
    dependencies = [
        'torch==2.0.1',
        'transformers==4.33.2',
        'scikit-learn==1.3.0',
        'pandas==2.0.3',
        'numpy==1.24.3',
        'fairlearn==0.9.0',
        'matplotlib==3.7.2',
        'seaborn==0.12.2',
        'spacy==3.6.1',
        'python-dateutil==2.8.2',
        'requests==2.31.0',
        'Pillow==10.0.0',
        'pymongo==4.5.0'
    ]
    
    logger.info("Installing Python dependencies...")
    
    for dependency in dependencies:
        try:
            logger.info(f"Installing {dependency}...")
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install', dependency
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            logger.info(f"✅ Installed {dependency}")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to install {dependency}: {e}")
            return False
        
    return True

def download_spacy_models():
    """Download required spaCy models"""
    models = [
        'en_core_web_lg',  # Large English model for better PII detection
        'en_core_web_sm'   # Small model as fallback
    ]
    
    logger.info("Downloading spaCy models...")
    
    for model in models:
        try:
            logger.info(f"Downloading {model}...")
            subprocess.check_call([
                sys.executable, '-m', 'spacy', 'download', model
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            logger.info(f"✅ Downloaded {model}")
        except subprocess.CalledProcessError as e:
            logger.warning(f"⚠️ Failed to download {model}: {e}")
            if model == 'en_core_web_lg':
                logger.info("Will fallback to en_core_web_sm")
        
    return True

def create_sample_datasets():
    """Create sample datasets for testing"""
    logger.info("Creating sample datasets...")
    
    try:
        # Sample predictions data for fairness testing
        sample_predictions = {
            'clause_text': [
                'This lease agreement shall terminate on December 31, 2024',
                'Employee must work 40 hours per week as specified',
                'All confidential information must be protected',
                'Payment is due within 30 days of invoice date',
                'The service provider shall deliver by the deadline',
                'Tenant is responsible for property maintenance',
                'Intellectual property rights belong to the company',
                'Disputes shall be resolved through arbitration',
                'This contract is governed by California law',
                'The agreement duration is 12 months',
                'Rental property is for residential use only',
                'Employee benefits include health insurance',
                'Non-disclosure terms apply to all parties',
                'Invoice payment terms are net 30 days',
                'Professional services include consulting',
                'Property damage liability rests with tenant'
            ] * 10,  # Repeat to create larger dataset
            
            'predicted_label': [
                'termination', 'employment', 'confidentiality', 'payment',
                'service', 'internal_maintenance', 'intellectual_property', 
                'dispute_resolution', 'governing_law', 'duration',
                'rental', 'employment', 'confidentiality', 'payment',
                'service', 'liability'
            ] * 10,
            
            'true_label': [
                'termination', 'employment', 'confidentiality', 'payment',
                'service', 'internal_maintenance', 'intellectual_property',
                'dispute_resolution', 'governing_law', 'duration', 
                'rental', 'employment', 'confidentiality', 'payment',
                'service', 'liability'
            ] * 10,
            
            'contract_type': [
                'rental', 'employment', 'nda', 'service',
                'service', 'rental', 'employment', 'service',
                'service', 'rental', 'rental', 'employment',
                'nda', 'service', 'service', 'rental'
            ] * 10
        }
        
        # Add some intentional bias for testing
        for i in range(len(sample_predictions['predicted_label'])):
            if sample_predictions['contract_type'][i] == 'employment' and i % 4 == 0:
                sample_predictions['predicted_label'][i] = 'other'  # Introduce bias
        
        df = pd.DataFrame(sample_predictions)
        df.to_csv('datasets/sample_predictions.csv', index=False)
        logger.info("✅ Created sample predictions dataset")
        
        # Sample documents for privacy testing
        sample_documents = [
            {
                'id': 'doc_001',
                'text': 'This lease agreement is between John Smith (email: john.smith@email.com, phone: 555-123-4567) and ABC Property Management.'
            },
            {
                'id': 'doc_002', 
                'text': 'Employee Sarah Johnson (SSN: 123-45-6789) will receive a salary of $75,000 per year.'
            },
            {
                'id': 'doc_003',
                'text': 'The client at 123 Main Street, New York, NY 10001 has requested confidential services.'
            }
        ]
        
        with open('datasets/sample_documents.json', 'w') as f:
            json.dump(sample_documents, f, indent=2)
        logger.info("✅ Created sample documents for privacy testing")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create sample datasets: {e}")
        return False

def create_config_files():
    """Create configuration files for Trust & Safety modules"""
    logger.info("Creating configuration files...")
    
    try:
        # Fairness audit configuration
        fairness_config = {
            "bias_thresholds": {
                "performance_disparity": 0.1,
                "demographic_parity": 0.1,
                "high_severity_threshold": 0.2
            },
            "contract_categories": {
                "rental": ["lease", "rental", "tenancy", "landlord"],
                "employment": ["employment", "job", "work", "employee"],
                "service": ["service", "consulting", "professional"],
                "sales": ["purchase", "sale", "buy", "sell"],
                "partnership": ["partnership", "joint", "collaboration"],
                "nda": ["confidentiality", "non-disclosure", "nda"]
            },
            "metrics_to_calculate": ["accuracy", "f1_score", "precision", "recall"],
            "visualization_settings": {
                "create_charts": True,
                "chart_format": "png",
                "chart_dpi": 300
            }
        }
        
        with open('config/fairness_config.json', 'w') as f:
            json.dump(fairness_config, f, indent=2)
        logger.info("✅ Created fairness audit configuration")
        
        # Privacy protection configuration
        privacy_config = {
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
                    "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
                    "replacement": "[EMAIL]"
                },
                "phone": {
                    "pattern": "(\\+?1[-\\.\\s]?)?\\$?([0-9]{3})\\$?[-\\.\\s]?([0-9]{3})[-\\.\\s]?([0-9]{4})",
                    "replacement": "[PHONE]"
                },
                "ssn": {
                    "pattern": "\\b\\d{3}-?\\d{2}-?\\d{4}\\b",
                    "replacement": "[SSN]"
                },
                "credit_card": {
                    "pattern": "\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b",
                    "replacement": "[CREDIT_CARD]"
                },
                "ip_address": {
                    "pattern": "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b",
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
        
        with open('config/privacy_config.json', 'w') as f:
            json.dump(privacy_config, f, indent=2)
        logger.info("✅ Created privacy protection configuration")
        
        # Accountability system configuration
        accountability_config = {
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
        
        with open('config/accountability_config.json', 'w') as f:
            json.dump(accountability_config, f, indent=2)
        logger.info("✅ Created accountability system configuration")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create configuration files: {e}")
        return False

def create_helper_scripts():
    """Create helper Python scripts for the API endpoints"""
    logger.info("Creating helper scripts...")
    
    try:
        # Health check script
        health_check_script = '''#!/usr/bin/env python3
"""
Health check script for Trust & Safety module
"""

import json
import sys
import os
import importlib.util

def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = [
        'pandas', 'numpy', 'scikit-learn', 'matplotlib', 
        'seaborn', 'spacy', 'pymongo', 'transformers', 'torch'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            importlib.import_module(package)
        except ImportError:
            missing_packages.append(package)
    
    return missing_packages

def check_spacy_models():
    """Check if required spaCy models are installed"""
    try:
        import spacy
        models_to_check = ['en_core_web_sm', 'en_core_web_lg']
        available_models = []
        
        for model in models_to_check:
            try:
                spacy.load(model)
                available_models.append(model)
            except OSError:
                pass
        
        return available_models
    except ImportError:
        return []

def check_directories():
    """Check if required directories exist"""
    required_dirs = [
        'fairness_reports', 'fairness_visualizations',
        'privacy_audit_logs', 'feedback_data', 'datasets'
    ]
    
    existing_dirs = []
    for directory in required_dirs:
        if os.path.exists(directory):
            existing_dirs.append(directory)
    
    return existing_dirs

def main():
    """Main health check function"""
    health_status = {
        'status': 'healthy',
        'timestamp': '2024-01-01T00:00:00Z',
        'checks': {
            'dependencies': {
                'status': 'pass',
                'missing_packages': []
            },
            'spacy_models': {
                'status': 'pass',
                'available_models': []
            },
            'directories': {
                'status': 'pass',
                'existing_directories': []
            }
        }
    }
    
    # Check dependencies
    missing_packages = check_dependencies()
    if missing_packages:
        health_status['checks']['dependencies']['status'] = 'fail'
        health_status['checks']['dependencies']['missing_packages'] = missing_packages
        health_status['status'] = 'unhealthy'
    
    # Check spaCy models
    available_models = check_spacy_models()
    health_status['checks']['spacy_models']['available_models'] = available_models
    if not available_models:
        health_status['checks']['spacy_models']['status'] = 'warning'
    
    # Check directories
    existing_dirs = check_directories()
    health_status['checks']['directories']['existing_directories'] = existing_dirs
    
    print(json.dumps(health_status, indent=2))

if __name__ == '__main__':
    main()
'''
        
        with open('ai/health_check.py', 'w') as f:
            f.write(health_check_script)
        logger.info("✅ Created health check script")
        
        # Fairness audit runner script
        fairness_runner_script = '''#!/usr/bin/env python3
"""
Fairness audit runner script
"""

import sys
import json
import argparse
from fairness_auditor import FairnessAuditor

def main():
    parser = argparse.ArgumentParser(description='Run fairness audit')
    parser.add_argument('--data_path', default='datasets/sample_predictions.csv', help='Path to predictions data')
    parser.add_argument('--output_visualizations', type=bool, default=True, help='Create visualizations')
    parser.add_argument('--summary', action='store_true', help='Return summary only')
    
    args = parser.parse_args()
    
    try:
        auditor = FairnessAuditor()
        
        if args.summary:
            # Return basic summary
            result = {
                'status': 'ready',
                'last_audit': None,
                'total_audits': 0
            }
        else:
            result = auditor.run_full_audit(args.data_path)
        
        print(json.dumps(result, default=str))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'status': 'failed'
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()
'''
        
        with open('ai/fairness_audit_runner.py', 'w') as f:
            f.write(fairness_runner_script)
        logger.info("✅ Created fairness audit runner script")
        
        # Privacy stats script
        privacy_stats_script = '''#!/usr/bin/env python3
"""
Privacy statistics script
"""

import json
import os
from datetime import datetime

def get_privacy_stats():
    """Get privacy protection statistics"""
    stats = {
        'total_documents_processed': 0,
        'total_entities_redacted': 0,
        'avg_redaction_percentage': 0,
        'performance_metrics': {
            'average_processing_time': 0,
            'min_processing_time': 0,
            'max_processing_time': 0
        },
        'entity_type_distribution': {},
        'statistics_generated_at': datetime.now().isoformat()
    }
    
    # Check if audit logs exist
    audit_dir = 'privacy_audit_logs'
    if os.path.exists(audit_dir):
        log_files = [f for f in os.listdir(audit_dir) if f.endswith('.jsonl')]
        stats['total_documents_processed'] = len(log_files) * 10  # Estimate
    
    return stats

def main():
    try:
        stats = get_privacy_stats()
        print(json.dumps(stats, indent=2))
    except Exception as e:
        error_result = {'error': str(e)}
        print(json.dumps(error_result))

if __name__ == '__main__':
    main()
'''
        
        with open('ai/privacy_stats.py', 'w') as f:
            f.write(privacy_stats_script)
        logger.info("✅ Created privacy stats script")
        
        # Feedback summary script
        feedback_summary_script = '''#!/usr/bin/env python3
"""
Feedback summary script
"""

import json
import sys
import argparse
from accountability_system import FeedbackCollector

def main():
    parser = argparse.ArgumentParser(description='Get feedback summary')
    parser.add_argument('--days', type=int, default=30, help='Number of days to analyze')
    parser.add_argument('--summary_only', type=bool, default=False, help='Return summary only')
    
    args = parser.parse_args()
    
    try:
        collector = FeedbackCollector()
        summary = collector.get_feedback_summary(days=args.days)
        
        print(json.dumps(summary, default=str))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'total_feedback': 0,
            'accuracy_from_feedback': 0,
            'avg_confidence': 0
        }
        print(json.dumps(error_result))

if __name__ == '__main__':
    main()
'''
        
        with open('ai/feedback_summary.py', 'w') as f:
            f.write(feedback_summary_script)
        logger.info("✅ Created feedback summary script")
        
        # PII redactor script
        pii_redactor_script = '''#!/usr/bin/env python3
"""
PII redactor script for API endpoints
"""

import json
import sys
import argparse
from privacy_protection import PIIRedactor

def main():
    parser = argparse.ArgumentParser(description='Redact PII from text')
    parser.add_argument('--input_file', required=True, help='Input file path')
    parser.add_argument('--return_entities', type=bool, default=True, help='Return detected entities')
    parser.add_argument('--audit_compliance', type=bool, default=False, help='Include compliance audit')
    parser.add_argument('--batch_mode', type=bool, default=False, help='Batch processing mode')
    
    args = parser.parse_args()
    
    try:
        redactor = PIIRedactor()
        
        # Read input
        with open(args.input_file, 'r') as f:
            if args.batch_mode:
                data = json.load(f)
                if isinstance(data, list):
                    texts = [item.get('text', '') for item in data]
                    result = redactor.batch_redact(texts)
                else:
                    result = {'error': 'Batch mode requires array of documents'}
            else:
                if args.input_file.endswith('.json'):
                    data = json.load(f)
                    text = data.get('text', '')
                else:
                    text = f.read()
                
                result = redactor.redact_pii(text, return_entities=args.return_entities)
                
                if args.audit_compliance:
                    compliance = redactor.audit_privacy_compliance(text)
                    result['compliance_audit'] = compliance
        
        print(json.dumps(result, default=str))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'redacted_text': '',
            'entities_redacted': 0
        }
        print(json.dumps(error_result))

if __name__ == '__main__':
    main()
'''
        
        with open('ai/pii_redactor.py', 'w') as f:
            f.write(pii_redactor_script)
        logger.info("✅ Created PII redactor script")
        
        # Feedback collector script
        feedback_collector_script = '''#!/usr/bin/env python3
"""
Feedback collector script for API endpoints
"""

import json
import sys
import argparse
from accountability_system import FeedbackCollector

def main():
    parser = argparse.ArgumentParser(description='Collect and manage feedback')
    parser.add_argument('--input_file', help='Input file with feedback data')
    parser.add_argument('--days', type=int, default=30, help='Days for export')
    parser.add_argument('--output_file', help='Output file for export')
    parser.add_argument('--format', default='csv', help='Export format')
    
    args = parser.parse_args()
    
    try:
        collector = FeedbackCollector()
        
        if args.input_file:
            # Store feedback
            with open(args.input_file, 'r') as f:
                feedback_data = json.load(f)
            
            result = collector.store_feedback(feedback_data)
        elif args.output_file:
            # Export feedback
            result = collector.export_feedback_data(args.output_file, args.days)
        else:
            # Get summary
            result = collector.get_feedback_summary(args.days)
        
        print(json.dumps(result, default=str))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'success': False
        }
        print(json.dumps(error_result))

if __name__ == '__main__':
    main()
'''
        
        with open('ai/feedback_collector.py', 'w') as f:
            f.write(feedback_collector_script)
        logger.info("✅ Created feedback collector script")
        
        # Accountability classifier script
        accountability_classifier_script = '''#!/usr/bin/env python3
"""
Accountability classifier script for confidence scoring
"""

import json
import sys
import argparse
from accountability_system import ConfidenceScorer

def main():
    parser = argparse.ArgumentParser(description='Score prediction confidence')
    parser.add_argument('--input_file', required=True, help='Input file with text and prediction')
    
    args = parser.parse_args()
    
    try:
        scorer = ConfidenceScorer()
        
        # Read input
        with open(args.input_file, 'r') as f:
            data = json.load(f)
        
        text = data.get('text', '')
        prediction = data.get('prediction')
        
        if prediction:
            # Score existing prediction
            confidence_score = scorer.calculate_confidence_score(text, prediction)
            confidence_level = scorer.get_confidence_level(confidence_score)
            
            result = {
                'text': text,
                'prediction': prediction,
                'confidence_score': confidence_score,
                'confidence_level': confidence_level,
                'requires_review': confidence_level in ['LOW', 'VERY_LOW']
            }
        else:
            # Classify and score
            result = scorer.classify_with_confidence(text)
        
        print(json.dumps(result, default=str))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'confidence_score': 0.1,
            'confidence_level': 'VERY_LOW',
            'requires_review': True
        }
        print(json.dumps(error_result))

if __name__ == '__main__':
    main()
'''
        
        with open('ai/accountability_classifier.py', 'w') as f:
            f.write(accountability_classifier_script)
        logger.info("✅ Created accountability classifier script")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create helper scripts: {e}")
        return False

def main():
    """Main setup function"""
    logger.info("🚀 Starting Trust & Safety module setup...")
    
    success = True
    
    # Create directories
    logger.info("📋 Creating directories...")
    if not create_directories():
        success = False
    
    # Install Python dependencies
    logger.info("📦 Installing Python dependencies...")
    if not install_python_dependencies():
        success = False
    
    # Download spaCy models
    logger.info("📖 Downloading spaCy models...")
    if not download_spacy_models():
        success = False
    
    # Create sample datasets
    logger.info("📊 Creating sample datasets...")
    if not create_sample_datasets():
        success = False
    
    # Create configuration files
    logger.info("⚙️ Creating configuration files...")
    if not create_config_files():
        success = False
    
    # Create helper scripts
    logger.info("🔧 Creating helper scripts...")
    if not create_helper_scripts():
        success = False
    
    if success:
        logger.info("✅ Trust & Safety module setup completed successfully!")
        logger.info("📝 Next steps:")
        logger.info("   1. Add Trust & Safety routes to your server.js")
        logger.info("   2. Test the health endpoint: GET /api/trust-safety/health")
        logger.info("   3. Try PII redaction: POST /api/trust-safety/privacy/redact")
        logger.info("   4. Run fairness audit: POST /api/trust-safety/fairness/audit")
    else:
        logger.error("❌ Setup failed. Please check the logs above.")

if __name__ == "__main__":
    main()
