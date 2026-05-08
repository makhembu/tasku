import Conf from 'conf';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  labels: string[];
  dueDate: Date | null;
  done: boolean;
  createdAt: Date;
}

interface StoreData {
  tasks: Task[];
}

export class TaskStore {
  private conf: Conf<StoreData>;

  constructor() {
    this.conf = new Conf<StoreData>({
      projectName: 'tasku',
      defaults: { tasks: [] as Task[] }
    });
  }

  add(task: Omit<Task, 'id' | 'createdAt' | 'done'>): Task {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      done: false,
      createdAt: new Date(),
    };
    const tasks = this.conf.get('tasks');
    tasks.push(newTask);
    this.conf.set('tasks', tasks);
    return newTask;
  }

  list(): Task[] {
    const tasks = this.conf.get('tasks');
    return tasks.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      return 0;
    });
  }

  complete(id: string): Task | null {
    const tasks = this.conf.get('tasks');
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.done = true;
      this.conf.set('tasks', tasks);
      return task;
    }
    return null;
  }

  delete(id: string): Task | null {
    const tasks = this.conf.get('tasks');
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      const [removed] = tasks.splice(idx, 1);
      this.conf.set('tasks', tasks);
      return removed;
    }
    return null;
  }
}
