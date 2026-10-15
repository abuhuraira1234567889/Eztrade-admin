import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <h1 className="text-2xl font-display font-semibold">Page not found</h1>
      <Link to="/" className="text-purple text-sm hover:underline">
        Go home
      </Link>
    </div>
  );
}
