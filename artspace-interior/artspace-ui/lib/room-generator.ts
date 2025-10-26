import * as THREE from 'three';

export interface RoomConfig {
  width: number;   // in meters
  depth: number;   // in meters
  height: number;  // in meters
  roomType: 'bedroom' | 'living_room' | 'dining_room' | 'office';
}

export interface FurniturePlacement {
  position: { x: number; y: number; z: number };
  rotation: { y: number };
  scale?: number;
}

export class RoomGenerator {
  private scene: THREE.Scene;
  private roomConfig: RoomConfig;
  private roomGroup: THREE.Group;

  constructor(scene: THREE.Scene, config: RoomConfig) {
    this.scene = scene;
    this.roomConfig = config;
    this.roomGroup = new THREE.Group();
  }

  generateRoom(): THREE.Group {
    const { width, depth, height } = this.roomConfig;
    
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(width, depth);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5e6d3, // Warm beige
      roughness: 0.7,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Create walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdfcfa, // Off-white
      roughness: 0.9,
      metalness: 0.0
    });

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(width, height);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.z = -depth / 2;
    backWall.position.y = height / 2;
    backWall.receiveShadow = true;
    this.roomGroup.add(backWall);

    // Left wall
    const sideWallGeometry = new THREE.PlaneGeometry(depth, height);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -width / 2;
    leftWall.position.y = height / 2;
    leftWall.receiveShadow = true;
    this.roomGroup.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = width / 2;
    rightWall.position.y = height / 2;
    rightWall.receiveShadow = true;
    this.roomGroup.add(rightWall);

    // Ceiling (optional, adds realism)
    const ceilingGeometry = new THREE.PlaneGeometry(width, depth);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1.0,
      metalness: 0.0
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    this.roomGroup.add(ceiling);

    // Add ceiling light
    const ceilingLight = new THREE.PointLight(0xfff8e1, 0.5, width * 2);
    ceilingLight.position.set(0, height - 0.3, 0);
    ceilingLight.castShadow = true;
    this.roomGroup.add(ceilingLight);

    return this.roomGroup;
  }

  // Calculate intelligent furniture placement based on room type and furniture type
  static calculateFurniturePlacement(
    roomConfig: RoomConfig,
    furnitureType: string,
    index: number,
    totalItems: number
  ): FurniturePlacement {
    const { width, depth, roomType } = roomConfig;
    
    // Define placement rules for different room types
    const placements: { [key: string]: { [key: string]: FurniturePlacement[] } } = {
      bedroom: {
        bed: [{
          position: { x: 0, y: 0, z: -depth / 2 + 1.5 }, // Against back wall
          rotation: { y: 0 },
          scale: 1
        }],
        nightstand: [
          { position: { x: -width / 4, y: 0, z: -depth / 2 + 1 }, rotation: { y: 0 }, scale: 0.7 },
          { position: { x: width / 4, y: 0, z: -depth / 2 + 1 }, rotation: { y: 0 }, scale: 0.7 }
        ],
        lamp: [
          { position: { x: -width / 4, y: 0.5, z: -depth / 2 + 1 }, rotation: { y: 0 }, scale: 0.5 },
          { position: { x: width / 4, y: 0.5, z: -depth / 2 + 1 }, rotation: { y: 0 }, scale: 0.5 }
        ],
        dresser: [{
          position: { x: width / 2 - 0.8, y: 0, z: 0 }, // Against right wall
          rotation: { y: -Math.PI / 2 },
          scale: 0.9
        }],
        chair: [{
          position: { x: -width / 3, y: 0, z: depth / 4 },
          rotation: { y: Math.PI / 4 },
          scale: 0.8
        }]
      },
      living_room: {
        sofa: [{
          position: { x: 0, y: 0, z: -depth / 2 + 1.2 }, // Against back wall
          rotation: { y: 0 },
          scale: 1
        }],
        table: [{
          position: { x: 0, y: 0, z: 0 }, // Center of room
          rotation: { y: 0 },
          scale: 0.8
        }],
        chair: [
          { position: { x: -width / 3, y: 0, z: depth / 4 }, rotation: { y: Math.PI / 6 }, scale: 0.8 },
          { position: { x: width / 3, y: 0, z: depth / 4 }, rotation: { y: -Math.PI / 6 }, scale: 0.8 }
        ],
        lamp: [{
          position: { x: -width / 2 + 0.5, y: 0, z: -depth / 2 + 0.5 },
          rotation: { y: 0 },
          scale: 0.9
        }],
        painting: [
          { position: { x: 0, y: 2, z: -depth / 2 + 0.1 }, rotation: { y: 0 }, scale: 1 },
          { position: { x: -width / 2 + 0.1, y: 2, z: 0 }, rotation: { y: Math.PI / 2 }, scale: 0.8 }
        ]
      }
    };

    // Get placements for room type and furniture type
    const roomPlacements = placements[roomType] || placements.living_room;
    const furniturePlacements = roomPlacements[furnitureType] || roomPlacements[furnitureType.split('_')[0]];
    
    if (furniturePlacements && furniturePlacements[index]) {
      return furniturePlacements[index];
    }

    // Default placement in a grid if no specific rule
    const cols = Math.ceil(Math.sqrt(totalItems));
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    const spacing = Math.min(width, depth) / (cols + 1);
    
    return {
      position: {
        x: (col - cols / 2) * spacing + spacing / 2,
        y: 0,
        z: (row - Math.ceil(totalItems / cols) / 2) * spacing
      },
      rotation: { y: 0 },
      scale: 0.8
    };
  }
}