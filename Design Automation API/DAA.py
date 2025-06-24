

import requests
import base64
import os
import json
import time
import zipfile
import uuid
from datetime import datetime

ENGINE = "Autodesk.Inventor+2026"
APPBUNDLE_ZIP = "InventorThumbnailAddin.bundle.zip"
RESPONSES_FOLDER = "responses"
FOLDER_PATH = "upload"

CLIENT_ID = "kARf5BOK9ACxCqGupWqM18p2OnlzxyGlgCm9AIrLOY1WXrvI"
CLIENT_SECRET = "CGG9rHGA27ckzmxPAKDUYbv0c8hFU4igSpSU0at4tEc69J1oXpDXHcC5OGRSwXCG"
BUCKET_KEY = f"bucket_{datetime.now().strftime('%Y%m%d%H%M%S')}"
POLICY_KEY = "transient"


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
 

# -----------------------------------------AppBundle-----------------------------------------------------------

def upload_appbundle(upload_params, version="unknown"):
    try:
        if "formData" not in upload_params or "endpointURL" not in upload_params:
            print("❌ Invalid upload_params structure. Dumping response:")
            print(json.dumps(upload_params, indent=2))
            return False

        form = upload_params["formData"]
        endpoint_url = upload_params["endpointURL"]

        with open(APPBUNDLE_ZIP, "rb") as file_data:
            files = {"file": file_data}
            data = {k: v for k, v in form.items() if k != "file"}

            response = requests.post(endpoint_url, data=data, files=files)

        if response.ok:
            print(f"✅ AppBundle uploaded successfully for version {version}.")
            return True
        else:
            print(f"❌ Failed to upload AppBundle: {response.status_code}")
            print("Response:", response.text)
            return False

    except Exception as e:
        print(f"❌ Exception during AppBundle upload: {str(e)}")
        return False

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
    result = r.json()

    if "uploadParameters" in result:
        print("✅ AppBundle registered (new).")
        return result
    elif r.status_code == 409:
        print("ℹ️ AppBundle exists. Creating new version...")
        return create_new_appbundle_version(token)
    else:
        print("❌ Failed to register AppBundle:", result)
        return None

def create_new_appbundle_version(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "engine": ENGINE
    }
    r = requests.post(f"https://developer.api.autodesk.com/da/us-east/v3/appbundles/{APPBUNDLE_ID}/versions", headers=headers, json=data)
    result = r.json()
    if "uploadParameters" in result:
        print("✅ New AppBundle version created.")
        return result
    else:
        print("❌ Failed to create AppBundle version:", result)
        return None

def create_appbundle_alias(token, version):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {"version": version, "id": "my_working_version"}
    url = f"https://developer.api.autodesk.com/da/us-east/v3/appbundles/{APPBUNDLE_ID}/aliases"
    r = requests.post(url, headers=headers, json=data)

    if r.status_code == 409:
        # Alias exists, update it
        update_url = f"{url}/my_working_version"
        r = requests.patch(update_url, headers=headers, json={"version": version})
        if r.ok:
            print(f"🔁 AppBundle alias updated to version {version}")
        else:
            print("❌ Failed to update AppBundle alias:", r.text)
    elif r.ok:
        print(f"✅ AppBundle alias created for version {version}")
    else:
        print("❌ Alias creation failed:", r.text)

# ----------------------------- Activity Creation -------------------------------------------------------------



def create_or_update_activity(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    command_line = "$(engine.path)\\InventorCoreConsole.exe /al \"$(appbundles[joints_constraints_appbundle].path)\""

    data = {
        "id": ACTIVITY_ID,
        "commandLine": command_line,
        "parameters": {
            "inputZip": {
                "zip": True,
                "localName": "upload",
                "verb": "get",
                "required": True
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
        "description": "Extracts joints and constraints from Inventor models"
    }

    r = requests.post("https://developer.api.autodesk.com/da/us-east/v3/activities", headers=headers, json=data)
    if r.status_code == 409:
        print("ℹ️ Activity exists. Creating new version...")
        return create_activity_version(token)
    elif r.ok:
        print("✅ Activity created.")
        version = r.json().get("version", 1)
        create_activity_alias(token, version)
    else:
        print("❌ Failed to create activity:", r.text)

def create_activity_version(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    data = {
        "commandLine": "$(engine.path)\\InventorCoreConsole.exe /al \"$(appbundles[joints_constraints_appbundle].path)\"",
        "parameters": {
            "inputZip": {
                "zip": True,
                "localName": "upload",
                "verb": "get",
                "required": True
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
        "description": "Updated version of activity"
    }

    r = requests.post(f"https://developer.api.autodesk.com/da/us-east/v3/activities/{ACTIVITY_ID}/versions", headers=headers, json=data)
    if r.ok:
        version = r.json().get("version", 1)
        print(f"✅ Activity version {version} created.")
        create_activity_alias(token, version)
    else:
        print("❌ Failed to create new activity version:", r.text)

def create_activity_alias(token, version):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    data = {"version": version, "id": ACTIVITY_ALIAS}
    url = f"https://developer.api.autodesk.com/da/us-east/v3/activities/{ACTIVITY_ID}/aliases"
    r = requests.post(url, headers=headers, json=data)

    if r.status_code == 409:
        # Alias exists, update it
        update_url = f"{url}/{ACTIVITY_ALIAS}"
        r = requests.patch(update_url, headers=headers, json={"version": version})
        if r.ok:
            print(f"🔁 Activity alias updated to version {version}")
        else:
            print("❌ Failed to update activity alias:", r.text)
    elif r.ok:
        print(f"✅ Activity alias created for version {version}")
    else:
        print("❌ Failed to create activity alias:", r.text)


# -----------------------------------------------------WorkItem----------------------------------------------------



def zip_folder(folder_path, output_zip_path):
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(folder_path):
            for file in files:
                full_path = os.path.join(root, file)
                arcname = os.path.relpath(full_path, folder_path)
                zipf.write(full_path, arcname)

def upload_to_oss(access_token, object_key, file_path):
    signed_data = get_signed_url(access_token, object_key)
    if not signed_data:
        print("❌ Failed to get signed upload URL")
        return False

    upload_key = signed_data.get("uploadKey")
    signed_url = signed_data.get("urls")[0]

    with open(file_path, "rb") as f:
        response = requests.put(signed_url, data=f, headers={"Content-Type": "application/octet-stream"})
        if response.status_code not in [200, 204]:
            print("❌ Upload failed:", response.text)
            return False

    return finalize_upload(access_token, object_key, upload_key)

def prepare_and_upload_zips(access_token):
    # Step 1: Prepare output.zip (empty structure or pre-created content)
    output_folder = "Output"
    os.makedirs(output_folder, exist_ok=True)
    output_zip_path = "Output.zip"
    zip_folder(output_folder, output_zip_path)

    # Step 2: Prepare input.zip from upload/
    input_zip_path = "input.zip"
    zip_folder(FOLDER_PATH, input_zip_path)

    # Step 3: Upload both zips to OSS
    input_key = "input.zip"
    result_key = "Output.zip"

    uploaded_input = upload_to_oss(access_token, input_key, input_zip_path)
    uploaded_result = upload_to_oss(access_token, result_key, output_zip_path)

    if uploaded_input and uploaded_result:
        print("✅ Both ZIP files uploaded successfully.")
        return input_key, result_key
        # return uploaded_result
    else:
        print("❌ One or more ZIP uploads failed.")
        return None, None
    
    """
    Returns a signed S3-style PUT URL for uploading an object to Autodesk OSS.
    """
    url = f"https://developer.api.autodesk.com/oss/v2/buckets/{BUCKET_KEY}/objects/{object_key}/signeds3upload?minutesExpiration={minutes}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    response = requests.get(url, headers=headers)
    data = response.json()

    save_response_to_file(f"signed_upload_url_{object_key}", data)

    if response.ok and "url" in data:
        print(f"✅ Signed S3 Upload URL generated: {data['url']}")
        return data["url"]
    else:
        print(f"❌ Failed to generate signed S3 upload URL: {data}")
        return None

def submit_workitem_with_zips(access_token, input_key, result_key):

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }


    payload = {
        "activityId": f"{NICKNAME}.{ACTIVITY_ID}+{ACTIVITY_ALIAS}",
        "arguments": {
            "inputZip": {
                "url": f"urn:adsk.objects:os.object:{BUCKET_KEY}/{input_key}",
                "verb": "get",
                "headers": {
                    "Authorization": f"Bearer {access_token}"
                },
                "localName": "upload"
            },
            "resultZip": {
                "url": f"urn:adsk.objects:os.object:{BUCKET_KEY}/{result_key}",
                "verb": "put",
                "headers": {
                    "Authorization": f"Bearer {access_token}"
                },
                "localName": "Output.zip"
            }
        }
    }


    response = requests.post(
        "https://developer.api.autodesk.com/da/us-east/v3/workitems",
        headers=headers,
        json=payload
    )

    if response.ok:
        workitem_id = response.json().get("id")
        print(f"✅ Workitem submitted! ID: {workitem_id}")
        save_response_to_file("12_submit_workitem", response.json())
        return workitem_id

    print("❌ Failed to submit workitem:", response.text)
    save_response_to_file("12_submit_workitem_error", response.json())
    return None

def check_workitem_status(access_token, workitem_id):
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"https://developer.api.autodesk.com/da/us-east/v3/workitems/{workitem_id}"
    start_time = time.time()
    timeout = 120  

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


# -----------------------------------------Output Result------------------------------------------------------------


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


# -----------------------------------------------Main Execution------------------------------------------------------------

if __name__ == "__main__":
    token = get_access_token()
    if not token:
        print("❌ Could not obtain token.")
        exit(1)

    create_bucket(token)

    bundle = register_appbundle(token)
    if bundle and "uploadParameters" in bundle:
        version = bundle.get("version", 1)
        if upload_appbundle(bundle["uploadParameters"], version=version):
            create_appbundle_alias(token, version)
    else:
        print("❌ AppBundle registration failed or no uploadParameters returned.")

    create_or_update_activity(token)

    input_key, result_key = prepare_and_upload_zips(token)

    if input_key and result_key:
        workitem_id = submit_workitem_with_zips(token, input_key, result_key)
        if workitem_id:
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

    


    

