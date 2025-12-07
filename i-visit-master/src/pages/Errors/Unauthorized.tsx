import Meta from "../../utils/Meta";

export default function Unauthorized() {
  Meta({ title: "Unauthorized Access" });
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <h1 className="text-2xl">Unauthorized – You do not have access to this page.</h1>
    </div>
  );
}
