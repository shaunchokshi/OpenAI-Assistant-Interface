# Database Initialization

This document explains the automated database initialization process implemented for the production Docker environment.

## Overview

The application has been configured to automatically initialize the database tables when the container starts. This ensures that the application will work correctly without manual intervention.

## Process Flow

1. **Container Startup**: When the Docker container starts, it runs `production-server.js`.

2. **Database Initialization Check**: The server checks if it needs to initialize the database by running `initialize-database.js`.

3. **Table Creation**: If the database tables don't exist, the initialization script runs `drizzle-kit push` to create all necessary tables based on the schema defined in `shared/schema.ts`.

4. **Application Start**: Once the database is properly initialized, the application starts serving requests.

## Docker Compose Configuration

The `docker-compose.yml` file has been configured to:

- Wait for the PostgreSQL database to be healthy before starting the application
- Set up proper health checks for both the database and the application
- Configure all necessary environment variables

## Manual Intervention

If the automatic initialization fails, you can:

1. Start the PostgreSQL container only:
   ```
   docker-compose up -d postgres
   ```

2. Connect to the database directly and create the tables:
   ```
   docker-compose exec postgres psql -U ${PGUSER} -d ${PGDATABASE}
   ```

3. Or run the initialization script manually:
   ```
   docker-compose exec app node initialize-database.js
   ```

## Troubleshooting

If you encounter issues with database initialization:

1. Check the logs for error messages:
   ```
   docker-compose logs app
   ```

2. Ensure the database container is running and healthy:
   ```
   docker-compose ps
   ```

3. Verify database connection settings in the environment variables:
   ```
   docker-compose config
   ```

## Production Deployment

For production deployments, ensure:

1. All required environment variables are set in a secure manner
2. Database backup and restore procedures are in place
3. The database has sufficient resources for the expected load