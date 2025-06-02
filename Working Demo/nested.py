import requests
import base64
import os
import time
import json

CLIENT_ID = "WA2Kz91xVUfApIGYmyh8vAF3YUlCQoqBWy9Huk9z2RLmpB9b"
CLIENT_SECRET = "Jx4HqWtqC9HA23nWnCti59M7nkb0av9x8hroTMnpGurBQl8VyPIARAEA820PQAXX"
BUCKET_KEY = "check-3bucket"
POLICY_KEY = "transient"
FOLDER_PATH = "upload"
ASSEMBLY_FILE = "scissors.iam"
COMPONENTS_FOLDER = "Components"
RESPONSES_FOLDER = "responses"

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
            signed_data = get_signed_url(access_token, file_name)
            if not signed_data:
                continue

            upload_key = signed_data.get("uploadKey")
            signed_url = signed_data.get("urls")[0]

            if upload_file_to_s3(signed_url, full_path):
                finalize_upload(access_token, file_name, upload_key)
    print("✅ All files uploaded and finalized.")

def base64_encode_urn(urn):
    return base64.b64encode(urn.encode('utf-8')).decode('utf-8').replace('=', '').replace('+', '-').replace('/', '_')

def link_references(access_token):
    assembly_urn = f"urn:adsk.objects:os.object:{BUCKET_KEY}/{ASSEMBLY_FILE}"
    encoded_urn = base64_encode_urn(assembly_urn)
    url = f"https://developer.api.autodesk.com/modelderivative/v2/designdata/{encoded_urn}/references"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    references = []
    for file_name in os.listdir('./upload/Components'):
        if file_name.lower().endswith('.ipt'):
            references.append({
                "urn": f"urn:adsk.objects:os.object:{BUCKET_KEY}/{file_name}",
                "relativePath": f"{COMPONENTS_FOLDER}/{file_name}",
                "filename": file_name
            })

    payload = {
        "urn": assembly_urn,
        "filename": ASSEMBLY_FILE,
        "references": references
    }

    response = requests.post(url, headers=headers, json=payload)
    save_response_to_file("05_link_references", response.json())
    if response.ok:
        print("✅ References linked.")
    return response.ok

def start_translation_job(access_token):
    assembly_urn = f"urn:adsk.objects:os.object:{BUCKET_KEY}/{ASSEMBLY_FILE}"
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

def retrieve_list_of_viewable_files(access_token, encoded_urn):
    url = f"https://developer.api.autodesk.com/modelderivative/v2/designdata/{encoded_urn}/metadata"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    if response.ok:
        data = response.json()
        save_response_to_file("08_metadata", data)
        print("✅ Metadata retrieved successfully.")

        metadata_list = data.get("data", {}).get("metadata", [])
        if metadata_list:
            return metadata_list[0].get("guid")
        else:
            print("⚠️ No metadata entries found.")
            return None
    else:
        print("❌ Error retrieving viewable files.")
        return None
    
def get_object_hierarchy(access_token, encoded_urn, guid_viewable):
    url = f"https://developer.api.autodesk.com/modelderivative/v2/designdata/{encoded_urn}/metadata/{guid_viewable}"
    headers = {"Authorization": f"Bearer {access_token}"}

    max_retries = 10
    delay = 10 

    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)
        data = response.json()
        save_response_to_file("09_object_hierarchy", data)

        if not response.ok:
            print("❌ Error retrieving object hierarchy.")
            return

        if data.get("result") == "success" and "data" not in data:
            print(f"⏳ Properties still extracting... retrying in {delay} seconds ({attempt + 1}/{max_retries})")
            time.sleep(delay)
            continue

        print("✅ Object hierarchy retrieved successfully.")
        return

    print("❌ Timed out waiting for object hierarchy to be available.")
    
def retrieve_properties_all_objects(access_token, encoded_urn, guid_viewable):
    url = f"https://developer.api.autodesk.com/modelderivative/v2/designdata/{encoded_urn}/metadata/{guid_viewable}/properties"
    headers = {"Authorization": f"Bearer {access_token}"}

    max_retries = 10
    delay = 10 

    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)
        if not response.ok:
            print("❌ Error retrieving properties.")
            return None

        data = response.json()
        save_response_to_file("10_properties_all_objects", data)

        if data.get("result") == "success" and "data" not in data:
            print(f"⏳ Properties still extracting... retrying in {delay} seconds ({attempt + 1}/{max_retries})")
            time.sleep(delay)
            continue

        print("✅ Properties retrieved successfully.")
        return data

    print("❌ Timed out waiting for properties to be available.")
    return None

if __name__ == "__main__":
    token = get_access_token()
    if not token:
        print("❌ Failed to get access token.")
        exit(1)
    print("✅ Access token retrieved.")

    if not create_bucket(token):
        print("❌ Failed to create bucket.")
        exit(1)
    print("✅ Bucket ready.")

    upload_all_files(token)

    if not link_references(token):
        print("❌ Failed to link references.")
        exit(1)

    encoded_urn = start_translation_job(token)
    if not encoded_urn:
        print("❌ Failed to start translation job.")
        exit(1)

    check_translation_status(token, encoded_urn)

    guid_viewable = retrieve_list_of_viewable_files(token, encoded_urn)

    get_object_hierarchy(token, encoded_urn, guid_viewable)

    retrieve_properties_all_objects(token, encoded_urn, guid_viewable)
   
