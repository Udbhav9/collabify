import React, { useState } from 'react';
import API from '../api/client';
import { Sparkles } from 'lucide-react';

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [semester, setSemester] = useState(1);
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  if (!isOpen) return null;

  const handleAiGenerate = async () => {
    if (!title || !course) {
      alert('Please enter a Project Title and Course Name first.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await API.post('/ai/generate-description', { title, course });
      setDescription(res.data.description);
    } catch (err) {
      alert('Failed to generate AI description.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formattedDeadline = new Date(deadline).toISOString();
      const response = await API.post('/projects/', {
        title,
        description,
        course,
        semester: parseInt(semester, 10),
        deadline: formattedDeadline,
      });

      onProjectCreated(response.data);
      onClose();
      setTitle('');
      setDescription('');
      setCourse('');
      setSemester(1);
      setDeadline('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Create New Project</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Project Title</label>
            <input
              type="text"
              required
              placeholder="e.g., E-Commerce Microservices Platform"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Course Name</label>
            <input
              type="text"
              required
              placeholder="e.g., Distributed Systems"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Semester</label>
              <input
                type="number"
                min="1"
                max="8"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Deadline</label>
              <input
                type="datetime-local"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-medium text-slate-300">Description</label>
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" /> {aiLoading ? 'Generating...' : 'AI Generate Scope'}
              </button>
            </div>
            <textarea
              rows="3"
              placeholder="Brief overview of project goals..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}