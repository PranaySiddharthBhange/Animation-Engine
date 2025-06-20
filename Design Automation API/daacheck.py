

import requests
import base64
import os
import json
import time
 

ENGINE = "Autodesk.Inventor+2026"
APPBUNDLE_ZIP = "InventorThumbnailAddin.bundle.zip"

CLIENT_ID = "kARf5BOK9ACxCqGupWqM18p2OnlzxyGlgCm9AIrLOY1WXrvI"
CLIENT_SECRET = "CGG9rHGA27ckzmxPAKDUYbv0c8hFU4igSpSU0at4tEc69J1oXpDXHcC5OGRSwXCG"
BUCKET_KEY = "june20_2025"
POLICY_KEY = "transient"
FOLDER_PATH = "upload"
RESPONSES_FOLDER = "responses"

NICKNAME = "daa"
APPBUNDLE_ID = "joints_constraints_appbundle"
ACTIVITY_ID = "joints_constraints_activity"
ACTIVITY_ALIAS = "my_current_version"


 
os.makedirs(RESPONSES_FOLDER, exist_ok=True)
 
def save_response_to_file(step_name, response_data):
    path = os.path.join(RESPONSES_FOLDER, f"{step_name}.json")
    with open(path, "w") as f:
        json.dump(response_data, f, indent=4)
 
def get_access_token():
    credentials = f"{CLIENT_ID}:{CLIENT_SECRET}"
    encoded_credentials = base64.b64encode(credentials.encode("ascii")).decode("ascii")
    auth_headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "Authorization": f"Basic {encoded_credentials}"
    }
    auth_data = {
        "grant_type": "client_credentials",
        "scope": "data:write data:read bucket:create bucket:delete"
    }
 
    response = requests.post(
        "https://developer.api.autodesk.com/authentication/v2/token",
        headers=auth_headers,
        data=auth_data
    )
    if response.ok:
        save_response_to_file("01_get_access_token", response.json())
        return response.json().get("access_token")
    return None
 
def create_bucket(access_token):
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "bucketKey": BUCKET_KEY,
        "policyKey": POLICY_KEY,
        "access": "full"
    }
 
    response = requests.post(
        "https://developer.api.autodesk.com/oss/v2/buckets",
        headers=headers,
        json=payload
    )
 
    save_response_to_file("02_create_bucket", response.json())
    return BUCKET_KEY if response.ok or response.status_code == 409 else None
 
def get_signed_url(access_token, file_name):
    url = f"https://developer.api.autodesk.com/oss/v2/buckets/{BUCKET_KEY}/objects/{file_name}/signeds3upload?minutesExpiration=60"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    if response.ok:
        save_response_to_file(f"03_get_signed_url_{file_name}", response.json())
        return response.json()
    return None
 
def upload_file_to_s3(signed_url, file_path):
    with open(file_path, 'rb') as f:
        headers = {"Content-Type": "application/octet-stream"}
        response = requests.put(signed_url, data=f, headers=headers)
        return response.status_code in [200, 204]
 
def finalize_upload(access_token, file_name, upload_key):
    url = f"https://developer.api.autodesk.com/oss/v2/buckets/{BUCKET_KEY}/objects/{file_name}/signeds3upload"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "ossbucketKey": BUCKET_KEY,
        "ossSourceFileObjectKey": file_name,
        "access": "full",
        "uploadKey": upload_key
    }
 
    response = requests.post(url, headers=headers, json=payload)
    save_response_to_file(f"04_finalize_upload_{file_name}", response.json())
    return response.ok
 
def upload_all_files(access_token):
    for root, dirs, files in os.walk(FOLDER_PATH):
        for file_name in files:
            full_path = os.path.join(root, file_name)
            object_key = os.path.relpath(full_path, FOLDER_PATH).replace("\\", "/")
            signed_data = get_signed_url(access_token, object_key)
            if not signed_data:
                continue
            upload_key = signed_data.get("uploadKey")
            signed_url = signed_data.get("urls")[0]
            if upload_file_to_s3(signed_url, full_path):
                finalize_upload(access_token, object_key, upload_key)
    print("✅ All files uploaded and finalized.")


def base64_encode_urn(urn):
    return base64.b64encode(urn.encode('utf-8')).decode('utf-8').replace('=', '').replace('+', '-').replace('/', '_')
 
def detect_assembly_file():
    for root, dirs, files in os.walk(FOLDER_PATH):
        for file in files:
            if file.lower().endswith(".iam"):
                return file
    return None
 
def link_references(access_token, assembly_file):
    assembly_urn = f"urn:adsk.objects:os.object:{BUCKET_KEY}/{assembly_file}"
    encoded_urn = base64_encode_urn(assembly_urn)
    url = f"https://developer.api.autodesk.com/modelderivative/v2/designdata/{encoded_urn}/references"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
 
    references = []
    for root, dirs, files in os.walk(FOLDER_PATH):
        for file_name in files:
            if file_name.lower().endswith('.ipt'):
                rel_path = os.path.relpath(os.path.join(root, file_name), FOLDER_PATH)
                rel_path = rel_path.replace('\\', '/')
                references.append({
                    "urn": f"urn:adsk.objects:os.object:{BUCKET_KEY}/{file_name}",
                    "relativePath": rel_path,
                    "filename": file_name
                })


    payload = {
        "urn": assembly_urn,
        "filename": assembly_file,
        "references": references
    }
 
    response = requests.post(url, headers=headers, json=payload)
    save_response_to_file("05_link_references", response.json())
    if response.ok:
        print("✅ References linked.")
    return response.ok
 
def start_translation_job(access_token, assembly_file):
    assembly_urn = f"urn:adsk.objects:os.object:{BUCKET_KEY}/{assembly_file}"
    encoded_urn = base64_encode_urn(assembly_urn)
    url = "https://developer.api.autodesk.com/modelderivative/v2/designdata/job"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "x-ads-force": "true"
    }
    payload = {
        "input": {
            "urn": encoded_urn,
            "checkReferences": True
        },
        "output": {
            "formats": [
                {
                    "type": "svf2",
                    "views": ["2d", "3d"]
                }
            ]
        }
    }
 
    response = requests.post(url, headers=headers, json=payload)
    save_response_to_file("06_start_translation_job", response.json())
    if response.ok:
        print("✅ Translation job started.")
        return encoded_urn
    return None
 
def check_translation_status(access_token, encoded_urn):
    url = f"https://developer.api.autodesk.com/modelderivative/v2/designdata/{encoded_urn}/manifest"
    headers = {"Authorization": f"Bearer {access_token}"}
 
    while True:
        response = requests.get(url, headers=headers)
        save_response_to_file("07_translation_status", response.json())
 
        if not response.ok:
            print("❌ Error checking translation status.")
            break
 
        status = response.json().get("status", "unknown")
        if status == "success":
            print("✅ Translation completed.")
            break
        elif status in ["failed", "timeout"]:
            print("❌ Translation failed or timed out.")
            break
        else:
            time.sleep(10)
 

# ---------------------------


def set_nickname(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {"nickname": NICKNAME}
    r = requests.patch("https://developer.api.autodesk.com/da/us-east/v3/forgeapps/me", headers=headers, json=data)
    return None

def register_appbundle(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "id": APPBUNDLE_ID,
        "engine": ENGINE,
        "description": "Extract joints and constraints"
    }
    r = requests.post("https://developer.api.autodesk.com/da/us-east/v3/appbundles", headers=headers, json=data)

    try:
        result = r.json()
    except Exception:
        result = r.text
    if isinstance(result, dict) and "uploadParameters" in result:
        return result
    else:
        print("AppBundle already exists or error occurred, skipping upload.")
        return None
    
def upload_appbundle(upload_params):
    files = {
        "file": open(APPBUNDLE_ZIP, "rb")
    }
    form = upload_params["formData"]
    data = {k: v for k, v in form.items() if k != "file"}
    r = requests.post(upload_params["endpointURL"], data=data, files=files)

    return r.ok


def create_appbundle_alias(token, version=1):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {"version": version, "id": "my_working_version"}
    r = requests.post(f"https://developer.api.autodesk.com/da/us-east/v3/appbundles/{APPBUNDLE_ID}/aliases", headers=headers, json=data)

    return r.ok


def create_activity(token):
    """Create activity that accepts input zip file"""

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    command_line = (
        "$(engine.path)\\InventorCoreConsole.exe /al \"$(appbundles[joints_constraints_appbundle].path)\""
    )

    data = {
        "id": ACTIVITY_ID,
        "commandLine": command_line, 
        "parameters": {
            "inputZip": {
                "zip": True,  # This tells DA to extract the zip
                "localName": "upload",  # Extract to 'upload' folder
                "verb": "get",
                "required": True,
                "description": "Input zip file containing CAD files"
            },
            "resultZip": {
                "zip": False,
                "localName": "Output.zip",
                "verb": "put",
                "required": True
            }
        },
        "engine": ENGINE,
        "appbundles": [f"{NICKNAME}.{APPBUNDLE_ID}+my_working_version"],
        "settings": {},
        "description": "Extracts joints and constraints from Inventor models"
    }

    try:
        response = requests.post(
            "https://developer.api.autodesk.com/da/us-east/v3/activities",
            headers=headers,
            json=data
        )
        
        if not response.ok:
            print(f"Failed with status {response.status_code}")
            print("Response:", response.text)
            return False
            
        return True
        
    except Exception as e:
        print(f"Request failed: {str(e)}")
        return False



def create_activity_alias(token, version=1):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {"version": version, "id": ACTIVITY_ALIAS}
    r = requests.post(f"https://developer.api.autodesk.com/da/us-east/v3/activities/{ACTIVITY_ID}/aliases", headers=headers, json=data)
    return r.ok


def submit_workitem(access_token):
    """Submit workitem using signed URL for input (alternative method)"""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "activityId": f"{NICKNAME}.{ACTIVITY_ID}+{ACTIVITY_ALIAS}",
        "arguments": {
            "inputZip": {
                "url": "https://cdn.us.oss.api.autodesk.com/oss/v2/signedresources/43c2526a-ddfd-4162-b6c5-271e448dab0a?region=US",
                "verb": "get",
                "localName": "upload"
            },
            "resultZip": {
                "url": "https://cdn.us.oss.api.autodesk.com/oss/v2/signedresources/d73b55b9-f4ac-4eee-955a-6a69508e6e93?region=US",
                "verb": "put",
                "localName": "Output.zip"
            }
        }
    }
    
    try:
        response = requests.post(
            "https://developer.api.autodesk.com/da/us-east/v3/workitems",
            headers=headers,
            json=payload
        )
        
        if response.ok:
            workitem_id = response.json().get("id")
            print(f"✅ Workitem submitted successfully! ID: {workitem_id}")
            save_response_to_file("12_submit_workitem", response.json())
            return workitem_id
        
        print(f"❌ Failed to submit workitem. Status: {response.status_code}")
        print("Error details:", response.json())
        save_response_to_file("12_submit_workitem_error", response.json())
        return None
        
    except Exception as e:
        print(f"❌ Request failed: {str(e)}")
        return None
  


def check_workitem_status(access_token, workitem_id):
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://developer.api.autodesk.com/da/us-east/v3/workitems/{workitem_id}"
    start_time = time.time()
    timeout = 120  # seconds

    while True:
        if time.time() - start_time > timeout:
            print("Timeout")
            break

        response = requests.get(url, headers=headers)
        data = response.json()
        save_response_to_file("13_workitem_status", data)

        status = data.get("status")
        print(f"WorkItem status: {status}")

        if status == "success":
            print("WorkItem completed successfully.")
            break

        time.sleep(30)

    return response.json()


def get_signed_download_url(access_token, object_key):
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    url = f"https://developer.api.autodesk.com/oss/v2/buckets/{BUCKET_KEY}/objects/{object_key}/signeds3download"
    response = requests.get(url, headers=headers)
    data = response.json()
    save_response_to_file(f"14_signed_download_url_{object_key}", data)
    if "url" in data:
        return data["url"]
    else:
        print(f"❌ Could not get signed download URL for {object_key}: {data}")
        return None

def download_file(url, out_path):
    r = requests.get(url)
    with open(out_path, "wb") as f:
        f.write(r.content)
    print(f"Downloaded {out_path}")




if __name__ == "__main__":

    token = get_access_token()
    set_nickname(token)


    if not token:
        print("❌ Failed to get access token.")
        exit(1)
    print("✅ Access token retrieved.")
 
    if not create_bucket(token):
        print("❌ Failed to create bucket.")
        exit(1)
    print("✅ Bucket ready.")
 
    upload_all_files(token)
 
    assembly_file = detect_assembly_file()
    if not assembly_file:
        print("❌ No assembly (.iam) file found.")
        exit(1)
    print(f"✅ Detected assembly file: {assembly_file}")
 
    if not link_references(token, assembly_file):
        print("❌ Failed to link references.")
        exit(1)

    encoded_urn = start_translation_job(token, assembly_file)

    if not encoded_urn:
        print("❌ Failed to start translation job.")
        exit(1)
 
    check_translation_status(token, encoded_urn)

    appbundle_info = register_appbundle(token)

    print("✅ Register AppBundle Done.")

    if appbundle_info and "uploadParameters" in appbundle_info:
        if not upload_appbundle(appbundle_info["uploadParameters"]):
            print("❌ Failed to upload appbundle.")
            exit(1)


    print("✅ Upload AppBundle Done.")

    if not create_appbundle_alias(token):
        print("❌ Failed to create appbundle alias.")
        exit(1)

    print("✅ Create AppBundle Alias Done.")

    if not create_activity(token):
        print("❌ Failed to create activity.")
        exit(1)


    print("✅ Create Activity Done.")

    if not create_activity_alias(token):
        print("❌ Failed to create activity alias.")
        exit(1)


    print("✅ Create Activity Alias Done.")

    workitem_id = submit_workitem(token)
    if not workitem_id:
        print("❌ Failed to submit workitem.")
        exit(1)


    workitem_result = check_workitem_status(token, workitem_id)

    if workitem_result.get("status") == "success":
        url = get_signed_download_url(token, "Output.zip")
        if url:
            download_file(url, "Output.zip")
            print("✅ Successfully downloaded results (Output.zip)")
        else:
            print("❌ Output.zip not found.")
    else:
        print("End........No Output.")








