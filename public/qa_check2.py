import re

def check_system():
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()
    with open("app.js", "r", encoding="utf-8") as f:
        js = f.read()

    print("--- HTML to JS Function Checks ---")
    
    # Check onclick attributes in HTML
    onclick_funcs = re.findall(r'onclick=["\']([a-zA-Z0-9_]+)\(', html)
    onclick_funcs = set(onclick_funcs)
    
    missing_funcs = []
    for func in onclick_funcs:
        if f"function {func}" not in js and f"const {func} =" not in js and f"let {func} =" not in js:
            missing_funcs.append(func)
            
    if missing_funcs:
        print(f"WARNING: HTML onclick calls these functions which are NOT found in app.js: {missing_funcs}")
    else:
        print("SUCCESS: All inline onclick functions in HTML exist in app.js.")

    print("\n--- JS Event Listener Target Checks ---")
    # Check JS addEventListener
    # look for document.getElementById('id').addEventListener
    event_listeners = re.findall(r'getElementById\(["\']([^"\']+)["\']\)\.addEventListener', js)
    
    html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))
    missing_ids = []
    for el_id in event_listeners:
        if el_id not in html_ids:
            missing_ids.append(el_id)
            
    if missing_ids:
        print(f"WARNING: JS adds event listeners to these IDs which are NOT found in HTML: {missing_ids}")
    else:
        print("SUCCESS: All elements targeted by addEventListener exist in HTML.")

if __name__ == "__main__":
    check_system()
