import { Agent } from "./components/agent";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "react-error-boundary";
function App() {
  return (
    <>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div className="flex flex-col items-center justify-center h-screen gap-4">
            <h1 className="text-2xl font-bold">Error</h1>
            <p className="text-primary/60 text-center max-w-md wrap-anywhere">
              {error.message}
            </p>
            <button
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/80 cursor-pointer transition-all duration-300"
              onClick={resetErrorBoundary}
            >
              Reset
            </button>
          </div>
        )}
      >
        <Toaster />
        <Agent />
      </ErrorBoundary>
    </>
  );
}

export default App;
