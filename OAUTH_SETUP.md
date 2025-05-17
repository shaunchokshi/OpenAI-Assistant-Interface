# OAuth Configuration Guide

This guide explains how to set up OAuth authentication with Google and GitHub for the CeeK OpenAI API Assistant application.

## Prerequisites

- A Google Cloud Platform account (for Google OAuth)
- A GitHub account (for GitHub OAuth)
- Your application deployed with a publicly accessible URL (for production) or a tunnel service like ngrok (for development)

## Google OAuth Setup

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID as you'll need it later

### Step 2: Configure the OAuth Consent Screen

1. In the Google Cloud Console, navigate to **APIs & Services > OAuth consent screen**
2. Choose the appropriate user type:
   - **External** - For public applications available to any Google user
   - **Internal** - For applications restricted to users within your organization (recommended for private deployments)
3. Fill in the required information:
   - App name: "CeeK OpenAI API Assistant" (or your custom name)
   - User support email: Your contact email
   - App logo (optional): Upload your application logo
   - Application home page: Your application's URL
   - Application privacy policy link: `https://your-domain.com/privacy`
   - Application terms of service link: `https://your-domain.com/terms`
4. Click **Save and Continue**
5. Add the following scopes:
   - `email`
   - `profile`
6. Click **Save and Continue**
7. Add any test users if using External user type
8. Click **Save and Continue** to complete the configuration

### Step 3: Create OAuth Client ID

1. In the Google Cloud Console, navigate to **APIs & Services > Credentials**
2. Click **Create Credentials** and select **OAuth client ID**
3. Application type: **Web application**
4. Name: "CeeK OpenAI API Assistant Web Client" (or your custom name)
5. Authorized JavaScript origins:
   - Add your application's base URL (e.g., `https://your-domain.com`)
   - For local development, add `http://localhost:5000`
6. Authorized redirect URIs:
   - Add your callback URL: `https://your-domain.com/auth/google/callback`
   - For local development, add `http://localhost:5000/auth/google/callback`
7. Click **Create**
8. Note your **Client ID** and **Client Secret** - you'll need these for your application

### Step 4: Update Environment Variables

Add the following environment variables to your application:

```
GOOGLE_ID=your_client_id
GOOGLE_SECRET=your_client_secret
GOOGLE_CALLBACK=https://your-domain.com/auth/google/callback
```

## GitHub OAuth Setup

### Step 1: Create a GitHub OAuth Application

1. Go to your GitHub account settings
2. Navigate to **Developer settings > OAuth Apps**
3. Click **New OAuth App**
4. Fill in the required information:
   - Application name: "CeeK OpenAI API Assistant" (or your custom name)
   - Homepage URL: Your application's URL (e.g., `https://your-domain.com`)
   - Application description (optional): Brief description of your application
   - Authorization callback URL: `https://your-domain.com/auth/github/callback`
5. Click **Register application**

### Step 2: Generate a Client Secret

1. In your newly created OAuth application settings, click **Generate a new client secret**
2. Note your **Client ID** and **Client Secret** - you'll need these for your application

### Step 3: Update Environment Variables

Add the following environment variables to your application:

```
GITHUB_ID=your_client_id
GITHUB_SECRET=your_client_secret
GITHUB_CALLBACK=https://your-domain.com/auth/github/callback
```

## Production Considerations

### Google OAuth Verification

If you selected **External** as your user type in the OAuth consent screen setup and plan to make your application available to all Google users, you may need to go through Google's verification process. This typically applies when:

1. Your application uses sensitive or restricted scopes
2. You expect to have more than 100 users

The verification process involves:
- Domain verification
- Additional application information
- Security assessment (for applications using restricted scopes)

For internal applications within your organization, verification is not required.

### Security Best Practices

1. **Never commit OAuth secrets to your code repository**
   - Always use environment variables or a secure secrets management system

2. **Implement robust session management**
   - Use secure, HTTPOnly cookies
   - Implement proper session expiration
   - Consider implementing refresh tokens for longer sessions

3. **Validate OAuth provider responses**
   - Verify that email addresses are properly validated
   - Implement additional security checks if needed

4. **Regularly rotate client secrets**
   - Periodically generate new client secrets for your OAuth applications
   - Update your environment variables accordingly

## Troubleshooting

### Common Issues with Google OAuth

1. **"Error: redirect_uri_mismatch"**
   - Ensure your callback URL exactly matches what you configured in the Google Cloud Console
   - Check for differences in protocol (http vs https), trailing slashes, or port numbers

2. **"Error: invalid_client"**
   - Verify your client ID and client secret are correct
   - Check if your OAuth client is properly configured

3. **"Error: access_denied"**
   - The user denied permission or the scopes requested are not approved
   - Review your consent screen configuration and requested scopes

### Common Issues with GitHub OAuth

1. **"Bad credentials" or "401 Unauthorized"**
   - Check if your client ID and client secret are correct
   - Verify your OAuth application is still active

2. **"Callback URL mismatch"**
   - Ensure your callback URL exactly matches what you configured in GitHub
   - Check for differences in protocol (http vs https), trailing slashes, or port numbers

## Testing Your OAuth Configuration

To test your OAuth configuration:

1. Restart your application with the updated environment variables
2. Navigate to your application's login page
3. Click the "Login with Google" or "Login with GitHub" button
4. Complete the authentication flow
5. Verify you're redirected back to your application and successfully logged in

If any issues occur, check your server logs for error messages and refer to the troubleshooting section above.