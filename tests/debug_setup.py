#!/usr/bin/env python3
"""Debug script to test setup step by step"""

import sys
import os
sys.path.append('.')

from integrate.conftest import TestServerManager, TestConfig

def main():
    print("=== Debug Test Setup ===")
    print(f"Base URL: {TestConfig.BASE_URL}")
    print(f"Database URL: {TestConfig.DATABASE_URL}")
    
    manager = TestServerManager()
    
    print(f"Is GitHub Actions: {manager.is_github_actions}")
    
    # Step 1: Check if server is running
    print("\n1. Checking if server is running...")
    if manager.is_server_running():
        print("✅ Server is already running")
        return
    else:
        print("❌ Server is not running")
    
    # Step 2: Check local services
    print("\n2. Checking local services...")
    if manager._check_local_services():
        print("✅ Local services available")
    else:
        print("❌ Local services not available - will start containers")
    
    # Step 3: Start dependencies
    print("\n3. Starting dependencies...")
    try:
        manager.start_dependencies()
        print("✅ Dependencies started")
    except Exception as e:
        print(f"❌ Failed to start dependencies: {e}")
        return
    
    # Step 4: Start server
    print("\n4. Starting server...")
    try:
        manager.start_server()
        print("✅ Server started")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return
    
    print("\n✅ All setup completed successfully!")

if __name__ == "__main__":
    main()