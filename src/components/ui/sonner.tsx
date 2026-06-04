import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast glass-toast group-[.toaster]:bg-card/40 group-[.toaster]:text-foreground group-[.toaster]:border-border/40 group-[.toaster]:shadow-2xl !p-4 !min-w-[350px]",
          success: "glass-toast-success",
          error: "glass-toast-error",
          warning: "glass-toast-warning",
          info: "glass-toast-info",
          description: "group-[.toast]:text-muted-foreground font-medium",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-bold rounded-xl",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-bold rounded-xl",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
