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
- `SESSION_SECRET`: Random string for session encryption
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
3. Build the application:
   ```
   npm run build
   ```
4. Start the application:
   ```
   npm run start
   ```

## Production Considerations

- The app includes helmet for security headers in production
- Rate limiting is enabled for API endpoints
- Compression is enabled for better performance
- Cookie security features are enabled in production
- Production error handling is configured to prevent leaking sensitive information
- File uploads are limited to 50MB
- API responses are cached for better performance
- Production logs are written to the logs directory

## Monitoring & Maintenance

- Check the log files in the `logs` directory for application logs
- Monitor the PostgreSQL database for performance issues
- Regularly back up the database

## Updating

To update the application:

1. Pull the latest changes
2. Install dependencies: `npm install`
3. Build the application: `npm run build`
4. Restart the application: `npm run start`