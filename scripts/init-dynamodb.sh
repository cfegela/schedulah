#!/bin/sh

echo "Waiting for DynamoDB Local to be ready..."
sleep 5

echo "Creating Rentals table..."
aws dynamodb create-table \
    --table-name Rentals \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url http://dynamodb-local:8000 \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "Rentals table created successfully!"
else
    echo "Failed to create Rentals table (may already exist)"
fi

echo "Creating Reservations table..."
aws dynamodb create-table \
    --table-name Reservations \
    --attribute-definitions \
        AttributeName=rentalId,AttributeType=S \
        AttributeName=date,AttributeType=S \
    --key-schema \
        AttributeName=rentalId,KeyType=HASH \
        AttributeName=date,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url http://dynamodb-local:8000 \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "Reservations table created successfully!"
else
    echo "Failed to create Reservations table (may already exist)"
fi

echo "Creating AvailableDates table..."
aws dynamodb create-table \
    --table-name AvailableDates \
    --attribute-definitions \
        AttributeName=rentalId,AttributeType=S \
        AttributeName=date,AttributeType=S \
    --key-schema \
        AttributeName=rentalId,KeyType=HASH \
        AttributeName=date,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url http://dynamodb-local:8000 \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "AvailableDates table created successfully!"
else
    echo "Failed to create AvailableDates table (may already exist)"
fi
