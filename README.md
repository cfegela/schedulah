# Schedulah - Items CRUD Application

A full-stack CRUD application for managing items, built with Python Lambda handlers, vanilla JavaScript, and DynamoDB, all running locally via Docker Compose.

## Architecture

- **Backend**: Python Lambda handler (AWS-deployable) wrapped in Flask for local development
- **Frontend**: Vanilla JavaScript single-page application served by Nginx
- **Database**: DynamoDB Local
- **Deployment**: Docker Compose for local development

## Project Structure

```
schedulah/
├── docker-compose.yml       # Docker Compose configuration
├── nginx.conf               # Nginx configuration for frontend proxy
├── api/
│   ├── Dockerfile          # API service Docker image
│   ├── requirements.txt    # Python dependencies
│   ├── handler.py          # AWS Lambda handler (deployable to AWS)
│   └── local_app.py        # Flask wrapper for local development
├── frontend/
│   ├── index.html          # Main HTML page
│   ├── app.js              # JavaScript application logic
│   └── style.css           # Styling
└── scripts/
    └── init-dynamodb.sh    # DynamoDB table initialization script
```

## Getting Started

### Prerequisites

- Docker and Docker Compose (or Podman with podman-compose)

### Running the Application

1. **Start all services**:
   ```bash
   docker compose up --build
   ```

2. **Access the application**:
   - Open your browser to http://localhost:8080
   - The frontend will load and display the Items Manager interface

3. **Stop the services**:
   ```bash
   docker compose down
   ```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 8080 | Nginx serving the static HTML/JS/CSS |
| `api` | 5000 | Flask app wrapping the Lambda handler |
| `dynamodb-local` | 8000 | Local DynamoDB instance |
| `dynamodb-init` | - | One-shot container that creates the Items table |

## API Endpoints

All API requests are proxied through Nginx at `/api/*`:

- `GET /api/items` - List all items
- `GET /api/items/{id}` - Get a specific item
- `POST /api/items` - Create a new item
- `PUT /api/items/{id}` - Update an item
- `DELETE /api/items/{id}` - Delete an item

### Item Schema

```json
{
  "id": "uuid-string",
  "name": "Item name (required)",
  "description": "Item description (optional)",
  "createdAt": "ISO-8601 timestamp"
}
```

## Features

### User Interface
- **Professional header and navbar** with mobile-responsive hamburger menu
- **Multi-page navigation** with hash-based routing
- **Icon-based actions** using Remix Icons for clean, modern UI
- **Responsive design** that works on desktop, tablet, and mobile
- **Client-side routing** - no page reloads, instant navigation
- **Browser back/forward** support with full history management

### Item Management
- **View items list** - Clean table with name, description, and icon actions
- **View item details** - Dedicated read-only page showing full item information
- **Create new items** - Dedicated form page with validation
- **Edit existing items** - Pre-populated form with update and delete options
- **Delete items** - Available on edit page with confirmation dialog

### Technical Features
- **RESTful API** with Python Lambda handlers (AWS-deployable)
- **DynamoDB Local** for data persistence
- **CORS enabled** for API access
- **Docker Compose** for easy local development
- **No build step** - pure vanilla JavaScript

## Development

### API Development

The Lambda handler in `api/handler.py` is AWS-deployable. For local development, `api/local_app.py` wraps it in a Flask application that translates HTTP requests to Lambda proxy events.

### Frontend Development

The frontend is pure HTML, CSS, and vanilla JavaScript with no build step required. Edit files in `frontend/` and refresh your browser.

**Pages:**
- `/` or `#/items` - Items list with table view and icon actions
- `#/items/{id}` - View item details (read-only)
- `#/items/new` - Create new item form
- `#/items/edit/{id}` - Edit existing item form (includes delete option)
- `#/about` - About page with app information

**Navigation Flow:**
```
Items List
  ├─ Click item name or view icon → View Item (read-only)
  │   └─ Click Edit button → Edit Item
  ├─ Click edit icon → Edit Item
  │   ├─ Click Update Item → Save and return to list
  │   ├─ Click Delete → Confirm and return to list
  │   └─ Click Cancel → Return to list
  └─ Click Create New Item → Create Form
      ├─ Click Create Item → Save and return to list
      └─ Click Cancel → Return to list
```

The app uses hash-based routing for client-side navigation without page reloads. All navigation is handled via URL hash changes, providing full browser history support.

### Database

DynamoDB Local runs in-memory by default. Data is lost when containers are stopped. To persist data, modify the `docker-compose.yml` to use a volume for DynamoDB.

## Testing

Test the API directly:

```bash
# List items
curl http://localhost:8080/api/items

# Create an item
curl -X POST http://localhost:8080/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Item","description":"A test"}'

# Get a specific item
curl http://localhost:8080/api/items/{id}

# Update an item
curl -X PUT http://localhost:8080/api/items/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","description":"Updated description"}'

# Delete an item
curl -X DELETE http://localhost:8080/api/items/{id}
```

## Deploying to AWS

The Lambda handler (`api/handler.py`) is ready to deploy to AWS:

1. Package the handler with dependencies
2. Create a Lambda function with Python 3.12 runtime
3. Set up API Gateway with Lambda proxy integration
4. Create a DynamoDB table named `Items` with partition key `id` (String)
5. Configure the Lambda execution role with DynamoDB permissions

## License

MIT
