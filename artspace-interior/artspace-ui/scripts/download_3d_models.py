#!/usr/bin/env python3
"""
Download 3D models from Poly Haven and Sketchfab APIs
"""

import os
import sys
import json
import requests
from pathlib import Path
import time

# Configuration
POLY_HAVEN_API = "https://api.polyhaven.com"
SKETCHFAB_API = "https://api.sketchfab.com/v3"
SKETCHFAB_TOKEN = "dfbddcdb1d094d139df817914f2dba53"

# Paths
SCRIPT_DIR = Path(__file__).parent
PUBLIC_MODELS_DIR = SCRIPT_DIR.parent / "public" / "models"
FURNITURE_DIR = PUBLIC_MODELS_DIR / "furniture"
LIGHTING_DIR = PUBLIC_MODELS_DIR / "lighting"

# Ensure directories exist
FURNITURE_DIR.mkdir(parents=True, exist_ok=True)
LIGHTING_DIR.mkdir(parents=True, exist_ok=True)


def download_file(url, output_path, headers=None):
    """Download a file from URL to output_path"""
    try:
        print(f"Downloading: {url}")
        response = requests.get(url, headers=headers, stream=True, timeout=60)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        file_size = os.path.getsize(output_path) / (1024 * 1024)  # Size in MB
        print(f"✓ Downloaded: {output_path.name} ({file_size:.2f} MB)")
        return True
    except Exception as e:
        print(f"✗ Failed to download {url}: {str(e)}")
        return False


def get_poly_haven_models(category="Models", search_term=None):
    """Get list of models from Poly Haven API"""
    try:
        url = f"{POLY_HAVEN_API}/assets"
        params = {"type": category}
        
        print(f"\nFetching Poly Haven models...")
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        models = response.json()
        print(f"Found {len(models)} models on Poly Haven")
        
        # Filter by search term if provided
        if search_term:
            filtered = {}
            for uid, data in models.items():
                name = data.get('name', '').lower()
                tags = [t.lower() for t in data.get('tags', [])]
                if search_term.lower() in name or any(search_term.lower() in tag for tag in tags):
                    filtered[uid] = data
            print(f"Filtered to {len(filtered)} models matching '{search_term}'")
            return filtered
        
        return models
    except Exception as e:
        print(f"Error fetching Poly Haven models: {str(e)}")
        return {}


def download_poly_haven_model(asset_id, output_dir):
    """Download a specific model from Poly Haven"""
    try:
        # Get asset info
        info_url = f"{POLY_HAVEN_API}/files/{asset_id}"
        print(f"\nFetching info for {asset_id}...")
        response = requests.get(info_url, timeout=30)
        response.raise_for_status()
        
        files_data = response.json()
        
        # Look for GLTF files
        gltf_files = []
        if 'gltf' in files_data:
            for resolution, formats in files_data['gltf'].items():
                if 'gltf' in formats:
                    gltf_files.append({
                        'url': formats['gltf']['url'],
                        'size': formats['gltf'].get('size', 0),
                        'resolution': resolution
                    })
        
        if not gltf_files:
            print(f"No GLTF files found for {asset_id}")
            return None
        
        # Download the smallest resolution (faster)
        gltf_files.sort(key=lambda x: x['size'])
        best_file = gltf_files[0]
        
        output_path = output_dir / f"{asset_id}.glb"
        
        if download_file(best_file['url'], output_path):
            return str(output_path.relative_to(PUBLIC_MODELS_DIR.parent))
        
        return None
    except Exception as e:
        print(f"Error downloading Poly Haven model {asset_id}: {str(e)}")
        return None


def search_sketchfab_models(query, downloadable=True, max_results=10):
    """Search for downloadable models on Sketchfab"""
    try:
        url = f"{SKETCHFAB_API}/search"
        headers = {"Authorization": f"Token {SKETCHFAB_TOKEN}"}
        
        params = {
            "type": "models",
            "q": query,
            "downloadable": str(downloadable).lower(),
            "archives_flavours": "true",  # Request download archives
            "count": min(max_results, 24)  # Max 24 per page
        }
        
        print(f"\nSearching Sketchfab for '{query}'...")
        response = requests.get(url, params=params, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        results = data.get('results', [])
        print(f"Found {len(results)} downloadable models on Sketchfab")
        
        return results
    except Exception as e:
        print(f"Error searching Sketchfab: {str(e)}")
        return []


def get_sketchfab_download_url(model_uid):
    """Get download URL for a Sketchfab model"""
    try:
        url = f"{SKETCHFAB_API}/models/{model_uid}/download"
        headers = {"Authorization": f"Token {SKETCHFAB_TOKEN}"}
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # Look for GLTF format
        if 'gltf' in data:
            return data['gltf']['url']
        
        # Fallback to any available format
        for format_name, format_data in data.items():
            if isinstance(format_data, dict) and 'url' in format_data:
                return format_data['url']
        
        return None
    except Exception as e:
        print(f"Error getting download URL for {model_uid}: {str(e)}")
        return None


def download_sketchfab_model(model_data, output_dir):
    """Download a Sketchfab model"""
    try:
        model_uid = model_data.get('uid')
        model_name = model_data.get('name', model_uid)
        
        print(f"\nDownloading Sketchfab model: {model_name}")
        
        # Get download URL
        download_url = get_sketchfab_download_url(model_uid)
        
        if not download_url:
            print(f"No download URL available for {model_name}")
            return None
        
        # Clean filename
        safe_name = "".join(c for c in model_name if c.isalnum() or c in (' ', '-', '_')).strip()
        safe_name = safe_name.replace(' ', '_').lower()[:50]  # Limit length
        
        output_path = output_dir / f"{safe_name}.glb"
        
        headers = {"Authorization": f"Token {SKETCHFAB_TOKEN}"}
        
        if download_file(download_url, output_path, headers=headers):
            return str(output_path.relative_to(PUBLIC_MODELS_DIR.parent))
        
        return None
    except Exception as e:
        print(f"Error downloading Sketchfab model: {str(e)}")
        return None


def main():
    print("=" * 60)
    print("3D Model Downloader")
    print("=" * 60)
    
    downloaded_models = {
        'furniture': [],
        'lighting': []
    }
    
    # ========================================
    # Download furniture models from Poly Haven
    # ========================================
    print("\n" + "=" * 60)
    print("POLY HAVEN - FURNITURE")
    print("=" * 60)
    
    furniture_keywords = ["chair", "table", "sofa", "couch", "desk", "shelf"]
    
    for keyword in furniture_keywords[:2]:  # Start with 2 keywords to test
        models = get_poly_haven_models(search_term=keyword)
        
        count = 0
        for asset_id, data in models.items():
            if count >= 2:  # Limit to 2 per keyword
                break
            
            model_path = download_poly_haven_model(asset_id, FURNITURE_DIR)
            if model_path:
                downloaded_models['furniture'].append({
                    'id': asset_id,
                    'name': data.get('name', asset_id),
                    'path': model_path,
                    'source': 'polyhaven'
                })
                count += 1
            
            time.sleep(1)  # Rate limiting
    
    # ========================================
    # Download furniture from Sketchfab
    # ========================================
    print("\n" + "=" * 60)
    print("SKETCHFAB - FURNITURE")
    print("=" * 60)
    
    furniture_queries = ["modern sofa", "modern chair", "coffee table"]
    
    for query in furniture_queries[:2]:  # Start with 2 queries
        models = search_sketchfab_models(query, max_results=3)
        
        count = 0
        for model_data in models:
            if count >= 2:  # Limit to 2 per query
                break
            
            model_path = download_sketchfab_model(model_data, FURNITURE_DIR)
            if model_path:
                downloaded_models['furniture'].append({
                    'id': model_data.get('uid'),
                    'name': model_data.get('name'),
                    'path': model_path,
                    'source': 'sketchfab'
                })
                count += 1
            
            time.sleep(2)  # Rate limiting (Sketchfab has strict limits)
    
    # ========================================
    # Download lighting models
    # ========================================
    print("\n" + "=" * 60)
    print("LIGHTING MODELS")
    print("=" * 60)
    
    # Try Poly Haven for lighting
    lighting_keywords = ["lamp", "light"]
    
    for keyword in lighting_keywords[:1]:
        models = get_poly_haven_models(search_term=keyword)
        
        count = 0
        for asset_id, data in models.items():
            if count >= 3:  # Get 3 lighting models
                break
            
            model_path = download_poly_haven_model(asset_id, LIGHTING_DIR)
            if model_path:
                downloaded_models['lighting'].append({
                    'id': asset_id,
                    'name': data.get('name', asset_id),
                    'path': model_path,
                    'source': 'polyhaven'
                })
                count += 1
            
            time.sleep(1)
    
    # Try Sketchfab for lighting if needed
    if len(downloaded_models['lighting']) < 3:
        models = search_sketchfab_models("floor lamp", max_results=5)
        
        count = len(downloaded_models['lighting'])
        for model_data in models:
            if count >= 6:  # Get up to 6 lighting models total
                break
            
            model_path = download_sketchfab_model(model_data, LIGHTING_DIR)
            if model_path:
                downloaded_models['lighting'].append({
                    'id': model_data.get('uid'),
                    'name': model_data.get('name'),
                    'path': model_path,
                    'source': 'sketchfab'
                })
                count += 1
            
            time.sleep(2)
    
    # ========================================
    # Summary
    # ========================================
    print("\n" + "=" * 60)
    print("DOWNLOAD SUMMARY")
    print("=" * 60)
    print(f"\nFurniture models downloaded: {len(downloaded_models['furniture'])}")
    for model in downloaded_models['furniture']:
        print(f"  - {model['name']} ({model['source']})")
    
    print(f"\nLighting models downloaded: {len(downloaded_models['lighting'])}")
    for model in downloaded_models['lighting']:
        print(f"  - {model['name']} ({model['source']})")
    
    # Save manifest
    manifest_path = PUBLIC_MODELS_DIR / "downloaded_models.json"
    with open(manifest_path, 'w') as f:
        json.dump(downloaded_models, f, indent=2)
    
    print(f"\nManifest saved to: {manifest_path}")
    print("\n✓ Download complete!")


if __name__ == "__main__":
    main()
