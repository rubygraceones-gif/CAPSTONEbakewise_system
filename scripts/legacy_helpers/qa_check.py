import re

def check_system():
    with open("index.html", "r", encoding="utf-8") as f:
        html = f.read()
    with open("app.js", "r", encoding="utf-8") as f:
        js = f.read()

    # Find all IDs in HTML
    html_ids = set(re.findall(r'id=["\']([^"\']+)["\']', html))
    
    # Find all buttons in HTML
    html_buttons_ids = set(re.findall(r'<button[^>]*id=["\']([^"\']+)["\'][^>]*>', html))
    
    # Find all form IDs in HTML
    html_form_ids = set(re.findall(r'<form[^>]*id=["\']([^"\']+)["\'][^>]*>', html))

    # Find all getElementById in JS
    js_get_elements = set(re.findall(r'getElementById\(["\']([^"\']+)["\']\)', js))
    
    print("--- QA REPORT ---")
    
    # Check for missing elements requested by JS
    missing_in_html = js_get_elements - html_ids
    # Filter out known dynamically created or irrelevant ones
    ignore_list = ['app', 'root', 'dummy']
    missing_in_html = [i for i in missing_in_html if i not in ignore_list]
    if missing_in_html:
        print(f"WARNING: JS is looking for these IDs, but they don't exist in HTML:\n{missing_in_html}\n")
    else:
        print("SUCCESS: All IDs referenced in JS exist in HTML.\n")
        
    # Check if buttons have event listeners (either onclick in HTML or addEventListener in JS)
    buttons_without_js = []
    for btn_id in html_buttons_ids:
        if btn_id not in js_get_elements and f"'{btn_id}'" not in js and f'"{btn_id}"' not in js and btn_id not in html:
            # simple check if the ID is used anywhere in JS
            pass
        if not re.search(r'getElementById\(["\']' + btn_id + r'["\']\)\.addEventListener', js) and btn_id not in js:
            buttons_without_js.append(btn_id)
            
    print("These buttons might not have explicit JS handlers attached by ID (might use classes or inline onclick):")
    print(buttons_without_js)

if __name__ == "__main__":
    check_system()
