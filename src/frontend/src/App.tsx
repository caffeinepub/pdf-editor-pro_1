import { PDFEditor } from "@/components/PDFEditor";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function App() {
  return (
    <TooltipProvider delayDuration={400}>
      <PDFEditor />
      <Toaster richColors position="top-right" />
    </TooltipProvider>
  );
}
