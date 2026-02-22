from flask import Flask, request, jsonify
from flask_cors import CORS
from handler import handler
import json
import boto3
import os
import time

# Initialize DynamoDB tables on startup
def init_dynamodb_tables():
    """Create DynamoDB tables if they don't exist"""
    endpoint_url = os.environ.get('DYNAMODB_ENDPOINT', 'http://localhost:8000')

    dynamodb = boto3.client(
        'dynamodb',
        endpoint_url=endpoint_url,
        region_name='us-east-1',
        aws_access_key_id='dummy',
        aws_secret_access_key='dummy'
    )

    # Wait for DynamoDB to be ready
    print("Waiting for DynamoDB to be ready...")
    max_retries = 30
    for i in range(max_retries):
        try:
            dynamodb.list_tables()
            print("DynamoDB is ready!")
            break
        except Exception as e:
            if i < max_retries - 1:
                time.sleep(1)
            else:
                print(f"Failed to connect to DynamoDB after {max_retries} attempts")
                raise

    tables = [
        {
            'name': 'Items',
            'key_schema': [{'AttributeName': 'id', 'KeyType': 'HASH'}],
            'attribute_definitions': [{'AttributeName': 'id', 'AttributeType': 'S'}]
        },
        {
            'name': 'Reservations',
            'key_schema': [
                {'AttributeName': 'itemId', 'KeyType': 'HASH'},
                {'AttributeName': 'date', 'KeyType': 'RANGE'}
            ],
            'attribute_definitions': [
                {'AttributeName': 'itemId', 'AttributeType': 'S'},
                {'AttributeName': 'date', 'AttributeType': 'S'}
            ]
        },
        {
            'name': 'AvailableDates',
            'key_schema': [
                {'AttributeName': 'itemId', 'KeyType': 'HASH'},
                {'AttributeName': 'date', 'KeyType': 'RANGE'}
            ],
            'attribute_definitions': [
                {'AttributeName': 'itemId', 'AttributeType': 'S'},
                {'AttributeName': 'date', 'AttributeType': 'S'}
            ]
        }
    ]

    for table_config in tables:
        try:
            # Check if table exists
            existing_tables = dynamodb.list_tables()['TableNames']

            if table_config['name'] not in existing_tables:
                print(f"Creating {table_config['name']} table...")
                dynamodb.create_table(
                    TableName=table_config['name'],
                    KeySchema=table_config['key_schema'],
                    AttributeDefinitions=table_config['attribute_definitions'],
                    BillingMode='PAY_PER_REQUEST'
                )
                print(f"{table_config['name']} table created successfully!")
            else:
                print(f"{table_config['name']} table already exists")
        except Exception as e:
            print(f"Error creating {table_config['name']} table: {e}")

# Initialize tables before starting the app
init_dynamodb_tables()

app = Flask(__name__)
CORS(app)


def create_lambda_event(method, path, body=None, path_params=None):
    """Convert Flask request to Lambda API Gateway proxy event"""
    event = {
        'httpMethod': method,
        'path': path,
        'pathParameters': path_params,
        'headers': dict(request.headers),
        'queryStringParameters': dict(request.args) if request.args else None,
        'body': body
    }
    return event


@app.route('/items', methods=['GET', 'POST', 'OPTIONS'])
def items():
    if request.method == 'OPTIONS':
        return '', 204

    event = create_lambda_event(
        request.method,
        '/items',
        request.data.decode('utf-8') if request.data else None
    )

    lambda_response = handler(event, None)

    return (
        lambda_response['body'],
        lambda_response['statusCode'],
        lambda_response['headers']
    )


@app.route('/items/<item_id>', methods=['GET', 'PUT', 'DELETE', 'OPTIONS'])
def item(item_id):
    if request.method == 'OPTIONS':
        return '', 204

    event = create_lambda_event(
        request.method,
        f'/items/{item_id}',
        request.data.decode('utf-8') if request.data else None,
        {'id': item_id}
    )

    lambda_response = handler(event, None)

    return (
        lambda_response['body'],
        lambda_response['statusCode'],
        lambda_response['headers']
    )


@app.route('/items/<item_id>/availability', methods=['GET', 'POST', 'OPTIONS'])
def availability(item_id):
    if request.method == 'OPTIONS':
        return '', 204

    event = create_lambda_event(
        request.method,
        f'/items/{item_id}/availability',
        request.data.decode('utf-8') if request.data else None,
        {'id': item_id}
    )

    lambda_response = handler(event, None)

    return (
        lambda_response['body'],
        lambda_response['statusCode'],
        lambda_response['headers']
    )


@app.route('/items/<item_id>/availability/<date>', methods=['DELETE', 'OPTIONS'])
def availability_date(item_id, date):
    if request.method == 'OPTIONS':
        return '', 204

    event = create_lambda_event(
        request.method,
        f'/items/{item_id}/availability/{date}',
        request.data.decode('utf-8') if request.data else None,
        {'id': item_id, 'date': date}
    )

    lambda_response = handler(event, None)

    return (
        lambda_response['body'],
        lambda_response['statusCode'],
        lambda_response['headers']
    )


@app.route('/items/<item_id>/reservations', methods=['GET', 'POST', 'OPTIONS'])
def reservations(item_id):
    if request.method == 'OPTIONS':
        return '', 204

    event = create_lambda_event(
        request.method,
        f'/items/{item_id}/reservations',
        request.data.decode('utf-8') if request.data else None,
        {'id': item_id}
    )

    lambda_response = handler(event, None)

    return (
        lambda_response['body'],
        lambda_response['statusCode'],
        lambda_response['headers']
    )


@app.route('/items/<item_id>/reservations/<date>', methods=['DELETE', 'OPTIONS'])
def reservation(item_id, date):
    if request.method == 'OPTIONS':
        return '', 204

    event = create_lambda_event(
        request.method,
        f'/items/{item_id}/reservations/{date}',
        request.data.decode('utf-8') if request.data else None,
        {'id': item_id, 'date': date}
    )

    lambda_response = handler(event, None)

    return (
        lambda_response['body'],
        lambda_response['statusCode'],
        lambda_response['headers']
    )


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
