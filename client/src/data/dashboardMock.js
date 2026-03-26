export const employeeInfo = {
  fullName: "Amina Bensalem",
  role: "HR Operations Officer",
  department: "Human Resources",
  email: "amina.bensalem@madar.dz",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
  attendanceRate: 94,
  overallProgress: 78,
  finalScore: 17.2,
  topSkill: "Teamwork",
};

export const tasks = [
  {
    id: 1,
    name: "Prepare onboarding checklist",
    priority: "High",
    deadline: "2026-03-27",
    status: "Completed",
    progress: 100,
  },
  {
    id: 2,
    name: "Update employee attendance report",
    priority: "Medium",
    deadline: "2026-03-28",
    status: "In Progress",
    progress: 68,
  },
  {
    id: 3,
    name: "Validate training requests",
    priority: "High",
    deadline: "2026-03-26",
    status: "Late",
    progress: 82,
  },
  {
    id: 4,
    name: "Prepare monthly HR dashboard notes",
    priority: "Low",
    deadline: "2026-03-30",
    status: "Pending",
    progress: 22,
  },
  {
    id: 5,
    name: "Review leave approvals backlog",
    priority: "Medium",
    deadline: "2026-03-29",
    status: "In Progress",
    progress: 56,
  },
];

export const weeklyPerformance = [72, 81, 76, 89];

export const monthlyProgress = [25, 34, 46, 52, 60, 68, 71, 78];

export const taskBreakdown = {
  completed: 12,
  pending: 5,
  late: 2,
};

export const skillsData = {
  punctuality: 18,
  productivity: 16,
  teamwork: 19,
  discipline: 17,
  qualityOfWork: 18,
};

export const planning = [
  {
    id: 1,
    time: "08:30",
    title: "Daily stand-up with HR team",
    subtitle: "15 min sync",
  },
  {
    id: 2,
    time: "10:30",
    title: "Employee contract review",
    subtitle: "Deadline this afternoon",
  },
  {
    id: 3,
    time: "14:00",
    title: "Training budget meeting",
    subtitle: "Conference room B",
  },
];

export const notifications = [
  {
    id: 1,
    title: "Urgent leave request pending",
    message: "A manager validation is still waiting for your review.",
    level: "important",
  },
  {
    id: 2,
    title: "Policy update published",
    message: "The new attendance policy is available for all employees.",
    level: "info",
  },
];

export const hrRequests = [
  { id: 1, label: "Leave request", status: "Pending" },
  { id: 2, label: "Absence regularization", status: "In Review" },
  { id: 3, label: "Training request", status: "Approved" },
];

export const quickMessages = [
  { id: 1, sender: "HR Team", subject: "Updated forms ready" },
  { id: 2, sender: "Payroll", subject: "Monthly inputs received" },
  { id: 3, sender: "Manager", subject: "Please review late tasks" },
];

export const monthlyScoreInsights = {
  achievement: "Completed all onboarding actions ahead of schedule.",
  improvement: "Reduce overdue validations for urgent leave requests.",
};
