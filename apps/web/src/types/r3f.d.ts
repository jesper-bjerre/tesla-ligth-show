// Augment React JSX intrinsic elements with React Three Fiber's Three.js elements.
// React 17+ uses React.JSX instead of the global JSX namespace.
import type { ThreeElements } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
