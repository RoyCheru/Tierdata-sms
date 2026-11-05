import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

// shadcn/ui-style Tabs, scoped to the dashboard per the design-system rule that
// only the dashboard page uses shadcn primitives; every other page uses the
// app's own component library (src/components/ui).

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-4", className)} {...props} />;
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("inline-flex w-fit items-center gap-1 rounded-lg bg-surface-sunken p-1", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium text-ink-500 transition-colors",
        "hover:text-ink-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        "data-[state=active]:bg-white data-[state=active]:text-ink-900 data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("focus-visible:outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
