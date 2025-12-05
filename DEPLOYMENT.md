# Multi-Instance Deployment Guide

This application supports running multiple instances simultaneously by using environment variables.

## Quick Start: Deploy a New Instance

To deploy a new instance, you only need to set **2 environment variables**:

### In Dokploy

1. **Create New Application**
2. **Set Environment Variables:**
   - `PORT=5001` (or any available port)
   - `APP_DOMAIN=test.techydan.uk` (your domain for this instance)

3. **Configure Ports:**
   - Container Port: `5001` (match the PORT env var)
   - Published Port: `5001`

4. **Deploy!**

### In Cloudflare Tunnel

1. **Add Public Hostname:**
   - Public hostname: `test.techydan.uk` (match APP_DOMAIN)
   - Service: `http://192.168.1.85:5001` (match the PORT)
   - Path: `*`

## Environment Variables

### Required
- `PORT` - Port number for this instance (default: 5000)
- `APP_DOMAIN` - Domain name without protocol (e.g., `video.techydan.uk`)

### Optional
- `JWT_SECRET` - Secret key for JWT tokens
- `ADDITIONAL_CORS_ORIGINS` - Extra CORS origins (comma-separated)
- `UPLOADS_DIR` - Custom uploads directory
- `DB_PATH` - Custom database file path
- `MAX_FILE_SIZE` - Maximum upload size in bytes

## Example Configurations

### Production Instance
```
PORT=5000
APP_DOMAIN=video.techydan.uk
JWT_SECRET=production-secret-key
```

### Test/Dev Instance
```
PORT=5001
APP_DOMAIN=test.techydan.uk
JWT_SECRET=test-secret-key
```

### Staging Instance
```
PORT=5002
APP_DOMAIN=staging.techydan.uk
JWT_SECRET=staging-secret-key
```

## How It Works

The application automatically:
- Constructs the full URL from `APP_DOMAIN`
- Adds the domain to CORS allowed origins
- Uses HTTPS for non-localhost domains
- Configures all settings based on environment variables

No code changes needed between instances!
