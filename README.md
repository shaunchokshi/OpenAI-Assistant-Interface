# OpenAI Assistant Platform

A modern, secure web application for interacting with OpenAI Assistants, providing comprehensive analytics and enhanced user experience with advanced session management capabilities.

## Features

- **Authentication**: Secure login with username/password, Google OAuth, and GitHub OAuth
- **OpenAI Integration**: Use existing OpenAI assistants or create new ones
- **File Management**: Upload and manage files for use with assistants
- **Analytics**: Track usage metrics and costs
- **Fine-Tuning**: Manage fine-tuning jobs and models
- **Theme Customization**: Personalize the app's appearance
- **Session Management**: Track and manage active login sessions

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- OpenAI API key
- (Optional) Docker and Docker Compose for containerized deployment

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and configure the environment variables
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```

### Production Deployment

#### Using Node.js

1. Build the application:
   ```
   ./build.sh
   ```
2. Start the production server:
   ```
   npm start
   ```

#### Using Docker (Recommended)

1. Configure environment variables in `.env` file
2. Build for production and run with Docker Compose:
   ```
   # Build production optimized version
   ./build-production.sh
   
   # Run production containers
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Docker Deployment Instructions

### Building the Production Docker Image

Our production build approach creates a streamlined Docker image without development dependencies:

```bash
# Single command to build everything for production
./docker-build-prod.sh

# Then run with the production docker-compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Alternative: Development Docker Build

For development or testing, you can use the standard Docker build:

```bash
# Use our helper script
./docker-build.sh

# Or run manually
./build.sh
docker-compose build
docker-compose up -d
```

### Running the Container

```bash
# Start the production containers
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop containers
docker-compose -f docker-compose.prod.yml down
```

### Environment Variables

Make sure to set all the required environment variables before running the containers. See `.env.example` for all required variables.

## Troubleshooting Docker Build

If you encounter the error `Cannot find package '@vitejs/plugin-react' imported from /app/dist/index.js` or `failed to calculate checksum of ref: "/dist": not found`, it means you're using the development build in a production context or the build process didn't complete properly. Use our simplified production build script instead:

```bash
./docker-build-prod.sh
docker-compose -f docker-compose.prod.yml up -d
```

This script handles the complete production build process in a more reliable way, creating a specialized server setup that doesn't require development dependencies.

## License

This project is licensed under the MIT License.