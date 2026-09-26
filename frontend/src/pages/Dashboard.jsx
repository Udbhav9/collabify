import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import CreateProjectModal from '../components/CreateProjectModal';
import EditProjectModal from '../components/EditProjectModal';
import { Plus, Clock, ArrowRight, MoreVertical, Edit3, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await API.get('/projects/');
      const projectsData = response.data || [];

      // Fetch analytics for each project to calculate completion progress %
      const updatedProjects = await Promise.all(
        projectsData.map(async (p) => {
          try {
            const analyticsRes = await API.get(`/projects/${p.id}/analytics/`);
            return { ...p, completion_percentage: analyticsRes.data.completion_percentage || 0 };
          } catch (e) {
            return { ...p, completion_percentage: 0 };
          }
        })
      );

      setProjects(updatedProjects);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this project? All tasks and data will be permanently removed.')) {
      return;
    }

    try {
      await API.delete(`/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete project.');
    } finally {
      setActiveMenuId(null);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout searchTerm={searchTerm} setSearchTerm={setSearchTerm}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {user?.role === 'teacher' ? 'Student Project Evaluation Portal' : 'Project Workspace'}
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              {user?.role === 'teacher'
                ? 'Review team progress, audit student task contributions, and provide academic evaluation grades.'
                : 'Manage your course projects, assign tasks, and collaborate with your team.'}
            </p>
          </div>

          {user?.role === 'student' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Project
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-slate-400 py-12 text-center text-xs">Loading projects...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-sm mb-4">No active projects found.</p>
            {user?.role === 'student' && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs"
              >
                Create First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/50 transition-all shadow-md flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full uppercase tracking-wider">
                      {project.course} (Sem {project.semester})
                    </span>

                    {/* Edit/Delete Actions Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === project.id ? null : project.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === project.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-slate-950 border border-slate-800 rounded-xl shadow-xl py-1 z-30 text-xs">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingProject(project);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-indigo-400" /> Edit
                          </button>
                          <button
                            onClick={(e) => handleDeleteProject(project.id, e)}
                            className="w-full px-3 py-1.5 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link to={`/projects/${project.id}`} className="block">
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors mb-2">
                      {project.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>
                  </Link>
                </div>

                {/* Progress Bar (Feature 1) */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-semibold mb-1">
                      <span className="text-slate-400">Completion Progress</span>
                      <span className="text-indigo-400">{project.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${project.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex justify-between items-center text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      {user?.role === 'teacher' ? 'Evaluate' : 'Open Workspace'} <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onProjectCreated={() => fetchProjects()}
      />

      <EditProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onProjectUpdated={() => fetchProjects()}
      />
    </DashboardLayout>
  );
}