#!/usr/bin/env python3
"""
Feedback Summary Generator for Trust & Safety Module
"""

import json
import sys
import argparse
from datetime import datetime, timedelta
from accountability_system import FeedbackCollector

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Generate feedback summary')
    parser.add_argument('--days', type=int, default=30, help='Number of days to analyze')
    parser.add_argument('--summary_only', type=bool, default=False, help='Return summary only')
    
    args = parser.parse_args()
    
    try:
        collector = FeedbackCollector()
        
        if args.summary_only:
            # Return basic summary for dashboard
            summary = collector.get_feedback_summary(args.days)
        else:
            # Return detailed feedback data
            summary = collector.get_feedback_summary(args.days)
            
        print(json.dumps(summary, default=str))
        
    except Exception as e:
        error_result = {
            'total_feedback': 0,
            'corrections': 0,
            'avg_confidence': 0,
            'unique_users_count': 0,
            'prediction_accuracy': 0,
            'date_range': {
                'start': (datetime.now() - timedelta(days=args.days)).isoformat(),
                'end': datetime.now().isoformat(),
                'days': args.days
            }
        }
        print(json.dumps(error_result))

if __name__ == '__main__':
    main()
