#!/usr/bin/env python3
"""
Vite Cache Fix Script
Resolves Vite cache permission issues and Vue parsing problems
Requires administrator privileges on Windows
"""

import os
import sys
import shutil
import subprocess
import ctypes
from pathlib import Path

def is_admin():
    """Check if the script is running with administrator privileges"""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except:
        return False

def run_as_admin():
    """Restart the script with administrator privileges"""
    if is_admin():
        return False
    
    # Re-run the script with admin rights
    ctypes.windll.shell32.ShellExecuteW(
        None, "runas", sys.executable, " ".join(sys.argv), None, 1
    )
    return True

def fix_vite_cache():
    """Fix Vite cache permission issues"""
    project_root = Path(__file__).parent.parent
    vite_cache_dir = project_root / "node_modules" / ".vite"
    
    print(f"🔧 Project root: {project_root}")
    print(f"🗂️ Vite cache directory: {vite_cache_dir}")
    
    try:
        if vite_cache_dir.exists():
            print("🧹 Removing Vite cache directory...")
            
            # Try different methods to remove the directory
            methods = [
                lambda: shutil.rmtree(vite_cache_dir),
                lambda: subprocess.run(['rmdir', '/s', '/q', str(vite_cache_dir)], shell=True, check=True),
                lambda: subprocess.run(['del', '/s', '/q', '/f', '/q', str(vite_cache_dir / '*')], shell=True, check=True)
            ]
            
            for i, method in enumerate(methods):
                try:
                    method()
                    print(f"✅ Successfully removed cache using method {i+1}")
                    break
                except Exception as e:
                    print(f"⚠️ Method {i+1} failed: {e}")
                    if i == len(methods) - 1:
                        raise
            else:
                # Create fresh cache directory
                vite_cache_dir.mkdir(parents=True, exist_ok=True)
                print("✅ Created fresh Vite cache directory")
        else:
            print("ℹ️ Vite cache directory doesn't exist, creating it...")
            vite_cache_dir.mkdir(parents=True, exist_ok=True)
            
    except Exception as e:
        print(f"❌ Failed to fix Vite cache: {e}")
        return False
    
    return True

def fix_file_permissions():
    """Fix file permissions for the project directory"""
    project_root = Path(__file__).parent.parent
    
    try:
        print("🔐 Fixing file permissions...")
        
        # Take ownership of the directory
        subprocess.run([
            'icacls', str(project_root), 
            '/grant', 'Users:(OI)(CI)F', 
            '/T'
        ], check=True, capture_output=True)
        
        print("✅ File permissions fixed")
        return True
        
    except Exception as e:
        print(f"⚠️ Could not fix file permissions: {e}")
        return False

def create_clean_vite_config():
    """Create a clean Vite configuration"""
    config_content = '''import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "src"),
    },
  },
  
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: false,
    cors: true,
  },
  
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  
  optimizeDeps: {
    force: true,
    include: ["vue"],
  },
});'''

    config_path = Path(__file__).parent.parent / "config" / "vite.config.ts"
    
    try:
        print("📝 Creating clean Vite configuration...")
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(config_content)
        print("✅ Clean Vite configuration created")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create Vite config: {e}")
        return False

def restart_development_server():
    """Restart the development server"""
    try:
        print("🚀 Starting development server...")
        
        # Change to project directory
        project_root = Path(__file__).parent.parent
        os.chdir(project_root)
        
        # Start Vite development server
        subprocess.run([
            'npm', 'run', 'dev'
        ], check=True)
        
        print("✅ Development server started successfully")
        return True
        
    except Exception as e:
        print(f"❌ Failed to start development server: {e}")
        return False

def main():
    """Main function"""
    print("🔧 Vite Cache Fix Script")
    print("=" * 50)
    
    # Check for admin privileges
    if run_as_admin():
        return
    
    print("✅ Running with administrator privileges")
    
    # Step 1: Fix Vite cache
    if not fix_vite_cache():
        print("❌ Failed to fix Vite cache")
        return 1
    
    # Step 2: Fix file permissions
    if not fix_file_permissions():
        print("⚠️ Could not fix file permissions, but continuing...")
    
    # Step 3: Create clean Vite config
    if not create_clean_vite_config():
        print("❌ Failed to create Vite configuration")
        return 1
    
    print("\n" + "=" * 50)
    print("✅ Vite cache fix completed successfully!")
    print("🚀 You can now run 'npm run dev' to start the development server")
    print("=" * 50)
    
    # Ask if user wants to start the development server
    try:
        response = input("\nWould you like to start the development server now? (y/n): ")
        if response.lower().startswith('y'):
            restart_development_server()
    except KeyboardInterrupt:
        print("\n👋 Script interrupted by user")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())