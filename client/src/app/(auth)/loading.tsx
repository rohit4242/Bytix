import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] space-y-4">
            <Spinner className="w-8 h-8" />
            <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
    );
}