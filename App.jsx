import React, { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  ListTodo,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
  CalendarDays,
  AlertTriangle,
  LayoutDashboard,
  Circle,
  Pencil,
  Bell
} from "lucide-react";

const STORAGE_KEY = "taskflow_tasks_v1";
const SETTINGS_KEY = "taskflow_settings_v1";

const defaultSettings = {
  theme: "light",
  notifications: true,
  overdueNotifications: true,
  defaultReminder: 15,
};

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    return {
      ...defaultSettings,
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {})
    };
  } catch {
    return defaultSettings;
  }
}

function formatDate(value) {
  if (!value) return "No date";

  const d = new Date(`${value}T00:00:00`);

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function isOverdue(task) {
  if (task.completed || !task.dueDate) return false;

  const due = new Date(
    `${task.dueDate}T${task.dueTime || "23:59"}`
  );

  return due.getTime() < Date.now();
}

function priorityLabel(value) {
  if (!value) return "Medium";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [settings, setSettings] = useState(loadSettings);

  const [view, setView] = useState("all");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("due");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const [toast, setToast] = useState("");

  /* --------------------------------
     SAVE TASKS
  -------------------------------- */

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(tasks)
    );
  }, [tasks]);

  /* --------------------------------
     SAVE SETTINGS
  -------------------------------- */

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(settings)
    );

    document.documentElement.dataset.theme =
      settings.theme;
  }, [settings]);

  /* --------------------------------
     REFRESH OVERDUE STATUS
  -------------------------------- */

  useEffect(() => {
    const timer = setInterval(() => {
      setTasks(current =>
        current.map(task => ({ ...task }))
      );
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  /* --------------------------------
     REMINDERS
  -------------------------------- */

  useEffect(() => {
    if (
      !settings.notifications &&
      !settings.overdueNotifications
    ) {
      return;
    }

    const checkReminders = () => {
      const now = Date.now();

      setTasks(current => {
        let changed = false;

        const next = current.map(task => {
          if (
            task.completed ||
            !task.dueDate ||
            !task.dueTime
          ) {
            return task;
          }

          const due = new Date(
            `${task.dueDate}T${task.dueTime}`
          ).getTime();

          const reminderAt =
            due -
            Number(task.reminder || 0) * 60000;

          let copy = task;

          /* Reminder */

          if (
            settings.notifications &&
            now >= reminderAt &&
            now < due &&
            !task.reminded
          ) {
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("TaskFlow reminder", {
                body: `${task.title} is due ${
                  task.reminder
                    ? `in ${task.reminder} minutes`
                    : "soon"
                }.`
              });
            } else {
              setToast(
                `Reminder: ${task.title}`
              );
            }

            copy = {
              ...copy,
              reminded: true
            };

            changed = true;
          }

          /* Overdue notification */

          if (
            settings.overdueNotifications &&
            now >= due &&
            !task.overdueNotified
          ) {
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification("Overdue task", {
                body: `${task.title} is overdue.`
              });
            } else {
              setToast(
                `Overdue: ${task.title}`
              );
            }

            copy = {
              ...copy,
              overdueNotified: true
            };

            changed = true;
          }

          return copy;
        });

        return changed ? next : current;
      });
    };

    checkReminders();

    const timer = setInterval(
      checkReminders,
      30000
    );

    return () => clearInterval(timer);
  }, [
    settings.notifications,
    settings.overdueNotifications
  ]);

  /* --------------------------------
     TOAST
  -------------------------------- */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(
      () => setToast(""),
      4000
    );

    return () => clearTimeout(timer);
  }, [toast]);

  /* --------------------------------
     NOTIFICATIONS
  -------------------------------- */

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setToast(
        "This browser does not support notifications."
      );

      return;
    }

    const permission =
      await Notification.requestPermission();

    setToast(
      permission === "granted"
        ? "Notifications enabled."
        : "Notifications were not enabled."
    );
  };

  /* --------------------------------
     COUNTS
  -------------------------------- */

  const counts = useMemo(
    () => ({
      total: tasks.length,

      completed: tasks.filter(
        task => task.completed
      ).length,

      pending: tasks.filter(
        task => !task.completed
      ).length,

      overdue: tasks.filter(
        isOverdue
      ).length,

      today: tasks.filter(
        task =>
          task.dueDate ===
            new Date()
              .toISOString()
              .slice(0, 10) &&
          !task.completed
      ).length
    }),
    [tasks]
  );

  /* --------------------------------
     VISIBLE TASKS
  -------------------------------- */

  const visibleTasks = useMemo(() => {
    let list = [...tasks];

    if (view === "today") {
      const today = new Date()
        .toISOString()
        .slice(0, 10);

      list = list.filter(
        task => task.dueDate === today
      );
    }

    else if (view === "upcoming") {
      const today = new Date()
        .toISOString()
        .slice(0, 10);

      list = list.filter(
        task =>
          task.dueDate &&
          task.dueDate > today &&
          !task.completed
      );
    }

    else if (view === "completed") {
      list = list.filter(
        task => task.completed
      );
    }

    else if (view === "overdue") {
      list = list.filter(isOverdue);
    }

    /* Filters */

    if (filter === "pending") {
      list = list.filter(
        task => !task.completed
      );
    }

    if (filter === "done") {
      list = list.filter(
        task => task.completed
      );
    }

    /* Search */

    if (search.trim()) {
      const q = search.toLowerCase();

      list = list.filter(task =>
        `${task.title} ${task.description || ""} ${
          task.category || ""
        }`
          .toLowerCase()
          .includes(q)
      );
    }

    /* Sorting */

    list.sort((a, b) => {
      if (sort === "priority") {
        const rank = {
          high: 0,
          medium: 1,
          low: 2
        };

        return (
          rank[a.priority] -
          rank[b.priority]
        );
      }

      if (sort === "newest") {
        return (
          b.createdAt -
          a.createdAt
        );
      }

      if (sort === "oldest") {
        return (
          a.createdAt -
          b.createdAt
        );
      }

      return (
        (a.dueDate || "9999-12-31")
          .localeCompare(
            b.dueDate || "9999-12-31"
          )
      );
    });

    return list;
  }, [
    tasks,
    view,
    filter,
    search,
    sort
  ]);

  /* --------------------------------
     OPEN NEW TASK
  -------------------------------- */

  const openNewTask = () => {
    setEditingTask(null);
    setModalOpen(true);
    setSidebarOpen(false);
  };

  /* --------------------------------
     SAVE TASK
  -------------------------------- */

  const saveTask = data => {
    if (editingTask) {
      setTasks(current =>
        current.map(task =>
          task.id === editingTask.id
            ? {
                ...task,
                ...data,
                reminded: false,
                overdueNotified: false
              }
            : task
        )
      );

      setToast("Task updated.");
    } else {
      setTasks(current => [
        ...current,
        {
          ...data,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          completed: false,
          reminded: false,
          overdueNotified: false
        }
      ]);

      setToast("Task added.");
    }

    setModalOpen(false);
    setEditingTask(null);
  };

  /* --------------------------------
     COMPLETE / UNCOMPLETE TASK
  -------------------------------- */

  const toggleTask = id => {
    setTasks(current => {
      const task = current.find(
        t => t.id === id
      );

      if (!task) {
        return current;
      }

      /* Uncomplete */

      if (task.completed) {
        return current.map(t =>
          t.id === id
            ? {
                ...t,
                completed: false,
                reminded: false,
                overdueNotified: false
              }
            : t
        );
      }

      /* Complete current task */

      const completedTask = {
        ...task,
        completed: true,
        reminded: false,
        overdueNotified: false
      };

      /* No repeat */

      if (
        !task.repeat ||
        task.repeat === "none"
      ) {
        return current.map(t =>
          t.id === id
            ? completedTask
            : t
        );
      }

      /* Cannot repeat without date */

      if (!task.dueDate) {
        return current.map(t =>
          t.id === id
            ? completedTask
            : t
        );
      }

      /* Calculate next occurrence */

      const nextDate = new Date(
        `${task.dueDate}T${
          task.dueTime || "00:00"
        }`
      );

      if (task.repeat === "daily") {
        nextDate.setDate(
          nextDate.getDate() + 1
        );
      }

      if (task.repeat === "weekly") {
        nextDate.setDate(
          nextDate.getDate() + 7
        );
      }

      if (task.repeat === "monthly") {
        nextDate.setMonth(
          nextDate.getMonth() + 1
        );
      }

      const nextTask = {
        ...task,

        id: crypto.randomUUID(),

        completed: false,

        dueDate:
          nextDate
            .toISOString()
            .split("T")[0],

        reminded: false,

        overdueNotified: false,

        createdAt: Date.now()
      };

      return [
        ...current.map(t =>
          t.id === id
            ? completedTask
            : t
        ),
        nextTask
      ];
    });

    setToast("Task completed.");
  };

  /* --------------------------------
     DELETE TASK
  -------------------------------- */

  const deleteTask = id => {
    if (confirm("Delete this task?")) {
      setTasks(current =>
        current.filter(
          task => task.id !== id
        )
      );

      setToast("Task deleted.");
    }
  };

  /* --------------------------------
     CLEAR COMPLETED
  -------------------------------- */

  const clearCompleted = () => {
    setTasks(current =>
      current.filter(
        task => !task.completed
      )
    );

    setToast(
      "Completed tasks cleared."
    );
  };

  /* --------------------------------
     APP UI
  -------------------------------- */

  return (
    <div className="app-shell">

      <Sidebar
        view={view}
        setView={setView}
        counts={counts}
        openNewTask={openNewTask}
        open={sidebarOpen}
        close={() =>
          setSidebarOpen(false)
        }
        setSettings={setSettings}
        settings={settings}
        requestNotifications={
          requestNotifications
        }
      />

      <main className="main">

        {/* TOP BAR */}

        <header className="topbar">

          <button
            className="icon-btn mobile-menu"
            onClick={() =>
              setSidebarOpen(true)
            }
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div>
            <h1>My Tasks</h1>

            <p>
              Stay organized, one task
              at a time.
            </p>
          </div>

          <button className="avatar">
            P
          </button>

        </header>

        {/* WELCOME CARD */}

        <section className="welcome-card">

          <div>

            <span className="eyebrow">
              WELCOME BACK 👋
            </span>

            <h2>
              Let's make today{" "}
              <span>productive!</span>
            </h2>

            <p>
              Keep track of your tasks,
              stay focused, and celebrate
              your progress along the way.
            </p>

            <button
              className="primary light"
              onClick={openNewTask}
            >
              <Plus size={18} />
              Add New Task
            </button>

          </div>

          <div className="welcome-mark">
            <Check size={62} />
          </div>

        </section>

        {/* STATS */}

        <section className="stats-grid">

          <Stat
            icon={<ListTodo />}
            label="Total"
            value={counts.total}
          />

          <Stat
            icon={<Clock3 />}
            label="Pending"
            value={counts.pending}
          />

          <Stat
            icon={<CheckCircle2 />}
            label="Completed"
            value={counts.completed}
          />

          <Stat
            icon={<AlertTriangle />}
            label="Overdue"
            value={counts.overdue}
            danger
          />

        </section>

        {/* TASK CONTENT */}

        <section className="content-card">

          <div className="section-head">

            <div>

              <h2>
                {view === "all"
                  ? "Today's Tasks"
                  : titleForView(view)}
              </h2>

              <p>
                {visibleTasks.length} task
                {visibleTasks.length === 1
                  ? ""
                  : "s"} shown
              </p>

            </div>

            <div className="toolbar">

              <div className="search-box">

                <Search size={17} />

                <input
                  value={search}
                  onChange={e =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search tasks..."
                />

              </div>

              <select
                value={sort}
                onChange={e =>
                  setSort(
                    e.target.value
                  )
                }
              >

                <option value="due">
                  Due date
                </option>

                <option value="priority">
                  Priority
                </option>

                <option value="newest">
                  Newest
                </option>

                <option value="oldest">
                  Oldest
                </option>

              </select>

            </div>

          </div>

          {/* FILTERS */}

          <div className="filters">

            {[
              "all",
              "pending",
              "done"
            ].map(item => (

              <button
                key={item}
                className={
                  filter === item
                    ? "filter active"
                    : "filter"
                }
                onClick={() =>
                  setFilter(item)
                }
              >

                {item === "all"
                  ? "All"
                  : item === "pending"
                  ? "Pending"
                  : "Done"}

              </button>

            ))}

            {counts.completed > 0 && (

              <button
                className="text-button"
                onClick={
                  clearCompleted
                }
              >
                Clear completed
              </button>

            )}

          </div>

          {/* TASK LIST */}

          <div className="task-list">

            {visibleTasks.length === 0 ? (

              <EmptyState
                onAdd={openNewTask}
              />

            ) : (

              visibleTasks.map(task => (

                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={() =>
                    toggleTask(task.id)
                  }
                  onEdit={() => {
                    setEditingTask(task);
                    setModalOpen(true);
                  }}
                  onDelete={() =>
                    deleteTask(task.id)
                  }
                />

              ))

            )}

          </div>

        </section>

      </main>

      {/* TASK MODAL */}

      {modalOpen && (

        <TaskModal
          task={editingTask}
          defaultReminder={
            settings.defaultReminder
          }
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onSave={saveTask}
        />

      )}

      {/* TOAST */}

      {toast && (

        <div className="toast">

          <Bell size={17} />

          {toast}

        </div>

      )}

    </div>
  );
}

/* =====================================
   TITLE FOR VIEW
===================================== */

function titleForView(view) {
  return {
    today: "Today's Tasks",
    upcoming: "Upcoming Tasks",
    completed: "Completed Tasks",
    overdue: "Overdue Tasks"
  }[view] || "My Tasks";
}

/* =====================================
   SIDEBAR
===================================== */

function Sidebar({
  view,
  setView,
  counts,
  openNewTask,
  open,
  close,
  settings,
  setSettings,
  requestNotifications
}) {
  const items = [
    [
      "all",
      "All Tasks",
      <LayoutDashboard size={18} />
    ],

    [
      "today",
      "Today",
      <CalendarDays size={18} />
    ],

    [
      "upcoming",
      "Upcoming",
      <Clock3 size={18} />
    ],

    [
      "completed",
      "Completed",
      <CheckCircle2 size={18} />
    ],

    [
      "overdue",
      "Overdue",
      <AlertTriangle size={18} />
    ]
  ];

  return (
    <>

      {open && (
        <div
          className="overlay"
          onClick={close}
        />
      )}

      <aside
        className={
          open
            ? "sidebar open"
            : "sidebar"
        }
      >

        <div className="brand">

          <div className="brand-icon">
            <Check size={21} />
          </div>

          <span>TaskFlow</span>

          <button
            className="icon-btn close-mobile"
            onClick={close}
          >
            <X size={20} />
          </button>

        </div>

        <button
          className="primary full"
          onClick={openNewTask}
        >
          <Plus size={18} />
          Add Task
        </button>

        <nav>

          {items.map(
            ([id, label, icon]) => (

              <button
                key={id}
                className={
                  view === id
                    ? "nav-link active"
                    : "nav-link"
                }
                onClick={() => {
                  setView(id);
                  close();
                }}
              >

                {icon}

                <span>
                  {label}
                </span>

                {id === "overdue" &&
                  counts.overdue > 0 && (
                    <b>
                      {counts.overdue}
                    </b>
                  )}

              </button>

            )
          )}

        </nav>

        <div className="sidebar-bottom">

          {/* DARK MODE */}

          <button
            className="nav-link"
            onClick={() =>
              setSettings(s => ({
                ...s,
                theme:
                  s.theme === "light"
                    ? "dark"
                    : "light"
              }))
            }
          >

            {settings.theme ===
            "light" ? (
              <Moon size={18} />
            ) : (
              <Sun size={18} />
            )}

            <span>
              {settings.theme ===
              "light"
                ? "Dark mode"
                : "Light mode"}
            </span>

          </button>

          {/* NOTIFICATIONS */}

          <button
            className="nav-link"
            onClick={
              requestNotifications
            }
          >

            <Bell size={18} />

            <span>
              Enable notifications
            </span>

          </button>

          <div className="sidebar-note">

            <Settings size={16} />

            <span>
              Tasks are stored locally
              on this device.
            </span>

          </div>

        </div>

      </aside>

    </>
  );
}

/* =====================================
   STAT
===================================== */

function Stat({
  icon,
  label,
  value,
  danger
}) {
  return (
    <div
      className={`stat ${
        danger ? "danger" : ""
      }`}
    >

      <div className="stat-icon">
        {icon}
      </div>

      <div>
        <strong>
          {value}
        </strong>

        <span>
          {label}
        </span>
      </div>

    </div>
  );
}

/* =====================================
   EMPTY STATE
===================================== */

function EmptyState({ onAdd }) {
  return (
    <div className="empty">

      <div className="empty-icon">
        <ListTodo size={28} />
      </div>

      <h3>
        No tasks here
      </h3>

      <p>
        Add your first task and start
        making progress.
      </p>

      <button
        className="primary"
        onClick={onAdd}
      >
        <Plus size={17} />
        Add Task
      </button>

    </div>
  );
}

/* =====================================
   TASK CARD
===================================== */

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete
}) {
  const overdue =
    isOverdue(task);

  return (
    <article
      className={`task-card ${
        task.completed
          ? "completed"
          : ""
      } ${
        overdue
          ? "overdue"
          : ""
      }`}
    >

      <button
        className={`check-circle ${
          task.completed
            ? "checked"
            : ""
        }`}
        onClick={onToggle}
        aria-label="Complete task"
      >
        {task.completed && (
          <Check size={16} />
        )}
      </button>

      <div className="task-main">

        <div className="task-title-row">

          <h3>
            {task.title}
          </h3>

          <span
            className={`priority ${
              task.priority
            }`}
          >
            {priorityLabel(
              task.priority
            )}
          </span>

        </div>

        {task.description && (
          <p>
            {task.description}
          </p>
        )}

        <div className="task-meta">

          {task.dueDate && (
            <span>
              <CalendarDays
                size={14}
              />
              {formatDate(
                task.dueDate
              )}
            </span>
          )}

          {task.dueTime && (
            <span>
              <Clock3 size={14} />
              {task.dueTime}
            </span>
          )}

          {task.category && (
            <span>
              <Circle size={8} />
              {task.category}
            </span>
          )}

          {task.repeat &&
            task.repeat !== "none" && (
              <span>
                ↻ {task.repeat}
              </span>
            )}

          {overdue && (
            <span className="overdue-label">
              <AlertTriangle
                size={14}
              />
              Overdue
            </span>
          )}

        </div>

      </div>

      <div className="task-actions">

        <button
          className="icon-btn"
          onClick={onEdit}
          title="Edit"
        >
          <Pencil size={17} />
        </button>

        <button
          className="icon-btn delete"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 size={17} />
        </button>

      </div>

    </article>
  );
}

/* =====================================
   TASK MODAL
===================================== */

function TaskModal({
  task,
  defaultReminder,
  onClose,
  onSave
}) {
  const [form, setForm] =
    useState({
      title:
        task?.title || "",

      description:
        task?.description || "",

      dueDate:
        task?.dueDate || "",

      dueTime:
        task?.dueTime || "",

      reminder:
        task?.reminder ??
        defaultReminder,

      repeat:
        task?.repeat ||
        "none",

      priority:
        task?.priority ||
        "medium",

      category:
        task?.category ||
        "Personal"
    });

  const update = (
    key,
    value
  ) => {
    setForm(current => ({
      ...current,
      [key]: value
    }));
  };

  const submit = e => {
    e.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    onSave({
      ...form,

      title:
        form.title.trim(),

      reminder:
        Number(form.reminder)
    });
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e =>
        e.target ===
          e.currentTarget &&
        onClose()
      }
    >

      <div className="modal">

        <div className="modal-head">

          <div>

            <span className="eyebrow">
              TASK
            </span>

            <h2>
              {task
                ? "Edit Task"
                : "Add New Task"}
            </h2>

          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
          >
            <X />
          </button>

        </div>

        <form onSubmit={submit}>

          {/* TASK NAME */}

          <label>
            Task name

            <input
              autoFocus
              value={form.title}
              onChange={e =>
                update(
                  "title",
                  e.target.value
                )
              }
              placeholder="What do you need to do?"
              required
            />

          </label>

          {/* DESCRIPTION */}

          <label>
            Description

            <textarea
              value={
                form.description
              }
              onChange={e =>
                update(
                  "description",
                  e.target.value
                )
              }
              placeholder="Add some details..."
            />

          </label>

          {/* DATE + TIME */}

          <div className="two-col">

            <label>
              Due date

              <input
                type="date"
                value={
                  form.dueDate
                }
                onChange={e =>
                  update(
                    "dueDate",
                    e.target.value
                  )
                }
              />

            </label>

            <label>
              Due time

              <input
                type="time"
                value={
                  form.dueTime
                }
                onChange={e =>
                  update(
                    "dueTime",
                    e.target.value
                  )
                }
              />

            </label>

          </div>

          {/* REMINDER + PRIORITY */}

          <div className="two-col">

            <label>
              Reminder

              <select
                value={
                  form.reminder
                }
                onChange={e =>
                  update(
                    "reminder",
                    e.target.value
                  )
                }
              >

                <option value="0">
                  At due time
                </option>

                <option value="5">
                  5 minutes before
                </option>

                <option value="15">
                  15 minutes before
                </option>

                <option value="30">
                  30 minutes before
                </option>

                <option value="60">
                  1 hour before
                </option>

                <option value="1440">
                  1 day before
                </option>

              </select>

            </label>

            <label>
              Priority

              <select
                value={
                  form.priority
                }
                onChange={e =>
                  update(
                    "priority",
                    e.target.value
                  )
                }
              >

                <option value="low">
                  Low
                </option>

                <option value="medium">
                  Medium
                </option>

                <option value="high">
                  High
                </option>

              </select>

            </label>

          </div>

          {/* CATEGORY + REPEAT */}

          <div className="two-col">

            <label>
              Category

              <select
                value={
                  form.category
                }
                onChange={e =>
                  update(
                    "category",
                    e.target.value
                  )
                }
              >

                <option>
                  Personal
                </option>

                <option>
                  Work
                </option>

                <option>
                  School
                </option>

                <option>
                  Shopping
                </option>

                <option>
                  Health
                </option>

                <option>
                  Other
                </option>

              </select>

            </label>

            <label>
              Repeat

              <select
                value={
                  form.repeat
                }
                onChange={e =>
                  update(
                    "repeat",
                    e.target.value
                  )
                }
              >

                <option value="none">
                  Does not repeat
                </option>

                <option value="daily">
                  Daily
                </option>

                <option value="weekly">
                  Weekly
                </option>

                <option value="monthly">
                  Monthly
                </option>

              </select>

            </label>

          </div>

          {/* BUTTONS */}

          <div className="modal-actions">

            <button
              type="button"
              className="secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="primary"
              type="submit"
            >

              {task ? (
                <Pencil size={17} />
              ) : (
                <Plus size={17} />
              )}

              {task
                ? "Save Changes"
                : "Add Task"}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default App;