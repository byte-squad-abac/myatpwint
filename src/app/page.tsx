import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center p-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MyatPwint
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Myanmar Digital Publishing Platform
          </p>
          <div className="space-x-4">
            <Link href="/books">
              <Button>Browse Books</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline">Join as Author</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
