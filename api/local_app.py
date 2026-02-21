from flask import Flask, request, jsonify
from flask_cors import CORS
from handler import handler
import json

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
