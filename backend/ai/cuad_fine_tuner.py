"""
CUAD Dataset Fine-tuning Module
Uses local CUAD dataset to improve clause detection accuracy
"""

import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel, Trainer, TrainingArguments
from datasets import Dataset
import pandas as pd
import numpy as np
import json
import os
import logging
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import glob

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CUADFineTuner:
    def __init__(self, cuad_dataset_path="./cuad/CUAD_v1"):
        self.cuad_path = cuad_dataset_path
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.tokenizer = AutoTokenizer.from_pretrained('bert-base-uncased')
        
        # Enhanced clause types based on CUAD dataset structure
        self.clause_types = [
            'anti_assignment',
            'audit_rights', 
            'covenant_not_to_sue',
            'dates',
            'document_name',
            'governing_law',
            'insurance',
            'ip_ownership_assignment',
            'joint_ip_ownership',
            'licenses',
            'liquidated_damages',
            'minimum_commitment',
            'most_favored_nation',
            'no_solicit_employees',
            'non_compete_exclusivity',
            'termination',
            'payment',
            'liability',
            'confidentiality',
            'intellectual_property',
            'dispute_resolution',
            'force_majeure',
            'duration',
            'internal_maintenance',
            'additions_alterations',
            'assignment',
            'other'
        ]
        
        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(self.clause_types)
        
        logger.info(f"Initialized CUAD Fine-tuner with {len(self.clause_types)} clause types")
    
    def load_cuad_labels(self):
        """Load and process CUAD label files"""
        training_data = []
        
        try:
            # Path to label group Excel files
            label_path = os.path.join(self.cuad_path, "label_group_xlsx")
            
            if not os.path.exists(label_path):
                logger.error(f"CUAD label path not found: {label_path}")
                return self.create_fallback_dataset()
            
            # Process each label file
            label_files = glob.glob(os.path.join(label_path, "*.xlsx"))
            logger.info(f"Found {len(label_files)} label files")
            
            for label_file in label_files:
                try:
                    # Extract clause type from filename
                    filename = os.path.basename(label_file)
                    clause_type = self.extract_clause_type_from_filename(filename)
                    
                    if clause_type not in self.clause_types:
                        continue
                    
                    # Read Excel file
                    df = pd.read_excel(label_file)
                    
                    # Process labeled examples
                    for _, row in df.iterrows():
                        if 'text' in row and pd.notna(row['text']):
                            text = str(row['text']).strip()
                            if len(text) > 20:  # Filter out very short texts
                                training_data.append({
                                    'text': text[:512],  # Truncate for BERT
                                    'label': clause_type
                                })
                
                except Exception as e:
                    logger.warning(f"Error processing {label_file}: {e}")
                    continue
            
            # Add synthetic examples for rental-specific clauses
            training_data.extend(self.generate_rental_clause_examples())
            
            logger.info(f"Loaded {len(training_data)} training examples from CUAD dataset")
            
            if len(training_data) == 0:
                return self.create_fallback_dataset()
            
            return self.create_dataset_from_examples(training_data)
            
        except Exception as e:
            logger.error(f"Error loading CUAD labels: {e}")
            return self.create_fallback_dataset()
    
    def extract_clause_type_from_filename(self, filename):
        """Extract clause type from CUAD label filename"""
        # Map CUAD filenames to our clause types
        filename_mapping = {
            'Anti-assignment': 'anti_assignment',
            'Audit Rights': 'audit_rights',
            'Covenant not to Sue': 'covenant_not_to_sue',
            'Dates': 'dates',
            'Document Name': 'document_name',
            'Governing Law': 'governing_law',
            'Insurance': 'insurance',
            'IP Ownership Assignment': 'ip_ownership_assignment',
            'Joint IP Ownership': 'joint_ip_ownership',
            'Licenses': 'licenses',
            'Liquidated Damages': 'liquidated_damages',
            'Minimum Commitment': 'minimum_commitment',
            'Most Favored Nation': 'most_favored_nation',
            'No-Solicit of Employees': 'no_solicit_employees',
            'Non-Compete, Exclusivity, No-Solicit': 'non_compete_exclusivity'
        }
        
        for key, value in filename_mapping.items():
            if key in filename:
                return value
        
        return 'other'
    
    def generate_rental_clause_examples(self):
        """Generate synthetic examples for rental-specific clauses"""
        return [
            # Duration clauses
            {'text': 'This lease shall commence on January 1, 2024 and shall continue for a period of 12 months', 'label': 'duration'},
            {'text': 'The term of this rental agreement is for one year beginning from the date of execution', 'label': 'duration'},
            {'text': 'Lease period shall be for 24 months from the commencement date', 'label': 'duration'},
            {'text': 'The initial term shall be three years with option to renew', 'label': 'duration'},
            
            # Internal Maintenance clauses
            {'text': 'Tenant shall be responsible for internal maintenance and repairs of the premises', 'label': 'internal_maintenance'},
            {'text': 'The lessee agrees to maintain the interior of the property in good condition', 'label': 'internal_maintenance'},
            {'text': 'Internal upkeep including painting and minor repairs shall be tenant responsibility', 'label': 'internal_maintenance'},
            {'text': 'Tenant must maintain all interior fixtures and fittings in working order', 'label': 'internal_maintenance'},
            
            # Additions and Alterations clauses
            {'text': 'No additions or alterations shall be made without prior written consent of landlord', 'label': 'additions_alterations'},
            {'text': 'Tenant may not modify or alter the premises without landlord approval', 'label': 'additions_alterations'},
            {'text': 'Any structural changes require written permission from the property owner', 'label': 'additions_alterations'},
            {'text': 'Alterations and improvements must be approved in writing before commencement', 'label': 'additions_alterations'},
        ]
    
    def create_dataset_from_examples(self, training_data):
        """Convert training examples to Dataset format"""
        texts = [item['text'] for item in training_data]
        labels = [self.label_encoder.transform([item['label']])[0] for item in training_data]
        
        return Dataset.from_dict({
            'text': texts,
            'labels': labels
        })
    
    def create_fallback_dataset(self):
        """Create fallback dataset if CUAD loading fails"""
        logger.warning("Using fallback dataset - CUAD dataset not available")
        
        fallback_data = [
            {'text': 'Payment shall be made within 30 days of invoice date', 'label': 'payment'},
            {'text': 'This agreement may be terminated with 30 days notice', 'label': 'termination'},
            {'text': 'Confidential information shall not be disclosed to third parties', 'label': 'confidentiality'},
            {'text': 'Liability shall be limited to the amount paid under this agreement', 'label': 'liability'},
            {'text': 'All intellectual property rights remain with the original owner', 'label': 'intellectual_property'},
            {'text': 'Disputes shall be resolved through binding arbitration', 'label': 'dispute_resolution'},
            {'text': 'This agreement shall be governed by the laws of the state', 'label': 'governing_law'},
            {'text': 'Force majeure events shall excuse performance delays', 'label': 'force_majeure'},
        ]
        
        # Add rental-specific examples
        fallback_data.extend(self.generate_rental_clause_examples())
        
        return self.create_dataset_from_examples(fallback_data)
    
    def fine_tune_model(self, model, output_dir="./models/cuad_fine_tuned"):
        """Fine-tune the model using CUAD dataset"""
        logger.info("Starting CUAD fine-tuning process...")
        
        # Load CUAD dataset
        dataset = self.load_cuad_labels()
        
        # Tokenize dataset
        def tokenize_function(examples):
            return self.tokenizer(
                examples['text'],
                truncation=True,
                padding=True,
                max_length=512,
                return_tensors='pt'
            )
        
        tokenized_dataset = dataset.map(tokenize_function, batched=True)
        
        # Split dataset
        train_size = int(0.8 * len(tokenized_dataset))
        train_dataset = tokenized_dataset.select(range(train_size))
        eval_dataset = tokenized_dataset.select(range(train_size, len(tokenized_dataset)))
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=3,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=16,
            warmup_steps=500,
            weight_decay=0.01,
            logging_dir='./logs',
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
        )
        
        # Initialize trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
        )
        
        # Fine-tune model
        logger.info("Starting training...")
        trainer.train()
        
        # Save fine-tuned model
        os.makedirs(output_dir, exist_ok=True)
        trainer.save_model(output_dir)
        
        # Save label encoder
        with open(f"{output_dir}/label_encoder.json", 'w') as f:
            json.dump({
                'classes': self.label_encoder.classes_.tolist()
            }, f)
        
        logger.info(f"Fine-tuning completed. Model saved to {output_dir}")
        
        return trainer

def fine_tune_cuad_model():
    """Main function to fine-tune model with CUAD dataset"""
    from bert_clause_classifier import BERTClauseClassifier
    
    fine_tuner = CUADFineTuner()
    
    # Initialize model
    model = BERTClauseClassifier(num_labels=len(fine_tuner.clause_types))
    
    # Fine-tune with CUAD data
    trainer = fine_tuner.fine_tune_model(model)
    
    return trainer

if __name__ == "__main__":
    fine_tune_cuad_model()
