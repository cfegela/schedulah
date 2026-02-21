import json
import os
import uuid
from datetime import datetime
import boto3
from decimal import Decimal

# DynamoDB client
dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url=os.environ.get('DYNAMODB_ENDPOINT', 'http://dynamodb-local:8000'),
    region_name='us-east-1',
    aws_access_key_id='dummy',
    aws_secret_access_key='dummy'
)

table = dynamodb.Table('Items')


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def handler(event, context):
    """
    AWS Lambda handler for Items CRUD API
    """
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    path_parameters = event.get('pathParameters') or {}

    try:
        if http_method == 'GET' and path == '/items':
            return list_items()
        elif http_method == 'GET' and path_parameters.get('id'):
            return get_item(path_parameters['id'])
        elif http_method == 'POST' and path == '/items':
            body = json.loads(event.get('body', '{}'))
            return create_item(body)
        elif http_method == 'PUT' and path_parameters.get('id'):
            body = json.loads(event.get('body', '{}'))
            return update_item(path_parameters['id'], body)
        elif http_method == 'DELETE' and path_parameters.get('id'):
            return delete_item(path_parameters['id'])
        else:
            return response(404, {'error': 'Not found'})
    except Exception as e:
        return response(500, {'error': str(e)})


def list_items():
    """Get all items"""
    result = table.scan()
    items = result.get('Items', [])
    return response(200, items)


def get_item(item_id):
    """Get a single item by ID"""
    result = table.get_item(Key={'id': item_id})
    item = result.get('Item')

    if not item:
        return response(404, {'error': 'Item not found'})

    return response(200, item)


def create_item(body):
    """Create a new item"""
    if not body.get('name'):
        return response(400, {'error': 'Name is required'})

    item = {
        'id': str(uuid.uuid4()),
        'name': body['name'],
        'description': body.get('description', ''),
        'createdAt': datetime.utcnow().isoformat()
    }

    table.put_item(Item=item)
    return response(201, item)


def update_item(item_id, body):
    """Update an existing item"""
    # Check if item exists
    result = table.get_item(Key={'id': item_id})
    if 'Item' not in result:
        return response(404, {'error': 'Item not found'})

    update_expr = []
    expr_attr_values = {}
    expr_attr_names = {}

    if 'name' in body:
        update_expr.append('#n = :name')
        expr_attr_values[':name'] = body['name']
        expr_attr_names['#n'] = 'name'

    if 'description' in body:
        update_expr.append('#d = :description')
        expr_attr_values[':description'] = body['description']
        expr_attr_names['#d'] = 'description'

    if not update_expr:
        return response(400, {'error': 'No fields to update'})

    response_data = table.update_item(
        Key={'id': item_id},
        UpdateExpression='SET ' + ', '.join(update_expr),
        ExpressionAttributeValues=expr_attr_values,
        ExpressionAttributeNames=expr_attr_names,
        ReturnValues='ALL_NEW'
    )

    return response(200, response_data['Attributes'])


def delete_item(item_id):
    """Delete an item"""
    # Check if item exists
    result = table.get_item(Key={'id': item_id})
    if 'Item' not in result:
        return response(404, {'error': 'Item not found'})

    table.delete_item(Key={'id': item_id})
    return response(200, {'message': 'Item deleted successfully'})


def response(status_code, body):
    """Create API Gateway proxy response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }
