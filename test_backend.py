"""Quick test script for backend API"""
import warnings
warnings.filterwarnings('ignore')

import requests
import time
import sys

API_URL = "http://127.0.0.1:8000"

def test_health():
    """Test health endpoint"""
    try:
        response = requests.get(f"{API_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("[PASS] Health check passed")
            print(f"  Response: {response.json()}")
            return True
        else:
            print(f"[FAIL] Health check failed: HTTP {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("[FAIL] Cannot connect to backend. Is it running?")
        print(f"  Start it with: python start_backend.py")
        return False
    except Exception as e:
        print(f"[FAIL] Health check error: {e}")
        return False

def test_status():
    """Test status endpoint"""
    try:
        response = requests.get(f"{API_URL}/api/status", timeout=5)
        if response.status_code == 200:
            print("[PASS] Status check passed")
            data = response.json()
            print(f"  State: {data['state']}")
            print(f"  Message: {data['message']}")
            print(f"  Running: {data['is_running']}")
            return True
        else:
            print(f"[FAIL] Status check failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] Status check error: {e}")
        return False

def test_config():
    """Test config endpoint"""
    try:
        response = requests.get(f"{API_URL}/api/config", timeout=5)
        if response.status_code == 200:
            print("[PASS] Config check passed")
            data = response.json()
            print(f"  LLM URL: {data['lm_studio_url']}")
            print(f"  Model: {data['model_name']}")
            print(f"  Temperature: {data['temperature']}")
            print(f"  Max Tokens: {data['max_tokens']}")
            return True
        else:
            print(f"[FAIL] Config check failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] Config check error: {e}")
        return False

def test_metrics():
    """Test metrics endpoint"""
    try:
        response = requests.get(f"{API_URL}/api/metrics", timeout=5)
        if response.status_code == 200:
            print("[PASS] Metrics check passed")
            data = response.json()
            sys_metrics = data['system']
            print(f"  CPU: {sys_metrics['cpu_percent']:.1f}%")
            print(f"  RAM: {sys_metrics['ram_used_gb']:.2f}GB / {sys_metrics['ram_total_gb']:.2f}GB ({sys_metrics['ram_percent']:.1f}%)")
            if sys_metrics.get('gpu_percent'):
                print(f"  GPU: {sys_metrics['gpu_percent']:.1f}%")
                if sys_metrics.get('gpu_temp'):
                    print(f"  GPU Temp: {sys_metrics['gpu_temp']:.1f}C")
            return True
        else:
            print(f"[FAIL] Metrics check failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"[FAIL] Metrics check error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Voice Assistant Backend API")
    print("=" * 60)
    print()
    
    tests = [
        ("Health Check", test_health),
        ("Status Check", test_status),
        ("Config Check", test_config),
        ("Metrics Check", test_metrics),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        print(f"\n[{name}]")
        if test_func():
            passed += 1
        else:
            failed += 1
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed > 0:
        print("\n[INFO] Make sure the backend is running:")
        print("   python start_backend.py")
        sys.exit(1)
    else:
        print("\n[SUCCESS] All tests passed! Backend is working correctly.")
        sys.exit(0)
