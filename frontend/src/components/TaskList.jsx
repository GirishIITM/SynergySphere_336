import React, { useEffect, useState } from "react";
import { prioritizeTasks } from "../utils/prioritizeTasks";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // You would normally fetch this from an API. For now, we'll mock it:
    const mockTasks = [
      {
        id: 1,
        title: "Fix login bug",
        deadline: "2025-06-06",
        members: ["user1", "user2"],
        assignedUser: { name: "user1", pendingTasks: 5 },
      },
      {
        id: 2,
        title: "Design landing page",
        deadline: "2025-06-04",
        members: ["user3"],
        assignedUser: { name: "user3", pendingTasks: 3 },
      },
      {
        id: 3,
        title: "Database backup",
        deadline: "2025-06-10",
        members: ["user2", "user4", "user5"],
        assignedUser: { name: "user2", pendingTasks: 7 },
      },
    ];

    const prioritized = prioritizeTasks(mockTasks);
    setTasks(prioritized);
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Prioritized Task List</h2>
      <ul>
        {tasks.map((task, index) => (
          <li
            key={task.id}
            style={{
              margin: "10px 0",
              padding: "10px",
              border: "1px solid #ccc",
              backgroundColor: index === 0 ? "#ffe4e1" : "#f9f9f9",
            }}
          >
            <strong>{task.title}</strong> <br />
            Deadline: {task.deadline} <br />
            Members: {task.members.length} <br />
            Assigned User: {task.assignedUser.name} (
            {task.assignedUser.pendingTasks} pending tasks)
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
