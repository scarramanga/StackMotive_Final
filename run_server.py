import uvicorn
import os
import sys

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    uvicorn.run(
        "server.main:app",
        host="127.0.0.1",
        port=8090,
        reload=True,
        reload_dirs=["server"]
    )
