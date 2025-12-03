# MyTube - Private Video Hosting Platform

> **⚠️ AI-Generated Application**: This application was generated using AI assistance. While most features have been tested and work as intended, some edge cases or features may not function perfectly. Please report any issues you encounter.

A secure, self-hosted video sharing application designed for private organizations and teams. Protected by Cloudflare Zero Trust authentication.

## 🚀 Features

### 🎥 Video Management
- **Upload**: Drag-and-drop video uploads with progress tracking.
- **Playback**: Custom video player with support for various formats.
- **Thumbnails**: Automatic thumbnail generation using FFmpeg.
- **Organization**: Organize videos with custom Categories and Tags.
- **My Videos**: Dedicated view for users to manage their own uploads.
- **Trash**: Soft-delete functionality with a trash bin for recovery or permanent deletion.

### 🔍 Discovery & Navigation
- **Search**: Real-time search by video title.
- **Filtering**: Filter videos by Category or Tags.
- **Responsive Design**: Modern, dark-themed UI that works on desktop and mobile.

### 👤 User Management & Security
- **SSO Integration**: Built-in support for Cloudflare Zero Trust (Access) for secure, password-less login.
- **User Profiles**: Customizable display names.
- **Admin Controls**:
  - Manage Users (View, Delete, Change Roles).
  - Configure Application Settings (App Title, Upload Limits).
  - Manage Categories (Add, Rename, Delete).
  - Toggle SSO/Dev Mode.

### ⚙️ Administration
- **Settings Dashboard**: Centralized control panel for all application configurations.
- **Category Management**: Create and edit categories to keep content organized.
- **Upload Limits**: Set maximum file size limits for uploads.

## 🛠️ Tech Stack

- **Frontend**: React, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **Database**: LowDB (JSON file-based database)
- **Video Processing**: FFmpeg
- **Authentication**: Cloudflare Access (JWT verification)

## 📦 Setup & Running

### Prerequisites
- **Node.js**: Required to run the application. [Download Node.js](https://nodejs.org/)
- **FFmpeg**: Required for video processing and thumbnail generation.
  - **Windows**: Download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/), extract, and add the `bin` folder to your System PATH.
  - **Linux**: `sudo apt install ffmpeg`
  - **Mac**: `brew install ffmpeg`

### Installation

1.  **Clone/Download the repository** to your local machine.

2.  **Install All Dependencies**:
    Open a terminal in the project root and run:
    ```bash
    npm run install-all
    ```
    *This will install dependencies for both the backend and frontend.*

### Running the Application

Simply run from the project root:

```bash
npm start
```

This will start both the backend server (port 3000) and frontend client (port 5173) simultaneously.

**Access the App**: Open your browser and navigate to `http://localhost:5173`.

### ⚠️ Important Notes
- **Default Setup**: The application runs in **Dev Mode** by default, allowing you to log in as a test user without Cloudflare SSO.
- **Default Test Account**:
  - **Username**: `testuser`
  - **Password**: `password`
  - **Role**: Admin
- **Enabling SSO** (Optional): If you want to use Cloudflare Zero Trust authentication:
  1.  Go to Settings (requires admin access).
  2.  Toggle "Require SSO Authentication" to **ON**.
  3.  Configure your Cloudflare logout URL.
  4.  See [Cloudflare SSO Setup Guide](cloudflare-sso-setup.md) for detailed instructions.
- **Database**: All data is stored locally in `server/db.json`. Do not delete this file unless you want to reset the database.

## 📝 Configuration

Configuration is stored in `server/db.json`. You can modify settings via the **Settings** page in the application if you are an admin.
