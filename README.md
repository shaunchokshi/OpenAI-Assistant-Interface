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

#### Using Docker

1. Configure environment variables in `.env` file
2. Build and run with Docker Compose:
   ```
   ./docker-build.sh
   docker-compose up -d
   ```

## Docker Deployment Instructions

### Building the Docker Image

```bash
# Use our helper script to build the app and Docker image
./docker-build.sh

# Or build manually
docker-compose build
```

### Running the Container

```bash
# Start the containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Environment Variables

Make sure to set all the required environment variables before running the containers. See `.env.example` for all required variables.

## Troubleshooting Docker Build

If you encounter the error `failed to calculate checksum of ref: "/app/client/dist": not found`, it means the build process didn't generate the expected directory structure. Try these steps:

1. Use our custom build script first:
   ```
   ./build.sh
   ```
2. Check that the `dist/public` directory exists with the frontend assets
3. Rebuild the Docker image:
   ```
   docker-compose build
   ```

## License

This project is licensed under the MIT License.