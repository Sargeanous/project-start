import { useEffect, useState, type ComponentType } from "react";
import type { PlacementFormatTwinProps } from "./PlacementFormatTwin";

function Placeholder() {
  return (
    <div className="placement-twin-loading" role="status">
      Loading format model...
    </div>
  );
}

export function ClientOnlyPlacementFormatTwin(props: PlacementFormatTwinProps) {
  const [Twin, setTwin] = useState<ComponentType<PlacementFormatTwinProps> | null>(null);

  useEffect(() => {
    let active = true;
    import("./PlacementFormatTwin").then((module) => {
      if (active) setTwin(() => module.default);
    });
    return () => {
      active = false;
    };
  }, []);

  return Twin ? <Twin {...props} /> : <Placeholder />;
}
