import os
import subprocess
import time
import webbrowser
import sys
from pathlib import Path

def kill_port(port):
    try:
        # Find PIDs listening on the given port
        result = subprocess.check_output(f'netstat -aon | findstr ":{port}" | findstr "LISTENING"', shell=True, text=True)
        for line in result.strip().split('\n'):
            parts = line.split()
            if len(parts) >= 5:
                pid = parts[-1]
                # Kill the process
                subprocess.call(f'taskkill /F /PID {pid}', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        pass # No process listening on this port

def main():
    print("Starting Global Energy Crisis Assessment Platform...")
    print("========================================")
    
    print("Cleaning old processes...")
    kill_port(8000)
    kill_port(8080)
    
    current_dir = Path(__file__).parent.resolve()
    project_root = current_dir.parent
    backend_dir = project_root / "web_app" / "后端"
    frontend_dir = project_root / "web_app" / "前端"
    
    print("[1/2] Starting FastAPI Backend (Port 8000)...")
    # Use start cmd /c to open a new terminal window
    backend_cmd = f'start "Energy_Backend" cmd /c "chcp 65001 > nul && cd /d "{backend_dir}" && python 后端_API.py"'
    os.system(backend_cmd)
    
    time.sleep(2)
    
    print("[2/2] Starting Frontend Server (Port 8080)...")
    frontend_cmd = f'start "Energy_Frontend" cmd /c "chcp 65001 > nul && cd /d "{frontend_dir}" && python -m http.server 8080"'
    os.system(frontend_cmd)
    
    print("========================================")
    print("SUCCESS!")
    print("Backend API: http://localhost:8000")
    print("Frontend URL: http://localhost:8080")
    print("\nOpening browser...")
    
    webbrowser.open("http://localhost:8080")

if __name__ == "__main__":
    main()
