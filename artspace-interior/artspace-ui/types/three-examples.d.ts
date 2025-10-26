declare module 'three/examples/jsm/controls/OrbitControls' {
  import { Camera, Vector3 } from 'three'
  import { EventDispatcher } from 'three'

  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement)
    enableDamping: boolean
    dampingFactor: number
    minDistance: number
    maxDistance: number
    maxPolarAngle: number
    target: Vector3
    update(): void
    reset(): void
    dispose(): void
  }

  export default OrbitControls
}

declare module 'three/examples/jsm/loaders/OBJLoader' {
  import { Group, Loader, LoadingManager } from 'three'

  export class OBJLoader extends Loader<Group> {
    constructor(manager?: LoadingManager)
    load(
      url: string,
      onLoad: (object: Group) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (event: ErrorEvent | Error) => void
    ): void
    parse(data: string): Group
  }

  export default OBJLoader
}
