import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Spec } from '../types';
import { Plus, Trash2, FileText, Menu } from 'lucide-react';

export default function Dashboard() {
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.listSpecs().then(setSpecs);
  }, []);

  const filteredSpecs = filter === 'all'
    ? specs
    : specs.filter((s) => s.status === filter);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this spec?')) return;
    await api.deleteSpec(id);
    setSpecs(specs.filter((s) => s.id !== id));
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={`bg-gray-50 border-r border-gray-200 transition-all ${
          sidebarOpen ? 'w-56' : 'w-14'
        } flex flex-col`}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
        {sidebarOpen && (
          <nav className="px-3 py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Projects</p>
            <p className="text-sm text-gray-600">All specs</p>
          </nav>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Specs</h1>
            <div className="flex gap-1 ml-4">
              {['all', 'draft', 'in_review', 'final'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'in_review' ? 'In Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate('/specs/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> New Spec
          </button>
        </header>

        {/* Spec list */}
        <div className="flex-1 overflow-auto p-6">
          {filteredSpecs.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">No specs yet. Create your first one!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b text-xs uppercase tracking-wide">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Version</th>
                  <th className="pb-2 font-medium">Updated</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredSpecs.map((spec) => (
                  <tr
                    key={spec.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/specs/${spec.id}`)}
                  >
                    <td className="py-3 text-sm font-medium text-gray-900">{spec.title}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        spec.status === 'approved' ? 'bg-green-100 text-green-700' :
                        spec.status === 'final' ? 'bg-green-100 text-green-700' :
                        spec.status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {spec.status}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-500">v{spec.current_version}</td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(spec.updated_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(spec.id); }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
