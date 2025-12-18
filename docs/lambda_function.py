"""
AWS Lambda Function for EventBridge → API Trigger (Python 3.11)

This Lambda function receives events from EventBridge and forwards them
to your Next.js API endpoint to process refunds.

DEPLOYMENT INSTRUCTIONS:
1. Create new Lambda function in AWS Console
2. Runtime: Python 3.11
3. Copy this code into lambda_function.py
4. Set environment variable: API_ENDPOINT=https://yourdomain.com
5. Set timeout to 60 seconds
6. Give Lambda permission to be invoked by EventBridge

IAM Policy for Lambda:
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "events.amazonaws.com"
    },
    "Action": "lambda:InvokeFunction",
    "Resource": "arn:aws:lambda:REGION:ACCOUNT_ID:function:protagonist-refund-trigger"
  }]
}
"""

import json
import os
import urllib.request
import urllib.error
from typing import Dict, Any


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda function triggered by EventBridge to process refunds.
    
    Args:
        event: EventBridge event with userId, subscriptionId, action
        context: Lambda context
        
    Returns:
        Response with statusCode and body
    """
    print(f'EventBridge trigger received: {json.dumps(event)}')
    
    # Get API endpoint from environment variable
    api_endpoint = os.environ.get('API_ENDPOINT')
    
    if not api_endpoint:
        raise ValueError('API_ENDPOINT environment variable not set')
    
    # Extract event data
    user_id = event.get('userId')
    subscription_id = event.get('subscriptionId')
    action = event.get('action')
    scheduled_time = event.get('scheduledTime')
    
    if not user_id or not action:
        raise ValueError('Missing required fields: userId or action')
    
    print(f'Processing {action} for user {user_id}')
    
    # Prepare request data
    request_data = {
        'userId': user_id,
        'subscriptionId': subscription_id,
        'action': action,
        'scheduledTime': scheduled_time
    }
    
    # Make HTTP POST request to API
    url = f'{api_endpoint}/api/stripe/process-refund'
    headers = {
        'Content-Type': 'application/json'
    }
    
    try:
        # Encode data as JSON
        data = json.dumps(request_data).encode('utf-8')
        
        # Create request
        req = urllib.request.Request(
            url,
            data=data,
            headers=headers,
            method='POST'
        )
        
        # Make request with 30 second timeout
        with urllib.request.urlopen(req, timeout=30) as response:
            response_data = json.loads(response.read().decode('utf-8'))
            
        print(f'Success: {json.dumps(response_data)}')
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Pre-billing check completed successfully',
                'data': response_data
            })
        }
        
    except urllib.error.HTTPError as e:
        # API returned an error status code
        error_body = e.read().decode('utf-8')
        print(f'API error: {e.code} - {error_body}')
        
        return {
            'statusCode': e.code,
            'body': json.dumps({
                'error': 'API request failed',
                'status_code': e.code,
                'details': error_body
            })
        }
        
    except urllib.error.URLError as e:
        # Network error (connection failed, timeout, etc.)
        print(f'Connection error: {str(e)}')
        raise Exception(f'Failed to connect to API: {str(e)}')
        
    except Exception as e:
        # Unexpected error
        print(f'Unexpected error: {str(e)}')
        raise


# For local testing (optional)
if __name__ == '__main__':
    # Test event
    test_event = {
        'userId': 'test-user-123',
        'subscriptionId': 'sub_test123',
        'action': 'pre_billing_check',
        'scheduledTime': '2025-12-30T23:00:00.000Z'
    }
    
    # Set environment variable for testing
    os.environ['API_ENDPOINT'] = 'http://localhost:3000'
    
    # Call handler
    result = lambda_handler(test_event, None)
    print(f'Result: {json.dumps(result, indent=2)}')

