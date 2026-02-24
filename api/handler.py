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

table = dynamodb.Table('Rentals')
reservations_table = dynamodb.Table('Reservations')
available_dates_table = dynamodb.Table('AvailableDates')


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def handler(event, context):
    """
    AWS Lambda handler for Rentals CRUD API
    """
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    path_parameters = event.get('pathParameters') or {}
    query_parameters = event.get('queryStringParameters') or {}

    try:
        # Availability routes (must come before rental routes to prevent path conflicts)
        if '/availability' in path:
            rental_id = path_parameters.get('id')
            date = path_parameters.get('date')

            if http_method == 'GET' and rental_id:
                return list_available_dates(rental_id, query_parameters)
            elif http_method == 'POST' and rental_id:
                body = json.loads(event.get('body', '{}'))
                return set_available_dates(rental_id, body)
            elif http_method == 'DELETE' and rental_id and date:
                return remove_available_date(rental_id, date)

        # Reservation routes (must come before rental routes to prevent path conflicts)
        if '/reservations' in path:
            rental_id = path_parameters.get('id')
            date = path_parameters.get('date')

            if http_method == 'GET' and rental_id:
                return list_reservations(rental_id, query_parameters)
            elif http_method == 'POST' and rental_id:
                body = json.loads(event.get('body', '{}'))
                return create_reservation(rental_id, body)
            elif http_method == 'DELETE' and rental_id and date:
                return delete_reservation(rental_id, date)

        # Rental routes
        if http_method == 'GET' and path == '/rentals':
            return list_rentals()
        elif http_method == 'GET' and path_parameters.get('id'):
            return get_rental(path_parameters['id'])
        elif http_method == 'POST' and path == '/rentals':
            body = json.loads(event.get('body', '{}'))
            return create_rental(body)
        elif http_method == 'PUT' and path_parameters.get('id'):
            body = json.loads(event.get('body', '{}'))
            return update_rental(path_parameters['id'], body)
        elif http_method == 'DELETE' and path_parameters.get('id'):
            return delete_rental(path_parameters['id'])
        else:
            return response(404, {'error': 'Not found'})
    except Exception as e:
        return response(500, {'error': str(e)})


def list_rentals():
    """Get all rentals"""
    result = table.scan()
    rentals = result.get('Items', [])
    return response(200, rentals)


def get_rental(rental_id):
    """Get a single rental by ID"""
    result = table.get_item(Key={'id': rental_id})
    rental = result.get('Item')

    if not rental:
        return response(404, {'error': 'Rental not found'})

    return response(200, rental)


def create_rental(body):
    """Create a new rental"""
    if not body.get('name'):
        return response(400, {'error': 'Name is required'})

    rental = {
        'id': str(uuid.uuid4()),
        'name': body['name'],
        'description': body.get('description', ''),
        'createdAt': datetime.utcnow().isoformat()
    }

    table.put_item(Item=rental)
    return response(201, rental)


def update_rental(rental_id, body):
    """Update an existing rental"""
    # Check if rental exists
    result = table.get_item(Key={'id': rental_id})
    if 'Item' not in result:
        return response(404, {'error': 'Rental not found'})

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
        Key={'id': rental_id},
        UpdateExpression='SET ' + ', '.join(update_expr),
        ExpressionAttributeValues=expr_attr_values,
        ExpressionAttributeNames=expr_attr_names,
        ReturnValues='ALL_NEW'
    )

    return response(200, response_data['Attributes'])


def delete_rental(rental_id):
    """Delete a rental"""
    # Check if rental exists
    result = table.get_item(Key={'id': rental_id})
    if 'Item' not in result:
        return response(404, {'error': 'Rental not found'})

    table.delete_item(Key={'id': rental_id})
    return response(200, {'message': 'Rental deleted successfully'})


def list_available_dates(rental_id, query_params):
    """Get available dates for a rental within a date range"""
    start_date = query_params.get('startDate')
    end_date = query_params.get('endDate')

    try:
        if start_date and end_date:
            # Query with date range
            result = available_dates_table.query(
                KeyConditionExpression=Key('rentalId').eq(rental_id) & Key('date').between(start_date, end_date)
            )
        else:
            # Query all available dates for the rental
            result = available_dates_table.query(
                KeyConditionExpression=Key('rentalId').eq(rental_id)
            )

        dates = result.get('Items', [])
        return response(200, dates)
    except Exception as e:
        return response(500, {'error': str(e)})


def set_available_dates(rental_id, body):
    """Set dates as available (toggle on) or remove dates (toggle off)"""
    dates = body.get('dates', [])
    action = body.get('action', 'add')  # 'add' or 'remove'

    if not dates:
        return response(400, {'error': 'At least one date is required'})

    # Verify rental exists
    rental_result = table.get_item(Key={'id': rental_id})
    if 'Item' not in rental_result:
        return response(404, {'error': 'Rental not found'})

    try:
        if action == 'add':
            # Add dates to available dates
            for date in dates:
                available_dates_table.put_item(
                    Item={
                        'rentalId': rental_id,
                        'date': date,
                        'createdAt': datetime.utcnow().isoformat()
                    }
                )
            return response(200, {'message': f'{len(dates)} date(s) marked as available'})

        elif action == 'remove':
            # Remove dates from available dates
            for date in dates:
                available_dates_table.delete_item(
                    Key={'rentalId': rental_id, 'date': date}
                )
            return response(200, {'message': f'{len(dates)} date(s) removed from availability'})

        else:
            return response(400, {'error': 'Invalid action. Use "add" or "remove"'})

    except Exception as e:
        return response(500, {'error': str(e)})


def remove_available_date(rental_id, date):
    """Remove a specific date from available dates"""
    try:
        available_dates_table.delete_item(Key={'rentalId': rental_id, 'date': date})
        return response(200, {'message': 'Date removed from availability'})
    except Exception as e:
        return response(500, {'error': str(e)})


def list_reservations(rental_id, query_params):
    """Get reservations for a rental within a date range"""
    start_date = query_params.get('startDate')
    end_date = query_params.get('endDate')

    try:
        if start_date and end_date:
            # Query with date range
            result = reservations_table.query(
                KeyConditionExpression=Key('rentalId').eq(rental_id) & Key('date').between(start_date, end_date)
            )
        else:
            # Query all reservations for the rental
            result = reservations_table.query(
                KeyConditionExpression=Key('rentalId').eq(rental_id)
            )

        reservations = result.get('Items', [])
        return response(200, reservations)
    except Exception as e:
        return response(500, {'error': str(e)})


def create_reservation(rental_id, body):
    """Create reservation(s) for a rental"""
    dates = body.get('dates', [])
    reserved_by = body.get('reservedBy', '').strip()
    notes = body.get('notes', '').strip()

    if not dates:
        return response(400, {'error': 'At least one date is required'})

    if not reserved_by:
        return response(400, {'error': 'reservedBy is required'})

    # Verify rental exists
    rental_result = table.get_item(Key={'id': rental_id})
    if 'Item' not in rental_result:
        return response(404, {'error': 'Rental not found'})

    created_reservations = []
    failed_dates = []

    # Create reservation for each date
    for date in dates:
        try:
            reservation = {
                'rentalId': rental_id,
                'date': date,
                'reservedBy': reserved_by,
                'notes': notes,
                'createdAt': datetime.utcnow().isoformat()
            }

            # Use conditional put to prevent double-booking
            reservations_table.put_item(
                Item=reservation,
                ConditionExpression='attribute_not_exists(rentalId) AND attribute_not_exists(#d)',
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


def delete_reservation(rental_id, date):
    """Cancel a reservation for a specific date"""
    try:
        # Check if reservation exists
        result = reservations_table.get_item(Key={'rentalId': rental_id, 'date': date})
        if 'Item' not in result:
            return response(404, {'error': 'Reservation not found'})

        reservations_table.delete_item(Key={'rentalId': rental_id, 'date': date})
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
