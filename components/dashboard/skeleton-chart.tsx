import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function SkeletonChart({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[300px] flex flex-col space-y-4">
          <Skeleton className="h-full w-full" />
          <div className="flex justify-center space-x-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-[100px]" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 