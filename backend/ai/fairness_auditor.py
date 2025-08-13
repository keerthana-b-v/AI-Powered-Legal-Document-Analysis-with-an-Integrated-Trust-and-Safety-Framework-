"""
Fairness Auditor for Legal Document Analysis
Detects and reports bias in AI model predictions across different contract types
"""

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import json
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class FairnessAuditor:
    """
    Audits AI model predictions for fairness across different contract types
    """
    
    def __init__(self, config_path=None):
        self.config = self._load_config(config_path)
        self.bias_thresholds = self.config.get('bias_thresholds', {
            'performance_disparity': 0.1,
            'demographic_parity': 0.1,
            'high_severity_threshold': 0.2
        })
        
        self.contract_categories = self.config.get('contract_categories', {
            'rental': ["lease", "rental", "tenancy", "landlord"],
            'employment': ["employment", "job", "work", "employee"],
            'service': ["service", "consulting", "professional"],
            'sales': ["purchase", "sale", "buy", "sell"],
            'partnership': ["partnership", "joint", "collaboration"],
            'nda': ["confidentiality", "non-disclosure", "nda"]
        })
        
        self.metrics_to_calculate = self.config.get('metrics_to_calculate', 
                                                  ["accuracy", "f1_score", "precision", "recall"])
    
    def _load_config(self, config_path):
        """Load configuration from file or use defaults"""
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                return json.load(f)
        
        # Default configuration
        return {
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
    
    def load_predictions_data(self, data_path):
        """
        Load predictions data from CSV file
        Expected columns: clause_text, predicted_label, true_label, contract_type
        """
        try:
            df = pd.read_csv(data_path)
            required_columns = ['clause_text', 'predicted_label', 'true_label', 'contract_type']
            
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            logger.info(f"Loaded {len(df)} predictions from {data_path}")
            return df
            
        except Exception as e:
            logger.error(f"Error loading predictions data: {e}")
            raise
    
    def calculate_performance_metrics(self, y_true, y_pred):
        """Calculate standard performance metrics"""
        metrics = {}
        
        if 'accuracy' in self.metrics_to_calculate:
            metrics['accuracy'] = accuracy_score(y_true, y_pred)
        
        if 'precision' in self.metrics_to_calculate:
            metrics['precision'] = precision_score(y_true, y_pred, average='weighted', zero_division=0)
        
        if 'recall' in self.metrics_to_calculate:
            metrics['recall'] = recall_score(y_true, y_pred, average='weighted', zero_division=0)
        
        if 'f1_score' in self.metrics_to_calculate:
            metrics['f1_score'] = f1_score(y_true, y_pred, average='weighted', zero_division=0)
        
        return metrics
    
    def calculate_fairness_metrics(self, df):
        """
        Calculate fairness metrics across different contract types
        """
        results = {
            'overall_metrics': {},
            'group_metrics': {},
            'bias_issues': [],
            'recommendations': [],
            'audit_timestamp': datetime.now().isoformat()
        }
        
        # Overall performance
        overall_metrics = self.calculate_performance_metrics(
            df['true_label'], df['predicted_label']
        )
        results['overall_metrics'] = overall_metrics
        
        # Performance by contract type
        contract_types = df['contract_type'].unique()
        group_metrics = {}
        
        for contract_type in contract_types:
            subset = df[df['contract_type'] == contract_type]
            if len(subset) > 0:
                metrics = self.calculate_performance_metrics(
                    subset['true_label'], subset['predicted_label']
                )
                group_metrics[contract_type] = {
                    'metrics': metrics,
                    'sample_size': len(subset)
                }
        
        results['group_metrics'] = group_metrics
        
        # Detect bias issues
        bias_issues = self._detect_bias_issues(overall_metrics, group_metrics)
        results['bias_issues'] = bias_issues
        
        # Generate recommendations
        recommendations = self._generate_recommendations(bias_issues, group_metrics)
        results['recommendations'] = recommendations
        
        return results
    
    def _detect_bias_issues(self, overall_metrics, group_metrics):
        """Detect potential bias issues"""
        bias_issues = []
        
        # Check for performance disparities
        for metric_name in self.metrics_to_calculate:
            if metric_name not in overall_metrics:
                continue
                
            overall_score = overall_metrics[metric_name]
            group_scores = []
            
            for contract_type, data in group_metrics.items():
                if metric_name in data['metrics']:
                    group_scores.append({
                        'contract_type': contract_type,
                        'score': data['metrics'][metric_name],
                        'sample_size': data['sample_size']
                    })
            
            if len(group_scores) < 2:
                continue
            
            # Find max and min performance
            max_score = max(group_scores, key=lambda x: x['score'])
            min_score = min(group_scores, key=lambda x: x['score'])
            
            disparity = max_score['score'] - min_score['score']
            
            if disparity > self.bias_thresholds['performance_disparity']:
                severity = 'high' if disparity > self.bias_thresholds['high_severity_threshold'] else 'medium'
                
                bias_issues.append({
                    'type': 'performance_disparity',
                    'metric': metric_name,
                    'severity': severity,
                    'disparity': disparity,
                    'best_performing': max_score['contract_type'],
                    'worst_performing': min_score['contract_type'],
                    'best_score': max_score['score'],
                    'worst_score': min_score['score'],
                    'description': f"{metric_name.title()} disparity of {disparity:.3f} between {max_score['contract_type']} and {min_score['contract_type']} contracts"
                })
        
        return bias_issues
    
    def _generate_recommendations(self, bias_issues, group_metrics):
        """Generate recommendations based on detected issues"""
        recommendations = []
        
        if not bias_issues:
            recommendations.append({
                'type': 'positive',
                'priority': 'low',
                'title': 'No significant bias detected',
                'description': 'The model shows relatively fair performance across contract types.',
                'action': 'Continue monitoring with regular audits.'
            })
            return recommendations
        
        # Group issues by severity
        high_severity_issues = [issue for issue in bias_issues if issue['severity'] == 'high']
        medium_severity_issues = [issue for issue in bias_issues if issue['severity'] == 'medium']
        
        if high_severity_issues:
            recommendations.append({
                'type': 'critical',
                'priority': 'high',
                'title': 'Critical bias issues detected',
                'description': f'Found {len(high_severity_issues)} high-severity bias issues requiring immediate attention.',
                'action': 'Review training data balance, consider data augmentation for underperforming contract types, and retrain model.'
            })
        
        if medium_severity_issues:
            recommendations.append({
                'type': 'warning',
                'priority': 'medium',
                'title': 'Moderate bias issues detected',
                'description': f'Found {len(medium_severity_issues)} medium-severity bias issues.',
                'action': 'Monitor closely and consider targeted improvements for affected contract types.'
            })
        
        # Specific recommendations for underperforming groups
        underperforming_types = set()
        for issue in bias_issues:
            underperforming_types.add(issue['worst_performing'])
        
        for contract_type in underperforming_types:
            sample_size = group_metrics.get(contract_type, {}).get('sample_size', 0)
            
            if sample_size < 50:  # Arbitrary threshold
                recommendations.append({
                    'type': 'data',
                    'priority': 'medium',
                    'title': f'Insufficient data for {contract_type} contracts',
                    'description': f'Only {sample_size} samples available for {contract_type} contracts.',
                    'action': f'Collect more training data for {contract_type} contracts to improve model performance.'
                })
        
        return recommendations
    
    def create_visualizations(self, results, output_dir='fairness_visualizations'):
        """Create visualization charts for the audit results"""
        try:
            os.makedirs(output_dir, exist_ok=True)
            
            # Performance comparison chart
            self._create_performance_comparison_chart(results, output_dir)
            
            # Bias severity chart
            self._create_bias_severity_chart(results, output_dir)
            
            logger.info(f"Visualizations saved to {output_dir}")
            
        except Exception as e:
            logger.error(f"Error creating visualizations: {e}")
    
    def _create_performance_comparison_chart(self, results, output_dir):
        """Create performance comparison chart across contract types"""
        group_metrics = results['group_metrics']
        
        if not group_metrics:
            return
        
        # Prepare data for plotting
        contract_types = list(group_metrics.keys())
        metrics_data = {}
        
        for metric in self.metrics_to_calculate:
            metrics_data[metric] = []
            for contract_type in contract_types:
                score = group_metrics[contract_type]['metrics'].get(metric, 0)
                metrics_data[metric].append(score)
        
        # Create subplot for each metric
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        axes = axes.flatten()
        
        for i, metric in enumerate(self.metrics_to_calculate[:4]):  # Max 4 metrics
            if i < len(axes):
                ax = axes[i]
                bars = ax.bar(contract_types, metrics_data[metric])
                ax.set_title(f'{metric.title()} by Contract Type')
                ax.set_ylabel(metric.title())
                ax.set_ylim(0, 1)
                
                # Add value labels on bars
                for bar in bars:
                    height = bar.get_height()
                    ax.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                           f'{height:.3f}', ha='center', va='bottom')
                
                # Rotate x-axis labels if needed
                plt.setp(ax.get_xticklabels(), rotation=45, ha='right')
        
        # Remove empty subplots
        for i in range(len(self.metrics_to_calculate), len(axes)):
            fig.delaxes(axes[i])
        
        plt.tight_layout()
        plt.savefig(f'{output_dir}/performance_comparison.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def _create_bias_severity_chart(self, results, output_dir):
        """Create bias severity overview chart"""
        bias_issues = results['bias_issues']
        
        if not bias_issues:
            # Create a "no issues" chart
            fig, ax = plt.subplots(figsize=(8, 6))
            ax.text(0.5, 0.5, 'No Significant Bias Issues Detected', 
                   ha='center', va='center', fontsize=16, color='green')
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            ax.axis('off')
            plt.savefig(f'{output_dir}/bias_severity.png', dpi=300, bbox_inches='tight')
            plt.close()
            return
        
        # Count issues by severity
        severity_counts = {}
        for issue in bias_issues:
            severity = issue['severity']
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # Create pie chart
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Severity distribution
        colors = {'high': '#ff4444', 'medium': '#ffaa44', 'low': '#44ff44'}
        wedges, texts, autotexts = ax1.pie(
            severity_counts.values(), 
            labels=severity_counts.keys(),
            colors=[colors.get(k, '#cccccc') for k in severity_counts.keys()],
            autopct='%1.0f%%',
            startangle=90
        )
        ax1.set_title('Bias Issues by Severity')
        
        # Issues by metric
        metric_counts = {}
        for issue in bias_issues:
            metric = issue['metric']
            metric_counts[metric] = metric_counts.get(metric, 0) + 1
        
        ax2.bar(metric_counts.keys(), metric_counts.values())
        ax2.set_title('Bias Issues by Metric')
        ax2.set_ylabel('Number of Issues')
        plt.setp(ax2.get_xticklabels(), rotation=45, ha='right')
        
        plt.tight_layout()
        plt.savefig(f'{output_dir}/bias_severity.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def generate_report(self, results, output_path='fairness_report.json'):
        """Generate comprehensive fairness audit report"""
        try:
            # Add summary statistics
            report = results.copy()
            report['summary'] = {
                'total_bias_issues': len(results['bias_issues']),
                'high_severity_issues': len([i for i in results['bias_issues'] if i['severity'] == 'high']),
                'medium_severity_issues': len([i for i in results['bias_issues'] if i['severity'] == 'medium']),
                'contract_types_analyzed': len(results['group_metrics']),
                'total_recommendations': len(results['recommendations'])
            }
            
            # Save report
            with open(output_path, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            logger.info(f"Fairness audit report saved to {output_path}")
            return report
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            raise
    
    def run_full_audit(self, data_path, output_dir='fairness_reports'):
        """
        Run complete fairness audit with visualizations and report
        """
        try:
            # Create output directory
            os.makedirs(output_dir, exist_ok=True)
            
            # Load data and calculate metrics
            df = self.load_predictions_data(data_path)
            results = self.calculate_fairness_metrics(df)
            
            # Create visualizations
            viz_dir = os.path.join(output_dir, 'visualizations')
            self.create_visualizations(results, viz_dir)
            
            # Generate report
            report_path = os.path.join(output_dir, f'fairness_audit_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json')
            report = self.generate_report(results, report_path)
            
            logger.info("Fairness audit completed successfully")
            return report
            
        except Exception as e:
            logger.error(f"Error running fairness audit: {e}")
            raise

# Example usage
if __name__ == "__main__":
    auditor = FairnessAuditor()
    
    # Run audit on sample data
    try:
        report = auditor.run_full_audit('datasets/sample_predictions.csv')
        print("Fairness Audit Summary:")
        print(f"- Total issues found: {report['summary']['total_bias_issues']}")
        print(f"- High severity: {report['summary']['high_severity_issues']}")
        print(f"- Medium severity: {report['summary']['medium_severity_issues']}")
        print(f"- Recommendations: {report['summary']['total_recommendations']}")
    except Exception as e:
        print(f"Error running audit: {e}")
