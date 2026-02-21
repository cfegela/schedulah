import json
import os
import uuid
from datetime import datetime
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key

# DynamoDB client
dynamodb = boto3.resource(
    'dynamodb',
    endpoint_url=os.environ.get('DYNAMODB_ENDPOINT', 'http://dynamodb-local:8000'),
    region_name='us-east-1',
    aws_access_key_id='dummy',
    aws_secret_access_key='dummy'
)

table = dynamodb.Table('Items')
reservations_table = dynamodb.Table('Reservations')
available_dates_table = dynamodb.Table('AvailableDates')


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
    query_parameters = event.get('queryStringParameters') or {}

    try:
        # Availability routes (must come before item routes to prevent path conflicts)
        if '/availability' in path:
            item_id = path_parameters.get('id')
            date = path_parameters.get('date')

            if http_method == 'GET' and item_id:
                return list_available_dates(item_id, query_parameters)
            elif http_method == 'POST' and item_id:
                body = json.loads(event.get('body', '{}'))
                return set_available_dates(item_id, body)
            elif http_method == 'DELETE' and item_id and date:
                return remove_available_date(item_id, date)

        # Reservation routes (must come before item routes to prevent path conflicts)
        if '/reservations' in path:
            item_id = path_parameters.get('id')
            date = path_parameters.get('date')

            if http_method == 'GET' and item_id:
                return list_reservations(item_id, query_parameters)
            elif http_method == 'POST' and item_id:
                body = json.loads(event.get('body', '{}'))
                return create_reservation(item_id, body)
            elif http_method == 'DELETE' and item_id and date:
                return delete_reservation(item_id, date)

        # Item routes
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


def list_available_dates(item_id, query_params):
    """Get available dates for an item within a date range"""
    start_date = query_params.get('startDate')
    end_date = query_params.get('endDate')

    try:
        if start_date and end_date:
            # Query with date range
            result = available_dates_table.query(
                KeyConditionExpression=Key('itemId').eq(item_id) & Key('date').between(start_date, end_date)
            )
        else:
            # Query all available dates for the item
            result = available_dates_table.query(
                KeyConditionExpression=Key('itemId').eq(item_id)
            )

        dates = result.get('Items', [])
        return response(200, dates)
    except Exception as e:
        return response(500, {'error': str(e)})


def set_available_dates(item_id, body):
    """Set dates as available (toggle on) or remove dates (toggle off)"""
    dates = body.get('dates', [])
    action = body.get('action', 'add')  # 'add' or 'remove'

    if not dates:
        return response(400, {'error': 'At least one date is required'})

    # Verify item exists
    item_result = table.get_item(Key={'id': item_id})
    if 'Item' not in item_result:
        return response(404, {'error': 'Item not found'})

    try:
        if action == 'add':
            # Add dates to available dates
            for date in dates:
                available_dates_table.put_item(
                    Item={
                        'itemId': item_id,
                        'date': date,
                        'createdAt': datetime.utcnow().isoformat()
                    }
                )
            return response(200, {'message': f'{len(dates)} date(s) marked as available'})

        elif action == 'remove':
            # Remove dates from available dates
            for date in dates:
                available_dates_table.delete_item(
                    Key={'itemId': item_id, 'date': date}
                )
            return response(200, {'message': f'{len(dates)} date(s) removed from availability'})

        else:
            return response(400, {'error': 'Invalid action. Use "add" or "remove"'})

    except Exception as e:
        return response(500, {'error': str(e)})


def remove_available_date(item_id, date):
    """Remove a specific date from available dates"""
    try:
        available_dates_table.delete_item(Key={'itemId': item_id, 'date': date})
        return response(200, {'message': 'Date removed from availability'})
    except Exception as e:
        return response(500, {'error': str(e)})


def list_reservations(item_id, query_params):
    """Get reservations for an item within a date range"""
    start_date = query_params.get('startDate')
    end_date = query_params.get('endDate')

    try:
        if start_date and end_date:
            # Query with date range
            result = reservations_table.query(
                KeyConditionExpression=Key('itemId').eq(item_id) & Key('date').between(start_date, end_date)
            )
        else:
            # Query all reservations for the item
            result = reservations_table.query(
                KeyConditionExpression=Key('itemId').eq(item_id)
            )

        reservations = result.get('Items', [])
        return response(200, reservations)
    except Exception as e:
        return response(500, {'error': str(e)})


def create_reservation(item_id, body):
    """Create reservation(s) for an item"""
    dates = body.get('dates', [])
    reserved_by = body.get('reservedBy', '').strip()
    notes = body.get('notes', '').strip()

    if not dates:
        return response(400, {'error': 'At least one date is required'})

    if not reserved_by:
        return response(400, {'error': 'reservedBy is required'})

    # Verify item exists
    item_result = table.get_item(Key={'id': item_id})
    if 'Item' not in item_result:
        return response(404, {'error': 'Item not found'})

    created_reservations = []
    failed_dates = []

    # Create reservation for each date
    for date in dates:
        try:
            reservation = {
                'itemId': item_id,
                'date': date,
                'reservedBy': reserved_by,
                'notes': notes,
                'createdAt': datetime.utcnow().isoformat()
            }

            # Use conditional put to prevent double-booking
            reservations_table.put_item(
                Item=reservation,
                ConditionExpression='attribute_not_exists(itemId) AND attribute_not_exists(#d)',
                ExpressionAttributeNames={'#d': 'date'}
            )

            created_reservations.append(reservation)
        except reservations_table.meta.client.exceptions.ConditionalCheckFailedException:
            failed_dates.append(date)
        except Exception as e:
            return response(500, {'error': f'Failed to create reservation for {date}: {str(e)}'})

    if failed_dates:
        return response(409, {
            'error': 'Some dates are already reserved',
            'failedDates': failed_dates,
            'createdReservations': created_reservations
        })

    return response(201, created_reservations)


def delete_reservation(item_id, date):
    """Cancel a reservation for a specific date"""
    try:
        # Check if reservation exists
        result = reservations_table.get_item(Key={'itemId': item_id, 'date': date})
        if 'Item' not in result:
            return response(404, {'error': 'Reservation not found'})

        reservations_table.delete_item(Key={'itemId': item_id, 'date': date})
        return response(200, {'message': 'Reservation cancelled successfully'})
    except Exception as e:
        return response(500, {'error': str(e)})


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
