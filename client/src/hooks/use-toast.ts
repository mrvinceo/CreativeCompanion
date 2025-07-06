// Simple mock toast to avoid React hooks errors
type Toast = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

function toast(props: Toast) {
  console.log("Toast:", props);
  return {
    id: "mock",
    dismiss: () => {},
    update: () => {},
  };
}

function useToast() {
  return {
    toasts: [],
    toast,
    dismiss: () => {},
  };
}

export { useToast, toast }
