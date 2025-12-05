# Troubleshooting: No Logs in Dokploy

## Possible Causes

1. **Logs not being sent to stdout/stderr** - Node.js logs need to go to console
2. **Log buffering** - Logs might be buffered and not flushed yet
3. **Container restarting** - Container might be crash-looping
4. **Wrong log viewer** - Looking at build logs instead of runtime logs

## Quick Checks in Dokploy

### 1. Check Container Status
- Go to the **Logs** tab
- Look for a dropdown to select the container
- Make sure you're viewing the **running container** (not build logs)

### 2. Check Docker Terminal
- In Dokploy, find the **Docker Terminal** or **Shell** option
- Try to connect to the running container
- If it connects, the container is actually running

### 3. Access the Application
- Try accessing `http://video.techydan.uk` in your browser
- If it loads, the app is working (just logs aren't showing)

## If Logs Still Don't Appear

The issue might be that console.log isn't flushing to Docker logs immediately. Try accessing the app first - if it works, the logs are just not being captured properly by Dokploy's UI.

### Test Direct Access
1. Open browser to: `http://video.techydan.uk`
2. If you see the app, it's working!
3. Logs might just not be visible in the UI

### Force Log Output
If needed, we can modify the server to force log flushing, but try accessing the app first.
