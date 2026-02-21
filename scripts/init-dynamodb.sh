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
