export function prioritizeTasks(tasks) {
  return tasks
    .map(task => {
      let priority = 0;

      // 1. Deadline (nearest = higher priority)
      const deadline = new Date(task.deadline);
      const daysLeft = (deadline - new Date()) / (1000 * 60 * 60 * 24);
      if (daysLeft <= 0) priority += 100;
      else priority += Math.max(0, 30 - daysLeft);

      // 2. More members → higher priority
      priority += (task.members?.length || 0) * 2;

      // 3. User's pending task count (simulated as "assignedUser.taskCount")
      priority += task.assignedUser?.taskCount ? task.assignedUser.taskCount * 0.5 : 0;

      return { ...task, priority };
    })
    .sort((a, b) => b.priority - a.priority);
}
