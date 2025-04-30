// Borrowed from shadcn/ui example
// https://ui.shadcn.com/docs/components/toast

import { ToastActionElement } from "@/components/ui/toast";
import { useToast as useToastOriginal } from "@/components/ui/use-toast";

type ToastOptions = {
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
};

export function useToast() {
  const { toast, dismiss, update } = useToastOriginal();

  return {
    toast: ({ title, description, action, variant }: ToastOptions) => {
      toast({
        title,
        description,
        action,
        variant,
      });
    },
    dismiss,
    update,
  };
}