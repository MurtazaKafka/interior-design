import * as THREE from 'three';

export interface FurnitureGenerationRequest {
  type: string;
  style: string;
  colors: string[];
  materials: string[];
  dimensions?: {
    width?: number;
    depth?: number;
    height?: number;
  };
}

export class Claude3DGenerator {
  private apiKey: string;
  private modelId: string = 'claude-sonnet-4-5'; // Claude Sonnet 4.5 - Best coding model (2025)

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateFurnitureCode(request: FurnitureGenerationRequest): Promise<string> {
    const prompt = this.buildPrompt(request);
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'max-tokens-64k' // Enable 64K output tokens
        },
        body: JSON.stringify({
          model: this.modelId,
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const code = this.extractCode(data.content[0].text);
      return code;
    } catch (error) {
      console.error('Failed to generate 3D code:', error);
      throw error;
    }
  }

  private buildPrompt(request: FurnitureGenerationRequest): string {
    return `You are an expert in Three.js and procedural 3D modeling. Generate Three.js code to create a realistic ${request.type} with these specifications:

Style: ${request.style}
Primary Colors: ${request.colors.join(', ')}
Materials: ${request.materials.join(', ')}
${request.dimensions ? `Approximate Dimensions (in meters): width=${request.dimensions.width}, depth=${request.dimensions.depth}, height=${request.dimensions.height}` : ''}

CRITICAL REQUIREMENTS:
1. Return ONLY executable JavaScript code - no explanations or markdown
2. Define a function called createFurniture() that returns a THREE.Group
3. Use only built-in Three.js geometries (BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, etc.)
4. Apply realistic materials with proper colors and properties
5. Add fine details that match the style (e.g., legs, armrests, cushions, decorative elements)
6. Make proportions realistic for the furniture type
7. The code must be completely self-contained with no external dependencies
8. Use MeshPhongMaterial or MeshStandardMaterial for realistic appearance
9. Add subtle variations in colors/materials for different parts

STRUCTURE YOUR CODE EXACTLY LIKE THIS:
function createFurniture() {
  const group = new THREE.Group();
  
  // Define colors
  const primaryColor = 0x[HEX_COLOR];
  const secondaryColor = 0x[HEX_COLOR];
  
  // Define materials
  const material1 = new THREE.MeshPhongMaterial({ 
    color: primaryColor,
    shininess: 100
  });
  
  // Create main structure
  const mainGeometry = new THREE.BoxGeometry(width, height, depth);
  const mainPart = new THREE.Mesh(mainGeometry, material1);
  mainPart.position.set(x, y, z);
  group.add(mainPart);
  
  // Add details and sub-components
  // ... more geometry ...
  
  // Optional: Add point light for lamps
  if (isLamp) {
    const light = new THREE.PointLight(0xFFFFAA, 0.5, 5);
    light.position.set(x, y, z);
    group.add(light);
  }
  
  return group;
}

Now generate the Three.js code for the ${request.type}:`;
  }

  private extractCode(response: string): string {
    // Remove any markdown formatting
    const cleanResponse = response
      .replace(/```javascript\n?/g, '')
      .replace(/```js\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // Extract just the function if there's extra text
    const functionMatch = cleanResponse.match(/function createFurniture[\s\S]*?^}/m);
    if (functionMatch) {
      return functionMatch[0];
    }
    
    // If it's already clean code, return it
    if (cleanResponse.startsWith('function createFurniture')) {
      return cleanResponse;
    }
    
    return cleanResponse;
  }

  // Execute the generated code and return a Three.js object
  executeGeneratedCode(code: string): THREE.Group {
    try {
      // Create a sandboxed function with Three.js in scope
      const func = new Function('THREE', `
        ${code}
        if (typeof createFurniture === 'function') {
          return createFurniture();
        } else {
          throw new Error('createFurniture function not found in generated code');
        }
      `);
      
      const result = func(THREE);
      
      if (!(result instanceof THREE.Group)) {
        if (result instanceof THREE.Object3D) {
          // Wrap in a group if it's just an Object3D
          const group = new THREE.Group();
          group.add(result);
          return group;
        }
        throw new Error('Generated code did not return a valid Three.js object');
      }
      
      // Apply some standard optimizations
      result.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      return result;
    } catch (error) {
      console.error('Failed to execute generated code:', error);
      console.error('Generated code was:', code);
      return this.createErrorPlaceholder();
    }
  }

  private createErrorPlaceholder(): THREE.Group {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xFF0000,
      opacity: 0.5,
      transparent: true
    });
    const cube = new THREE.Mesh(geometry, material);
    group.add(cube);
    
    // Add error indicator
    const errorGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const errorMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFFFF00,
      emissive: 0xFFFF00,
      emissiveIntensity: 0.5
    });
    const errorSphere = new THREE.Mesh(errorGeometry, errorMaterial);
    errorSphere.position.y = 0.4;
    group.add(errorSphere);
    
    return group;
  }
}

// Fallback generators if Claude API fails
export const FallbackGenerators = {
  chair: () => {
    const group = new THREE.Group();
    
    // Seat
    const seatGeometry = new THREE.BoxGeometry(0.45, 0.05, 0.45);
    const woodMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513,
      shininess: 30
    });
    const seat = new THREE.Mesh(seatGeometry, woodMaterial);
    seat.position.y = 0.45;
    group.add(seat);
    
    // Backrest
    const backGeometry = new THREE.BoxGeometry(0.45, 0.5, 0.05);
    const backrest = new THREE.Mesh(backGeometry, woodMaterial);
    backrest.position.set(0, 0.7, -0.2);
    group.add(backrest);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.45);
    const legMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x654321,
      shininess: 20
    });
    
    const positions = [
      [-0.2, 0.225, -0.2],
      [0.2, 0.225, -0.2],
      [-0.2, 0.225, 0.2],
      [0.2, 0.225, 0.2]
    ];
    
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });
    
    return group;
  },

  sofa: () => {
    const group = new THREE.Group();
    
    // Base cushion
    const baseGeometry = new THREE.BoxGeometry(2, 0.4, 0.8);
    const fabricMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x5C4033,
      shininess: 10
    });
    const base = new THREE.Mesh(baseGeometry, fabricMaterial);
    base.position.y = 0.2;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);
    
    // Backrest
    const backGeometry = new THREE.BoxGeometry(2, 0.6, 0.2);
    const backrest = new THREE.Mesh(backGeometry, fabricMaterial);
    backrest.position.set(0, 0.5, -0.3);
    backrest.castShadow = true;
    group.add(backrest);
    
    // Armrests
    const armGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.8);
    
    const leftArm = new THREE.Mesh(armGeometry, fabricMaterial);
    leftArm.position.set(-0.9, 0.35, 0);
    leftArm.castShadow = true;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, fabricMaterial);
    rightArm.position.set(0.9, 0.35, 0);
    rightArm.castShadow = true;
    group.add(rightArm);
    
    // Seat cushions
    const cushionMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B7355,
      shininess: 15
    });
    const cushionGeometry = new THREE.BoxGeometry(0.55, 0.15, 0.55);
    
    for (let i = 0; i < 3; i++) {
      const cushion = new THREE.Mesh(cushionGeometry, cushionMaterial);
      cushion.position.set(-0.65 + i * 0.65, 0.45, 0);
      cushion.castShadow = true;
      group.add(cushion);
    }
    
    return group;
  },

  table: () => {
    const group = new THREE.Group();
    
    // Tabletop with wood grain appearance
    const topGeometry = new THREE.BoxGeometry(1.2, 0.05, 0.8);
    const woodMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513,
      shininess: 80
    });
    const top = new THREE.Mesh(topGeometry, woodMaterial);
    top.position.y = 0.75;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);
    
    // Table legs
    const legGeometry = new THREE.BoxGeometry(0.05, 0.75, 0.05);
    const legMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x654321,
      shininess: 40
    });
    
    const positions = [
      [-0.55, 0.375, -0.35],
      [0.55, 0.375, -0.35],
      [-0.55, 0.375, 0.35],
      [0.55, 0.375, 0.35]
    ];
    
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      group.add(leg);
    });
    
    return group;
  },

  lamp: () => {
    const group = new THREE.Group();
    
    // Base
    const baseGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.05);
    const metalMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x2C2C2C,
      shininess: 100
    });
    const base = new THREE.Mesh(baseGeometry, metalMaterial);
    base.position.y = 0.025;
    base.castShadow = true;
    group.add(base);
    
    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5);
    const pole = new THREE.Mesh(poleGeometry, metalMaterial);
    pole.position.y = 0.75;
    pole.castShadow = true;
    group.add(pole);
    
    // Lampshade
    const shadeGeometry = new THREE.ConeGeometry(0.3, 0.4, 8, 1, true);
    const shadeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xFFF8DC,
      emissive: 0xFFF8DC,
      emissiveIntensity: 0.1,
      side: THREE.DoubleSide
    });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.y = 1.3;
    shade.rotation.z = Math.PI;
    group.add(shade);
    
    // Add point light
    const light = new THREE.PointLight(0xFFFFAA, 0.5, 5);
    light.position.y = 1.2;
    light.castShadow = true;
    group.add(light);
    
    return group;
  }
};