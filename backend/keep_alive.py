import urllib.request
import urllib.error
import json
import time
import os

SERVICES = {
    "ExpenseTracker": os.getenv("EXPENSE_TRACKER_URL", "https://expensetracker-ke0e.onrender.com/health"),
    "MoneyCommandAI Assistant": os.getenv("MONEY_COMMAND_AI_URL", "https://moneycommandai-assistant.onrender.com/health")
}

def check_and_wake(name, url):
    print(f"[{name}] Checking status at {url}...")
    max_retries = 6
    retry_delay = 15  # seconds
    
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KeepAliveCron'}
            )
            # 10 second timeout for the request itself
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    body = response.read().decode('utf-8')
                    try:
                        data = json.loads(body)
                        if data.get("status") == "ok":
                            print(f"[{name}] Success! Service is awake and returned 'ok'.")
                            return True
                    except json.JSONDecodeError:
                        pass
                    
                    print(f"[{name}] Received unexpected 200 response body: {body[:100]}")
        except urllib.error.HTTPError as e:
            # Render returns 503 during startup
            print(f"[{name}] Received HTTP error: {e.code} (Attempt {attempt}/{max_retries})")
        except urllib.error.URLError as e:
            print(f"[{name}] Connection error: {e.reason} (Attempt {attempt}/{max_retries})")
        except Exception as e:
            print(f"[{name}] Error: {str(e)} (Attempt {attempt}/{max_retries})")
            
        if attempt < max_retries:
            print(f"[{name}] Service might be cold-starting. Retrying in {retry_delay} seconds...")
            time.sleep(retry_delay)
            
    print(f"[{name}] Critical: Failed to wake up the service after {max_retries} attempts.")
    return False

def main():
    success = True
    for name, url in SERVICES.items():
        if not check_and_wake(name, url):
            success = False
            
    if not success:
        print("\n[Keep-Alive] One or more services failed to report 'ok'.")
        exit(1)
    else:
        print("\n[Keep-Alive] All services are healthy and awake.")

if __name__ == "__main__":
    main()
