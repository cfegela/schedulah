# Schedulah - Rental Reservation System

A full-stack rental reservation system that allows you to manage rentals, set their availability, and make date-based reservations. Built with Python Lambda handlers, vanilla JavaScript, and DynamoDB, all running locally via Docker Compose.

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
│   └── local_app.py        # Flask wrapper with auto table initialization
├── frontend/
│   ├── index.html          # Main HTML page
│   ├── app.js              # JavaScript application logic
│   └── style.css           # Styling
└── dynamodb-data/          # Persistent DynamoDB data storage
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
   - The frontend will load and display the Rentals Manager interface

3. **Stop the services**:
   ```bash
   docker compose down
   ```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 8080 | Nginx serving the static HTML/JS/CSS with clean URL support |
| `api` | 5000 | Flask app wrapping the Lambda handler (auto-creates DynamoDB tables on startup) |
| `dynamodb-local` | 8000 | Local DynamoDB instance with persistent storage |

**Note:** The Nginx configuration includes `try_files $uri $uri/ /index.html;` which serves `index.html` for all non-file paths, enabling clean URL routing with the HTML5 History API.

## API Endpoints

All API requests are proxied through Nginx at `/api/*`:

### Rentals
- `GET /api/rentals` - List all rentals
- `GET /api/rentals/{id}` - Get a specific rental
- `POST /api/rentals` - Create a new rental
- `PUT /api/rentals/{id}` - Update a rental
- `DELETE /api/rentals/{id}` - Delete a rental

### Reservations
- `GET /api/rentals/{id}/reservations` - List reservations for a rental (supports `?startDate=` and `?endDate=` query params)
- `POST /api/rentals/{id}/reservations` - Create reservation(s) for a rental
- `DELETE /api/rentals/{id}/reservations/{date}` - Delete a specific reservation

### Availability
- `GET /api/rentals/{id}/availability` - List available dates for a rental (supports `?startDate=` and `?endDate=` query params)
- `POST /api/rentals/{id}/availability` - Set dates as available
- `DELETE /api/rentals/{id}/availability/{date}` - Remove date from availability

### Data Schemas

**Rental:**
```json
{
  "id": "uuid-string",
  "name": "Rental name (required)",
  "description": "Rental description (optional)",
  "createdAt": "ISO-8601 timestamp"
}
```

**Reservation:**
```json
{
  "rentalId": "uuid-string",
  "date": "YYYY-MM-DD",
  "reservedBy": "Name (required)",
  "notes": "Optional notes",
  "createdAt": "ISO-8601 timestamp"
}
```

**Available Date:**
```json
{
  "rentalId": "uuid-string",
  "date": "YYYY-MM-DD",
  "createdAt": "ISO-8601 timestamp"
}
```

## Features

### User Interface
- **Professional header and navbar** with mobile-responsive hamburger menu
- **Clean URLs** with HTML5 History API routing (About, FAQ, Rentals, Reservations)
- **Card-based layouts** for modern, scannable rental and reservation lists
- **Icon-based actions** using Remix Icons for clean, modern UI
- **Responsive design** that works on desktop, tablet, and mobile
- **Client-side routing** - no page reloads, instant navigation
- **Browser back/forward** support with full history management
- **Modal calendar** - Availability calendar opens in responsive modal popup
- **Custom calendar UI** - Built from scratch without external libraries

### Rental Management
- **View rentals list** - Modern card grid showing rental name and description
- **Clickable rental cards** - Click any card to view full rental details
- **View rental details** - Dedicated page with "Check Availability" button
- **Check availability modal** - Click button to open calendar in responsive modal popup
- **Create new rentals** - Dedicated form page with validation
- **Edit existing rentals** - Pre-populated form with availability summary and modal calendar
- **Availability summary** - Shows lists of available and reserved dates for the next year
- **Set availability** - Interactive calendar modal to toggle available dates (green = available)
- **Delete rentals** - Available on edit page in Danger Zone with confirmation

### Reservation Management
- **Create reservations** - Click "Reserve" link on available dates in calendar modal
- **Dedicated reservation form** - Separate page with rental name, date, and reservation details
- **Single-day reservations** - One date per reservation for simplicity
- **View all reservations** - Modern card grid showing date, rental, reserved by, with View/Edit buttons
- **Reservation cards** - Each card displays date as heading with rental and reserved by info
- **View reservation details** - Dedicated page showing reservation information
- **Edit reservations** - Update reserved by name and notes
- **Delete reservations** - Available on edit page in Danger Zone with confirmation
- **Prevent double-booking** - Calendar shows reserved dates in gray, API enforces uniqueness

### Technical Features
- **RESTful API** with Python Lambda handlers (AWS-deployable)
- **HTML5 History API** routing with clean URLs (`/about` instead of `#/about`)
- **DynamoDB Local** with persistent storage across container restarts
- **Automatic table initialization** - API creates tables on startup if they don't exist
- **Three-table design** - Rentals, Reservations, AvailableDates with composite keys
- **Date range queries** - Efficient DynamoDB queries with BETWEEN conditions
- **CORS enabled** for API access
- **Docker Compose** for easy local development (3 containers)
- **No build step** - pure vanilla JavaScript

## Development

### API Development

The Lambda handler in `api/handler.py` is AWS-deployable. For local development, `api/local_app.py` wraps it in a Flask application that translates HTTP requests to Lambda proxy events.

### Frontend Development

The frontend is pure HTML, CSS, and vanilla JavaScript with no build step required. Edit files in `frontend/` and refresh your browser.

**Pages:**
- `/about` - About page with application information
- `/faq` - Frequently Asked Questions
- `/` or `/rentals` - Rentals list with card grid layout
- `/rentals/{id}` - View rental details with "Check Availability" button (opens calendar modal)
- `/rentals/new` - Create new rental form
- `/rentals/edit/{id}` - Edit rental form with availability summary, "Set Available Dates" button (opens modal calendar), and delete in Danger Zone
- `/reservations` - Reservations list with card grid layout showing View/Edit buttons
- `/reservations/new/{rentalId}/{date}` - Create reservation form
- `/reservations/{rentalId}/{date}` - View reservation details
- `/reservations/edit/{rentalId}/{date}` - Edit reservation form with delete in Danger Zone

**Navigation Flow:**
```
Rentals List (Card Grid)
  ├─ Click rental card → View Rental
  │   ├─ Click "Check Availability" button → Modal calendar opens
  │   │   ├─ Click "Reserve" link on available date → Create Reservation form
  │   │   │   ├─ Fill form and submit → Return to rental view
  │   │   │   └─ Cancel → Return to rental view
  │   │   └─ Close modal (× or click outside) → Return to rental view
  │   └─ Click Edit button → Edit Rental
  │       ├─ Availability Summary (shows available and reserved dates)
  │       ├─ Click "Set Available Dates" button → Modal calendar opens
  │       │   ├─ Toggle dates (green = available)
  │       │   └─ Close modal (× or click outside) → Summary refreshes
  │       ├─ Update Rental → Save and return to list
  │       ├─ Danger Zone: Delete Rental → Confirm and return to list
  │       └─ Cancel → Return to list
  └─ Click Create New Rental → Create Form
      ├─ Create Rental → Save and return to list
      └─ Cancel → Return to list

Reservations List (Card Grid)
  ├─ Click View button on card → View Reservation
  │   └─ Click Edit button → Edit Reservation
  │       ├─ Update reservation → Save and return to list
  │       ├─ Danger Zone: Delete Reservation → Confirm and return to list
  │       └─ Cancel → Return to list
  └─ Click Edit button on card → Edit Reservation (same as above)
```

The app uses HTML5 History API for client-side routing with clean URLs. All navigation is handled via `history.pushState()` without page reloads, providing full browser history support and professional-looking URLs.

### Database

DynamoDB Local is configured with persistent storage in `./dynamodb-data/`. Data is preserved across container restarts.

**Table Initialization:**
- Tables are automatically created by the API on first startup
- Idempotent initialization - safe to restart containers
- No separate init container needed

**Tables:**
- **Rentals** - Partition key: `id` (String)
- **Reservations** - Composite key: `rentalId` (partition), `date` (sort)
- **AvailableDates** - Composite key: `rentalId` (partition), `date` (sort)

The composite keys enable efficient range queries for reservations and availability within date ranges.

## Testing

Test the API directly:

```bash
# Rentals
curl http://localhost:8080/api/rentals
curl -X POST http://localhost:8080/api/rentals \
  -H "Content-Type: application/json" \
  -d '{"name":"Conference Room A","description":"Main conference room"}'

curl -X PUT http://localhost:8080/api/rentals/{id} \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name","description":"Updated description"}'

curl -X DELETE http://localhost:8080/api/rentals/{id}

# Availability
curl -X POST http://localhost:8080/api/rentals/{id}/availability \
  -H "Content-Type: application/json" \
  -d '{"dates":["2026-03-15","2026-03-16","2026-03-17"]}'

curl "http://localhost:8080/api/rentals/{id}/availability?startDate=2026-03-01&endDate=2026-03-31"

curl -X DELETE http://localhost:8080/api/rentals/{id}/availability/2026-03-15

# Reservations
curl -X POST http://localhost:8080/api/rentals/{id}/reservations \
  -H "Content-Type: application/json" \
  -d '{"dates":["2026-03-15"],"reservedBy":"John Doe","notes":"Team meeting"}'

curl "http://localhost:8080/api/rentals/{id}/reservations?startDate=2026-03-01&endDate=2026-03-31"

curl -X DELETE http://localhost:8080/api/rentals/{id}/reservations/2026-03-15
```

## Deploying to AWS

The Lambda handler (`api/handler.py`) is ready to deploy to AWS:

1. Package the handler with dependencies
2. Create a Lambda function with Python 3.12 runtime
3. Set up API Gateway with Lambda proxy integration
4. Create DynamoDB tables:
   - **Rentals**: Partition key `id` (String)
   - **Reservations**: Partition key `rentalId` (String), Sort key `date` (String)
   - **AvailableDates**: Partition key `rentalId` (String), Sort key `date` (String)
5. Configure the Lambda execution role with DynamoDB permissions

## License

MIT
