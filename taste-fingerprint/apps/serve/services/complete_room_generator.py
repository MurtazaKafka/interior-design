"""
Complete Room Generator using Claude Sonnet 4.5 Vision
Generates entire Three.js rooms from images with ALL objects
"""

import os
import base64
import logging
from typing import Optional, Dict, Any
from anthropic import Anthropic

logger = logging.getLogger(__name__)

class CompleteRoomGenerator:
    """Generate complete Three.js room scenes from images using Claude Vision"""
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize with Anthropic API key"""
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("Anthropic API key is required")
        
        self.client = Anthropic(api_key=self.api_key)
        self.model_id = "claude-sonnet-4-5"  # Latest Claude Sonnet 4.5 (2025)
    
    def generate_complete_room_from_image(
        self,
        image_data: str,  # Base64 encoded image or URL
        room_description: Optional[str] = None,
        existing_code: Optional[str] = None,
        max_tokens: int = 8000  # Use maximum tokens for complex scenes
    ) -> Dict[str, Any]:
        """
        Generate a COMPLETE Three.js room with ALL furniture and objects from an image
        
        Args:
            image_data: Base64 encoded image or URL of the room
            room_description: Optional description to guide generation
            existing_code: Optional existing Three.js code to modify/extend
            max_tokens: Maximum tokens for response (up to 8000)
        
        Returns:
            Dictionary with generated Three.js code and metadata
        """
        
        # Build the prompt for complete room generation
        prompt = self._build_complete_room_prompt(room_description, existing_code)
        
        try:
            # If image is base64, prepare for Claude Vision API
            messages = []
            
            if image_data.startswith('data:'):
                # Extract base64 data
                import re
                match = re.match(r'data:image/([^;]+);base64,(.+)', image_data)
                if match:
                    media_type = f"image/{match.group(1)}"
                    base64_data = match.group(2)
                    
                    messages = [{
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": base64_data
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }]
            else:
                # For now, use text-only with description
                messages = [{
                    "role": "user",
                    "content": prompt + f"\n\nImage URL: {image_data}\n\nUser description: {room_description or 'Modern bedroom with all furniture'}"
                }]
            
            # Call Claude API with vision capabilities
            response = self.client.messages.create(
                model=self.model_id,
                max_tokens=max_tokens,
                temperature=0.7,
                messages=messages
            )
            
            # Extract the generated code
            generated_text = response.content[0].text
            code = self._extract_complete_code(generated_text)
            
            # Ensure the code is complete
            if not code.endswith('}'):
                # Try to complete the function
                if 'return scene;' in code and not code.strip().endswith('}'):
                    code = code + '\n}'
                else:
                    # Use fallback if incomplete
                    logger.warning("Generated code appears incomplete, using fallback")
                    code = self._get_fallback_complete_room()
            
            logger.info(f"Successfully generated complete room with {len(code)} characters")
            
            return {
                "code": code,
                "source": "claude-vision-complete" if 'return scene;' in code else "fallback",
                "model": self.model_id,
                "description": room_description,
                "tokens_used": len(code) // 4  # Rough estimate
            }
            
        except Exception as e:
            logger.error(f"Failed to generate complete room: {str(e)}")
            # Return a basic room as fallback
            return {
                "code": self._get_fallback_complete_room(),
                "source": "fallback",
                "error": str(e)
            }
    
    def _build_complete_room_prompt(self, description: Optional[str], existing_code: Optional[str]) -> str:
        """Build prompt for complete room generation"""
        
        if existing_code:
            return f"""You are an expert Three.js developer. Analyze this image and MODIFY the existing room code to add new objects you see.

EXISTING CODE TO MODIFY:
```javascript
{existing_code}
```

ADD all new furniture and objects you see in the image that are not in the existing code.
Keep the existing objects and just add new ones.

{description or ''}

OUTPUT ONLY THE COMPLETE MODIFIED JAVASCRIPT CODE - NO EXPLANATIONS!"""
        
        return f"""You are an expert Three.js developer creating photorealistic room scenes.

Analyze this image and generate COMPLETE Three.js code that recreates EVERY object in the room.

CRITICAL REQUIREMENTS:
1. Create a function called createCompleteRoom() that returns a THREE.Scene
2. Include EVERY visible object: bed, nightstands, lamps, dresser, chairs, paintings, rugs, curtains, etc.
3. Create realistic room dimensions (walls, floor, ceiling) based on the image
4. Use proper scale - room should be approximately 5m x 5m x 3m
5. Position each object exactly as shown in the image
6. Use accurate colors and materials matching the image
7. Include proper lighting (ambient, directional, point lights for lamps)
8. Add ALL decorative elements (pillows, books, plants, etc.)

ROOM DETAILS TO CAPTURE:
- Wall color and texture
- Floor type (wood, carpet, tile)
- Ceiling details (flat, recessed lighting, chandelier)
- Window positions and curtains
- ALL furniture pieces with correct proportions
- Decorative items and accessories
- Lighting fixtures and their glow effects

{description or ''}

CODE STRUCTURE:
function createCompleteRoom() {{
  const scene = new THREE.Scene();
  
  // Room dimensions
  const roomWidth = 5;
  const roomDepth = 5;
  const roomHeight = 3;
  
  // Create room structure (walls, floor, ceiling)
  // ... walls with exact colors from image
  
  // Create ALL furniture
  // ... bed with headboard, mattress, pillows, blankets
  // ... nightstands with drawers, handles
  // ... lamps with shades and light sources
  // ... dresser with mirror
  // ... chairs with cushions
  // ... artwork on walls
  // ... rugs on floor
  // ... curtains on windows
  // ... ALL other visible objects
  
  // Lighting setup
  // ... ambient light
  // ... directional sunlight from windows
  // ... point lights in lamps
  // ... ceiling lights if visible
  
  // Position camera for best view
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(4, 2.5, 4);
  camera.lookAt(0, 1, 0);
  
  scene.userData.camera = camera;
  
  return scene;
}}

IMPORTANT: Generate COMPLETE, WORKING Three.js code that can be executed directly.
The function MUST end with 'return scene;' followed by closing brace.
DO NOT use markdown backticks or code blocks.
OUTPUT ONLY PURE JAVASCRIPT - NO EXPLANATIONS OR MARKDOWN!"""
    
    def _extract_complete_code(self, response: str) -> str:
        """Extract clean JavaScript code from response"""
        clean = response.strip()
        
        # Remove markdown if present
        if "```" in clean:
            import re
            pattern = r'```(?:javascript|js)?\n?(.*?)```'
            match = re.search(pattern, clean, re.DOTALL)
            if match:
                clean = match.group(1).strip()
            else:
                # Try to extract between first ``` and last ```
                start = clean.find('```')
                if start != -1:
                    clean = clean[start+3:]
                    # Skip language identifier
                    if clean.startswith('javascript') or clean.startswith('js'):
                        clean = clean[clean.find('\n')+1:]
                    end = clean.rfind('```')
                    if end != -1:
                        clean = clean[:end].strip()
        
        # Ensure function exists
        if "function createCompleteRoom" not in clean:
            # Wrap in function if needed
            return f"""function createCompleteRoom() {{
  const scene = new THREE.Scene();
  {clean}
  return scene;
}}"""
        
        return clean
    
    def _get_fallback_complete_room(self) -> str:
        """Fallback complete room if generation fails"""
        return """function createCompleteRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8f8f8);
  
  // Room dimensions
  const roomWidth = 5;
  const roomDepth = 5;
  const roomHeight = 3;
  
  // Floor
  const floorGeometry = new THREE.PlaneGeometry(roomWidth, roomDepth);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xf5e6d3, roughness: 0.7 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  
  // Walls
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xfdfcfa, roughness: 0.9 });
  
  // Back wall
  const backWallGeometry = new THREE.PlaneGeometry(roomWidth, roomHeight);
  const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
  backWall.position.z = -roomDepth / 2;
  backWall.position.y = roomHeight / 2;
  scene.add(backWall);
  
  // Bed
  const bedGroup = new THREE.Group();
  
  // Bed frame
  const bedFrameGeometry = new THREE.BoxGeometry(2, 0.3, 2.2);
  const bedFrameMaterial = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
  const bedFrame = new THREE.Mesh(bedFrameGeometry, bedFrameMaterial);
  bedFrame.position.y = 0.3;
  bedGroup.add(bedFrame);
  
  // Mattress
  const mattressGeometry = new THREE.BoxGeometry(1.9, 0.2, 2.1);
  const mattressMaterial = new THREE.MeshPhongMaterial({ color: 0xFFF8DC });
  const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
  mattress.position.y = 0.55;
  bedGroup.add(mattress);
  
  // Headboard
  const headboardGeometry = new THREE.BoxGeometry(2, 1.2, 0.1);
  const headboardMaterial = new THREE.MeshPhongMaterial({ color: 0x8B7355 });
  const headboard = new THREE.Mesh(headboardGeometry, headboardMaterial);
  headboard.position.set(0, 1, -1.05);
  bedGroup.add(headboard);
  
  bedGroup.position.set(0, 0, -1.5);
  scene.add(bedGroup);
  
  // Nightstands
  for (let i = 0; i < 2; i++) {
    const nightstandGroup = new THREE.Group();
    
    const nightstandGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.4);
    const nightstandMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
    const nightstand = new THREE.Mesh(nightstandGeometry, nightstandMaterial);
    nightstand.position.y = 0.3;
    nightstandGroup.add(nightstand);
    
    nightstandGroup.position.set(i === 0 ? -1.5 : 1.5, 0, -1.5);
    scene.add(nightstandGroup);
  }
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  // Camera position
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(4, 2.5, 4);
  camera.lookAt(0, 1, 0);
  scene.userData.camera = camera;
  
  return scene;
}"""