"""
3D Dataset Integration Examples
Add these implementations to services/furniture.py
"""

# ============================================================================
# OPTION 1: Objaverse Integration (850K+ 3D models)
# ============================================================================

"""
Installation:
pip install objaverse

Documentation: https://objaverse.allenai.org/
"""

import objaverse

def fetch_from_objaverse(query: str, category: str, limit: int) -> list[dict]:
    """
    Search Objaverse dataset for 3D furniture models.
    Objaverse has 800K+ high-quality 3D assets.
    """
    # Load available objects
    annotations = objaverse.load_annotations()
    
    # Filter by category and search terms
    filtered = []
    search_terms = query.lower().split()
    
    for uid, annotation in annotations.items():
        name = annotation.get('name', '').lower()
        tags = annotation.get('tags', [])
        
        # Match search terms
        if any(term in name for term in search_terms):
            filtered.append({
                'uid': uid,
                'name': annotation.get('name', ''),
                'tags': tags,
                'license': annotation.get('license', ''),
            })
        
        if len(filtered) >= limit:
            break
    
    # Download the 3D models
    results = []
    for item in filtered:
        try:
            # Download returns local path to .glb file
            local_path = objaverse.load_objects([item['uid']])[item['uid']]
            
            # You'd upload to your CDN/storage here
            # For now, we'll use local path
            results.append({
                'id': f"objaverse_{item['uid']}",
                'name': item['name'],
                'category': category,
                'model_url': local_path,  # Upload to CDN in production
                'thumbnail_url': f"https://objaverse.allenai.org/thumbnails/{item['uid']}.png",
                'style_tags': item['tags'],
                'source': 'objaverse',
                'license': item['license']
            })
        except Exception as e:
            print(f"Error loading object {item['uid']}: {e}")
            continue
    
    return results


# ============================================================================
# OPTION 2: Sketchfab API Integration (3M+ models)
# ============================================================================

"""
Setup:
1. Create account at https://sketchfab.com/
2. Get API token from https://sketchfab.com/settings/password
3. Add to .env: SKETCHFAB_API_KEY=your_token_here
"""

import requests
import os

SKETCHFAB_API_KEY = os.getenv('SKETCHFAB_API_KEY')

def fetch_from_sketchfab(query: str, category: str, limit: int) -> list[dict]:
    """
    Search Sketchfab for downloadable 3D models.
    Note: Only returns models that allow downloading.
    """
    headers = {'Authorization': f'Token {SKETCHFAB_API_KEY}'}
    
    params = {
        'type': 'models',
        'q': f"{query} {category}",
        'downloadable': True,
        'count': limit,
        'sort_by': '-likeCount'  # Most popular first
    }
    
    response = requests.get(
        'https://api.sketchfab.com/v3/search',
        params=params,
        headers=headers
    )
    response.raise_for_status()
    data = response.json()
    
    results = []
    for model in data.get('results', []):
        # Get download info
        model_uid = model['uid']
        download_url = f"https://api.sketchfab.com/v3/models/{model_uid}/download"
        
        results.append({
            'id': f"sketchfab_{model_uid}",
            'name': model['name'],
            'category': category,
            'model_url': f"https://sketchfab.com/models/{model_uid}/download",
            'thumbnail_url': model['thumbnails']['images'][0]['url'],
            'description': model.get('description', ''),
            'price': 0,  # Sketchfab free models
            'style_tags': model.get('tags', []),
            'source': 'sketchfab',
            'author': model['user']['displayName']
        })
    
    return results


# ============================================================================
# OPTION 3: PolyHaven Integration (Free CC0 Assets)
# ============================================================================

"""
PolyHaven provides free CC0 3D assets.
No API key required!
Documentation: https://polyhaven.com/
"""

def fetch_from_polyhaven(category: str, limit: int) -> list[dict]:
    """
    Fetch 3D models from PolyHaven.
    All assets are CC0 (public domain).
    """
    # Get list of all assets
    response = requests.get('https://api.polyhaven.com/assets')
    response.raise_for_status()
    all_assets = response.json()
    
    results = []
    for asset_id, asset_info in all_assets.items():
        # Filter by type (we want models)
        if asset_info.get('type') != 'model':
            continue
        
        # Get detailed info
        detail_response = requests.get(f'https://api.polyhaven.com/files/{asset_id}')
        detail_response.raise_for_status()
        files = detail_response.json()
        
        # Get GLTF file URL
        gltf_url = None
        if 'gltf' in files:
            gltf_url = files['gltf']['4k']['gltf']['url']  # Or choose resolution
        
        if gltf_url:
            results.append({
                'id': f"polyhaven_{asset_id}",
                'name': asset_info['name'],
                'category': category,
                'model_url': gltf_url,
                'thumbnail_url': f"https://cdn.polyhaven.com/asset_img/primary/{asset_id}.png",
                'style_tags': asset_info.get('tags', []),
                'price': 0,  # All free CC0
                'source': 'polyhaven',
                'license': 'CC0'
            })
        
        if len(results) >= limit:
            break
    
    return results


# ============================================================================
# OPTION 4: ShapeNet (Academic Dataset)
# ============================================================================

"""
ShapeNet is a large-scale 3D model repository.
Requires academic registration.
Download: https://shapenet.org/
"""

from pathlib import Path

SHAPENET_PATH = Path('/path/to/shapenet/dataset')

def fetch_from_shapenet(category: str, limit: int) -> list[dict]:
    """
    Load models from local ShapeNet dataset.
    Assumes you've downloaded and extracted ShapeNet.
    """
    # ShapeNet category IDs
    category_map = {
        'chair': '03001627',
        'table': '04379243',
        'sofa': '04256520',
        'lamp': '03636649',
    }
    
    category_id = category_map.get(category)
    if not category_id:
        return []
    
    category_path = SHAPENET_PATH / category_id
    if not category_path.exists():
        return []
    
    results = []
    for model_dir in list(category_path.iterdir())[:limit]:
        obj_file = model_dir / 'models' / 'model_normalized.obj'
        
        if obj_file.exists():
            results.append({
                'id': f"shapenet_{category_id}_{model_dir.name}",
                'name': f"ShapeNet {category.title()}",
                'category': category,
                'model_url': str(obj_file),  # Local path
                'thumbnail_url': '',  # Generate thumbnails separately
                'source': 'shapenet',
                'license': 'ShapeNet License'
            })
    
    return results


# ============================================================================
# INTEGRATION INTO furniture.py
# ============================================================================

"""
Add to _fetch_from_external_sources() in furniture.py:

def _fetch_from_external_sources(self, query: str, category: Optional[str], limit: int):
    all_results = []
    
    # Try multiple sources and combine results
    try:
        # Source 1: Objaverse (best quality)
        objaverse_items = fetch_from_objaverse(query, category or 'furniture', limit // 2)
        all_results.extend(objaverse_items)
    except Exception as e:
        print(f"Objaverse fetch error: {e}")
    
    try:
        # Source 2: PolyHaven (free CC0)
        polyhaven_items = fetch_from_polyhaven(category or 'furniture', limit // 4)
        all_results.extend(polyhaven_items)
    except Exception as e:
        print(f"PolyHaven fetch error: {e}")
    
    try:
        # Source 3: Sketchfab (if API key available)
        if SKETCHFAB_API_KEY:
            sketchfab_items = fetch_from_sketchfab(query, category or 'furniture', limit // 4)
            all_results.extend(sketchfab_items)
    except Exception as e:
        print(f"Sketchfab fetch error: {e}")
    
    return all_results[:limit]
"""


# ============================================================================
# TESTING
# ============================================================================

if __name__ == '__main__':
    # Test Objaverse
    print("Testing Objaverse...")
    results = fetch_from_objaverse("modern chair", "chair", 3)
    print(f"Found {len(results)} items from Objaverse")
    
    # Test PolyHaven
    print("\nTesting PolyHaven...")
    results = fetch_from_polyhaven("furniture", 3)
    print(f"Found {len(results)} items from PolyHaven")
