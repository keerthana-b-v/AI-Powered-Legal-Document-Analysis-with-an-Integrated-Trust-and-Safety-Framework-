import json
import sys
from datetime import datetime

def collect_feedback(feedback_data):
    """Collect and store human feedback"""
    
    feedback_id = f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(str(feedback_data)) % 10000}"
    
    # In a real implementation, this would save to database
    result = {
        'feedback_id': feedback_id,
        'timestamp': datetime.now().isoformat(),
        'status': 'stored',
        'original_text': feedback_data.get('original_text', ''),
        'model_prediction': feedback_data.get('model_prediction', ''),
        'user_correction': feedback_data.get('user_correction', ''),
        'model_confidence': feedback_data.get('model_confidence', 0),
        'user_id': feedback_data.get('user_id', 'anonymous')
    }
    
    return result

if __name__ == '__main__':
    try:
        if len(sys.argv) > 1:
            data = json.loads(sys.argv[1])
        else:
            data = {}
        
        result = collect_feedback(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
