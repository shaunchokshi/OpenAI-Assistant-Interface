# Deployment Guide

This document provides instructions for deploying the OpenAI Assistant application to production.

## Prerequisites

- Node.js v18+ 
- PostgreSQL database
- OpenAI API key
- (Optional) OAuth credentials for GitHub and Google authentication

## Environment Variables

Set up the following environment variables:

### Database
- `DATABASE_URL`: Full PostgreSQL connection string
- `PGHOST`: PostgreSQL host
- `PGPORT`: PostgreSQL port
- `PGUSER`: PostgreSQL username
- `PGPASSWORD`: PostgreSQL password
- `PGDATABASE`: PostgreSQL database name

### Authentication
- `SESSION_SECRET`: Random string for session encryption (use a secure random generator)
- `GITHUB_ID`: GitHub OAuth client ID
- `GITHUB_SECRET`: GitHub OAuth client secret
- `GITHUB_CALLBACK`: GitHub OAuth callback URL
- `GOOGLE_ID`: Google OAuth client ID
- `GOOGLE_SECRET`: Google OAuth client secret
- `GOOGLE_CALLBACK`: Google OAuth callback URL

### OpenAI
- `OPENAI_API_KEY`: OpenAI API key
- `ASSISTANT_ID`: (Optional) Default OpenAI Assistant ID

### Email
- `SMTP_RELAY_SERVER`: SMTP server for sending emails
- `SMTP_RELAY_PORT`: SMTP port
- `SMTP_RELAY_USER`: SMTP username
- `SMTP_RELAY_PASSWORD`: SMTP password
- `SMTP_FROM`: Email sender address

### Application
- `NODE_ENV`: Set to "production" for production deployments

## Deployment Steps

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Initialize the database:
   ```
   npm run db:push
   ```
4. Build the application for production:
   ```
   npm run build
   ```
5. Start the application in production mode:
   ```
   npm run start
   ```

## Health Check

The application provides a health check endpoint at `/api/health` that returns:
- System status
- Runtime environment
- Memory usage
- Uptime information
- Application version

This endpoint can be used with monitoring tools to ensure the application is running correctly.

## Production Features

The application has several production-ready features:

- **Security**:
  - Helmet middleware for security headers
  - Rate limiting (100 requests per 15 minutes per IP)
  - More aggressive rate limiting for auth endpoints (10 requests per 15 minutes)
  - HTTP-only, secure cookies for sessions
  - Production error handling to prevent leaking sensitive information

- **Performance**:
  - Compression middleware for better network performance
  - Response caching for applicable API endpoints
  - Optimized build process with minification

- **Reliability**:
  - Graceful shutdown handling for proper cleanup
  - Uncaught exception handling
  - Error boundary for client-side error recovery
  - File upload size limits (50MB)

- **Monitoring**:
  - Production-appropriate logging
  - Health check endpoint
  - Memory usage tracking

## Deployment Options

### Option 1: Traditional Node.js Deployment

Follow the standard deployment steps above. This is suitable for:
- VPS providers like DigitalOcean, AWS EC2, etc.
- Bare metal servers
- Self-hosted environments

### Option 2: Containerized Deployment

Build a Docker container:

```
docker build -t openai-assistant-app .
docker run -p 5000:5000 --env-file .env openai-assistant-app
```

This approach works well with:
- Kubernetes
- Docker Swarm
- AWS ECS
- Google Cloud Run

### Option 3: Platform as a Service

Deploy directly to a PaaS provider:
- Heroku
- Render
- Railway
- Fly.io

Most PaaS providers will automatically detect Node.js and run the appropriate build and start commands.

## Monitoring & Maintenance

- Check the log files in the `logs` directory for application logs
- Monitor the PostgreSQL database for performance issues
- Regularly back up the database
- Set up uptime monitoring using the `/api/health` endpoint
- Configure alerts for error rates and performance metrics

## Scaling Considerations

- The application uses in-memory session store by default, which is not suitable for multiple instances. For scale-out deployments:
  - Ensure database connection pooling is properly configured
  - Consider using Redis for session storage in multi-instance deployments
  - Use a load balancer with sticky sessions if needed

## Updating

To update the application:

1. Pull the latest changes
2. Install dependencies: `npm install`
3. Apply database updates: `npm run db:push` 
4. Build the application: `npm run build`
5. Restart the application: `npm run start`