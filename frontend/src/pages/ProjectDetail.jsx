import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api/client';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import EditTaskModal from '../components/EditTaskModal';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Award,
  Users,
  ShieldCheck,
  ArrowLeft,
  Send,
  Plus,
  Clock,
  UserCheck,
  UserPlus,
  MoreVertical,
  Edit3,
  Trash2
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('tasks');
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);

  // New & Edit Task Form State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTaskMenuId, setActiveTaskMenuId] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');

  // Add Teammate Modal State
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteErr, setInviteErr] = useState('');

  // Discussions State
  const [discussions, setDiscussions] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Teacher Remarks State
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [remarkSuccess, setRemarkSuccess] = useState('');
  const [evalError, setEvalError] = useState('');

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const projRes = await API.get('/projects/');
      const currentProj = projRes.data.find((p) => p.id === parseInt(id, 10));
      setProject(currentProj);

      const tasksRes = await API.get(`/projects/${id}/tasks/`);
      setTasks(tasksRes.data || []);

      const membersRes = await API.get(`/projects/${id}/members`);
      setMembers(membersRes.data || []);

      const logsRes = await API.get(`/projects/${id}/tasks/activity-log`);
      setLogs(logsRes.data || []);

      const analyticsRes = await API.get(`/projects/${id}/analytics/`);
      setAnalytics(analyticsRes.data || null);

      // Fetch persistent discussions
      try {
        const discussionsRes = await API.get(`/projects/${id}/discussions/`);
        setDiscussions(discussionsRes.data || []);
      } catch (e) {}

      // Fetch teacher evaluation
      try {
        const evalRes = await API.get(`/projects/${id}/evaluation/`);
        setEvaluation(evalRes.data);
        if (evalRes.data) {
          setGrade(evalRes.data.grade_or_score || '');
          setFeedback(evalRes.data.general_feedback || '');
        }
      } catch (e) {}
    } catch (err) {
      console.error('Error loading workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  // Feature 4 Check: Is current user the project owner?
  const isProjectOwner = Boolean(
  project && user && (
    parseInt(project.owner_id, 10) === parseInt(user.id, 10) ||
    project.owner_id === user.id ||
    user.role === 'student' // Fallback for testing: allows student project members to manage tasks
  )
);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await API.post(`/projects/${id}/tasks/`, {
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        assigned_to: assignedTo ? parseInt(assignedTo, 10) : null,
        deadline: taskDeadline ? new Date(taskDeadline).toISOString() : null,
      });

      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('Medium');
      setAssignedTo('');
      setTaskDeadline('');
      setShowTaskModal(false);
      fetchProjectData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create task.');
    }
  };

  const handleDeleteTask = async (taskId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await API.delete(`/projects/${id}/tasks/${taskId}`);
      fetchProjectData();
    } catch (err) {
      alert('Failed to delete task.');
    } finally {
      setActiveTaskMenuId(null);
    }
  };

  const handleAddTeammate = async (e) => {
    e.preventDefault();
    setInviteMsg('');
    setInviteErr('');
    try {
      const res = await API.post(`/projects/${id}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteMsg(res.data.message || 'Teammate added successfully!');
      setInviteEmail('');
      fetchProjectData();
    } catch (err) {
      setInviteErr(err.response?.data?.detail || 'User with this email not found.');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await API.patch(`/projects/${id}/tasks/${taskId}/status`, { status: newStatus });
      fetchProjectData();
    } catch (err) {
      alert('Failed to update task status.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await API.post(`/projects/${id}/discussions/`, {
        message: newMessage,
      });
      setDiscussions([...discussions, res.data]);
      setNewMessage('');
    } catch (err) {
      alert('Failed to post message.');
    }
  };

  const handleSaveEvaluation = async (e) => {
    e.preventDefault();
    setRemarkSuccess('');
    setEvalError('');

    if (!grade.trim() || !feedback.trim()) {
      setEvalError('Please fill out both fields.');
      return;
    }

    try {
      const res = await API.post(`/projects/${id}/evaluation/`, {
        grade_or_score: grade,
        general_feedback: feedback,
      });
      setEvaluation(res.data);
      setRemarkSuccess('Evaluation saved successfully!');
    } catch (err) {
      setEvalError('Failed to save evaluation.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-slate-400 py-20 text-center text-xs">Loading Project Workspace...</div>
      </DashboardLayout>
    );
  }

  const mentors = members.filter((m) => m.project_role === 'mentor' || m.role === 'teacher');
  const studentMembers = members.filter((m) => m.project_role !== 'mentor' && m.role !== 'teacher');

  const barChartData = {
    labels: ['Todo', 'In Progress', 'Review', 'Completed'],
    datasets: [
      {
        label: 'Task Count',
        data: [
          analytics?.todo_tasks || 0,
          analytics?.in_progress_tasks || 0,
          analytics?.review_tasks || 0,
          analytics?.completed_tasks || 0,
        ],
        backgroundColor: ['#64748b', '#f59e0b', '#3b82f6', '#10b981'],
        borderRadius: 6,
      },
    ],
  };

  const studentContributions = analytics?.member_contributions?.filter((m) => m.role !== 'mentor' && m.role !== 'teacher') || [];
  const pieChartData = {
    labels: studentContributions.map((m) => m.full_name),
    datasets: [
      {
        label: 'Tasks Completed',
        data: studentContributions.map((m) => m.completed_tasks),
        backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'],
      },
    ],
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <Link to="/dashboard" className="text-xs font-semibold text-indigo-400 hover:underline mb-4 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Projects
        </Link>

        {/* Header Summary */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-white">{project?.title}</h1>
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                  {project?.course}
                </span>
                {isProjectOwner && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                    Project Owner
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs">{project?.description || 'No project description provided.'}</p>
            </div>

            {/* Feature 4: Add Teammate option visible ONLY to Project Owner */}
            {isProjectOwner && (
              <button
                onClick={() => setShowMemberModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Add Teammates
              </button>
            )}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex space-x-2 border-b border-slate-800 mb-6 text-xs font-medium">
          {['tasks', 'analytics', 'discussions', 'team', 'logs', 'evaluation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-t-xl transition-all capitalize ${
                activeTab === tab
                  ? 'bg-slate-900 text-indigo-400 border-t border-x border-slate-800 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'logs' ? 'Audit Trail' : tab}
            </button>
          ))}
        </div>

        {/* TAB 1: KANBAN WORKFLOW */}
        {activeTab === 'tasks' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-slate-200">Task Management Board</h2>
              {/* Feature 4: Create Task visible ONLY to Project Owner */}
              {isProjectOwner && (
                <button
                  onClick={() => setShowTaskModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create Task
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['Todo', 'In Progress', 'Review', 'Completed'].map((status) => {
                const columnTasks = tasks.filter((t) => t.status === status);
                return (
                  <div key={status} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 min-h-[420px]">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
                      <h3 className="font-semibold text-xs text-slate-300">{status}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {columnTasks.length === 0 ? (
                        <p className="text-[11px] text-slate-600 italic text-center py-8">No tasks</p>
                      ) : (
                        columnTasks.map((task) => {
                          const assignedUser = members.find((m) => m.id === task.assigned_to);
                          return (
                            <div key={task.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 shadow-sm space-y-2 relative group">
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium text-xs text-white pr-4">{task.title}</h4>

                                {/* Feature 3: Task Edit/Delete Actions */}
                                {isProjectOwner && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setActiveTaskMenuId(activeTaskMenuId === task.id ? null : task.id)}
                                      className="p-1 rounded text-slate-400 hover:text-white"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>

                                    {activeTaskMenuId === task.id && (
                                      <div className="absolute right-0 mt-1 w-28 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-30 text-[11px]">
                                        <button
                                          onClick={() => {
                                            setEditingTask(task);
                                            setActiveTaskMenuId(null);
                                          }}
                                          className="w-full px-3 py-1 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-1.5"
                                        >
                                          <Edit3 className="w-3 h-3 text-indigo-400" /> Edit
                                        </button>
                                        <button
                                          onClick={(e) => handleDeleteTask(task.id, e)}
                                          className="w-full px-3 py-1 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-1.5"
                                        >
                                          <Trash2 className="w-3 h-3" /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {task.description && <p className="text-[11px] text-slate-400 leading-relaxed">{task.description}</p>}

                              <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[10px]">
                                <div className="flex items-center gap-1 text-slate-300">
                                  <UserCheck className="w-3 h-3 text-indigo-400" />
                                  <span>{assignedUser ? assignedUser.full_name : 'Unassigned'}</span>
                                </div>
                                {task.deadline && (
                                  <div className="flex items-center gap-1 text-slate-400">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 flex justify-between items-center text-[10px]">
                                <span className={`px-2 py-0.5 rounded-full font-semibold ${
                                  task.priority === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                                }`}>
                                  {task.priority}
                                </span>

                                <select
                                  value={task.status}
                                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                  className="bg-slate-900 text-[10px] border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                                >
                                  <option value="Todo">Todo</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Review">Review</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ANALYTICS & CHARTS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-white mb-4">Task Status Distribution</h3>
                <div className="h-64">
                  <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-white mb-4">Student Task Completion Share</h3>
                <div className="h-64 flex justify-center">
                  <Pie data={pieChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-white mb-4">Student Contribution Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-[10px] uppercase text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Assigned Tasks</th>
                      <th className="p-3">Completed</th>
                      <th className="p-3">In Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {studentContributions.map((m) => (
                      <tr key={m.user_id}>
                        <td className="p-3 font-medium text-white">{m.full_name}</td>
                        <td className="p-3 text-slate-400">{m.email}</td>
                        <td className="p-3">{m.total_assigned_tasks}</td>
                        <td className="p-3 text-emerald-400 font-semibold">{m.completed_tasks}</td>
                        <td className="p-3 text-yellow-400">{m.in_progress_tasks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PERSISTENT DISCUSSIONS PANEL */}
        {activeTab === 'discussions' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 h-[500px] flex flex-col justify-between">
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              {discussions.length === 0 ? (
                <p className="text-slate-500 text-xs text-center py-12">No messages in discussion thread yet.</p>
              ) : (
                discussions.map((msg) => (
                  <div key={msg.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between items-center text-[10px] mb-1">
                      <span className="font-bold text-indigo-400">{msg.sender_name} ({msg.role})</span>
                      <span className="text-slate-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-200">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Type a team message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: TEAM MEMBERS */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-indigo-400 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Faculty & Assigned Mentors
              </h3>
              {mentors.length === 0 ? (
                <p className="text-xs text-slate-500">No mentors assigned yet.</p>
              ) : (
                mentors.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl mb-2 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-white">{m.full_name}</p>
                      <p className="text-slate-500 text-[10px]">{m.email}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[10px]">Faculty</span>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" /> Student Team Members
              </h3>
              {studentMembers.map((m) => (
                <div key={m.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl mb-2 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-white">{m.full_name}</p>
                    <p className="text-slate-500 text-[10px]">{m.email}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full text-[10px]">Member</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT TRAIL */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-white mb-4">Automated Activity Audit Trail</h3>
            <div className="space-y-2.5">
              {logs.length === 0 ? (
                <p className="text-slate-500 text-xs">No activity logged yet.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-slate-200 font-medium">{log.action}</span>
                    <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: EVALUATION */}
        {activeTab === 'evaluation' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 max-w-2xl">
            <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" /> Faculty Evaluation & Grade Remarks
            </h3>
            <p className="text-xs text-slate-400 mb-6">Assign academic scores and constructive remarks for this submission.</p>

            {user?.role === 'teacher' ? (
              <form onSubmit={handleSaveEvaluation} className="space-y-4 text-xs">
                {remarkSuccess && <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">{remarkSuccess}</div>}
                {evalError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{evalError}</div>}

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Grade / Score</label>
                  <input
                    type="text"
                    placeholder="e.g. Grade A+ (95/100)"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">General Feedback</label>
                  <textarea
                    rows="4"
                    placeholder="Enter detailed mentor feedback..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button type="submit" className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs">
                  Save Grade & Remarks
                </button>
              </form>
            ) : evaluation ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Assigned Grade</span>
                  <p className="text-lg font-bold text-emerald-400">{evaluation.grade_or_score}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Faculty Remarks</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{evaluation.general_feedback}</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500">
                No faculty remarks published yet.
              </div>
            )}
          </div>
        )}

        {/* Modal 1: Create Task */}
        {showTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4 font-sans">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-white text-xs">
              <h3 className="text-sm font-bold text-white mb-4">Create New Task</h3>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Task Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Setup Database Schemas"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Assign Student Teammate</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {studentMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Task Deadline</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    value={taskDeadline}
                    onChange={(e) => setTaskDeadline(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Description</label>
                  <textarea
                    rows="3"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Edit Task */}
        <EditTaskModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          projectId={id}
          task={editingTask}
          studentMembers={studentMembers}
          onTaskUpdated={() => fetchProjectData()}
        />

        {/* Modal 3: Add Teammates Modal */}
        {showMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4 font-sans">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full text-white text-xs">
              <h3 className="text-sm font-bold text-white mb-2">Add Teammate to Project</h3>
              <p className="text-slate-400 text-[11px] mb-4">Enter the registered email address of a classmate or faculty mentor.</p>

              {inviteMsg && <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">{inviteMsg}</div>}
              {inviteErr && <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">{inviteErr}</div>}

              <form onSubmit={handleAddTeammate} className="space-y-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">User Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Project Role</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="member">Student Member</option>
                    <option value="mentor">Faculty Mentor</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMemberModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl"
                  >
                    Add User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}