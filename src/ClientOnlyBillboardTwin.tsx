import { useEffect, useState, type ComponentType } from "react";
import type { BillboardTwinProps } from "./BillboardTwin";

function BillboardTwinPlaceholder() {
  return (
    <div className="twin-client-placeholder" role="status">
      Loading 3D digital twin...
    </div>
  );
}

export function ClientOnlyBillboardTwin(props: BillboardTwinProps) {
  const [Twin, setTwin] = useState<ComponentType<BillboardTwinProps> | null>(null);

  useEffect(() => {
    let active = true;

    import("./BillboardTwin").then((module) => {
      if (active) setTwin(() => module.default);
    });

    return () => {
      active = false;
    };
  }, []);

  if (!Twin) return <BillboardTwinPlaceholder />;

  return <Twin {...props} />;
}
