# Schedulah - Item Reservation System

A full-stack item reservation system that allows you to manage items, set their availability, and make date-based reservations. Built with Python Lambda handlers, vanilla JavaScript, and DynamoDB, all running locally via Docker Compose.

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
| `dynamodb-local` | 8000 | Local DynamoDB instance with persistent storage |
| `dynamodb-init` | - | One-shot container that creates DynamoDB tables |

## API Endpoints

All API requests are proxied through Nginx at `/api/*`:

### Items
- `GET /api/items` - List all items
- `GET /api/items/{id}` - Get a specific item
- `POST /api/items` - Create a new item
- `PUT /api/items/{id}` - Update an item
- `DELETE /api/items/{id}` - Delete an item

### Reservations
- `GET /api/items/{id}/reservations` - List reservations for an item (supports `?startDate=` and `?endDate=` query params)
- `POST /api/items/{id}/reservations` - Create reservation(s) for an item
- `DELETE /api/items/{id}/reservations/{date}` - Delete a specific reservation

### Availability
- `GET /api/items/{id}/availability` - List available dates for an item (supports `?startDate=` and `?endDate=` query params)
- `POST /api/items/{id}/availability` - Set dates as available
- `DELETE /api/items/{id}/availability/{date}` - Remove date from availability

### Data Schemas

**Item:**
```json
{
  "id": "uuid-string",
  "name": "Item name (required)",
  "description": "Item description (optional)",
  "createdAt": "ISO-8601 timestamp"
}
```

**Reservation:**
```json
{
  "itemId": "uuid-string",
  "date": "YYYY-MM-DD",
  "reservedBy": "Name (required)",
  "notes": "Optional notes",
  "createdAt": "ISO-8601 timestamp"
}
```

**Available Date:**
```json
{
  "itemId": "uuid-string",
  "date": "YYYY-MM-DD",
  "createdAt": "ISO-8601 timestamp"
}
```

## Features

### User Interface
- **Professional header and navbar** with mobile-responsive hamburger menu
- **Multi-page navigation** with hash-based routing (About, FAQ, Items, Reservations)
- **Icon-based actions** using Remix Icons for clean, modern UI
- **Responsive design** that works on desktop, tablet, and mobile
- **Client-side routing** - no page reloads, instant navigation
- **Browser back/forward** support with full history management
- **Custom calendar UI** - Built from scratch without external libraries

### Item Management
- **View items list** - Clean table with name, description, and icon actions
- **View item details** - Dedicated page with item info and reservation calendar
- **Create new items** - Dedicated form page with validation
- **Edit existing items** - Pre-populated form with availability calendar
- **Set availability** - Interactive calendar to toggle available dates (green = available)
- **Delete items** - Available on edit page in Danger Zone with confirmation

### Reservation Management
- **Create reservations** - Click available dates on item view page, single-day reservations only
- **View all reservations** - Table view showing date, item, reserved by, with view/edit icons
- **View reservation details** - Dedicated page showing reservation information
- **Edit reservations** - Update reserved by name and notes
- **Delete reservations** - Available on edit page in Danger Zone with confirmation
- **Prevent double-booking** - Calendar shows reserved dates in gray, API enforces uniqueness

### Technical Features
- **RESTful API** with Python Lambda handlers (AWS-deployable)
- **DynamoDB Local** with persistent storage across container restarts
- **Three-table design** - Items, Reservations, AvailableDates with composite keys
- **Date range queries** - Efficient DynamoDB queries with BETWEEN conditions
- **CORS enabled** for API access
- **Docker Compose** for easy local development
- **No build step** - pure vanilla JavaScript

## Development

### API Development

The Lambda handler in `api/handler.py` is AWS-deployable. For local development, `api/local_app.py` wraps it in a Flask application that translates HTTP requests to Lambda proxy events.

### Frontend Development

The frontend is pure HTML, CSS, and vanilla JavaScript with no build step required. Edit files in `frontend/` and refresh your browser.

**Pages:**
- `#/about` - About page with application information
- `#/faq` - Frequently Asked Questions
- `/` or `#/items` - Items list with table view and icon actions
- `#/items/{id}` - View item details with reservation calendar
- `#/items/new` - Create new item form
- `#/items/edit/{id}` - Edit item form with availability calendar and delete in Danger Zone
- `#/reservations` - Reservations list with table view and icon actions
- `#/reservations/{itemId}/{date}` - View reservation details
- `#/reservations/edit/{itemId}/{date}` - Edit reservation form with delete in Danger Zone

**Navigation Flow:**
```
Items List
  ├─ Click item name or view icon → View Item
  │   ├─ Reservation Calendar (click available date to reserve)
  │   └─ Click Edit button → Edit Item
  │       ├─ Availability Calendar (toggle dates)
  │       ├─ Update Item → Save and return to list
  │       ├─ Danger Zone: Delete Item → Confirm and return to list
  │       └─ Cancel → Return to list
  ├─ Click edit icon → Edit Item (same as above)
  └─ Click Create New Item → Create Form
      ├─ Create Item → Save and return to list
      └─ Cancel → Return to list

Reservations List
  ├─ Click view icon → View Reservation
  │   └─ Click Edit button → Edit Reservation
  │       ├─ Update reservation → Save and return to list
  │       ├─ Danger Zone: Delete Reservation → Confirm and return to list
  │       └─ Cancel → Return to list
  └─ Click edit icon → Edit Reservation (same as above)
```

The app uses hash-based routing for client-side navigation without page reloads. All navigation is handled via URL hash changes, providing full browser history support.

### Database

DynamoDB Local is configured with persistent storage in `./dynamodb-data/`. Data is preserved across container restarts.

**Tables:**
- **Items** - Partition key: `id` (String)
- **Reservations** - Composite key: `itemId` (partition), `date` (sort)
- **AvailableDates** - Composite key: `itemId` (partition), `date` (sort)

The composite keys enable efficient range queries for reservations and availability within date ranges.

## Testing

Test the API directly:

```bash
# Items
curl http://localhost:8080/api/items
curl -X POST http://localhost:8080/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"Conference Room A","description":"Main conference room"}'

curl -X PUT http://localhost:8080/api/items/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","description":"Updated description"}'

curl -X DELETE http://localhost:8080/api/items/{id}

# Availability
curl -X POST http://localhost:8080/api/items/{id}/availability \
  -H "Content-Type: application/json" \
  -d '{"dates":["2026-03-15","2026-03-16","2026-03-17"]}'

curl "http://localhost:8080/api/items/{id}/availability?startDate=2026-03-01&endDate=2026-03-31"

curl -X DELETE http://localhost:8080/api/items/{id}/availability/2026-03-15

# Reservations
curl -X POST http://localhost:8080/api/items/{id}/reservations \
  -H "Content-Type: application/json" \
  -d '{"dates":["2026-03-15"],"reservedBy":"John Doe","notes":"Team meeting"}'

curl "http://localhost:8080/api/items/{id}/reservations?startDate=2026-03-01&endDate=2026-03-31"

curl -X DELETE http://localhost:8080/api/items/{id}/reservations/2026-03-15
```

## Deploying to AWS

The Lambda handler (`api/handler.py`) is ready to deploy to AWS:

1. Package the handler with dependencies
2. Create a Lambda function with Python 3.12 runtime
3. Set up API Gateway with Lambda proxy integration
4. Create DynamoDB tables:
   - **Items**: Partition key `id` (String)
   - **Reservations**: Partition key `itemId` (String), Sort key `date` (String)
   - **AvailableDates**: Partition key `itemId` (String), Sort key `date` (String)
5. Configure the Lambda execution role with DynamoDB permissions

## License

MIT
