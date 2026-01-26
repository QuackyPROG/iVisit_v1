# iVisit

Visitor management system with OCR-based ID scanning.

## Architecture

```
├── backend/          # Spring Boot API (port 8080)
├── ivisit-helper/    # Desktop helper for OCR/RFID (port 8765)
└── i-visit-master/   # React frontend (Vite, port 5173)
```

## Prerequisites

- Java 17+
- Node.js 18+
- MySQL 8+
- Tesseract OCR (for local OCR)

## Quick Start

### 1. Database

```sql
CREATE DATABASE ivisitdb;
```

### 2. Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Backend

```bash
cd backend
./mvnw spring-boot:run
```

### 4. Frontend

```bash
cd i-visit-master
npm install
npm run dev
```

### 5. Helper (Optional - for OCR/RFID)

```bash
cd ivisit-helper
./mvnw spring-boot:run
```

## Production

### Backend
```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/*.jar --spring.profiles.active=prod
```

### Frontend
```bash
cd i-visit-master
npm run build
# Deploy dist/ to your static host
```

## Environment Variables

See `.env.example` for all available options. Key variables:

| Variable | Description |
|----------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | MySQL connection |
| `DB_USERNAME`, `DB_PASSWORD` | DB credentials |
| `OPENROUTER_API_KEY` | AI Vision OCR (required for helper) |
| `MAIL_*` | SMTP for email verification |
| `APP_FRONTEND_BASE_URL` | Frontend URL for CORS/emails |

## Ports

| Service | Port |
|---------|------|
| Backend API | 8080 |
| Frontend | 5173 |
| Helper | 8765 |
