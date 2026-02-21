#!/bin/sh

echo "Waiting for DynamoDB Local to be ready..."
sleep 5

echo "Creating Items table..."
aws dynamodb create-table \
    --table-name Items \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url http://dynamodb-local:8000 \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "Items table created successfully!"
else
    echo "Failed to create Items table (may already exist)"
fi

echo "Creating Reservations table..."
aws dynamodb create-table \
    --table-name Reservations \
    --attribute-definitions \
        AttributeName=itemId,AttributeType=S \
        AttributeName=date,AttributeType=S \
    --key-schema \
        AttributeName=itemId,KeyType=HASH \
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
        AttributeName=itemId,AttributeType=S \
        AttributeName=date,AttributeType=S \
    --key-schema \
        AttributeName=itemId,KeyType=HASH \
        AttributeName=date,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --endpoint-url http://dynamodb-local:8000 \
    --region us-east-1

if [ $? -eq 0 ]; then
    echo "AvailableDates table created successfully!"
else
    echo "Failed to create AvailableDates table (may already exist)"
fi
