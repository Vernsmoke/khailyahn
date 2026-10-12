import { Typewriter } from "@/components/ui/typewriter-text";
import { ToggleTheme } from "@/components/ui/toggle-theme";

export default function DemoOne() {
  return (
    <div className="theme-selector-demo">
      <ToggleTheme />
    </div>
  );
}

export function DemoVariant1() {
  return (
    <Typewriter
      text={["Welcome to HextaUI", "Build awesome websites.", "hextaui.com"]}
      speed={100}
      loop
      className="typewriter-demo"
    />
  );
}
