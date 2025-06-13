import requests
import base64
import os
import time
import json
import networkx as nx

CLIENT_ID = "Kx5ZBaHiGk9aWpiSYTNKLWpuIJehrigAOV6sSng7D60kXGAq"
CLIENT_SECRET = "r1AqeIwZQlj9Adnac88IbML01OGt9DHAKum741XBRFXMwbXuWzsf5aGVorDagXJq"
BUCKET_KEY = "13june_2025"
POLICY_KEY = "transient"
FOLDER_PATH = "upload"
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
            time.sleep(30)

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
    for attempt in range(10):
        response = requests.get(url, headers=headers)
        data = response.json()
        save_response_to_file("09_object_hierarchy", data)
        if not response.ok:
            print("❌ Error retrieving object hierarchy.")
            return
        if data.get("result") == "success" and "data" not in data:
            print(f"⏳ Properties still extracting... retrying ({attempt + 1}/10)")
            time.sleep(10)
            continue
        print("✅ Object hierarchy retrieved successfully.")
        return
    print("❌ Timed out waiting for object hierarchy.")

def retrieve_properties_all_objects(access_token, encoded_urn, guid_viewable):
    url = f"https://developer.api.autodesk.com/modelderivative/v2/designdata/{encoded_urn}/metadata/{guid_viewable}/properties"
    headers = {"Authorization": f"Bearer {access_token}"}
    for attempt in range(10):
        response = requests.get(url, headers=headers)
        if not response.ok:
            print("❌ Error retrieving properties.")
            return None
        data = response.json()
        save_response_to_file("10_properties_all_objects", data)
        if data.get("result") == "success" and "data" not in data:
            print(f"⏳ Properties still extracting... retrying ({attempt + 1}/10)")
            time.sleep(10)
            continue
        print("✅ Properties retrieved successfully.")
        return data
    print("❌ Timed out waiting for properties.")
    return None

# ==========================================
# INTEGRATED ASSEMBLY GRAPH FUNCTIONS
# ==========================================

def load_json(file_path):
    """Load JSON data from file."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️ File {file_path} not found. Skipping...")
        return None
    except json.JSONDecodeError:
        print(f"⚠️ Error parsing {file_path}. Skipping...")
        return None

def parse_properties(properties_data):
    """
    Converts the properties data into a dictionary of part properties.
    """
    if not properties_data:
        return {}
    
    part_properties = {}
    collection = properties_data.get('data', {}).get('collection', [])
    for item in collection:
        part_name = item.get('name')
        props = item.get('properties', {})
        if part_name:
            part_properties[part_name] = props
    return part_properties

def parse_hierarchy(hierarchy_data):
    """
    Parses the hierarchy from 'Components' with optional 'Children'.
    Returns a dictionary mapping parent to child list.
    """
    if not hierarchy_data:
        return {}
    
    def traverse(node, parent=None, hierarchy={}):
        current_name = node.get('Name')
        children = node.get('Children', [])
        if parent and current_name:
            hierarchy.setdefault(parent, []).append(current_name)
        if children:
            for child in children:
                traverse(child, current_name, hierarchy)
        return hierarchy

    hierarchy = {}
    components = hierarchy_data.get('Components', [])
    for component in components:
        traverse(component, parent=None, hierarchy=hierarchy)
    return hierarchy

def parse_joints(joints_constraints_data):
    """
    Parses both constraints and joints into a combined list of edges.
    """
    if not joints_constraints_data:
        return []
    
    edges = []

    # Parse constraints (edges without direction)
    constraints = joints_constraints_data.get('Constraints', [])
    for constraint in constraints:
        entity_one = constraint.get('EntityOne')
        entity_two = constraint.get('EntityTwo')
        # Since no part names given here, skipping constraints unless mapping is available
        # Could map face references to parts with additional data if needed
        # Skipping this part for now as it's ambiguous

    # Parse joints (directed edges)
    joints = joints_constraints_data.get('Joints', [])
    for joint in joints:
        part_a = joint.get('OccurrenceOne')
        part_b = joint.get('OccurrenceTwo')
        joint_type = joint.get('Type', 'unknown')
        if part_a and part_b:
            edges.append({'partA': part_a, 'partB': part_b, 'type': joint_type})

    return edges

def build_assembly_graph(hierarchy, properties, joints):
    """
    Builds a directed assembly graph with nodes carrying properties and edges for hierarchy and joints.
    """
    G = nx.DiGraph()

    # Add nodes and properties
    for part_name, props in properties.items():
        G.add_node(part_name, **props)

    # Add hierarchy edges (parent -> child)
    for parent, children in hierarchy.items():
        for child in children:
            if not G.has_node(parent):
                G.add_node(parent)
            if not G.has_node(child):
                G.add_node(child)
            G.add_edge(parent, child, type='hierarchy')

    # Add joint edges (directed)
    for joint in joints:
        part_a = joint.get('partA')
        part_b = joint.get('partB')
        joint_type = joint.get('type', 'unknown')
        if part_a and part_b:
            if not G.has_node(part_a):
                G.add_node(part_a)
            if not G.has_node(part_b):
                G.add_node(part_b)
            G.add_edge(part_a, part_b, type='joint', joint_type=joint_type)

    return G

def save_graph_to_json(graph, output_file):
    """
    Saves the graph to JSON using node-link format with explicit 'edges' key.
    """
    graph_data = nx.readwrite.json_graph.node_link_data(graph, edges='edges')
    output_path = os.path.join(RESPONSES_FOLDER, output_file)
    with open(output_path, 'w') as f:
        json.dump(graph_data, f, indent=2)

def load_graph_from_json(file_path):
    """
    Loads the assembly graph from JSON.
    """
    try:
        full_path = os.path.join(RESPONSES_FOLDER, file_path)
        with open(full_path, 'r') as f:
            data = json.load(f)
        G = nx.DiGraph()
        
        # Add nodes
        for node in data.get("nodes", []):
            node_id = node.pop("id")
            G.add_node(node_id, **node)
        
        # Add edges
        for edge in data.get("edges", []):
            source = edge["source"]
            target = edge["target"]
            edge_type = edge.get("type", "undefined")
            G.add_edge(source, target, **edge)
        
        return G
    except (FileNotFoundError, json.JSONDecodeError, KeyError) as e:
        print(f"⚠️ Error loading graph from {file_path}: {e}")
        return None

def disassembly_planner(graph):
    """
    Simple disassembly planner:
    - Repeatedly removes leaf nodes (no outgoing edges).
    - Records the disassembly sequence.
    """
    if not graph or graph.number_of_nodes() == 0:
        return []
    
    disassembly_steps = []
    G = graph.copy()
    step_counter = 1

    while G.number_of_nodes() > 0:
        # Find leaves (no outgoing hierarchy/joint edges)
        leaves = [n for n in G.nodes if G.out_degree(n) == 0]
        if not leaves:
            print("⚠️ No more removable parts found. Disassembly halted.")
            break

        # Select the first leaf node
        part_to_remove = leaves[0]

        print(f"Step {step_counter}: Removing '{part_to_remove}'")
        disassembly_steps.append({
            "step": step_counter,
            "removed_part": part_to_remove,
            "remaining_parts": list(G.nodes)
        })

        G.remove_node(part_to_remove)
        step_counter += 1

    return disassembly_steps

def reverse_disassembly(disassembly_steps):
    """
    Reverses the disassembly steps to get the assembly sequence.
    """
    assembly_sequence = []
    for step in reversed(disassembly_steps):
        assembly_sequence.append(step["removed_part"])
    return assembly_sequence

def save_to_json(data, file_name, key_name):
    """
    Saves the data to JSON in the responses folder.
    """
    try:
        file_path = os.path.join(RESPONSES_FOLDER, file_name)
        with open(file_path, 'w') as f:
            json.dump({key_name: data}, f, indent=2)
        print(f"✅ Saved '{key_name}' to '{file_path}'.")
    except Exception as e:
        print(f"❌ Error saving to {file_path}: {e}")

def generate_assembly_graph():
    """
    Main function to generate assembly graph from existing data files.
    """
    print("\n" + "="*50)
    print("🔧 STARTING ASSEMBLY GRAPH GENERATION")
    print("="*50)
    
    # File paths
    properties_file = os.path.join(RESPONSES_FOLDER, '10_properties_all_objects.json')
    hierarchy_file = os.path.join(RESPONSES_FOLDER, '09_object_hierarchy.json')
    joints_file = 'output_3.json'  # Assuming this exists in the root directory
    output_file = '11_assembly_graph_demo.json'

    # Load JSON files
    properties_data = load_json(properties_file)
    hierarchy_data = load_json(hierarchy_file)
    joints_constraints_data = load_json(joints_file)

    # Parse data
    properties = parse_properties(properties_data)
    hierarchy = parse_hierarchy(hierarchy_data)
    joints = parse_joints(joints_constraints_data)

    print(f"📊 Parsed {len(properties)} properties")
    print(f"📊 Parsed {len(hierarchy)} hierarchy relationships")
    print(f"📊 Parsed {len(joints)} joint relationships")

    # Build the assembly graph
    assembly_graph = build_assembly_graph(hierarchy, properties, joints)

    # Print summary
    print(f"📈 Graph has {assembly_graph.number_of_nodes()} nodes and {assembly_graph.number_of_edges()} edges")

    if assembly_graph.number_of_nodes() > 0:
        print("\n📝 Nodes:")
        for node, data in assembly_graph.nodes(data=True):
            print(f"  {node}: {dict(list(data.items())[:3])}...")  # Show first 3 properties

        print("\n🔗 Edges:")
        for u, v, data in assembly_graph.edges(data=True):
            print(f"  {u} -> {v}: {data}")

        # Save graph to JSON
        save_graph_to_json(assembly_graph, output_file)
        print(f"✅ Assembly graph saved to responses/{output_file}")
        return True
    else:
        print("⚠️ No assembly graph generated - insufficient data")
        return False

def run_assembly_pipeline():
    """
    Main function to run the assembly pipeline planning.
    """
    print("\n" + "="*50)
    print("🏗️ STARTING ASSEMBLY PIPELINE PLANNING")
    print("="*50)
    
    input_file = '12_assembly_graph_demo.json'

    # Load the assembly graph
    graph = load_graph_from_json(input_file)
    if not graph:
        print("❌ Failed to load assembly graph. Pipeline planning aborted.")
        return False

    print(f"📈 Assembly graph loaded with {graph.number_of_nodes()} nodes and {graph.number_of_edges()} edges")

    if graph.number_of_nodes() == 0:
        print("⚠️ Empty graph. Pipeline planning aborted.")
        return False

    # Disassembly planning
    print("\n🔄 Starting disassembly planning...")
    disassembly_steps = disassembly_planner(graph)

    if not disassembly_steps:
        print("⚠️ No disassembly steps generated.")
        return False

    # Save disassembly steps
    save_to_json(disassembly_steps, '13_disassembly_sequence.json', key_name='disassembly_steps')

    # Generate assembly sequence
    assembly_sequence = reverse_disassembly(disassembly_steps)
    print(f"\n🔧 Assembly Sequence ({len(assembly_sequence)} steps):")
    for idx, part in enumerate(assembly_sequence, 1):
        print(f"  Step {idx}: Install '{part}'")

    # Save assembly sequence
    save_to_json(assembly_sequence, '14_assembly_sequence.json', key_name='assembly_sequence')
    
    print("✅ Assembly pipeline planning completed successfully!")
    return True

if __name__ == "__main__":
    # Original main.py workflow
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

    guid_viewable = retrieve_list_of_viewable_files(token, encoded_urn)
    if guid_viewable:
        get_object_hierarchy(token, encoded_urn, guid_viewable)
        properties_data = retrieve_properties_all_objects(token, encoded_urn, guid_viewable)
        
        # NEW: Integrated assembly graph generation and pipeline planning
        if properties_data:
            print("\n" + "="*70)
            print("🚀 STARTING INTEGRATED ASSEMBLY ANALYSIS")
            print("="*70)
            
            # Generate assembly graph
            if generate_assembly_graph():
                # Run assembly pipeline planning
                run_assembly_pipeline()
            else:
                print("⚠️ Skipping pipeline planning due to assembly graph generation failure.")
            
            print("\n" + "="*70)
            print("🎉 INTEGRATED WORKFLOW COMPLETED")
            print("="*70)
        else:
            print("⚠️ No properties data available. Skipping assembly analysis.")
    else:
        print("⚠️ No viewable files found. Skipping assembly analysis.")