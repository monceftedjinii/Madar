import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

export default function DashboardHeader() {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
          Employee Workspace
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Employee Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 md:text-base">
          Track performance, productivity and monthly score through one clear and modern RH dashboard.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_160px_180px]">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <SearchOutlinedIcon className="text-slate-400" fontSize="small" />
          <input
            className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="Search task, message, employee info..."
            type="text"
          />
        </label>

        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none">
          <option>March 2026</option>
          <option>February 2026</option>
          <option>January 2026</option>
        </select>

        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none">
          <option>Human Resources</option>
          <option>Finance</option>
          <option>Operations</option>
        </select>
      </div>
    </div>
  );
}
